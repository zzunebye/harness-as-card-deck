Skills For Real Engineers 是 [Matt Pocock](https://www.aihero.dev) 自述每天都在使用的一组 agent 技能。它与那些接管整个流程的框架相反：技能保持小巧、易于组合，控制权留在你手里，你也可以直接修改它们。

### 工作方式

大多数工作沿着一条从想法到发布的主流程进行。

1. **grill-with-docs** 通过访谈打磨想法，并把了解到的内容记录到术语表和 ADR 中。
2. **to-spec** 在工作跨越多个会话时，把对话变成规格说明。
3. **to-tickets** 把规格说明拆分成标明阻塞关系的 tracer-bullet 工单。
4. **implement** 处理单个工单，**implement-spec** 则用并行 subagent 执行整份规格说明。两者都由 **tdd** 驱动，并以 **code-review** 收尾。
5. **retro** 回顾会话，并修改 agent 的环境，而不是代码。

其他工作也会汇入这条流程：**triage** 处理外部进来的 issue，**wayfinder** 处理大到一个会话装不下、方向也不明确的工作。**ask-matt** 是路由器，可以问它哪个技能适合你的情况。

### 理念

最常见的失败是你和 agent 之间的理解不一致，所以这些技能从一场追问式访谈和一套共同语言开始。技能保持简短并相互调用，其中很多只有几行。小技能依赖其下层的访谈基础技能 **grilling**。

### 开始使用

```
claude plugin install mattpocock-skills@claude-plugins-official
```

在每个仓库运行一次 `/setup-matt-pocock-skills`，配置 issue 跟踪器、triage 标签和文档结构。然后在下一次改动时试试 `/grill-with-docs`；如果不确定从哪里开始，可以试试 `/ask-matt`。

### 在这副牌中

每张卡片都是插件列表中的一个技能，**ask-matt** 是路由器。已冻结的 `misc/` 和未完成的 `in-progress/` 技能不作为卡片。**Sprint** 视图把技能从 Sharpen 排到 Improve，术语和设置类技能放在旁边。
