**想快，先深入。** pstack 是 React 核心团队成员 Lauren Tan（[poteto](https://x.com/poteto)）在 Cursor 交付代码时使用的一套技能。它的目标是用更少的代码换取更高的质量，这样你就能并行运行多个 agent，并信任其中每一个。

### 工作方式

每个需要严谨对待的任务都从一个路由器 `/poteto-mode` 开始。它读取请求，把它匹配到 23 个 playbook 之一，例如 bug 修复、功能开发、调查、babysit 或 shipping，然后把该 playbook 的步骤复制成待办清单。每个步骤触发时，路由器会加载这一步所需的技能。`how` 和 `why` 负责调查，`architect` 和 `arena` 负责比较设计，`swarm` 负责验证，`unslop` 负责润色文字。每个决策都会注明所依据的原则，例如 *Laziness Protocol* 或 *Prove It Works*，评审者可以对照这条规则检查这个选择。

pstack 按模型的强项分配工作。常规代码交给快速的代码模型，最难的改动、写作和判断交给最强的模型。

### 开始使用

```
/plugin marketplace add cursor/plugins
/plugin install pstack@cursor-plugins
```

先运行一次 `/setup-pstack` 选择模型，然后用 `/poteto-mode <task>` 开始任务。

### 在这副牌中

♠ 是路由器，♥ 是它的 playbook，♦ 是 playbook 调用的技能，♣ 是技能引用的原则，★ 是子 agent。
