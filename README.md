# Blueprint

React · TypeScript · Vite 기반의 제품 개발용 프런트엔드 보일러플레이트입니다. 대시보드, 프로젝트 관리, 분석, 주문, 고객, 받은편지함, 설정, Foundations 화면과 함께 FSD 구조, 서버/클라이언트 상태 분리, 디자인 토큰, 테스트, CI, AI 작업 가드레일을 제공합니다.

기본 실행은 **브라우저에 저장되는 데모 모드**입니다. 대시보드 수치는 샘플이며 실제 계정, 결제, 인증, 서버 권한 검사는 포함하지 않습니다. 운영 연결은 [API 계약](docs/api-contract.md)과 [운영 전환 체크리스트](docs/production-readiness.md)를 기준으로 진행하세요.

Overview·Analytics·Orders·Customers는 MSW가 실제 fetch에 목업 응답을 제공하고 TanStack Query가 캐시합니다. 최초 로딩과 데이터 화면은 같은 카드 크기를 유지하며, 핵심 수치는 API/캐시 진입 모두 300ms 모션을 사용합니다. [캐시 확인 방법](docs/query-cache.md)과 [숫자 표시 규칙](docs/number-formatting.md)·[로딩·모션 계약](docs/loading-and-motion.md)을 참고하세요. API 모드에서는 mock worker를 시작하지 않습니다.

## 실행

헤더에서 한국어·영어와 USD·KRW 표시를 각각 선택할 수 있으며 설정은 브라우저에 저장됩니다. 환율은 demo/api 모드 모두 Frankfurter 공개 API에서 실제로 조회합니다. 기준일과 환율을 표시하고, 원본 USD 금액을 환산합니다. 유효한 환율이 없으면 원화 금액은 `—`로 표시하며 재시도를 제공합니다. 번역·숫자·날짜·환율의 소유 경계는 [언어와 표시 통화](docs/i18n.md)를 따릅니다.

Node.js 24 LTS와 pnpm 11을 사용합니다. 정확한 pnpm 버전은 `package.json`의 `packageManager`를 따릅니다.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Vite가 출력하는 로컬 주소에서 확인하세요. 기본 포트는 `5173`입니다. `.env.local`을 생략해도 기본 데모 설정으로 실행됩니다. 앱에서 생성/수정/삭제한 데모 프로젝트는 같은 브라우저의 localStorage에 저장됩니다. 이 데이터는 다른 사용자나 기기와 공유되지 않습니다.

개발 모드에서는 오른쪽 아래 **TanStack Devtools** 버튼 하나로 Query와 Router 패널을 전환합니다. [공식 플러그인 방식](https://tanstack.com/devtools/latest/docs/quick-start)을 사용하며 `import.meta.env.DEV` 경계에서 지연 로드하므로 production 진입 코드에는 포함하지 않습니다.

페이지별 제목/OG/Twitter 메타는 하나의 registry로 관리하며, 빌드 시 경로마다 메타가 들어간 정적 HTML shell을 만듭니다. React 화면은 CSR로 실행합니다. 공유 이미지의 절대 URL과 canonical을 만들려면 배포 전에 `VITE_SITE_URL`에 실제 공개 origin을 설정하세요. 파비콘·모바일 북마크 아이콘과 호스팅 경로 규칙은 [메타데이터 가이드](docs/seo.md)에 정리했습니다.

```dotenv
VITE_DATA_SOURCE=demo
VITE_API_BASE_URL=/api
```

`VITE_DATA_SOURCE=api`로 바꾸면 실제 API 어댑터를 사용합니다. 환경 변수는 Vite 빌드 시 번들에 포함되므로 변경 후 개발 서버 재시작/재빌드가 필요합니다. `VITE_` 변수에는 비밀 값을 넣지 마세요.

## 기술 선택

| 역할            | 구현                                                              |
| --------------- | ----------------------------------------------------------------- |
| 앱/빌드         | React 19, TypeScript 6.0 strict, Vite 8, pnpm                     |
| 구조            | Feature-Sliced Design, 슬라이스 공개 API, 자동 import 경계 검사   |
| UI              | shadcn/ui, Radix, Tailwind CSS 4, shadcn neutral 의미 토큰        |
| 아이콘          | lucide-react                                                      |
| 폰트            | Pretendard 동적 subset 자체 호스팅, 400 / 500 / 600               |
| URL/탐색        | TanStack Router                                                   |
| 서버 데이터     | TanStack Query, 취소 가능한 요청, Zod 응답 검증                   |
| 목업 HTTP       | demo 전용 MSW, 요청 횟수와 Query 캐시 재사용 검증                 |
| 클라이언트 상태 | Zustand                                                           |
| 테이블/차트     | TanStack Table, shadcn Chart/Recharts                             |
| 품질            | ESLint typed rules, Prettier, Vitest, Testing Library, Playwright |
| 협업            | Husky, lint-staged, commitlint, GitHub Actions, Dependabot        |
| AI 작업         | AGENTS.md, 계획 템플릿, 구조 검사, shadcn MCP 설정/점검           |

직접 작성한 컴포넌트 CSS는 없습니다. `src/app/styles/globals.css`만 Tailwind 진입점, shadcn 토큰, 기본 스타일을 선언합니다. 화면은 Tailwind 유틸리티로 조합하고 컨트롤은 `src/shared/ui`의 shadcn 컴포넌트를 사용합니다.

테마는 [공식 shadcn Vite recipe](https://ui.shadcn.com/docs/dark-mode/vite)를 기반으로 하며 light/dark/system 선택과 시스템 설정 변경을 지원합니다. 기존 `blueprint-theme` 저장 키를 사용하고 저장소를 사용할 수 없어도 현재 세션의 테마 선택은 동작합니다.

기본 UI는 무채색을 유지합니다. `primary`는 주요 동작, `brand`는 단일 Blueprint Blue 정체성 색상으로 구분합니다. 글자 두께는 `font-normal`(400), `font-medium`(500), `font-semibold`(600)만 허용하며 구조 검사기가 위반을 막습니다. 세부 사용 규칙은 [디자인 시스템](docs/design-system.md), 실제 토큰과 한글/영문 폰트 표본은 앱의 **Components → Theme tokens / Typography**에서 확인하세요.

## 샘플 페이지

| 메뉴                  | 제공하는 흐름                                            |
| --------------------- | -------------------------------------------------------- |
| Overview / Projects   | 기간별 요약, 프로젝트 생성·수정·삭제, 검색·필터          |
| Analytics             | 기간 선택, 방문/기기 차트, 유입 경로와 인기 페이지       |
| Orders                | 상태 탭, 검색·정렬·페이지 이동, 주문 상세 Sheet          |
| Customers             | 상태 필터, 검색·정렬·페이지 이동, 고객 상세 Sheet        |
| Inbox                 | 검색, 읽음/읽지 않음, 보관·복원, 메시지 상세             |
| Components / Settings | shadcn 구성 요소·토큰·폰트, 테마와 워크스페이스 설정     |
| Foundations           | 디자인 규칙, HStack/VStack 조합, 문구·국제화·피드백 예시 |

주문/고객은 HTTP 목업에서 읽는 조회 전용 데이터이며 받은편지함 변경은 페이지를 떠나면 초기화됩니다. 실제 메일 발송이나 결제 기능은 없습니다. 모바일(768px 미만)은 사이드바 drawer, 태블릿(768–1279px)은 기본 아이콘 탐색, PC(1280px 이상)는 펼친 사이드바를 사용합니다. 접힌 로고·메뉴·프로필은 같은 중심선을 사용하며 workspace 전환 블록은 표시하지 않습니다.

Foundations는 기존 shadcn·Pretendard·색상 규칙을 설명하는 페이지입니다. SEED의 설계 관점을 참고하되 패키지/토큰/컴포넌트를 가져오지 않습니다. HStack/VStack은 재사용할 수 있는 Tailwind 조합 예시이며 별도 UI primitive가 아닙니다.

## 명령

| 명령                             | 용도                                              |
| -------------------------------- | ------------------------------------------------- |
| `pnpm dev`                       | 로컬 개발 서버                                    |
| `pnpm build` / `pnpm preview`    | 타입 검사 및 정적 번들 / 로컬 빌드 확인           |
| `pnpm check`                     | 로컬 정적 검사: 포맷, 린트, 타입, 구조            |
| `pnpm check:ci`                  | Actions용 정적 검사, 가드레일/단위 테스트, 빌드   |
| `pnpm test` / `pnpm test:watch`  | 단위/컴포넌트 테스트 / watch                      |
| `pnpm test:coverage`             | 테스트 커버리지 리포트                            |
| `pnpm test:e2e`                  | Playwright 브라우저 테스트 (`pnpm build` 후 실행) |
| `pnpm check:architecture`        | FSD, shadcn 컨트롤, 스타일/토큰 규칙 검사         |
| `pnpm test:guardrails`           | 구조 검사기의 회귀 테스트                         |
| `pnpm format` / `pnpm lint`      | 포맷 적용 / 린트 검사                             |
| `pnpm ui:add <component>`        | 설정된 shadcn registry에서 컴포넌트 추가          |
| `pnpm ui:mcp` / `pnpm check:mcp` | shadcn MCP 서버 / 실제 도구 연결 점검             |
| `pnpm assets:generate`           | SVG 소스에서 파비콘·북마크·공유 이미지 재생성     |

전체 단위/E2E 테스트는 **GitHub Actions가 기본 실행 위치**입니다. 명시 요청이나 필요한 결함 재현이 없으면 로컬에서 전체 테스트를 실행하지 않습니다. 필요한 경우 파일·기능·화면 크기만 선택하며 [테스트 실행 정책](docs/testing.md)에 범주별 명령을 정리했습니다.

CI는 production build를 한 번만 만들고 `core`·`samples` 브라우저 job이 같은 번들을 공유합니다. Chromium에서 PC·태블릿·모바일을 확인하며 dev 서버 테스트를 중복 실행하지 않습니다. 브라우저 job은 최대 2개, 각 worker는 2개입니다. 로컬 브라우저 재현이 필요한 경우에만 `pnpm exec playwright install chromium`으로 준비하세요. 실제 Actions 실행과 브랜치 보호 설정은 원격 저장소에서 확인해야 합니다.

## 구조와 문서

```text
src/
  app/       # 진입, providers, router, 전역 토큰
  pages/     # 경로별 화면 조합
  widgets/   # 여러 기능을 묶는 화면 블록
  features/  # 사용자 행동/편집 흐름
  entities/  # 도메인 모델, API 어댑터, Query 옵션
  shared/    # shadcn UI, API transport, 설정, 공통 도구
```

- [작업별 문서 지도](docs/README.md) — 필요한 책임의 문서만 선택
- [아키텍처와 경계](docs/architecture.md)
- [폰트·색상·반응형 규칙](docs/design-system.md)
- [테스트 범주와 Actions 실행 정책](docs/testing.md)
- [페이지별 OG·파비콘·북마크](docs/seo.md)
- [시니어 코드 리뷰와 수정 근거](docs/reviews/production-code-review.md)
- [Lighthouse 측정 결과와 개선](docs/reviews/lighthouse-audit.md)
- [API 계약과 데모 어댑터](docs/api-contract.md)
- [Query 키·캐시·목업 검증](docs/query-cache.md)
- [카드 로딩·숫자 모션](docs/loading-and-motion.md)
- [운영 전환 체크리스트](docs/production-readiness.md)
- [AI 작업 흐름](docs/ai-workflow.md) · [에이전트 지침](AGENTS.md)
- [기여/커밋/PR 규칙](CONTRIBUTING.md)
- [작업 계획 템플릿](docs/plans/_template.md)
- [외부 소스 라이선스 고지](THIRD_PARTY_NOTICES.md)

새 기능은 책임을 배치하고 테스트 가능한 완료 조건을 먼저 정하세요. 데모 데이터를 실제 데이터처럼 표시하거나 미구현 기능을 완료된 것으로 설명하지 마세요.
