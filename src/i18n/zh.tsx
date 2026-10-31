import type { Messages } from "./en.tsx";

const zh: Messages = {
  topbar: {
    allDecks: "所有牌组",
    deck: "牌组",
    lens: "视图",
    language: "语言",
    viewSource: "在 GitHub 上查看源码",
    resizePanel: "调整面板大小",
    openSearch: "搜索",
    closeSearch: "关闭搜索",
    menu: "更多",
    legend: "连线图例",
  },
  layers: { router: "路由器", playbook: "Playbook", skill: "技能", principle: "原则", agent: "Agent" },
  lenses: { layer: "分层", tree: "路由树", sprint: "冲刺", scatter: "散布" },
  lobby: {
    pickDeck: "选一副牌！",
    cardCount: (n) => `${n} 张卡片`,
  },
  skills: {
    title: "什么是技能？",
    docsNav: "Claude 技能文档",
    intro: (
      <>
        技能是包含 <code>SKILL.md</code> 文件的文件夹。Claude 只在上下文中保留技能的名称和描述。当请求与描述匹配时，Claude 才会读取 <code>SKILL.md</code> 正文，只有正文指向时才会读取随附文件。
      </>
    ),
    links: {
      overview: "Agent Skills 概览",
      claudeCode: "Claude Code 中的技能",
      bestPractices: "编写最佳实践",
      whatAre: "什么是技能？",
      repo: "anthropics/skills",
    },
  },
  search: {
    label: "搜索卡片",
    placeholder: "搜索卡片",
    empty: (query) => `没有与“${query}”匹配的卡片。`,
  },
  crumbs: {
    path: "路径",
    read: "阅读 ▸",
    clear: "清除",
    back: "返回上一张卡片",
  },
  toc: { label: "目录" },
  reading: { settings: "阅读设置", size: "字号", font: "字体" },
  table: {
    cards: "卡片列表。用方向键在卡片间移动，按 Enter 打开。",
    dealHint: "点击牌组开始发牌",
    shuffling: "洗牌中…",
    dealDeck: "发牌",
    zoom: "缩放",
    zoomIn: "放大",
    zoomOut: "缩小",
    fit: "适应",
    inflow: "In",
    inflowLabel: "流入",
    outflow: "Out",
    outflowLabel: "流出",
  },
  flow: {
    heading: "示例请求",
    prev: "上一步",
    next: "下一步",
    step: (n, total) => `第 ${n} 步，共 ${total} 步`,
    close: "退出示例",
    details: "阅读卡片",
    disclaimer: "这只是请求流转方式的一个示例，实际的智能体可能走不同的路径。",
  },
  card: {
    out: (n) => `OUT ${n}`,
    in: (n) => `IN ${n}`,
    routes: (n) => `${n} 条路由`,
    uses: (n) => `使用 ${n}`,
    reads: (n) => `读取 ${n}`,
    citedBy: (n) => `${n} 处引用`,
  },
  translation: {
    active: "AI 翻译",
    banner: "这是对 SKILL.md 原文的 AI 机器翻译。以英文原文为准，内容可能有出入。",
    viewOriginal: "查看原文",
    notTranslated: "尚未翻译，显示英文原文。",
    footer: "所示正文是对英文原文的机器翻译。",
  },
  panel: {
    pickCard: "选一张卡片",
    pickCardIntro: (deckLabel) => (
      <>
        每张卡片都是 {deckLabel} 中真实的 <code>SKILL.md</code>（或 playbook）。选中一张，就会把与它相连的卡片从牌组中抽出来，并在这里阅读原文。
        正文中的引用会变成标签：悬停可在牌桌上找到对应卡片，点击即可跳转。
      </>
    ),
    close: "关闭",
    language: "语言",
    copy: "复制",
    copied: "已复制",
    copyCode: "复制代码",
    loading: (path) => `正在加载 ${path}…`,
    contentFrom: "内容来自",
    license: (name) => `${name} 许可证`,
  },
};

export default zh;
