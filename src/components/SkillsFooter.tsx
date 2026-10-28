const DOCS = "https://platform.claude.com/docs/en/agents-and-tools/agent-skills";

const LINKS = [
  { label: "Agent Skills overview", href: `${DOCS}/overview` },
  { label: "Skills in Claude Code", href: "https://code.claude.com/docs/en/skills" },
  { label: "Authoring best practices", href: `${DOCS}/best-practices` },
  { label: "What are Skills?", href: "https://support.claude.com/en/articles/12512176-what-are-skills" },
  { label: "anthropics/skills", href: "https://github.com/anthropics/skills" },
];

function Body() {
  return (
    <>
      <p>
        A skill is a folder with a <code>SKILL.md</code> file. Claude keeps only the skill's name and description in context. When a request matches the description, Claude reads the <code>SKILL.md</code> body, and it reads bundled files only if the body points to them.
      </p>
      <nav aria-label="Claude skills documentation">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ))}
      </nav>
    </>
  );
}

// Both variants stay in the DOM and CSS shows one: the footer on wide screens, the collapsed disclosure under the heading on tablet and below.
export function SkillsFooter({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <details className="skills-footer skills-compact">
        <summary>What is a skill?</summary>
        <Body />
      </details>
    );
  }
  return (
    <section className="skills-footer skills-wide">
      <Body />
    </section>
  );
}
