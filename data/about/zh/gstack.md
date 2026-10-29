gstack 把 Claude Code 变成一支由斜杠命令组成的工程团队。它由 Y Combinator 总裁兼 CEO [Garry Tan](https://x.com/garrytan) 打造，他在管理 YC 的同时每天用它交付代码。

### 工作方式

每个技能扮演一个角色，例如 CEO、工程经理、设计师、资深评审、QA 负责人、安全官或发布工程师。技能按冲刺的顺序运行：

**Think → Plan → Build → Review → Test → Ship → Reflect**

每一步都会写出下一步要读的内容。`/office-hours` 写出设计文档，供 `/plan-ceo-review` 读取。`/plan-eng-review` 写出测试计划，由 `/qa` 接手。`/review` 找出 bug，`/ship` 检查它们是否已修复。`/browse` 驱动无头 Chromium 浏览器，让 `/qa` 能点击应用并截图。`/careful` 在执行破坏性命令前发出警告，`/freeze` 阻止对某个目录之外的编辑。

### 开始使用

把仓库克隆到 `~/.claude/skills/gstack` 并运行 `./setup`。然后按顺序试试这些：

1. 运行 `/office-hours`，描述你正在构建的东西。
2. 对一个功能想法运行 `/plan-ceo-review`。
3. 对一个分支运行 `/review`，再对预发布环境的 URL 运行 `/qa`。

### 在这副牌中

每张卡片都是一个技能。**Sprint** 视图按冲刺顺序排列它们。
