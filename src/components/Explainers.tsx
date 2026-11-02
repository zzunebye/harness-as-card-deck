import type { ReactNode } from "react";
import { useT } from "../i18n/index.ts";

const DOCS = "https://platform.claude.com/docs/en/agents-and-tools/agent-skills";

type Explainer = {
  title: string;
  nav: string;
  intro: ReactNode;
  links: { label: string; href: string }[];
};

function useExplainers(): Explainer[] {
  const { harness, skills } = useT();
  return [
    {
      title: skills.title,
      nav: skills.docsNav,
      intro: skills.intro,
      links: [
        { label: skills.links.overview, href: `${DOCS}/overview` },
        { label: skills.links.claudeCode, href: "https://code.claude.com/docs/en/skills" },
        { label: skills.links.bestPractices, href: `${DOCS}/best-practices` },
        { label: skills.links.whatAre, href: "https://support.claude.com/en/articles/12512176-what-are-skills" },
        { label: skills.links.repo, href: "https://github.com/anthropics/skills" },
      ],
    },
    {
      title: harness.title,
      nav: harness.docsNav,
      intro: harness.intro,
      links: [
        { label: harness.links.howClaudeCodeWorks, href: "https://code.claude.com/docs/en/how-claude-code-works" },
        { label: harness.links.engineering, href: "https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html" },
        { label: harness.links.longRunning, href: "https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents" },
      ],
    },
  ];
}

function Body({ explainer }: { explainer: Explainer }) {
  return (
    <>
      <p>{explainer.intro}</p>
      <nav aria-label={explainer.nav}>
        {explainer.links.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ))}
      </nav>
    </>
  );
}

// Both variants stay in the DOM and CSS shows one: the aside on wide screens, the collapsed disclosures under the heading on tablet and below.
export function Explainers({ compact = false }: { compact?: boolean }) {
  const explainers = useExplainers();
  if (compact) {
    return (
      <div className="explainers-compact">
        {explainers.map((e) => (
          <details key={e.title} className="explainer">
            <summary>{e.title}</summary>
            <Body explainer={e} />
          </details>
        ))}
      </div>
    );
  }
  return (
    <aside className="explainers-wide">
      {explainers.map((e) => (
        <section key={e.title} className="explainer">
          <h3>{e.title}</h3>
          <Body explainer={e} />
        </section>
      ))}
    </aside>
  );
}
