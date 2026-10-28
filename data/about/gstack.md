gstack turns Claude Code into an engineering team of slash commands. [Garry Tan](https://x.com/garrytan), President and CEO of Y Combinator, built it and uses it every day to ship code while running YC.

### How it works

Each skill plays one role, such as CEO, eng manager, designer, staff reviewer, QA lead, security officer, or release engineer. The skills run in the order of a sprint:

**Think → Plan → Build → Review → Test → Ship → Reflect**

Each step writes something the next step reads. `/office-hours` writes a design doc that `/plan-ceo-review` reads. `/plan-eng-review` writes a test plan that `/qa` picks up. `/review` finds bugs, and `/ship` checks that they are fixed. `/browse` drives a headless Chromium browser so `/qa` can click through the app and take screenshots. `/careful` warns before destructive commands, and `/freeze` blocks edits outside one directory.

### Get started

Clone the repo into `~/.claude/skills/gstack` and run `./setup`. Then try these in order:

1. Run `/office-hours` and describe what you're building.
2. Run `/plan-ceo-review` on a feature idea.
3. Run `/review` on a branch, then `/qa` on a staging URL.

### In this deck

Every card is a skill. The **Sprint** lens lays them out in sprint order.
