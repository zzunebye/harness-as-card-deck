import { useT } from "../i18n/index.ts";

const DOCS = "https://platform.claude.com/docs/en/agents-and-tools/agent-skills";

const LINKS = [
  { key: "overview", href: `${DOCS}/overview` },
  { key: "claudeCode", href: "https://code.claude.com/docs/en/skills" },
  { key: "bestPractices", href: `${DOCS}/best-practices` },
  { key: "whatAre", href: "https://support.claude.com/en/articles/12512176-what-are-skills" },
  { key: "repo", href: "https://github.com/anthropics/skills" },
] as const;

function Body() {
  const t = useT();
  return (
    <>
      <p>{t.skills.intro}</p>
      <nav aria-label={t.skills.docsNav}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
            {t.skills.links[l.key]}
          </a>
        ))}
      </nav>
    </>
  );
}

// Both variants stay in the DOM and CSS shows one: the footer on wide screens, the collapsed disclosure under the heading on tablet and below.
export function SkillsFooter({ compact = false }: { compact?: boolean }) {
  const t = useT();
  if (compact) {
    return (
      <details className="skills-footer skills-compact">
        <summary>{t.skills.title}</summary>
        <Body />
      </details>
    );
  }
  return (
    <section className="skills-footer skills-wide">
      <h3>{t.skills.title}</h3>
      <Body />
    </section>
  );
}
