# 페이지 제목과 Sample 배지

라우트 페이지의 제목·설명·제목 옆 배지는 [`shared/ui/page-header.tsx`](../../src/shared/ui/page-header.tsx)의 `PageHeader`가 소유합니다. 기존 **HStack/VStack + native h1 + shadcn Badge** 조합이며 새 primitive나 UI 의존성이 아닙니다. 페이지에서 헤더 마크업을 복사하거나 자체 hero·eyebrow·별도 제목 크기를 만들지 않습니다.

## 하나의 표현

| 요소         | 공통 표현                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 제목         | 페이지당 h1 하나. `text-2xl leading-8 font-semibold tracking-tight`: 기본 글꼴 크기 16px에서 **24px / 600 / 줄 높이 32px** |
| 설명         | 필요한 경우 제목 아래 `text-sm leading-6 text-muted-foreground`, 읽기 너비 `max-w-2xl`                                     |
| 제목 옆 배지 | 기존 Badge의 `outline`, 기본 `text-xs font-medium`, `text-muted-foreground`                                                |
| 제목과 배지  | HStack의 `align="center"` 기본값으로 세로 중심 정렬, `gap-2.5`, 필요한 경우 줄바꿈                                         |
| 작업 컨트롤  | `actions`에 기존 Button·Select 등을 전달. 좁은 화면에서는 제목 아래, 태블릿부터 제목 영역 옆에 배치                        |

**모바일·태블릿·데스크톱 모두 제목은 같은 24px/600/32px 기준**입니다. 화면 구간에 따라 제목을 확대하지 않습니다. rem 단위를 유지하므로 브라우저 확대와 사용자 글꼴 설정은 존중합니다. 긴 한국어·영어 제목과 설명은 줄바꿈하며 고정 높이로 자르지 않습니다. 페이지의 바깥 여백·본문 배치는 페이지가 관리하고 헤더 내부 크기·정렬·색은 공통 구현에서만 바꿉니다.

## API와 문구

```tsx
interface PageHeaderProps {
  title: string
  description?: string
  badgeLabel?: string
  actions?: ReactNode
}

// 페이지의 기존 번역 namespace와 key를 유지한다.
;<PageHeader
  title={t('orders.title')}
  description={t('orders.intro')}
  badgeLabel={t('common.sample')}
/>
```

`title`은 내비게이션과 같은 페이지 이름입니다. 한 화면에서만 장식적인 이름이나 별도 상단 레이블을 붙이지 않습니다. `description`은 그 페이지에서 할 수 있는 일이나 필요한 맥락을 짧게 설명합니다. 제목을 장식하거나 부풀리는 문구를 넣지 않습니다. 기존 번역 키·언어 전환·문구 의미를 보존하며 [보이스와 톤](voice-and-tone.md), [라이팅](writing.md), [국제화](international-design.md)를 함께 따릅니다.

Sample 제목은 항상 `badgeLabel={t('common.sample')}`를 사용합니다. 페이지가 별도 Badge를 만들어 제목이나 설명 옆에 붙이거나 `Sample`/`샘플`을 하드코딩하지 않습니다. 다른 보조 레이블도 번역한 문자열로 전달합니다. 표의 주문 상태, 프로젝트 진행 상태, 필터 수량, Components의 배지 예시 등 **본문 상태 Badge는 기존 용도대로 사용**합니다.

`className`, `style`, `size`, `variant`, `titleClassName`, `children`, `asChild`는 PageHeader API가 아닙니다. 스타일 prop이나 부모의 `[&_h1]` / `[&_[data-slot=page-title]]` 선택자로 공통 제목을 덮어쓰지 않습니다. 새 헤더 요구가 생기면 페이지별 예외 대신 공통 컴포넌트와 이 계약을 함께 검토합니다.

## 검사 범위

`pnpm check:architecture`의 AST 검사는 다음 재발을 찾습니다.

- 테스트·fixture를 제외한 `src/pages` 코드의 직접 `<h1>`과 리터럴 `role="heading" aria-level="1"`.
- `*-page.tsx` 진입점에서 실제 소유 모듈의 `PageHeader` value import와 그 이름의 JSX 사용 누락. named alias·namespace import·파일 내부 const 별칭·상대 경로를 허용하며 type-only import나 같은 이름의 임의 컴포넌트만으로 충족하지 않습니다. 매개변수·지역 선언으로 import 이름을 가린 경우도 구분합니다. 기본 export 페이지와 타입이 있는 props도 허용합니다.
- PageHeader의 지원하지 않는 명시적 prop·children과 정적 객체 리터럴/const spread의 지원하지 않는 키. 같은 파일의 JSX 부모에서 직접 h1 또는 `page-title`을 대상으로 지정한 정적 타이포그래피 선택자도 클래스 const와 spread를 따라 검사합니다.
- 실제 shared Badge에 직접 쓴 `common.sample` / `admin:common.sample` 번역 호출과 리터럴 `Sample` / `샘플`. 다른 상태 배지를 일괄 금지하지 않습니다.

이 검사는 컴포넌트 실행이나 전체 TypeScript 심볼·데이터 흐름을 해석하지 않습니다. 함수 결과·다른 파일에서 가져온 값·mutable binding과 해석할 수 없는 spread/문구/클래스, 다른 파일의 부모 선택자, 임의 CSS 선택자 전체를 검증하지 않습니다. const 객체도 외부 함수가 변경할 수 있으므로 모든 실행 시점의 값을 보장하지 않습니다. JSX가 실제 라우트에서 표시되는지, 실행 시점 h1이 정확히 하나인지도 정적 사용 유무만으로 보장하지 않습니다.

타입 검사와 코드 검토에 더해 [테스트 정책](../testing.md)에 따른 화면 검증에서 라우트별 h1·한영 문구·Sample 배지·줄바꿈·컨트롤·세 화면 구간의 실제 계산 스타일을 확인합니다. 정적 검사 통과를 화면 검증 완료로 보고하지 않습니다.

관련 계약: [타이포그래피](typography.md), [레이아웃](layout.md), [기본 원칙](principles.md). 소유 코드: [`page-header.tsx`](../../src/shared/ui/page-header.tsx), 기존 [`badge.tsx`](../../src/shared/ui/badge.tsx), [`stack.tsx`](../../src/shared/ui/stack.tsx). 재발 검사: [`check-architecture.mjs`](../../scripts/check-architecture.mjs), [`check-architecture.test.mjs`](../../scripts/check-architecture.test.mjs).
