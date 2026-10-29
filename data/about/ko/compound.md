Compound Engineering은 [Every](https://every.to)의 플러그인이며 Kieran Klaassen과 Trevin Chow가 관리합니다. 하나의 루프를 중심으로 만든 스킬 모음입니다. 브레인스토밍, 계획, 구현, 리뷰를 거친 뒤 배운 것을 기록해서, 다음 작업이 이전보다 쉽게 시작되게 합니다.

### 동작 방식

대부분의 스킬은 작업을 다음 스킬에 넘깁니다.

1. **ce-brainstorm**은 막연한 아이디어를 적당한 크기의 요구사항 문서로 바꿉니다.
2. **ce-plan**은 요구사항을 구조화된 계획으로 바꿉니다.
3. **ce-work**는 계획을 끝까지 실행하고, 격리가 필요하면 워크트리에서 실행합니다.
4. **ce-code-review**는 diff에서 버그, 회귀, 테스트, 표준을 검토합니다.
5. **ce-commit-push-pr**은 커밋하고 푸시하고 PR을 엽니다. **ce-babysit-pr**은 머지까지 이어 갑니다.
6. **ce-compound**는 해결한 문제를 저장소에 오래 남는 학습으로 기록합니다.

**lfg**는 요청 하나로 전체 체인을 사람 손 없이 실행합니다. **ce-compound-refresh**는 나중에 저장된 학습을 현재 코드와 대조해서, 학습이 낡지 않게 합니다.

### 철학

작업 단위마다 다음 작업을 더 쉽게 만들어야 합니다. 계획과 리뷰에 가장 많은 노력을 들이고, 교훈은 이후 실행이 읽을 수 있도록 저장소에 보관합니다.

### 시작하기

```
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering
```

그다음 아이디어에 `/ce-brainstorm`을, 작은 요청에 `/lfg`를 써 보세요.

### 이 덱에서는

모든 카드는 스킬입니다. 플러그인에는 스킬별 참조 에이전트도 들어 있습니다. 이름은 같은데 본문이 달라서 카드로 만들지 않았습니다. **스프린트** 보기는 스킬을 Think부터 Compound까지 배치합니다.
