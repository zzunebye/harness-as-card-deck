这是 Anthropic 官方的技能仓库。其中的参考技能展示了技能系统能做什么，涵盖创意工作、网页测试、MCP 服务器和内部沟通等。Anthropic 提供它们用于演示和教学。

### 技能如何工作

技能是一个包含 `SKILL.md` 文件的文件夹。文件的 frontmatter 带有 `name` 和 `description`。agent 启动时只读取这两个字段。当任务与描述匹配时，它才会加载文件的其余部分。

这就是渐进式披露。正文给出工作流程。附带的脚本、模板和参考文件只在工作流程指向它们时才加载。技能在被使用之前几乎没有成本。

### 理念

教会 agent 以可重复的方式完成某一类任务。把指令放在任何人都能阅读和编辑的文件里。由描述来决定技能何时加载。

### 开始使用

```
/plugin marketplace add anthropics/skills
```

然后选择 `example-skills`，即可安装这副牌中的大部分技能。`claude-api`、`academy-guide` 和 `discernment-nudge` 作为独立插件安装。之后，直接提到技能名称或描述你的任务即可。

### 在这副牌中

每张卡片都是一个技能。它们彼此独立，所以卡片之间没有连线。**Sprint** 视图把它们分为 Build、Design、Write 和 Meta 四组。

仓库还提供 `docx`、`pdf`、`pptx` 和 `xlsx`。这四个是源码可见而非开源的，所以这副牌有意不收录它们。
