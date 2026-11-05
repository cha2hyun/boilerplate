# 작업 계획: 모바일 초기 실행 비용 줄이기

상태: 진행

## 문제와 완료 조건

- 사용자/상황: 관리자 blueprint의 후속 모바일 성능 최적화 요청.
- 현재 동작: 최근 Actions Lighthouse에서 Overview/Projects의 simulated TBT가 약 1초다. 숫자 모션에서 formatter 조회와 정적 예약 DOM 조합을 반복하고, 일부 라우트는 분리된 작은 wrapper에서 실제 페이지를 main 번들로 역수입한다.
- 변경 후 관찰 가능한 동작: 같은 표시·조회·편집·모션 계약을 유지하면서 포맷 계산과 불필요한 초기 코드 실행을 줄인다. 같은 기준의 production artifact와 Lighthouse에서 원인별 전후를 확인한다.
- 범위에서 제외하는 항목: 기능 숨김, 데이터 지연, 모션 비활성화, 라이브러리 교체, 백엔드·배포, 서버 페이지네이션.

## 확인한 근거

- 관련 파일/테스트/API 계약: `7758183`의 CI production artifact, CDP CPU profile, `shared/lib/format`, `shared/lib/i18n/use-formatters`, `features/number-motion`, 앱 라우트/페이지 공개 API, Lighthouse workflow.
- 가정과 아직 확인할 점: Lighthouse simulated 지표와 raw CPU 관측값을 구분한다. 로컬 CPU profile은 병목 조사이며 GitHub runner 점수와 직접 비교하지 않는다. 기존 LCP 요소는 페이지 설명문이라 데이터 준비 시점도 함께 확인한다.
- 기존 변경과 충돌 가능성: 시작 시 작업 트리는 깨끗했다. 세 Astra xhigh 담당이 formatter/라우트/측정 범위를 나누고 root가 통합한다. 사용자가 요청한 5173 개발 서버는 유지하며 성능 측정은 별도 production preview를 사용한다.

## 변경 경계

- 영향 레이어/슬라이스: app provider·routes, pages/widgets의 공개 조회 계약, shared formatter, number-motion, CI 측정/회귀 문서.
- 공개 API/환경 변수/저장 형식 변경: formatter의 좁은 재사용 API만 추가한다. URL 값·검증과 저장 키·데이터 형식은 유지한다. 조회 계약의 공개 search.ts 8개만 추가하며 ADR 006과 전이 import 검사로 UI 유입을 금지한다.
- 오류/빈 상태/취소/접근성 처리: Intl 입력 오류, 통화/언어 전환, 300ms deadline·전체 폭 예약·reduced motion·숨긴 문서, 기존 라우트 오류/입력 보호 계약을 유지한다.
- 마이그레이션/롤백 (필요할 때): 저장 데이터 이관은 없다. 성능 개선 근거가 없거나 기능 회귀가 생긴 변경은 원인별로 되돌린다.

## 실행과 검증

1. 최소 구현: formatter/렌더의 확인된 반복 비용과 불필요한 언어 이벤트부터 제거하고 라우트 번들 연결을 별도로 검증한다.
2. 필요한 계약/행동 테스트와 CI 범주: formatter·숫자 모션 선택 unit, provider 언어 이벤트 회귀, 기존 전체 core/samples와 Linux 시각 기준을 유지한다.
3. 로컬 정적 검사 `pnpm check`: 포맷·ESLint·타입·아키텍처·범주·페이지 명세가 통과했다.
4. 꼭 필요한 로컬 재현만 선택 (파일/동작/화면 크기, production 번들): CI artifact의 Overview/Projects에서 같은 CPU profile·데이터 준비 조건을 사용한다. 전체 테스트/build는 Actions가 소유한다.
5. 문서/운영 체크리스트 반영: measured/raw와 simulated 지표 및 source SHA를 남기고 Lighthouse trace/요약을 기존 artifact에 보관한다.

## 완료 기록

- 실제 변경 동작: 숫자 formatter/날짜 formatter와 모션 예약 트리를 재사용하고 초기 언어 이벤트 중복을 제거했다. 조회 진입점 분리와 실제 청크 preload/history/실패 복구 회귀를 추가했다. 라우트 오류 화면에서 현재 URL을 유지하는 Reload page를 제공한다.
- 실행한 명령과 결과: 시작 main `7758183` CI 성공, 열린 Dependabot PR/보안 알림 0건. baseline production artifact의 두 화면 CPU profile을 수집했다. 선택 단위 74개·아키텍처 회귀 55개·URL 회귀 47개와 pnpm check를 통과했다. Lighthouse summary에 source SHA·runner/Chrome/CPU·warning·raw/simulated 지표를 기록하고 trace를 보관한다.
- Actions 실행 결과 또는 미실행 사유 (로컬 전체 테스트는 기본 절차가 아님): 변경 후 PR CI·대표 Lighthouse·병합 후 최신 main 확인 예정.
- 남은 제약: 실험실 성능이며 실제 운영 API·배포 네트워크·실기기를 대표하지 않는다.
