import type { Messages } from "./en.tsx";

const ja: Messages = {
  topbar: {
    allDecks: "すべてのデッキ",
    deck: "デッキ",
    lens: "ビュー",
    language: "言語",
    viewSource: "GitHub でソースを見る",
    resizePanel: "パネルの幅を調整",
    openSearch: "検索",
    closeSearch: "検索を閉じる",
    menu: "その他",
    legend: "エッジの凡例",
  },
  layers: { router: "ルーター", playbook: "プレイブック", skill: "スキル", principle: "原則", agent: "エージェント" },
  lenses: { layer: "レイヤー", tree: "ルートツリー", sprint: "スプリント", scatter: "散布図" },
  lobby: {
    pickDeck: "デッキを選ぼう！",
    cardCount: (n) => `カード ${n} 枚`,
  },
  harness: {
    title: "ハーネスとは？",
    docsNav: "ハーネスの参考資料",
    intro: "ハーネスとは、AI エージェントからモデルを除いたすべてです。ツールを提供し、モデルが目にするコンテキストを管理します。Claude Code がその一例です。このページのデッキは外側のハーネスで、コーディングエージェントに導入すると働き方が変わります。各デッキはスキルの集まりで、プレイブックやサブエージェントを含むものもあります。",
    links: {
      howClaudeCodeWorks: "Claude Code のしくみ",
      engineering: "コーディングエージェント利用者のためのハーネスエンジニアリング",
      longRunning: "長時間稼働するエージェントのための効果的なハーネス",
    },
  },
  skills: {
    title: "スキルとは？",
    docsNav: "Claude スキルのドキュメント",
    intro: (
      <>
        スキルとは、<code>SKILL.md</code> ファイルを含むフォルダです。Claude がコンテキストに常駐させるのはスキルの名前と説明だけです。依頼が説明に合致したときに初めて <code>SKILL.md</code> の本文を読み、同梱ファイルは本文が指したときだけ読みます。
      </>
    ),
    links: {
      overview: "Agent Skills の概要",
      claudeCode: "Claude Code のスキル",
      bestPractices: "作成のベストプラクティス",
      whatAre: "スキルとは？",
      repo: "anthropics/skills",
    },
  },
  search: {
    label: "カードを検索",
    placeholder: "カードを検索",
    empty: (query) => `「${query}」に一致するカードはありません。`,
  },
  crumbs: {
    path: "パス",
    read: "読む ▸",
    clear: "クリア",
    back: "前のカードへ戻る",
  },
  toc: { label: "目次" },
  reading: { settings: "読書設定", size: "文字サイズ", font: "フォント" },
  table: {
    cards: "カード一覧。矢印キーでカード間を移動し、Enter で開きます。",
    dealHint: "デッキをクリックして配る",
    shuffling: "シャッフル中…",
    dealDeck: "配る",
    zoom: "ズーム",
    zoomIn: "拡大",
    zoomOut: "縮小",
    fit: "全体表示",
    inflow: "In",
    inflowLabel: "流入",
    outflow: "Out",
    outflowLabel: "流出",
  },
  flow: {
    heading: "リクエストの例",
    prev: "前のステップ",
    next: "次のステップ",
    step: (n, total) => `ステップ ${n} / ${total}`,
    close: "例を閉じる",
    details: "カードを読む",
    disclaimer: "リクエストがどう流れるかの一例です。実際のエージェントは別の経路をたどることがあります。",
  },
  card: {
    out: (n) => `OUT ${n}`,
    in: (n) => `IN ${n}`,
    routes: (n) => `ルート ${n}`,
    uses: (n) => `利用 ${n}`,
    reads: (n) => `参照 ${n}`,
    citedBy: (n) => `被引用 ${n}`,
  },
  translation: {
    active: "AI 翻訳",
    banner: "SKILL.md 原文の AI による機械翻訳です。正確さは英語の原文を基準にしてください。内容に差異がある場合があります。",
    viewOriginal: "原文を見る",
    notTranslated: "まだ翻訳されていないため、英語の原文を表示しています。",
    footer: "表示している本文は英語原文の機械翻訳です。",
  },
  panel: {
    pickCard: "カードを選んでください",
    pickCardIntro: (deckLabel) => (
      <>
        どのカードも {deckLabel} の実際の <code>SKILL.md</code>（またはプレイブック）です。1 枚選ぶと、つながっているカードがデッキから引き出され、ここで原文を読めます。
        本文中の参照はチップになります。ホバーするとテーブル上の該当カードが見つかり、クリックで移動できます。
      </>
    ),
    close: "閉じる",
    language: "言語",
    copy: "コピー",
    copied: "コピーしました",
    copyCode: "コードをコピー",
    loading: (path) => `${path} を読み込み中…`,
    contentFrom: "出典",
    license: (name) => `${name} ライセンス`,
  },
};

export default ja;
