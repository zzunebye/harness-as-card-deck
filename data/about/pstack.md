**if you want to go fast, go deep first.** pstack is the skill set that [poteto](https://x.com/poteto), Lauren Tan of the React core team, uses to ship at Cursor. Its goal is less code of higher quality, so you can run many agents in parallel and trust each one.

### How it works

You start every rigorous task with one router, `/poteto-mode`. It reads the request, matches it to one of 23 playbooks such as bug fix, feature, investigation, babysit, or shipping, and copies that playbook's steps into a todo list. As each step fires, the router loads the skill the step needs. `how` and `why` investigate, `architect` and `arena` compare designs, `swarm` verifies, and `unslop` edits prose. Each decision names the principle behind it, such as *Laziness Protocol* or *Prove It Works*, so a reviewer can check the choice against that rule.

pstack splits work by model strength. Routine code goes to a fast code model. The hardest changes, prose, and judgment go to the strongest model.

### Get started

```
/plugin marketplace add cursor/plugins
/plugin install pstack@cursor-plugins
```

Run `/setup-pstack` once to pick models, then start a task with `/poteto-mode <task>`.

### In this deck

♠ is the router, ♥ are its playbooks, ♦ are the skills they call, ♣ are the principles they cite, and ★ are the subagents.
