# 작업 계획: 텍스트 링크 규칙과 푸터

상태: 구현·정적 검사·화면 확인 완료, Actions·PR·main 머지 보류

## 문제와 완료 조건

- 컴포넌트 구현 전에 [텍스트 링크 규칙](../design/text-links.md)을 정의한다.
- 기존 shadcn 조합으로 공통 TextLink와 typed RouterTextLink를 제공한다.
- 외부 origin은 항상 새 탭, 내부 경로는 기본 현재 탭으로 탐색한다. 밑줄·우측 위 화살표·키보드 초점·새 탭 설명을 공통 적용한다.
- 푸터 왼쪽에 cha2hyun 제작자 문구, 오른쪽에 프로젝트 GitHub 링크를 표시한다.

## 변경 경계

- `shared/lib`: URL/target/rel 계약. `shared/ui`: shadcn anchor 조합. `shared/lib/i18n`: 새 탭 설명.
- `widgets/app-shell`: 푸터 문구와 정렬. Components에 API 사용 예제를 제공한다.
- 기존 UI 금지 규칙의 예외는 이 조합만 허용하며 ADR과 주제별 문서에서 연결한다.
- 새 의존성·일반 CSS·상태 저장·서버 API를 추가하지 않는다.

## 검증과 완료

- 의미 있는 URL·접근성·Router 계약 테스트를 작성하고 기존 workspace E2E에 푸터 검증을 통합한다.
- 로컬은 `pnpm check`와 꼭 필요한 좁은 재현만 수행한다. 전체 테스트·빌드는 실행하지 않는다.
- 최신 사용자 지시에 따라 Actions·PR 생성·main 머지는 사용자가 마지막에 요청할 때까지 보류한다. 작업 브랜치의 기능 커밋·푸시는 유지한다.

## 완료 근거

- 규칙을 `d1d7263`으로 먼저 커밋한 뒤 TextLink/RouterTextLink, 공통 푸터, Components 사용 예제를 구현했다.
- `pnpm check`의 포맷·ESLint·타입·아키텍처·E2E 범주 정적 검사가 통과했다.
- 실행 중인 개발 서버에서 390px·768px·1440px 푸터의 좌우 배치, 세로 중심, 가로 넘침과 링크 가림 여부를 확인했다. 내부 프로젝트 링크 이동과 새 탭 target도 확인했다.
- 개발 도구의 기본 위치를 `middle-right`로 옮겨 푸터와 겹치지 않게 했다. 이미 저장한 개발 도구 위치는 해당 도구의 설정이 우선하므로 검증 브라우저에서도 Trigger Position을 Middle Right로 변경했다.
- URL 정책·접근성·실제 Router 연결의 계약 테스트와 기존 workspace E2E의 푸터 검증을 작성했다. 이번 작업에서 단위/E2E 테스트와 production 빌드는 실행하지 않았다.
- Astra 6 xhigh 서브에이전트의 구현·테스트·문서 리뷰에서 차단할 결함이 발견되지 않았다. Actions 검증은 미실행 상태다.
