# 작업 계획: 캐시·로딩·숫자 모션과 디자인 문서

상태: 구현·대상 검증 완료. 전체 회귀 검증은 PR의 Actions checks에서 확인한다.

## 완료 조건

- Overview, Analytics, Orders, Customers에 실제 fetch 기반 목업 응답을 연결하고 Query 캐시의 재사용·키 분리·무효화를 검증한다.
- TanStack 공식 `queryOptions`와 도메인별 계층 키를 사용한다. 초기 로딩과 성공 화면의 카드 외곽 크기를 동일하게 유지하고 캐시/백그라운드 갱신 시 스켈레톤으로 돌아가지 않는다.
- 데이터·캐시에서 표시하는 핵심 수치에 240ms 숫자 모션을 적용한다. 최대 300ms, reduced motion 즉시 표시, 최종 숫자 너비를 예약한다.
- 사이드바의 workspace 전환 블록을 제거하고 접힌 상태의 로고·메뉴·프로필 중심선을 맞춘다.
- shadcn과 기존 토큰/서체를 우선하는 Foundations 페이지와 주제별 AI 참조 문서를 제공한다. SEED 패키지를 설치하지 않고 개념만 참고한다.

## 변경 경계

- entities: 서버 응답 스키마, 쿼리 키/옵션, 목업 fixture.
- app: demo 전용 MSW 초기화와 핸들러, Foundations 경로/메타.
- pages/widgets: 데이터 상태를 보존하는 카드·표·차트와 사이드바 정렬.
- features/number-motion: 숫자 표시 동작. shadcn 컨트롤을 대체하는 primitive는 만들지 않는다.
- 문서: AGENTS는 짧은 진입 지침, 디자인/캐시/로딩·모션/검증은 각 소유 문서로 분리한다.
- 프로젝트 demo 저장 형식과 실제 API 모드의 데이터 소유권을 유지한다. Inbox는 클라이언트 샘플, Settings는 Zustand 설정으로 유지한다.

## 검증과 전달

1. Astra xhigh 에이전트가 데이터, 페이지 상태, 문서/Foundations를 병렬 작업한다.
2. 캐시 재사용/파라미터 키/취소와 숫자 모션 경계의 의미 있는 테스트를 추가한다.
3. 로컬은 정적 검사와 필요한 좁은 재현만 수행한다. 전체 단위/E2E는 production bundle을 공유하는 Actions에서 실행한다.
4. 카드 외곽 치수, 접힌 사이드바 정렬, cold/warm cache 수치 표시를 대상 화면/세 breakpoint에서 확인한다.
5. 기능 단위로 검증 후 커밋·푸시하고 PR에 실제 결과를 기록한다.

## 구현 결과

MSW 초기화 실패 화면과 API 모드의 mock 미실행을 구현했다. Query 옵션·취소·mutation 키를 함께 갱신했고 정적 worker/라이선스/배포 경로를 API 계약에 기록했다. 문서 지도와 주제별 소유 문서를 분리하고 로컬 산출물의 깨진 영구 링크를 제거했다.

숫자 모션 대상 검사, Overview production 캐시·카드 치수 검사와 정적 검사를 통과했다. Foundations 세 화면 구간 및 사이드바 중심선도 확인했다. 독립 리뷰의 네 지적을 수정했고 재검토는 9.2/10이다. 구체적인 검사 범위와 한계는 [리뷰 기록](../reviews/query-experience.md)에 남겼다. 전체 단위/E2E는 로컬에서 반복하지 않고 기존 2-job Actions에 맡긴다.
