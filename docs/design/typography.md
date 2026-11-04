# 타이포그래피

기본 UI 서체는 [Pretendard 1.3.9](https://github.com/orioncactus/pretendard/tree/v1.3.9)의 **동적 subset**입니다. 공식 패키지의 Regular/Medium/SemiBold CSS만 가져오며 unicode-range에 해당하는 글리프 조각을 브라우저가 선택해서 요청합니다. Vite가 폰트를 같은 출처의 해시 자산으로 배포하므로 런타임 외부 CDN이 필요하지 않습니다. 전체 폰트/모든 subset을 preload하지 않습니다.

작은 폰트 조각도 CSS에 base64로 포함하지 않도록 Vite의 font asset inlining을 끕니다. 그래야 화면에 쓰이지 않는 글리프가 초기 CSS와 함께 전송되지 않고 `unicode-range`에 따라 요청됩니다. 다른 작은 자산은 Vite 기본 정책을 유지합니다.

| 두께         | Tailwind        | 역할                                             |
| ------------ | --------------- | ------------------------------------------------ |
| 400 Regular  | `font-normal`   | 본문, 설명, 입력값, 표 데이터, 보조 문구         |
| 500 Medium   | `font-medium`   | 버튼·탭·메뉴, 필드 레이블, 행 제목, 작은 강조    |
| 600 SemiBold | `font-semibold` | 페이지·카드·대화상자 제목, KPI 숫자, 중요한 강조 |

크기·간격·의미 토큰으로 위계를 표현하고 추가 두께를 만들지 않습니다. `font-bold`/700을 포함한 나머지 두께, 임의 weight(`font-[650]`), inline fontWeight, font-variation-settings override는 금지합니다. `b`/`strong`도 600으로 제한합니다. 합성 굵기를 막으며 세 weight 외 Tailwind weight 토큰은 초기화합니다. 기존 shadcn의 400/500/600 사용은 그대로 둡니다.

문서/코드/키보드 표기의 의미 있는 monospace는 허용하지만 일반 UI에 별도 장식 폰트를 도입하지 않습니다. 글꼴 로딩 실패 시 시스템 sans-serif로 대체합니다.

## 크기와 읽기 위계

| 역할           | 기본 조합                                         | 기준                                               |
| -------------- | ------------------------------------------------- | -------------------------------------------------- |
| 페이지 제목    | `text-2xl leading-8 font-semibold tracking-tight` | 모든 화면 24px/600, 공통 PageHeader가 h1 하나 제공 |
| 섹션 제목      | `text-lg font-semibold`                           | 의미 있는 h2/h3로 문서 순서 유지                   |
| 본문·표 데이터 | `text-sm font-normal leading-6`                   | 긴 안내는 줄 높이와 읽기 너비 확보                 |
| 레이블·행 제목 | `text-sm font-medium`                             | 입력값과 설명보다 분명한 위계                      |
| 보조 설명      | `text-xs text-muted-foreground`                   | 중요한 오류/결정 정보를 작은 글자에 숨기지 않음    |
| KPI            | `text-3xl font-semibold tabular-nums`             | 단위·기간·레이블을 함께 표시                       |

본문 크기는 rem 기반 Tailwind 스케일을 사용합니다. 한글과 영문을 함께 확인하고 줄 수가 늘어도 잘리지 않게 합니다. 고정 높이로 본문을 가두지 않습니다. 목록 제목은 필요한 경우 `min-w-0`와 `truncate`, 상세 본문은 `break-words`를 사용합니다. 금액/식별자/날짜의 생략은 사용자가 전체 값을 확인할 수 있을 때만 허용합니다.

수량·금액·비율의 문자열은 [숫자 표시](../number-formatting.md)의 공통 함수로 만들고, 정렬이 필요한 숫자는 `tabular-nums`를 사용합니다. 숫자 모션과 최종 문자열 너비 예약은 [로딩과 모션](../loading-and-motion.md)을 따릅니다.

페이지 제목·설명·칩의 조합은 [페이지 헤더 규칙](page-headers.md)이 소유합니다. 페이지에서 h1 크기를 개별 지정하거나 breakpoint에 따라 제목만 키우지 않습니다.

소유 코드: `src/app/styles/globals.css`, `src/shared/ui/page-header.tsx`, `vite.config.ts`. 화면 표본: Components → Typography, Foundations → 기본.
