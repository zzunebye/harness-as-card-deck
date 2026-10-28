This is Anthropic's official skills repository. It holds reference skills that show what the skills system can do, from creative work and web testing to MCP servers and internal comms. Anthropic provides them for demonstration and education.

### How a skill works

A skill is a folder with a `SKILL.md` file. Its frontmatter carries a `name` and a `description`. The agent reads only those two fields at startup. When a task matches the description, it loads the rest of the file.

This is progressive disclosure. The body gives the workflow. Bundled scripts, templates, and reference files load only when the workflow points to them. A skill stays cheap until it is used.

### Philosophy

Teach the agent a repeatable way to do one kind of task. Keep the instructions in a file anyone can read and edit. Let the description decide when the skill loads.

### Get started

```
/plugin marketplace add anthropics/skills
```

Then pick `example-skills` to install most of this deck. `claude-api`, `academy-guide`, and `discernment-nudge` install as their own plugins. After that, mention a skill by name or describe the task.

### In this deck

Every card is a skill. They are independent, so the cards have no links between them. The **Sprint** lens groups them into Build, Design, Write, and Meta.

The repo also ships `docx`, `pdf`, `pptx`, and `xlsx`. Those four are source-available, not open source, so this deck deliberately leaves them out.
