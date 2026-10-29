import type { Messages } from "./en.tsx";

const ko: Messages = {
  topbar: {
    allDecks: "모든 덱",
    deck: "덱",
    lens: "보기 방식",
    language: "언어",
    viewSource: "GitHub에서 소스 보기",
    resizePanel: "패널 크기 조절",
    openSearch: "검색",
    closeSearch: "검색 닫기",
    menu: "더 보기",
    legend: "연결선 범례",
  },
  layers: { router: "라우터", playbook: "플레이북", skill: "스킬", principle: "원칙", agent: "에이전트" },
  lenses: { layer: "레이어", tree: "라우트 트리", sprint: "스프린트", scatter: "산점도" },
  lobby: {
    pickDeck: "덱을 고르세요!",
    cardCount: (n) => `카드 ${n}장`,
  },
  skills: {
    title: "스킬이란?",
    docsNav: "Claude 스킬 문서",
    intro: (
      <>
        스킬은 <code>SKILL.md</code> 파일이 들어 있는 폴더입니다. Claude는 스킬의 이름과 설명만 컨텍스트에 유지합니다. 요청이 설명과 맞으면 <code>SKILL.md</code> 본문을 읽고, 본문이 가리킬 때만 함께 들어 있는 파일을 읽습니다.
      </>
    ),
    links: {
      overview: "Agent Skills 개요",
      claudeCode: "Claude Code의 스킬",
      bestPractices: "작성 모범 사례",
      whatAre: "스킬이란?",
      repo: "anthropics/skills",
    },
  },
  search: {
    label: "카드 검색",
    placeholder: "카드 검색",
    empty: (query) => `“${query}”와 일치하는 카드가 없습니다.`,
  },
  crumbs: {
    path: "경로",
    read: "읽기 ▸",
    clear: "지우기",
  },
  toc: { label: "목차" },
  reading: { settings: "읽기 설정", size: "크기", font: "글꼴" },
  table: {
    cards: "카드 목록. 방향키로 카드 사이를 이동하고 Enter로 엽니다.",
    dealHint: "덱을 눌러 카드를 나눠 보세요",
    shuffling: "섞는 중…",
    dealDeck: "덱 나누기",
    zoom: "확대/축소",
    zoomIn: "확대",
    zoomOut: "축소",
    fit: "맞춤",
    inflow: "들어오는 선",
    outflow: "나가는 선",
  },
  card: {
    out: (n) => `OUT ${n}`,
    in: (n) => `IN ${n}`,
    routes: (n) => `라우트 ${n}개`,
    uses: (n) => `${n}개 사용`,
    reads: (n) => `${n}개 읽음`,
    citedBy: (n) => `${n}곳에서 인용`,
  },
  translation: {
    active: "AI 번역",
    banner: "이 글은 원문 SKILL.md를 AI가 기계 번역한 것입니다. 영어 원문이 기준이며 내용이 다를 수 있습니다.",
    viewOriginal: "원문 보기",
    notTranslated: "아직 번역되지 않았습니다. 영어 원문을 표시합니다.",
    footer: "표시된 본문은 영어 원문을 기계 번역한 것입니다.",
  },
  panel: {
    pickCard: "카드를 고르세요",
    pickCardIntro: (deckLabel) => (
      <>
        각 카드는 {deckLabel}의 실제 <code>SKILL.md</code>(또는 플레이북)입니다. 카드를 선택하면 연결된 카드가 덱에서 나오고, 원문을 여기서 읽을 수 있습니다.
        본문 속 참조는 칩으로 바뀝니다. 마우스를 올리면 보드에서 그 카드가 강조되고, 누르면 그 카드로 이동합니다.
      </>
    ),
    close: "닫기",
    language: "언어",
    copy: "복사",
    copied: "복사됨",
    copyCode: "코드 복사",
    loading: (path) => `${path} 불러오는 중…`,
    contentFrom: "출처",
    license: (name) => `${name} 라이선스`,
  },
};

export default ko;
