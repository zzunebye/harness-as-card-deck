Superpowers 是 [Jesse Vincent](https://blog.fsck.com/2025/10/09/superpowers/) 提出的编码 agent 开发方法。它由一组技能和一条启动指令组成，让 agent 在每个任务之前先寻找匹配的技能。一旦匹配，agent 必须遵循该技能的工作流程。

### 工作方式

agent 不会一上来就写代码。它走的是同一条流水线：

1. **brainstorming** 询问你想要什么，并整理成设计方案交给你批准。
2. **using-git-worktrees** 开出隔离的分支，并在任何改动之前确认测试通过。
3. **writing-plans** 把设计拆成 2 到 5 分钟的任务，每个任务都有确切的文件路径和检查方式。
4. **subagent-driven-development** 把每个任务交给全新的子 agent，并评审结果。
5. **test-driven-development** 要求 agent 先写一个失败的测试，并删除先于测试写出的代码。
6. **requesting-code-review** 在任务之间运行，遇到任何严重问题就停止工作。
7. **finishing-a-development-branch** 运行测试，并让你选择合并、创建 PR、保留或丢弃该分支。

agent 可以独自按已批准的计划工作几个小时。

### 理念

先写测试。遵循流程，而不是靠猜。保持代码简单。声称成功之前先验证。

### 开始使用

```
/plugin install superpowers@claude-plugins-official
```

技能会自动加载，所以你可以直接从一个普通的请求开始。

### 在这副牌中

每张卡片都是一个技能。**Sprint** 视图按流水线顺序排列它们。
