# 아키텍처

이 프로젝트는 [Feature-Sliced Design의 레이어 규칙](https://feature-sliced.design/docs/concepts/app-splitting)을 사용합니다. 레이어는 책임과 의존 방향을 결정하고, 슬라이스는 도메인/사용자 행동의 응집도를 유지합니다.

## 레이어와 import

```text
app → pages → widgets → features → entities → shared
```

| 레이어   | 책임                                    | 예시                                             |
| -------- | --------------------------------------- | ------------------------------------------------ |
| app      | 앱 조립과 생명주기                      | Router, QueryClient, theme provider, globals.css |
| pages    | URL에 대응하는 화면                     | 대시보드, 프로젝트 목록, 설정                    |
| widgets  | 독립적으로 조합 가능한 큰 화면 블록     | 프로젝트 테이블, 앱 탐색 셸                      |
| features | 사용자의 목적 있는 행동                 | 프로젝트 생성/수정/삭제                          |
| entities | 도메인 데이터와 재사용 계약             | Project/Analytics 스키마, API 어댑터, Query 옵션 |
| shared   | 특정 비즈니스 행동에 종속되지 않는 기반 | shadcn UI, fetch transport, env 검증, format     |

하위 레이어만 가져올 수 있습니다. 같은 레이어의 서로 다른 슬라이스는 직접 가져오지 않습니다. 공통 동작은 하위 레이어로 내리거나 상위 레이어에서 props/콜백으로 조합합니다. `app`과 `shared`에는 슬라이스가 없으며 세그먼트끼리 참조할 수 있습니다. 필요 없는 레이어/빈 폴더를 미리 만들지 않습니다.

`pages`, `widgets`, `features`, `entities`의 외부 소비자는 슬라이스 루트 `index.ts`를 사용합니다. 내부 파일 위치는 구현 세부사항입니다. `shared`는 `@/shared/ui/button`, `@/shared/lib/utils`처럼 파일 단위 경로를 허용합니다.

```ts
// 다른 슬라이스는 공개 API 사용
import { projectSchema, projectsQueryOptions } from '@/entities/project'
import { Button } from '@/shared/ui/button'

// 같은 슬라이스 내부에서는 상대 경로 사용
import { httpProjectAdapter } from './http'
```

`@/entities/project/api/http`처럼 내부 파일을 외부에서 직접 가져오거나 `features/a → features/b`로 연결하면 `pnpm check:architecture`가 실패합니다. 정적 import, 재수출, import type, 문자열 dynamic import, require 및 상대 경로를 모두 확인합니다. 검사할 수 없는 계산형 dynamic import와 `import.meta.glob`은 금지합니다.

`src`의 코드는 위 여섯 레이어에 둡니다. 예외는 앱 진입점 `src/main.tsx`와 테스트 초기화 파일 `src/test/setup.ts`뿐이며 다른 소스가 이 두 파일을 가져올 수는 없습니다. `src/utils` 같은 별도 루트 폴더를 거쳐 레이어 경계를 우회하는 import도 거부합니다.

## 상태의 소유권

| 상태                            | 소유자                    | 이유                                                |
| ------------------------------- | ------------------------- | --------------------------------------------------- |
| 경로와 탐색                     | TanStack Router           | 새로고침/직접 링크에 일관된 진입점                  |
| 차트 기간·검색·필터·정렬·페이지 | TanStack Router search    | Zod 검증 후 새로고침·뒤로/앞으로·직접 링크에서 복원 |
| 원격/샘플 조회 데이터           | TanStack Query            | 캐시, 로딩/오류, 요청 취소, mutation 후 무효화      |
| 워크스페이스 이름/compact mode  | Zustand                   | 서버와 독립적인 UI 환경 설정의 명시적 소유권        |
| 언어·표시 통화                  | Zustand                   | 검증·저장하는 독립적인 UI 환경 설정                 |
| USD/KRW 기준 환율               | TanStack Query            | 공개 API의 검증된 원격 데이터와 공유 캐시           |
| light/dark/system 테마          | shadcn Vite ThemeProvider | 공식 Vite recipe 기반의 class 적용/시스템 테마 구독 |
| 폼 입력/열린 대화상자           | 해당 컴포넌트/feature     | 수명이 짧고 다른 영역에 공개할 이유가 없음          |

Query 결과를 Zustand에 복제하지 않습니다. 서버 상태의 진실 공급원은 서버이며 데모에서는 API 어댑터입니다. API 응답은 Zod로 검증하고 컴포넌트에는 검증된 도메인 데이터를 전달합니다. 데이터 어댑터는 `demo`와 `api` 모드에서 같은 계약을 따릅니다. 캐시 수명·무효화·화면 갱신은 [Query 캐시](query-cache.md), 응답/페이지/정렬/저장 규칙은 [API 계약](api-contract.md)이 소유합니다.

테마 provider는 `app/providers/theme-provider.tsx`, context와 `useTheme`는 `shared/lib/theme.ts`에 둡니다. 따라서 shared UI의 Sonner나 화면이 app 레이어를 거슬러 가져오지 않습니다. `blueprint-theme`에 `light`/`dark`/`system`만 저장하며, system 모드에서는 OS 설정 변경을 구독합니다. 배경은 공식 shadcn 토큰이 선택된 root class에 따라 바뀝니다. [테마 구현 결정](adr/003-vite-theme-provider.md)을 참고하세요.

`shared/lib/i18n`은 번역 리소스, UI 환경 설정, locale formatter와 주입용 환율 context를 소유합니다. `entities/exchange-rate`가 실제 공개 API의 응답 검증과 Query 옵션을 소유하고 앱의 `CurrencyProvider`가 결과를 shared context에 주입합니다. 따라서 shared는 entity/app을 역으로 가져오지 않으며 환율을 Zustand에 복제하지 않습니다. `LocalizationProvider`는 i18next와 문서 언어를 연결합니다. 자세한 계약은 [언어와 표시 통화](i18n.md)를 참고합니다.

## UI와 스타일

상단 KPI는 `shared/ui/metric-card`가 기존 shadcn Card와 Stack을 조합합니다. 서버 데이터·숫자 formatter·환율은 호출부가 전달하며 shared에서 features/entities를 가져오지 않습니다. 페이지는 카드의 크기·여백·타이포그래피를 덮어쓰지 않고 [공통 조합](design/compositions.md)을 따릅니다.

shadcn 컴포넌트는 `src/shared/ui`에 두며 [shadcn의 CSS 변수 테마 방식](https://ui.shadcn.com/docs/theming)을 사용합니다. 컨트롤은 이 계층에서만 정의합니다. 페이지에서 native button/input 또는 Radix primitive를 직접 조합해 또 다른 UI 시스템을 만들지 않습니다. `main`, `section`, `header`, `p`, `a` 등 의미 있는 문서 구조는 일반 HTML을 사용해도 됩니다. 페이지 최상위 h1과 헤더 칩은 `shared/ui/page-header`가 소유합니다. 기존 Stack·Badge를 사용하는 문서 구조 조합이며 별도 UI primitive나 의존성을 추가하지 않습니다. [페이지 헤더 규칙](design/page-headers.md)을 따릅니다.

본문·푸터의 텍스트 탐색에는 `shared/ui/text-link`의 승인된 shadcn 조합을 사용합니다. `TextLink`는 기존 Button link variant와 anchor를 조합하며 `RouterTextLink`는 TanStack `createLink`로 내부 경로 타입을 보존합니다. Sidebar/Breadcrumb 등의 기존 탐색 컨트롤은 유지합니다. 예외 범위는 [ADR 004](adr/004-text-link-composition.md), 동작/API 계약은 [텍스트 링크 규칙](design/text-links.md)이 소유합니다.

`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`, `chart-*` 등 의미 토큰을 사용합니다. `bg-blue-500` 또는 `bg-[#123456]`처럼 화면별 색을 하드코딩하지 않습니다. 임의 너비/그리드 값 같은 Tailwind 레이아웃 유틸리티는 허용합니다.

CSS 파일은 `src/app/styles/globals.css` 하나입니다. 여기에 Tailwind import, shadcn light/dark 토큰, `@theme`, 기본 `@apply`를 둡니다. 화면별 CSS, CSS Modules, Sass, styled-components/Emotion은 사용하지 않습니다. 공식 shadcn 컴포넌트의 차트/사이드바처럼 동적 CSS 변수 또는 내부 style 태그가 필요한 생성 코드만 `shared/ui`에서 허용합니다. 이것은 임의 스타일을 그 폴더로 옮기는 우회 경로가 아닙니다.

Pretendard는 버전을 고정한 jsDelivr CDN에서 400/500/600 동적 subset만 불러오며 앱 번들에는 폰트를 포함하지 않습니다. 텍스트는 normal/medium/semibold만 사용하고, brand는 neutral primary와 별도 토큰으로 관리합니다. 앱 레이아웃은 md(768px)/xl(1280px)의 세 구간으로 구성하며 생성된 shadcn primitive의 기본 반응형 동작은 유지합니다. 상세 계약은 [디자인 시스템 인덱스](design-system.md)에서 해당 주제만 읽습니다. 직접 작성하는 가로/세로 배치는 `shared/ui/stack`의 HStack/VStack으로 통일하고 교차축 중앙 정렬을 기본으로 합니다. 그리드와 의미 있는 HTML, 설치된 shadcn 내부는 유지합니다. 허용 범위는 [ADR 005](adr/005-stack-layout.md), API와 정렬 예외는 [레이아웃](design/layout.md)이 소유하며 외부 레이아웃 패키지는 추가하지 않습니다. 앱 UI는 한국어/영어와 독립적인 USD/KRW 설정을 지원하며 RTL은 포함하지 않습니다. 번역·저장·환율 경계는 [언어와 표시 통화](i18n.md)를 따릅니다. 수량·금액·비율 표기는 [숫자 표시](number-formatting.md)의 공통 함수가 소유합니다. 로딩·skeleton·숫자 모션은 [로딩과 모션](loading-and-motion.md)이 소유합니다.

Analytics, Orders, Customers의 조회 데이터는 각각 `entities/traffic`, `entities/order`, `entities/customer`가 Query와 응답 스키마를 소유합니다. 데모에서는 샘플을 반환하며 운영 데이터나 계정이 있다고 표현하지 않도록 Sample 안내를 유지합니다. Inbox의 읽음/보관 상태는 페이지 내부 샘플이며 화면을 떠나면 초기화됩니다. 실제 수신함 연결 시 도메인 계약을 `entities`로, 사용자의 변경 행동을 `features`로 분리합니다. Query 데이터나 샘플 fixture를 Zustand에 복제하지 않습니다.

## 자동 검사와 한계

- TypeScript strict 및 ESLint typed rules로 타입 경계, 미처리 Promise, React Hooks, Query 사용을 검사합니다. E2E 파일도 별도 TypeScript 프로젝트로 검사하고 비동기 브라우저 동작/검증의 누락된 `await`를 ESLint로 확인합니다.
- `scripts/check-architecture.mjs`는 TypeScript AST로 FSD import와 JSX 컨트롤/style을 검사합니다. 파일 내부 `const` 별칭, 정적 객체·중첩 spread·문자열 키를 따라가며 매개변수·블록·함수의 이름 가림과 순환을 구분합니다. JSX에 나중에 명시한 prop과 정적 spread의 덮어쓰기 순서를 유지합니다. CSS 파일 위치/선택자와 고정 팔레트 유틸리티도 확인합니다. 숫자 포맷 소유 파일과 테스트 밖의 직접 `Intl.NumberFormat`·`toFixed`·`toPrecision` 호출을 거부합니다. 숫자 `toLocaleString`과 수량을 포함한 문자열 등의 전체 사용 규칙은 리뷰로 확인합니다.
- 색상·두께 유틸리티는 실제 `className`, 클래스 조합 함수와 `cva`의 클래스 입력에서 검사합니다. 번역·설명·variant 이름 같은 일반 문자열은 클래스가 아닙니다. JSX 색상 prop, ChartConfig 및 차트 config/style의 색상도 검사합니다. 다른 파일의 값, 함수 호출 결과, mutable binding, 보이는 쓰기로 변경된 객체와 해석할 수 없는 spread는 안전하다고 증명하지 않습니다. 객체를 외부 함수에 넘긴 뒤의 변경 등 전체 데이터 흐름도 분석하지 않으므로 해당 경계는 리뷰가 담당합니다.
- 가드레일 회귀 테스트는 허용/금지 import, 상대 경로, 동적 import, UI/색상 규칙을 고정합니다.
- 정적 검사는 shadcn 코드의 출처, 실제 접근성, 런타임 환경, 브라우저 동작을 보증하지 않습니다. 코드 리뷰와 브라우저 검증을 함께 수행합니다.

로컬 기본 명령 `pnpm check`는 정적 검사만 수행합니다. 전체 단위/브라우저 테스트는 Actions에서 실행하고, 로컬 재현은 변경과 관련된 최소 범위로 제한합니다. [테스트 실행 정책](testing.md)을 참고하세요.

규칙 변경은 코드와 테스트 및 이 문서를 함께 변경하세요. 검사 실패를 피하기 위한 전역 ignore는 추가하지 않습니다. TanStack Table 관련 한 줄 예외는 [ADR](adr/001-tanstack-table-react-compiler.md)에 기록되어 있습니다.
