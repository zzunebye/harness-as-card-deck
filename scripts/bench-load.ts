// Cold-cache first-load benchmark: node scripts/bench-load.ts <urlA> <urlB> [runs=5] [--out runs.json] [--ready <css selector>]
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const READY_TIMEOUT_MS = 90_000;
// LCP keeps emitting candidates after first render (late fonts, layout), so let it settle before reading.
const LCP_SETTLE_MS = 2_000;

// Lighthouse mobile: 1.6 Mbps down, 750 Kbps up, 150 ms RTT, 4x CPU slowdown, Moto G Power viewport.
const NETWORK = { offline: false, latency: 150, downloadThroughput: (1.6e6 / 8), uploadThroughput: (750e3 / 8) };
const CPU_RATE = 4;
const VIEWPORT = { width: 412, height: 823, deviceScaleFactor: 1.75, mobile: true };

interface Run {
  side: "A" | "B";
  url: string;
  readyMs: number;
  idleMs: number;
  lcpMs: number | null;
  jsBytesBeforeReady: number;
  jsBytesTotal: number;
  bytesTotal: number;
  scripts: { url: string; encoded: number; finishedMs: number }[];
  failedRequests: string[];
  consoleErrors: string[];
}

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outFile = outIdx >= 0 ? args.splice(outIdx, 2)[1] : null;
const readyIdx = args.indexOf("--ready");
// The Lobby's deck buttons by default. A deep link passes the selector for the content it should open on.
const READY_SELECTOR = readyIdx >= 0 ? args.splice(readyIdx, 2)[1] : ".lobby-deck";
const [urlA, urlB, runsArg] = args;
if (!urlA || !urlB) throw new Error("usage: node scripts/bench-load.ts <urlA> <urlB> [runs=5] [--out runs.json] [--ready <css selector>]");
if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}. Set CHROME to a Chrome or Chromium binary.`);
const runs = Number(runsArg ?? 5);

// Runs in the page before any app script, on the page's own clock (ms since navigation start).
const PAGE_PROBE = `(() => {
  window.__bench = { lcp: null, ready: null, idle: null };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__bench.lcp = e.startTime; })
    .observe({ type: "largest-contentful-paint", buffered: true });
  const check = () => {
    if (window.__bench.ready !== null || !document.querySelector(${JSON.stringify(READY_SELECTOR)})) return;
    window.__bench.ready = performance.now();
    setTimeout(() => { window.__bench.idle = performance.now(); }, 0);
  };
  new MutationObserver(check).observe(document, { childList: true, subtree: true });
})();`;

class Cdp {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve(v: any): void; reject(e: Error): void }>();
  private listeners: ((method: string, params: any, sessionId?: string) => void)[] = [];

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) p?.reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else p?.resolve(msg.result);
      } else {
        for (const l of this.listeners) l(msg.method, msg.params, msg.sessionId);
      }
    });
  }

  static open(url: string): Promise<Cdp> {
    const ws = new WebSocket(url);
    return new Promise((resolve, reject) => {
      ws.addEventListener("open", () => resolve(new Cdp(ws)));
      ws.addEventListener("error", () => reject(new Error(`CDP websocket failed: ${url}`)));
    });
  }

  send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  on(fn: (method: string, params: any, sessionId?: string) => void) {
    this.listeners.push(fn);
  }

  close() {
    this.ws.close();
  }
}

function launchChrome(profile: string): Promise<{ proc: ChildProcess; wsUrl: string }> {
  const proc = spawn(CHROME, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  return new Promise((resolve, reject) => {
    let err = "";
    const timer = setTimeout(() => reject(new Error(`Chrome did not print a DevTools URL:\n${err}`)), 15_000);
    proc.stderr!.on("data", (d) => {
      err += d;
      const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve({ proc, wsUrl: m[1] });
      }
    });
    proc.on("exit", (code) => reject(new Error(`Chrome exited (${code}) before DevTools was ready:\n${err}`)));
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function measure(side: "A" | "B", url: string): Promise<Run> {
  const profile = mkdtempSync(join(tmpdir(), "bench-load-"));
  const { proc, wsUrl } = await launchChrome(profile);
  const cdp = await Cdp.open(wsUrl);
  try {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const s = (method: string, params: object = {}) => cdp.send(method, params, sessionId);

    const requests = new Map<string, { url: string; type?: string; status?: number }>();
    const finished: { id: string; encoded: number; at: number }[] = [];
    const failedRequests: string[] = [];
    const consoleErrors: string[] = [];
    let navStart: number | null = null;

    cdp.on((method, p, sid) => {
      if (sid !== sessionId) return;
      if (method === "Network.requestWillBeSent") {
        requests.set(p.requestId, { url: p.request.url, type: p.type });
        if (navStart === null && p.type === "Document" && p.request.url.startsWith(url.split("?")[0])) navStart = p.timestamp;
      } else if (method === "Network.responseReceived") {
        const r = requests.get(p.requestId);
        if (r) Object.assign(r, { type: p.type, status: p.response.status });
        if (p.response.status >= 400) failedRequests.push(`${p.response.status} ${p.response.url}`);
      } else if (method === "Network.loadingFinished") {
        finished.push({ id: p.requestId, encoded: p.encodedDataLength, at: p.timestamp });
      } else if (method === "Network.loadingFailed") {
        failedRequests.push(`${p.errorText} ${requests.get(p.requestId)?.url ?? p.requestId}`);
      } else if (method === "Runtime.consoleAPICalled" && p.type === "error") {
        consoleErrors.push(p.args.map((a: any) => a.value ?? a.description ?? "").join(" "));
      } else if (method === "Runtime.exceptionThrown") {
        consoleErrors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text);
      } else if (method === "Log.entryAdded" && p.entry.level === "error") {
        consoleErrors.push(`${p.entry.source}: ${p.entry.text} ${p.entry.url ?? ""}`.trim());
      }
    });

    await s("Network.enable");
    await s("Runtime.enable");
    await s("Log.enable");
    await s("Page.enable");
    await s("Network.clearBrowserCache");
    await s("Network.setCacheDisabled", { cacheDisabled: true });
    await s("Network.emulateNetworkConditions", NETWORK);
    await s("Emulation.setCPUThrottlingRate", { rate: CPU_RATE });
    await s("Emulation.setDeviceMetricsOverride", VIEWPORT);
    await s("Page.addScriptToEvaluateOnNewDocument", { source: PAGE_PROBE });

    await s("Page.navigate", { url });
    const deadline = Date.now() + READY_TIMEOUT_MS;
    let bench: { lcp: number | null; ready: number | null; idle: number | null } | null = null;
    while (Date.now() < deadline) {
      const { result } = await s("Runtime.evaluate", { expression: "window.__bench && window.__bench.idle !== null ? JSON.stringify(window.__bench) : null", returnByValue: true });
      if (result.value) {
        bench = JSON.parse(result.value);
        break;
      }
      await wait(50);
    }
    if (!bench) throw new Error(`${side} ${url}: ${READY_SELECTOR} never appeared within ${READY_TIMEOUT_MS} ms`);
    await wait(LCP_SETTLE_MS);
    const { result } = await s("Runtime.evaluate", { expression: "window.__bench.lcp", returnByValue: true });
    if (navStart === null) throw new Error(`${side} ${url}: no Document request seen, so bytes cannot be placed on the page clock`);

    const sinceNav = (t: number) => (t - navStart!) * 1000;
    const scripts = finished
      .filter((f) => requests.get(f.id)?.type === "Script")
      .map((f) => ({ url: requests.get(f.id)!.url, encoded: f.encoded, finishedMs: Math.round(sinceNav(f.at)) }));
    return {
      side,
      url,
      readyMs: Math.round(bench.ready!),
      idleMs: Math.round(bench.idle!),
      lcpMs: result.value === null ? null : Math.round(result.value),
      jsBytesBeforeReady: scripts.filter((x) => x.finishedMs <= bench!.ready!).reduce((a, x) => a + x.encoded, 0),
      jsBytesTotal: scripts.reduce((a, x) => a + x.encoded, 0),
      bytesTotal: finished.reduce((a, f) => a + f.encoded, 0),
      scripts,
      failedRequests,
      consoleErrors,
    };
  } finally {
    cdp.close();
    proc.kill("SIGKILL");
    await new Promise((r) => proc.once("exit", r));
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

const METRICS = ["readyMs", "idleMs", "lcpMs", "jsBytesBeforeReady", "jsBytesTotal", "bytesTotal"] as const;

type Stat = { median: number; min: number; max: number; n: number };

function stat(values: (number | null)[]): Stat {
  const v = values.filter((x): x is number => x !== null).sort((a, b) => a - b);
  const mid = v.length >> 1;
  return { median: v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2, min: v[0], max: v[v.length - 1], n: v.length };
}

const summarize = (rs: Run[]) => Object.fromEntries(METRICS.map((m) => [m, stat(rs.map((r) => r[m]))])) as Record<(typeof METRICS)[number], Stat>;

const results: Run[] = [];
for (let i = 0; i < runs; i++) {
  for (const [side, url] of [["A", urlA], ["B", urlB]] as const) {
    const r = await measure(side, url);
    results.push(r);
    console.error(`run ${i + 1}/${runs} ${side}: ready ${r.readyMs} ms, idle ${r.idleMs} ms, LCP ${r.lcpMs} ms, JS before ready ${r.jsBytesBeforeReady} B, failed ${r.failedRequests.length}, console errors ${r.consoleErrors.length}`);
  }
}

const summary = {
  conditions: { network: NETWORK, cpuRate: CPU_RATE, viewport: VIEWPORT, runs, readySelector: READY_SELECTOR },
  A: { url: urlA, ...summarize(results.filter((r) => r.side === "A")) },
  B: { url: urlB, ...summarize(results.filter((r) => r.side === "B")) },
  failedRequests: results.flatMap((r) => r.failedRequests.map((f) => `${r.side}: ${f}`)),
  consoleErrors: results.flatMap((r) => r.consoleErrors.map((e) => `${r.side}: ${e}`)),
};
const fmt = (s: Stat) => `${s.median} (${s.min}..${s.max}, n=${s.n})`;
console.log(`ready = ${READY_SELECTOR} in the DOM, idle = first task after that`);
console.log(`metric               A: median (range, n)              B: median (range, n)`);
for (const m of METRICS) console.log(`${m.padEnd(20)} ${fmt(summary.A[m]).padEnd(33)} ${fmt(summary.B[m])}`);
console.log(`failed requests: ${summary.failedRequests.length}${summary.failedRequests.map((f) => `\n  ${f}`).join("")}`);
console.log(`console errors: ${summary.consoleErrors.length}${summary.consoleErrors.map((e) => `\n  ${e}`).join("")}`);
if (outFile) {
  writeFileSync(outFile, JSON.stringify({ summary, runs: results }, null, 2));
  console.error(`raw runs written to ${outFile}`);
} else {
  console.log(JSON.stringify(results));
}
