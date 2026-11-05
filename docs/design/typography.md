# 타이포그래피

기본 UI 서체는 [Pretendard 1.3.9](https://github.com/orioncactus/pretendard/tree/v1.3.9)의 **동적 subset**입니다. `index.html`이 jsDelivr의 공식 npm 패키지에서 Regular/Medium/SemiBold CSS를 직접 불러오며, unicode-range에 해당하는 글리프 조각도 브라우저가 CDN에서 선택해서 요청합니다. 버전은 `1.3.9`로 고정하고 `latest`나 전체 두께·전체 폰트 CSS로 교체하지 않습니다.

CDN 기준 경로는 `https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/`입니다. `crossorigin` preconnect로 연결을 준비하고 공식 CSS의 `font-display: swap`을 유지합니다. 전체 폰트/모든 subset을 preload하거나 Vite 번들에 중복 포함하지 않습니다. 배포 환경에서 CSP를 설정한다면 `style-src`와 `font-src`에 `https://cdn.jsdelivr.net`을 허용해야 합니다.

`pretendard` 개발 의존성은 브랜드 이미지 생성과 결정적인 E2E 응답에만 사용합니다. 버전을 변경할 때 `index.html`, `package.json`/lockfile, E2E의 CDN 경로와 이 문서를 함께 맞춥니다. 실제 CDN 응답·CORS는 별도로 확인하고 브라우저 회귀 검사는 [테스트 정책](../testing.md)에 따라 같은 버전의 원본 파일을 사용합니다.

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
| KPI            | `text-3xl leading-9 font-semibold tabular-nums`   | 공통 MetricCard에서 단위·기간·레이블을 함께 표시   |

본문 크기는 rem 기반 Tailwind 스케일을 사용합니다. 한글과 영문을 함께 확인하고 줄 수가 늘어도 잘리지 않게 합니다. 고정 높이로 본문을 가두지 않습니다. 목록 제목은 전체 내용을 여는 상세 경로가 있을 때 `min-w-0`와 `truncate`, 공백 없는 문자열을 포함할 수 있는 상세 본문은 `wrap-anywhere`를 사용합니다. 금액/식별자/날짜의 전체 확인과 숫자 줄바꿈은 [긴 콘텐츠](content-overflow.md)를 따릅니다. KPI 금액만 별도 breakpoint에서 작게 만들거나 자동 축약하지 않습니다.

수량·금액·비율의 문자열은 [숫자 표시](../number-formatting.md)의 공통 함수로 만들고, 정렬이 필요한 숫자는 `tabular-nums`를 사용합니다. 숫자 모션과 최종 문자열 너비 예약은 [로딩과 모션](../loading-and-motion.md)을 따릅니다.

페이지 제목·설명·칩의 조합은 [페이지 헤더 규칙](page-headers.md)이 소유합니다. 페이지에서 h1 크기를 개별 지정하거나 breakpoint에 따라 제목만 키우지 않습니다.

KPI의 레이블·숫자·footer 크기는 [공통 화면 조합](compositions.md)이 소유하며 페이지에서 재정의하지 않습니다.

소유 코드: `index.html`, `src/app/styles/globals.css`, `src/shared/ui/page-header.tsx`, `src/shared/ui/metric-card.tsx`. 화면 표본: Components → Typography, Foundations → 기본·피드백.
