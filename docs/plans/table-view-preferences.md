# 작업 계획: 표의 열 배치와 읽기 간격 개인화

상태: 완료 (구현·로컬 검증, Actions 미조회)

## 문제와 완료 조건

- 사용자/상황: Projects·Orders·Customers에서 업무에 맞게 표를 읽는 사용자.
- 현재 동작: Projects의 임시 열 표시 선택과 Orders·Customers의 고정 열 배치만 제공한다.
- 변경 후 관찰 가능한 동작: 열 너비/순서/좌우 고정/표시와 세 가지 행 간격을 조절하고, 표별로 현재 브라우저에 복원하며 기본값으로 되돌린다. 헤더 드래그와 설정 대화상자의 키보드/터치 조작을 함께 제공한다.
- 범위에서 제외하는 항목: 계정 간 동기화, 서버 데이터 변경, Overview 요약 표 개인화, 새 UI 프레임워크.

## 확인한 근거

- 관련 파일/테스트/API 계약: `widgets/project-table`, `pages/orders`, `pages/customers`, `shared/ui/table`, `docs/url-state.md`, `e2e/projects.spec.ts`, `e2e/commerce.spec.ts`.
- 가정과 아직 확인할 점: UI 설정은 Zustand가 소유하고 기존 URL/Query 계약을 바꾸지 않는다. 동적 표 치수는 기존 shadcn Table에 한정한 style 예외와 ADR로 설명한다.
- 기존 변경과 충돌 가능성: 시작 시 작업 트리는 깨끗하며 기능 브랜치에서 작업한다.

## 변경 경계

- 영향 레이어/슬라이스: `features/table-view`가 환경 설정과 조작을 소유하고 세 표가 사용한다. 기존 `shared/ui/table`은 치수와 고정 위치만 표현한다.
- 공개 API/환경 변수/저장 형식 변경: `blueprint-table-views` v1, 표 ID별 레이아웃만 저장. Zod 검증 후 알려진 열 ID로 정규화한다.
- 오류/빈 상태/취소/접근성 처리: 저장소 실패 시 세션 유지, 손상/이전 형식은 기본값 복구, 열 추가/제거 대응, 필수 열 보존, 키보드 이동/너비 조절, 드래그 취소, 좁은 표에서 고정 열 겹침 방지. 동일한 헤더/열/밀도를 로딩과 데이터에 사용한다.
- 마이그레이션/롤백: 이전 저장 키와 독립적이다. 제거 시 기존 URL/데이터는 영향받지 않는다.

## 실행과 검증

1. 공통 모델/설정 UI/테이블 치수 구현 후 세 표에 연결한다.
2. 저장 복원·손상·열 변경·불가 저장을 단위 테스트로, 조작·복원·초기화·URL 유지·표 간 격리를 기존 E2E 범주로 다룬다.
3. 로컬 정적 검사 `pnpm check`를 실행한다.
4. 로컬 전체 테스트는 실행하지 않는다. 확인된 입력 취소·초점 문제는 해당 컴포넌트/행동만 재현한다. 주문 표의 의도된 시각 변경은 production build 하나와 CI와 같은 Linux 브라우저 이미지로 해당 표본만 비교하고, 검토한 actual만 기준에 반영한다.
5. 페이지 명세·URL 상태·아키텍처·동적 치수 ADR을 갱신한다.

## 완료 기록

- 실제 변경 동작: 세 표의 보기 설정·헤더 이동/너비 조절·표별 브라우저 복원과 초기화 완료. 모바일은 설정 창으로 조작하며, 고정 열이 스크롤 영역을 가리면 고정을 잠시 중단한다. 입력 초안 Escape 취소, 키보드 이동 후 초점, Overview 독립성을 보존했다.
- 실행한 명령과 결과:
  - `pnpm check`: 포맷/린트/타입/아키텍처/테스트 범주/기획/문서/브라우저 이미지 검사 통과.
  - 선택 단위 검사: table-view 모델/저장소 20개, 설정 UI 5개, 기존 Projects 정렬/URL 페이지 2개 통과. 실제 발견한 Escape·초점·ResizeObserver 환경 문제만 좁혀 검증했다.
  - `pnpm exec node --test --test-name-pattern='table geometry' scripts/check-architecture.test.mjs`: 전용 가드레일 4개 통과.
  - 시각 변경 재현용 `pnpm build`와 `pnpm check:bundle-budget` 통과. 초기 JS 850,605 bytes / gzip 272,718 bytes로 기존 예산을 유지했다.
  - CI와 같은 Playwright Noble `linux/amd64` 이미지에서 선택한 Projects/Commerce 보기 변경·드래그·키보드·모바일 식별 열 동작 8개 통과, 해당 화면에 적용되지 않는 4개 skip. 전체 suite는 실행하지 않았다.
  - 주문 태블릿 이미지 차이는 expected/actual/diff 검토 후 기준 갱신, 같은 Linux 환경에서 해당 이미지 비교 1개 통과. 자세한 변경 범위는 [시각 기준 기록](../design/visual-regression.md)에 남겼다.
  - 시작·완료 시 열린 Dependabot PR 및 보안 알림 각각 0건. 원격 main `c9d6a77d2e55cc9a3f5210b9344a36d8b0f84234` 확인.
- Actions 실행 결과 또는 미실행 사유: 사용자가 조회를 요청하지 않았으므로 조회/대기하지 않는다.
- 남은 제약: 서버 사용자 계정 동기화는 제공하지 않는다.
