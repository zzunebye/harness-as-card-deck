Compound Engineering is a plugin from [Every](https://every.to), maintained by Kieran Klaassen and Trevin Chow. It is a set of skills built around one loop: brainstorm, plan, build, review, then write down what you learned so the next piece of work starts easier than the last.

### How it works

Most skills hand work to the next one.

1. **ce-brainstorm** turns a vague idea into a right-sized requirements document.
2. **ce-plan** turns the requirements into a structured plan.
3. **ce-work** executes the plan end to end, in a worktree if you want isolation.
4. **ce-code-review** reviews the diff for bugs, regressions, tests, and standards.
5. **ce-commit-push-pr** commits, pushes, and opens the PR. **ce-babysit-pr** carries it to merge.
6. **ce-compound** records the solved problem as a durable learning in the repo.

**lfg** runs the whole chain hands-off from one request. **ce-compound-refresh** later checks the saved learnings against the current code, so they don't go stale.

### Philosophy

Each unit of work should make the next one easier. Planning and review get the most effort, and the lessons are kept in the repo where later runs can read them.

### Get started

```
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering
```

Then try `/ce-brainstorm` on an idea, or `/lfg` on a small request.

### In this deck

Every card is a skill. The plugin also ships per-skill reference agents. Their names repeat with different bodies, so they are not cards. The **Sprint** lens lays the skills out from Think to Compound.
