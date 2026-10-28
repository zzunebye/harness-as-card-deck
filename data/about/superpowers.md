Superpowers is a development method for coding agents by [Jesse Vincent](https://blog.fsck.com/2025/10/09/superpowers/). It is a set of skills plus a startup instruction that makes the agent look for a matching skill before every task. When a skill matches, the agent must follow its workflow.

### How it works

The agent doesn't start by writing code. It runs one pipeline:

1. **brainstorming** asks what you want and writes it up as a design for you to approve.
2. **using-git-worktrees** opens an isolated branch and confirms the tests pass before any change.
3. **writing-plans** breaks the design into 2 to 5 minute tasks, each with exact file paths and a check.
4. **subagent-driven-development** hands each task to a fresh subagent and reviews the result.
5. **test-driven-development** makes the agent write a failing test first, and deletes code written before its test.
6. **requesting-code-review** runs between tasks and stops work on any critical issue.
7. **finishing-a-development-branch** runs the tests and offers to merge, open a PR, keep, or discard the branch.

An agent can work through an approved plan alone for a couple of hours.

### Philosophy

Write the test first. Follow a process instead of guessing. Keep the code simple. Verify before you claim success.

### Get started

```
/plugin install superpowers@claude-plugins-official
```

The skills load on their own, so you can start with a normal request.

### In this deck

Every card is a skill. The **Sprint** lens lays them out in pipeline order.
