# 디자인 시스템

Blueprint는 **기존 shadcn UI → Tailwind 의미 토큰 → Pretendard 400/500/600**을 우선합니다.

작업에 해당하는 문서만 읽으세요. 문서 전체를 AGENTS.md나 프롬프트에 붙이지 않습니다.

| 작업                                      | 읽을 계약                                 |
| ----------------------------------------- | ----------------------------------------- |
| 컴포넌트 선택, 아이콘, 표면, 접근성, 상태 | [기본 원칙](design/principles.md)         |
| 텍스트 링크, 외부 새 탭, Router 연결      | [텍스트 링크](design/text-links.md)       |
| 글꼴·제목·본문·숫자                       | [타이포그래피](design/typography.md)      |
| 페이지 제목·설명·Sample 배지·작업 컨트롤  | [페이지 헤더](design/page-headers.md)     |
| neutral/brand, 상태 색상, light/dark      | [색상](design/color.md)                   |
| HStack/VStack, 중앙 정렬, 간격, 반응형    | [레이아웃](design/layout.md)              |
| KPI·카드·목록·폼의 공통 조합              | [화면 조합](design/compositions.md)       |
| 긴 제목·금액·본문·표 셀                   | [긴 콘텐츠](design/content-overflow.md)   |
| 키보드·확대·대비·오류 연결                | [접근성](design/accessibility.md)         |
| 기준 이미지·시각 차이 검토                | [시각 회귀](design/visual-regression.md)  |
| 스크롤바, 문서 너비, 기본 스크롤 입력     | [스크롤](design/scrolling.md)             |
| 날짜·숫자·통화, 긴 번역, 방향성           | [국제화](design/international-design.md)  |
| 서비스의 말투와 상황별 표현               | [보이스와 톤](design/voice-and-tone.md)   |
| 버튼·폼·오류·빈 결과 문구                 | [라이팅](design/writing.md)               |
| 전환·피드백의 목적, reduced motion        | [모션](design/motion.md)                  |
| 수량·통화·백분율·축약 표시                | [숫자 표시](number-formatting.md)         |
| 실제 로딩·skeleton·숫자 전환 구현         | [로딩과 모션 계약](loading-and-motion.md) |

실제 조합은 앱의 **Foundations**, 개별 shadcn 컴포넌트·폰트·색상은 **Components**에서 확인합니다. Foundations는 화면에 적용할 규칙을 보여주는 예시입니다. 앱의 한국어/영어와 USD/KRW 지원 범위는 [언어와 표시 통화](i18n.md)를 따르며 RTL은 포함하지 않습니다.

페이지 제목과 제목 옆 배지는 공통 `PageHeader`를 사용합니다. 모바일·태블릿·데스크톱에서 같은 제목 크기를 유지하며 페이지별 hero·eyebrow·타이포그래피 예외를 만들지 않습니다. API와 Sample 문구는 [페이지 헤더 계약](design/page-headers.md)을 따릅니다.

`pnpm check:architecture`는 금지 weight, 하드코딩 색상, FSD/UI 경계와 직접 layout div·Stack 정렬 덮어쓰기를 검사합니다. 페이지의 직접 h1, 공통 PageHeader 사용 누락·명시적 덮어쓰기, 직접 Sample Badge도 정적 범위에서 검사합니다. 실행 시점의 제목 수, 대비·긴 문구·초점·모션은 정적 검사만으로 보장되지 않습니다. 검증 범위는 [페이지 헤더 계약](design/page-headers.md)과 [테스트 정책](testing.md)을 따릅니다. 데이터/빌드 등 다른 작업은 [문서 지도](README.md)에서 시작하세요.
