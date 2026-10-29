gstack은 Claude Code를 슬래시 명령으로 이루어진 엔지니어링 팀으로 바꿉니다. Y Combinator 사장 겸 CEO인 [Garry Tan](https://x.com/garrytan)이 만들었고, YC를 운영하면서 매일 이것으로 코드를 배포합니다.

### 동작 방식

각 스킬은 CEO, 엔지니어링 매니저, 디자이너, 시니어 리뷰어, QA 리드, 보안 책임자, 릴리스 엔지니어 같은 역할 하나를 맡습니다. 스킬은 스프린트 순서대로 실행됩니다.

**Think → Plan → Build → Review → Test → Ship → Reflect**

각 단계는 다음 단계가 읽을 결과물을 남깁니다. `/office-hours`는 `/plan-ceo-review`가 읽는 설계 문서를 쓰고, `/plan-eng-review`는 `/qa`가 가져가는 테스트 계획을 씁니다. `/review`는 버그를 찾고, `/ship`은 그 버그가 고쳐졌는지 확인합니다. `/browse`는 헤드리스 Chromium 브라우저를 조작해서 `/qa`가 앱을 직접 눌러 보고 스크린샷을 찍게 합니다. `/careful`은 파괴적인 명령 전에 경고하고, `/freeze`는 한 디렉터리 밖의 편집을 막습니다.

### 시작하기

저장소를 `~/.claude/skills/gstack`에 클론하고 `./setup`을 실행합니다. 그다음 아래 순서로 써 보세요.

1. `/office-hours`를 실행하고 만들고 있는 것을 설명합니다.
2. 기능 아이디어에 `/plan-ceo-review`를 실행합니다.
3. 브랜치에 `/review`를 실행하고, 스테이징 URL에 `/qa`를 실행합니다.

### 이 덱에서는

모든 카드는 스킬입니다. **스프린트** 보기는 스킬을 스프린트 순서로 배치합니다.
