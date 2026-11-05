# 테스트 실행 정책

로컬에서는 빠른 정적 검사로 작업 피드백을 받고 전체 단위·브라우저 테스트는 GitHub Actions에서 실행합니다. 사용자의 명시 요청 또는 결함을 해결하기 위해 반드시 필요한 경우를 제외하면 로컬 전체 테스트를 실행하지 않습니다. 필요한 로컬 재현은 파일, 기능, 테스트 이름, 화면 크기로 좁히며 같은 결과를 확인하기 위한 반복 실행은 하지 않습니다.

## 기본 명령과 실행 위치

| 명령                    | 범위                                                              | 기본 실행 위치      |
| ----------------------- | ----------------------------------------------------------------- | ------------------- |
| `pnpm check`            | 포맷, ESLint, 타입, FSD/UI/토큰 및 단위/E2E 범주 정적 검사        | 로컬                |
| `pnpm check:page-specs` | 페이지 기획 누락·중복·필수 섹션·로컬 링크 정적 검사               | 로컬 / 문서 전용 CI |
| `pnpm check:ci`         | 정적 검사 + 가드레일 테스트 + 전체 단위 테스트 + production build | Actions quality job |
| `pnpm test:unit`        | 전체 Vitest 범주                                                  | Actions             |
| `pnpm test:guardrails`  | 아키텍처 검사기, 경로별 HTML, E2E 범주 회귀 테스트                | Actions             |
| `pnpm test:e2e:core`    | 워크스페이스/프로젝트/조회 캐시와 카드 치수                       | Actions core job    |
| `pnpm test:e2e:samples` | 샘플 운영 페이지                                                  | Actions samples job |

`pnpm test`는 `test:unit`의 기존 호환 명령입니다. `test:watch`, `test:coverage`는 필요할 때 직접 선택하는 도구이며 기본 CI/로컬 검사에 추가하지 않습니다. `pnpm check`는 테스트나 production build를 실행하지 않습니다.

E2E 파일은 `tsconfig.e2e.json`이 소유하며 루트 TypeScript 참조를 통해 `pnpm typecheck`에 포함됩니다. Playwright 실행과 별개로 Node/DOM 타입을 검사하고 ESLint의 `no-floating-promises`로 비동기 동작과 assertion의 누락된 `await`를 확인합니다. 이 정적 검사는 브라우저를 실행하지 않습니다.

## 단위 테스트 범주

Vitest 5의 [named projects](https://vitest.dev/guide/projects)를 사용하며 각 파일은 한 범주에만 포함됩니다. 범주의 단일 정의는 `scripts/unit-test-categories.ts`이며 Vitest와 범주 검사기가 함께 사용합니다. `*.test.ts(x)`와 `*.spec.ts(x)`를 지원합니다. 공통 alias, React plugin, jsdom, setup, mock 정리 설정은 inline project가 상속합니다. 전체 실행도 하나의 Vitest 프로세스에서 worker 최대 2개로 제한합니다.

| 범주/명령                    | 테스트 위치와 책임                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm test:unit:foundations` | `shared/api`, `shared/config`, `shared/lib`: transport/응답 검증, 환경 설정, 공통 계약              |
| `pnpm test:unit:data`        | `entities`, `features`: 도메인 스키마, 어댑터, 캐시 갱신, 저장/사용자 행동                          |
| `pnpm test:unit:ui`          | `app`, `pages`, `widgets`, `shared/ui`, `shared/hooks`: provider, 컴포넌트와 브라우저 API 구독 계약 |

로컬 재현이 필요한 경우의 예시입니다. 모두 실행하라는 목록이 아닙니다.

```sh
# 한 계약 파일만 선택
pnpm test:unit:data src/entities/project/model/schema.test.ts

# 해당 범주 안에서 한 동작만 선택
pnpm test:unit:ui src/app/providers/theme-provider.test.tsx -t 'system'
```

`pnpm check:unit-categories`는 src를 재귀적으로 탐색해 단위 테스트의 누락·중복 범주와 지원하지 않는 확장자를 거부합니다. 새 shared 세그먼트의 테스트는 의도한 범주에 등록해야 하며 검사기와 Vitest의 패턴을 따로 관리하지 않습니다. 검사기 회귀 테스트는 기존 `test:guardrails`에 포함됩니다. 새 테스트는 코드가 소유한 슬라이스/세그먼트 옆에 둡니다. 단순 class 문자열/구현 함수의 복제, 변화 없는 정적 seed 전체 스냅샷, 의미 없는 coverage 수치 상승을 목적으로 테스트를 추가하지 않습니다. 검증할 실패 계약이 있어야 합니다.

## 브라우저 범주와 페이지 선택

| CI 범주   | 파일/선택 명령                                         | 확인할 사용자 흐름                                         |
| --------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| `core`    | `test:e2e:workspace` → `workspace.spec.ts`             | 탐색, 검색, 테마/설정, 컴포넌트, 반응형 셸                 |
| `core`    | `test:e2e:cache` → `query-cache.spec.ts`               | 실제 요청 횟수, cold/warm 캐시, background 갱신, 카드 치수 |
| `core`    | `test:e2e:projects` → `projects.spec.ts`               | 프로젝트 생성/수정/삭제, 필터, 오류/빈 상태                |
| `samples` | `test:e2e:commerce` → `commerce.spec.ts`               | 주문/고객 목록, 필터, 상세 및 선택 흐름                    |
| `samples` | `test:e2e:analytics-inbox` → `analytics-inbox.spec.ts` | 분석 기간/비교와 메시지 탐색/읽음 처리                     |

두 범주는 겹치지 않습니다. `package.json`의 `test:e2e:core`와 `test:e2e:samples`는 기존 스펙의 경로를 명시적으로 열거합니다. 새 파일을 추가하거나 삭제하면 이 목록도 갱신하세요. `pnpm check:e2e-categories`가 `e2e` 아래 스펙을 재귀적으로 찾아 누락·중복·없는 경로를 거부하며, 로컬 `pnpm check`와 CI의 정적 검사에 포함됩니다. 검사기 회귀 테스트는 기존 `test:guardrails`에서 실행합니다. 개별 파일용 편의 명령은 CI 범주에 포함하지 않습니다.

같은 시나리오를 dev와 production 두 환경에서 반복하지 않습니다. E2E는 `pnpm build` 결과 `dist/`를 `pnpm preview`로 제공하며 기본적으로 Chromium만 사용합니다.

`core`에는 `e2e/localization.spec.ts`도 포함됩니다. 언어·통화의 독립 전환과 저장 복원, 환산 값, 환율 캐시 재사용, 오류/재시도, 세 화면 구간의 컨트롤 정렬을 확인합니다. 필요한 로컬 재현에서는 이 파일과 `--project`로 범위를 좁힙니다.

모든 브라우저 스펙은 `e2e/fixtures.ts`를 사용합니다. fixture는 외부 Frankfurter 요청과 Pretendard CDN 요청을 `BrowserContext.route`로 고정하여 CI가 외부 공급자 가용성에 의존하지 않도록 합니다. 실패 테스트는 같은 경로를 해당 테스트 안에서 재정의합니다. 폰트는 버전을 고정한 `pretendard` 개발 의존성의 원본 CSS·WOFF2·WOFF를 CDN URL과 CORS 헤더 그대로 응답하며, 잘못된 버전·경로는 실패합니다. 기존 workspace 검사에서 CDN stylesheet/subset 요청과 한글·영문 glyph 및 400/500/600만 로드되는지 확인합니다. 이는 CDN 가용성 검사가 아니므로 폰트 변경 시 실제 CDN의 HTTP/CORS와 원본 파일 일치를 별도로 확인합니다. 실제 앱에는 자체 호스팅 Pretendard fallback이나 환율 목업을 추가하지 않으며 개발/배포 앱은 CDN과 공개 API를 직접 호출합니다. 외부 통합 변경 때 실제 응답/CORS 확인과 단위 테스트의 스키마/오류/캐시 검증을 함께 수행합니다.

| Playwright project | viewport    | 입력/환경            |
| ------------------ | ----------- | -------------------- |
| `desktop`          | 1440 × 1000 | Chromium 데스크톱    |
| `tablet`           | 834 × 1112  | Chromium 터치 태블릿 |
| `mobile`           | 412 × 915   | Chromium 모바일      |

한 파일/화면 크기를 선택해야 하는 경우:

```sh
# 해당 변경의 production build가 있을 때만 실행
pnpm test:e2e:commerce --project mobile
pnpm test:e2e e2e/analytics-inbox.spec.ts --project tablet -g '필요한 테스트 이름'
```

Playwright는 worker 2개, CI에서만 실패당 재시도 1회를 사용합니다. retry는 불안정한 테스트를 방치하는 수단이 아닙니다. 실패 trace/screenshot을 확인하고 실제 결함이나 재현 가능한 대기 조건을 수정합니다. Vite StrictMode/HMR 자체에 관련된 문제일 때만 별도 개발 서버 검증을 추가합니다.

## 입력 보호와 앱 오류 복구 회귀

`core`의 `e2e/unsaved-changes.spec.ts`는 설정의 페이지 이동/계속 편집/폐기, 프로젝트 폼의 닫기 경로와 초점 복구를 세 화면 구간에서 확인합니다. 브라우저 뒤로/앞으로 및 새로고침의 기본 확인창은 데스크톱에서만 확인하며, 저장 후에는 불필요한 확인이 없어야 합니다. 모바일 OS의 강제 종료까지 보장하는 검사는 아닙니다.

`e2e/app-recovery.spec.ts`는 production 앱의 ThemeProvider가 실패하는 환경을 주입하고, Provider 바깥의 일반 오류 화면과 새로고침 후 정상 진입을 확인합니다. 테스트 전용 앱 라우트나 런타임 플래그를 추가하지 않습니다. 오류 보고의 개인정보 제외·중복 억제·adapter 실패 격리와 컴포넌트 경계는 해당 소유 코드 옆 단위 테스트가 확인합니다.

## Actions 구성과 실행 범위

`quality` job은 frozen lockfile로 설치하고 정적 검사/가드레일/단위 테스트를 실행한 뒤 production build를 한 번만 만듭니다. `production-dist` artifact를 업로드하면 `core`, `samples` 브라우저 job이 같은 결과물을 내려받습니다. 각 화면 크기를 별도 job으로 쪼개지 않으며 브라우저 job은 최대 2개가 동시에 실행됩니다. 각 job의 worker 2개와 합쳐 최대 4개 브라우저 테스트 worker가 동작합니다.

CI workflow는 모든 PR의 opened/synchronize/reopened와 main push에서 시작합니다. `changes`가 문서 전용으로 확인하면 quality/browser를 생략하고 최종 `CI Gate`를 실행합니다. 코드·설정·알 수 없는 경로의 변경에는 전체 검사를 실행합니다. feature branch push만으로 중복 실행하지 않으며 같은 ref의 새 실행이 시작되면 진행 중인 이전 실행을 취소합니다. 분류·실패 처리·보호 설정은 [CI Gate](ci-gate.md)가 소유합니다.

PR 제목은 별도 `PR Title` workflow가 opened/edited/synchronize/reopened에서 검사합니다. 제목을 고치면 그 검사만 갱신되며 전체 단위/E2E가 다시 실행되지 않습니다. 이 경량 job은 checkout, 의존성 설치, 빌드 없이 PR 메타데이터만 읽습니다. 타입/subject는 pinned semantic-PR action, 100자 제한/앞뒤 공백은 작은 Node 검사로 검증합니다. 허용 타입은 `commitlint.config.cjs`와 일치시킵니다. fork PR도 다루기 위해 읽기 전용 `pull_request_target`을 사용하며 PR 소스를 checkout하거나 실행하지 않습니다. 해당 workflow는 기본 브랜치에 먼저 존재해야 동작합니다.

수동 `workflow_dispatch`에서는 `all`, `core`, `samples`를 선택합니다. 품질/단위/build는 항상 실행하고 선택한 브라우저 범주만 뒤따릅니다. 최종 이름은 `Manual CI result`이며 PR의 필수 `CI Gate`와 구분합니다.

main에는 `CI Gate`와 `Conventional PR title`을 GitHub Actions 제공 필수 검사로 설정합니다. workflow 자체에는 경로 필터를 두지 않아 문서 PR에도 gate가 존재합니다. 포크에는 원격 보호 설정이 자동 적용되지 않으므로 [설정·검증 절차](ci-gate.md#포크-후-설정)를 따릅니다.

## 디자인·접근성 회귀

`core`의 `e2e/design-visual.spec.ts`는 대표 KPI/표/폼 조합의 기준 이미지를 비교하고, 작은 텍스트에 사용하는 불투명 토큰 쌍의 light/dark 대비를 확인합니다. `e2e/accessibility.spec.ts`는 키보드 대화상자/폼 오류 연결, 실행 중 reduced-motion 변경, 모바일 200% 글자 확대에서 핵심 행동 도달 여부를 검사합니다. 세부 범위와 한계는 [접근성](design/accessibility.md), 이미지 검토·갱신은 [시각 회귀](design/visual-regression.md)가 소유합니다.

브라우저 runner는 `ubuntu-24.04`, 브라우저 버전은 lockfile로 고정합니다. 기준은 같은 Linux 환경에서 검토한 PNG만 사용하며 자동 갱신하지 않습니다. 새 브라우저 job·중복 빌드는 추가하지 않습니다. 전체 언어·테마·화면 조합이나 보조기술 준수 전체를 증명하는 검사는 아닙니다.

문서만 바뀌어도 changes job이 `node scripts/check-page-specs.mjs`를 실행합니다. 의존성을 설치하지 않으며 필수 항목/경로의 구조를 검사합니다. 자연어 기획과 구현의 의미가 같은지는 해당 코드·행동 테스트·리뷰가 확인합니다.

## 선택 실행: Lighthouse

`Lighthouse` workflow는 수동 `workflow_dispatch`로만 실행합니다. `page`는 `overview`(`/`) 또는 `projects`(`/projects`), `device`는 `mobile` 또는 `desktop`을 선택합니다. 표준 Ubuntu runner의 Chrome에서 Lighthouse `13.6.0`을 사용하며, job 하나가 production build를 한 번 만든 뒤 선택한 페이지/기기 조합을 한 번 검사합니다. PR/push 자동 실행, 전체 단위/E2E, dev 서버 중복 검사는 추가하지 않습니다.

성능·접근성·권장사항·SEO의 HTML/JSON 보고서와 preview 로그를 `test-results/lighthouse/`에 생성하고 `lighthouse-<page>-<device>` artifact로 성공/실패 시 모두 최대 3일 보관합니다. 점수 임계값은 강제하지 않지만 CLI 오류나 보고서 생성 실패는 job 실패로 처리합니다. 데모의 기본 `noindex`와 공개 origin 미설정은 그대로 검사하며, SEO 점수를 높이려고 가짜 `VITE_SITE_URL`을 주입하지 않습니다. 성능 점수는 runner 부하에 따라 달라질 수 있으므로 같은 페이지/기기에서 상세 지표와 함께 비교하세요. 수동 실행도 비공개 저장소의 Actions 사용량에 포함됩니다.

## GitHub Free 사용량

2026-11-03에 확인한 GitHub 공식 문서는 공개 저장소의 **표준 GitHub-hosted runner** 사용을 무료로 안내합니다. larger runner는 이 조건에 포함되지 않습니다. 이 workflow는 표준 `ubuntu-latest`만 사용합니다. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

비공개 저장소에 적용되는 현재 GitHub Free 기본 제공량은 **월 $12 상당 compute usage와 500 MB Actions storage**입니다. 현재 문서는 이를 고정된 분 수가 아닌 금액으로 표기하며, compute는 다른 적격 compute 사용과 공유될 수 있습니다. 실제 저장소 공개 여부, 계정 잔여 사용량이나 지출 한도는 이 코드에서 확인하거나 변경하지 않습니다. [플랜별 포함 사용량](https://docs.github.com/en/billing/reference/product-usage-included).

GitHub는 각 job의 부분 분을 올림하고 실행한 job별 사용량을 합산합니다. 병렬화는 대기 시간을 줄이지만 총 사용 시간을 무료로 만들지는 않습니다. 현재 표준 Linux 2-core 요율 $0.006/분을 단독으로 사용한다면 $12는 약 2,000분에 해당하는 계산이며, 고정 분 쿼터 보장은 아닙니다. [Runner 요율과 반올림](https://docs.github.com/en/billing/reference/actions-runner-pricing).

코드 변경의 changes/gate 두 경량 job은 설치·빌드 없이 분류와 결과만 검증합니다. 브라우저 구성을 작은 job 12개로 분리하지 않은 이유는 checkout/설치/브라우저 준비와 job 단위 반올림 비용을 줄이기 위해서입니다. production bundle은 1일, 실패 진단은 3일만 보관하고 성공 브라우저 보고서는 업로드하지 않습니다. pnpm 캐시는 공유하지만 Chromium 바이너리 캐시나 매 실행 coverage를 추가하지 않습니다. 실제 Actions 시간/실패 빈도를 본 뒤 필요한 범위만 조정하세요.
