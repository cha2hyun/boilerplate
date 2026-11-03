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

| 상태                           | 소유자                    | 이유                                                |
| ------------------------------ | ------------------------- | --------------------------------------------------- |
| 경로와 탐색                    | TanStack Router           | 새로고침/직접 링크에 일관된 진입점                  |
| 원격/샘플 조회 데이터          | TanStack Query            | 캐시, 로딩/오류, 요청 취소, mutation 후 무효화      |
| 워크스페이스 이름/compact mode | Zustand                   | 서버와 독립적인 UI 환경 설정의 명시적 소유권        |
| light/dark/system 테마         | shadcn Vite ThemeProvider | 공식 Vite recipe 기반의 class 적용/시스템 테마 구독 |
| 폼 입력/열린 대화상자          | 해당 컴포넌트/feature     | 수명이 짧고 다른 영역에 공개할 이유가 없음          |

Query 결과를 Zustand에 복제하지 않습니다. 서버 상태의 진실 공급원은 서버이며 데모에서는 API 어댑터입니다. API 응답은 Zod로 검증하고 컴포넌트에는 검증된 도메인 데이터를 전달합니다. 데이터 어댑터는 `demo`와 `api` 모드에서 같은 계약을 따릅니다. 캐시 수명·무효화·화면 갱신은 [Query 캐시](query-cache.md), 응답/페이지/정렬/저장 규칙은 [API 계약](api-contract.md)이 소유합니다.

테마 provider는 `app/providers/theme-provider.tsx`, context와 `useTheme`는 `shared/lib/theme.ts`에 둡니다. 따라서 shared UI의 Sonner나 화면이 app 레이어를 거슬러 가져오지 않습니다. `blueprint-theme`에 `light`/`dark`/`system`만 저장하며, system 모드에서는 OS 설정 변경을 구독합니다. 배경은 공식 shadcn 토큰이 선택된 root class에 따라 바뀝니다. [테마 구현 결정](adr/003-vite-theme-provider.md)을 참고하세요.

## UI와 스타일

shadcn 컴포넌트는 `src/shared/ui`에 두며 [shadcn의 CSS 변수 테마 방식](https://ui.shadcn.com/docs/theming)을 사용합니다. 컨트롤은 이 계층에서만 정의합니다. 페이지에서 native button/input 또는 Radix primitive를 직접 조합해 또 다른 UI 시스템을 만들지 않습니다. `main`, `section`, `header`, `h1`, `p`, `a` 등 의미 있는 문서 구조는 일반 HTML을 사용해도 됩니다.

`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`, `chart-*` 등 의미 토큰을 사용합니다. `bg-blue-500` 또는 `bg-[#123456]`처럼 화면별 색을 하드코딩하지 않습니다. 임의 너비/그리드 값 같은 Tailwind 레이아웃 유틸리티는 허용합니다.

CSS 파일은 `src/app/styles/globals.css` 하나입니다. 여기에 Tailwind/폰트 import, shadcn light/dark 토큰, `@theme`, 기본 `@apply`를 둡니다. 화면별 CSS, CSS Modules, Sass, styled-components/Emotion은 사용하지 않습니다. 공식 shadcn 컴포넌트의 차트/사이드바처럼 동적 CSS 변수 또는 내부 style 태그가 필요한 생성 코드만 `shared/ui`에서 허용합니다. 이것은 임의 스타일을 그 폴더로 옮기는 우회 경로가 아닙니다.

Pretendard는 400/500/600 동적 subset만 번들에 포함합니다. 텍스트는 normal/medium/semibold만 사용하고, brand는 neutral primary와 별도 토큰으로 관리합니다. 앱 레이아웃은 md(768px)/xl(1280px)의 세 구간으로 구성하며 생성된 shadcn primitive의 기본 반응형 동작은 유지합니다. 상세 계약은 [디자인 시스템 인덱스](design-system.md)에서 해당 주제만 읽습니다. 가로/세로 배치는 HTML + Tailwind 조합이며 별도 HStack/VStack primitive나 SEED 의존성을 추가하지 않습니다. 국제화 문서는 확장 기준이며 앱 전체 번역/RTL 구현을 뜻하지 않습니다. 로딩·skeleton·숫자 모션은 [로딩과 모션](loading-and-motion.md)이 소유합니다.

Analytics, Orders, Customers의 조회 데이터는 각각 `entities/traffic`, `entities/order`, `entities/customer`가 Query와 응답 스키마를 소유합니다. 데모에서는 샘플을 반환하며 운영 데이터나 계정이 있다고 표현하지 않도록 Sample 안내를 유지합니다. Inbox의 읽음/보관 상태는 페이지 내부 샘플이며 화면을 떠나면 초기화됩니다. 실제 수신함 연결 시 도메인 계약을 `entities`로, 사용자의 변경 행동을 `features`로 분리합니다. Query 데이터나 샘플 fixture를 Zustand에 복제하지 않습니다.

## 자동 검사와 한계

- TypeScript strict 및 ESLint typed rules로 타입 경계, 미처리 Promise, React Hooks, Query 사용을 검사합니다. E2E 파일도 별도 TypeScript 프로젝트로 검사하고 비동기 브라우저 동작/검증의 누락된 `await`를 ESLint로 확인합니다.
- `scripts/check-architecture.mjs`는 TypeScript AST로 FSD import와 JSX 컨트롤/style을 검사합니다. CSS 파일 위치/선택자와 고정 팔레트 유틸리티도 확인합니다.
- 가드레일 회귀 테스트는 허용/금지 import, 상대 경로, 동적 import, UI/색상 규칙을 고정합니다.
- 정적 검사는 shadcn 코드의 출처, 실제 접근성, 런타임 환경, 브라우저 동작을 보증하지 않습니다. 코드 리뷰와 브라우저 검증을 함께 수행합니다.

로컬 기본 명령 `pnpm check`는 정적 검사만 수행합니다. 전체 단위/브라우저 테스트는 Actions에서 실행하고, 로컬 재현은 변경과 관련된 최소 범위로 제한합니다. [테스트 실행 정책](testing.md)을 참고하세요.

규칙 변경은 코드와 테스트 및 이 문서를 함께 변경하세요. 검사 실패를 피하기 위한 전역 ignore는 추가하지 않습니다. TanStack Table 관련 한 줄 예외는 [ADR](adr/001-tanstack-table-react-compiler.md)에 기록되어 있습니다.
