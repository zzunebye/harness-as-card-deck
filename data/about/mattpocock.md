Skills For Real Engineers is the set of agent skills [Matt Pocock](https://www.aihero.dev) says he uses every day. It sets itself against frameworks that own your process. These skills stay small and composable, so you keep control and can edit them.

### How it works

Most work runs along one main flow, from idea to ship.

1. **grill-with-docs** sharpens the idea by interview and records what it learns in a glossary and ADRs.
2. **to-spec** turns the conversation into a spec, for a build that spans several sessions.
3. **to-tickets** splits the spec into tracer-bullet tickets with blocking edges.
4. **implement** works one ticket, or **implement-spec** runs the whole spec with parallel subagents. Both drive **tdd** and close with **code-review**.
5. **retro** looks back over the session and changes the agent's environment, not the code.

Other work merges onto that flow: **triage** for incoming issues, and **wayfinder** for an effort too big and foggy for one session. **ask-matt** is the router: ask it which skill fits your situation.

### Philosophy

The most common failure is misalignment between you and the agent, so the skills start with a grilling session and a shared language. Skills stay short and call each other, and many are only a few lines. The small ones lean on **grilling**, the interview primitive underneath them.

### Get started

```
claude plugin install mattpocock-skills@claude-plugins-official
```

Run `/setup-matt-pocock-skills` once per repo to configure the issue tracker, triage labels, and doc layout. Then try `/grill-with-docs` on your next change, or `/ask-matt` if you are not sure where to start.

### In this deck

Every card is a skill from the plugin's list, and **ask-matt** is the router. The frozen `misc/` and unfinished `in-progress/` skills are not cards. The **Sprint** lens lays the skills out from Sharpen to Improve, with the vocabulary and setup skills beside them.
