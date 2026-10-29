**빠르게 가려면 먼저 깊이 들어가라.** pstack은 React 코어 팀의 Lauren Tan([poteto](https://x.com/poteto))이 Cursor에서 코드를 배포할 때 쓰는 스킬 모음입니다. 목표는 더 적은 코드로 더 높은 품질을 내는 것입니다. 그래야 에이전트를 여러 개 병렬로 돌리면서 각각을 믿을 수 있습니다.

### 동작 방식

엄밀하게 다뤄야 할 작업은 모두 라우터 하나, `/poteto-mode`로 시작합니다. 라우터는 요청을 읽고 버그 수정, 기능 개발, 조사, PR 머지 준비(babysit), 배포(shipping) 같은 23개 플레이북 중 하나에 맞춘 뒤, 그 플레이북의 단계를 할 일 목록으로 복사합니다. 단계가 실행될 때마다 라우터는 그 단계에 필요한 스킬을 불러옵니다. `how`와 `why`는 조사하고, `architect`와 `arena`는 설계를 비교하고, `swarm`은 검증하고, `unslop`은 글을 다듬습니다. 각 결정에는 *Laziness Protocol*이나 *Prove It Works* 같은 근거 원칙이 붙어서, 리뷰어가 그 규칙과 대조해 선택을 확인할 수 있습니다.

pstack은 모델의 강점에 따라 작업을 나눕니다. 반복적인 코드는 빠른 코드 모델에 맡기고, 가장 어려운 변경과 글쓰기, 판단은 가장 강한 모델에 맡깁니다.

### 시작하기

```
/plugin marketplace add cursor/plugins
/plugin install pstack@cursor-plugins
```

`/setup-pstack`을 한 번 실행해 모델을 고른 다음, `/poteto-mode <작업>`으로 작업을 시작하세요.

### 이 덱에서는

♠는 라우터, ♥는 라우터의 플레이북, ♦는 플레이북이 부르는 스킬, ♣는 스킬이 인용하는 원칙, ★는 서브에이전트입니다.
