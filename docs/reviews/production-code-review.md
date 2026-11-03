# 프로덕션 기반 코드 리뷰

평가일: 2026-11-03. 독립 리뷰어 3명(Astra 6 xhigh)이 읽기 전용으로 먼저 평가하고, 통합 담당자가 코드·설치된 라이브러리 구현·재현 근거를 대조한 뒤 수정했다.

## 점수와 해석

| 담당 영역          | 가중치 | 수정 전      | 수정 후      |
| ------------------ | ------ | ------------ | ------------ |
| 아키텍처·데이터    | 40%    | 87/100       | 96/100       |
| UI·접근성          | 30%    | 86/100       | 94/100       |
| 테스트·CI·가드레일 | 30%    | 89/100       | 95/100       |
| 가중 평균          | 100%   | **87.3/100** | **95.1/100** |

점수는 이 저장소의 프런트엔드 기반에 대한 리뷰어의 판단이며 외부 인증이나 운영 배포 승인 점수가 아니다. 수정 후 점수도 코드·대상 검사 중심의 평가이며 전체 Actions 결과와 실제 백엔드 통합은 포함하지 않는다. 문서에 명시된 인증·권한·실제 서버·결제의 부재를 결함으로 감점하지 않았다. 이후 추가한 Devtools 통합과 SEO 기반은 이 초기 비교 점수의 평가 대상에 억지로 포함하지 않는다.

세부 기준은 아키텍처의 경계/런타임 계약/캐시 일관성/복구/HTTP 각각 20점, UI의 동작 30점·접근성 30점·반응형 20점·컴포넌트 규칙 20점, 하네스의 테스트 30점·CI 25점·타입 도구 20점·가드레일 20점·지침 5점이다.

## 확인한 문제와 수정 판단

| 우선도 | 근거와 재현 조건                                                                                                                                                                        | 판단 및 수정                                                                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| P2     | `entities/project/api/queries.ts`: 첫 GET이 느리고 생성 POST가 먼저 끝나면 아직 없는 캐시 갱신이 생략된다. TanStack Query는 진행 중인 최초 GET을 재사용해 과거 목록을 fresh로 저장한다. | 채택. mutation 성공 시 진행 중인 목록 요청을 취소한 후 캐시 반영/무효화. 지연 응답을 제어하는 회귀 검사 추가.                                 |
| P2     | `shared/config/env.ts`: 역슬래시 경로와 `https:host/path`를 허용하면 브라우저 URL 해석이 선언된 API 주소 계약과 달라진다.                                                               | 채택. 역슬래시·모호한 scheme·공백·query/hash delimiter 거부. 배포 설정의 계약 문제이며 사용자 입력 취약점이라고 과장하지 않는다.              |
| P2     | `shared/api/client.ts`: 헤더/본문 응답이 끝나지 않으면 mutation 창이 pending 상태로 잠긴다.                                                                                             | 채택. 15초 deadline이 헤더와 JSON 본문을 포함한다. 외부 abort 이유와 정리를 보존하고 mutation timeout은 서버 반영 여부가 불명확함을 안내한다. |
| P2     | `features/project-editor`: 고정 중앙 Dialog에 높이 제한이 없어 짧은 화면이나 검증 오류가 늘어날 때 버튼이 화면 밖으로 나간다.                                                           | 채택. 소비자 Dialog에 viewport 높이 제한과 내부 스크롤 추가.                                                                                  |
| P2     | `widgets/app-shell`, `shared/ui/sidebar`: controlled 오버레이가 Radix Trigger 없이 열려 Escape 뒤 원래 초점으로 돌아가지 않는다.                                                        | 채택. opener를 기록해 닫힘 시 복원하고, 페이지 전환으로 opener가 사라지면 명시적 콘텐츠/탐색 trigger로 복귀한다.                              |
| P3     | `widgets/project-table`: Reset/Clear filters가 초점이 있는 자신을 제거한다.                                                                                                             | 채택. 검색 입력으로 초점을 옮긴다.                                                                                                            |
| P2     | `tsconfig.*`, `eslint.config.js`: E2E 파일이 TypeScript 검사 대상에서 빠지고 Promise 미처리를 검사하지 않는다.                                                                          | 채택. 루트 참조에 전용 E2E 프로젝트 추가, 타입 기반 no-floating-promises 적용.                                                                |
| P2     | `scripts/check-architecture.mjs`: 알 수 없는 내부 레이어를 만나면 검사 없이 반환해 `shared → main` 또는 중간 `src/utils`를 통한 상향 참조가 통과한다.                                   | 채택. 알 수 없는 내부 target을 거부하고 부트스트랩/테스트 setup의 source 예외를 좁게 허용한다.                                                |
| P3     | 같은 검사기에서 `role="button"`은 막지만 `role={"button"}`은 통과한다.                                                                                                                  | 채택. JSX expression의 문자열 literal도 동일하게 검사한다.                                                                                    |
| P2     | 통합 담당자가 실제 DOM에서 확인한 `SidebarInset`의 main 안에 또 다른 main이 있는 구조.                                                                                                  | 추가 수정. 공식 SidebarInset은 유지하고 내부 콘텐츠를 focusable div로 바꿔 main landmark 중첩을 제거한다.                                     |

기각한 지적: Analytics 막대에 Bar-level fill이 없다는 이유만으로 색상 누락을 의심했으나 fixture의 각 데이터가 semantic fill을 제공하고 Recharts가 이를 사용한다. 실제 결함이 아니므로 변경하지 않았다. Vitest 5 inline project 상속도 설치된 구현의 기본값이 true이므로 `extends: true` 추가를 요구하지 않았다.

## 검증 증거와 남은 범위

- 데이터 영역은 변경한 이름만 선택한 14개 사례가 통과했다: API 주소 9개, HTTP deadline/취소 4개, 최초 목록 경합 1개. 테스트의 mock realm/타이핑과 React Query observer 대기 오류를 수정한 뒤 해당 실패만 다시 확인했다.
- 구조 가드레일은 새 3개 회귀 사례만 실행했다. E2E 전용 타입 검사와 Promise lint 탐지 probe, 변경 영역 lint/format, 구조 정적 검사가 통과했다.
- UI 회귀는 기존 workspace/projects E2E에 추가했다. 스위트 실행 결과를 주장하지 않는다.
- 통합 담당자의 `pnpm check`와 production build도 통과했다. 추가 메타데이터 작업은 경로별 원문 HTTP까지 확인했으며 세부 기록은 작업 계획에 남겼다.
- 전체 로컬 단위/E2E/브라우저 스위트, 원격 Actions, commit/push는 실행하지 않았다.
- 실제 API의 PATCH/DELETE 계약과 운영 오류 복구, 인증/조직 전환 캐시, 실브라우저 접근성 회귀의 최종 증거는 이후 해당 Actions/통합 작업에서 확보해야 한다.
- timeout은 서버 rollback을 보증하지 않는다. 중복 제출 방지는 실제 서비스의 idempotency 계약에서 다뤄야 한다.

후속 작업 기록은 [작업 계획](../plans/production-code-review.md), 운영 전환 조건은 [운영 체크리스트](../production-readiness.md)를 참고한다.
