# 작업 계획: 중앙 정렬과 공통 Stack

상태: 구현 완료 · 후속 원격 검증은 [PR #18](https://github.com/cha2hyun/boilerplate/pull/18)에서 추적

> 아래 보류·미실행 기록은 각 기능 구현 당시의 결과입니다. 2026-11-04 후속 요청으로 Actions와 main 병합 절차를 재개했습니다. 최신 검증 결과와 최종 SHA는 연결된 PR에서 확인합니다.

## 문제와 완료 조건

KPI 비교 행의 배지와 설명이 `items-start` 때문에 어긋났다. 사용자가 최우선으로 강조한 같은 행의 세로 중앙 정렬을 기본값으로 보장하고, 직접 작성한 가로·세로 layout div를 HStack/VStack으로 통일한다.

## 구현 경계

- `shared/ui/stack`: 기존 cn·Tailwind·Radix Slot으로 구성한 HStack/VStack. 교차축 중앙 정렬을 기본으로, 페이지/폼은 명시적인 stretch로 처리한다.
- 앱·페이지·위젯·폼의 직접 행/열 묶음을 전환한다. 그리드와 shadcn 내부 구현, form/section/dl 등의 의미 구조는 유지한다.
- `asChild`에서는 기존 shadcn data-slot을 보존한다. 고정 높이 차트·활동 행은 shrink-0로 공간을 유지한다.
- 규칙의 단일 소유자는 `docs/design/layout.md`이며 AGENTS/README/아키텍처 문서는 해당 계약을 연결한다. ADR 005에 좁은 예외를 기록한다.
- 기존 아키텍처 검사에 layout div·Stack 기본 정렬 덮어쓰기 방지를 추가하고, 기존 캐시 E2E에 로딩/조회/캐시 재방문의 KPI 중심 검증을 통합한다. 별도 테스트 job이나 의존성은 추가하지 않는다.

## 검증 근거와 한계

- `pnpm check`: 포맷·ESLint·TypeScript·아키텍처·E2E 범주 검사 통과.
- 실행 중인 개발 서버에서 한국어·영어의 390px/921px/1440px KPI 네 행의 배지·설명 중심 차이 0px, 가로 넘침 없음 확인.
- 1280px 영문에서 설명이 두 줄(32px)로 표시되는 세 행도 중심 차이 0px 확인.
- Astra 6 xhigh 서브에이전트가 페이지·위젯 전환과 별도 읽기 전용 통합 리뷰를 수행했다. 슬롯 덮어쓰기 위험을 반영해 해결했다.
- 단위/가드레일/E2E 테스트 코드는 작성했으나 실행하지 않았다. production 빌드도 미실행이다. Actions·PR 생성·main 머지는 사용자가 마지막에 요청할 때까지 보류한다.
