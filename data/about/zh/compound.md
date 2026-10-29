Compound Engineering 是 [Every](https://every.to) 出品的插件，由 Kieran Klaassen 和 Trevin Chow 维护。它是一组围绕同一个循环构建的技能：头脑风暴、规划、构建、评审，最后记下所学，让下一项工作比上一项更容易开始。

### 工作方式

大多数技能会把工作交给下一个技能。

1. **ce-brainstorm** 把模糊的想法变成大小合适的需求文档。
2. **ce-plan** 把需求变成结构化的计划。
3. **ce-work** 端到端执行计划，需要隔离时可在 worktree 中进行。
4. **ce-code-review** 评审 diff，检查 bug、回归、测试和规范。
5. **ce-commit-push-pr** 负责提交、推送并创建 PR。**ce-babysit-pr** 负责把它推进到合并。
6. **ce-compound** 把已解决的问题记录为仓库中长期保存的经验。

**lfg** 从一个请求出发，无需人工介入，跑完整条链路。**ce-compound-refresh** 随后会对照当前代码检查已保存的经验，避免它们过时。

### 理念

每一项工作都应让下一项更容易。规划和评审投入最多精力，所学经验保存在仓库里，供之后的运行读取。

### 开始使用

```
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering
```

然后可以对一个想法试试 `/ce-brainstorm`，或对一个小请求试试 `/lfg`。

### 在这副牌中

每张卡片都是一个技能。插件还附带按技能划分的参考 agent。它们的名称重复而内容不同，所以不作为卡片。**Sprint** 视图把技能从 Think 排到 Compound。
