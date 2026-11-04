# 작업 계획: 페이지 제목과 헤더 칩 통일

상태: 구현·정적 검사 완료 · 원격 테스트 보류

## 문제와 완료 조건

- 제목이 페이지별 24px/30px이고 Sample 칩은 outline/secondary가 섞여 있습니다.
- 9개 페이지 모두 제목 24px·굵기 600·줄 높이 32px를 유지하고 동일한 outline 헤더 칩을 사용합니다. 모바일·태블릿·PC에서 크기 정책이 같아야 합니다.
- Overview의 상단 작은 문구와 슬로건을 제거하고 메뉴와 같은 ‘개요’/‘Overview’를 표시합니다. Components도 메뉴 이름과 제목을 맞춥니다.
- 소유 코드를 하나로 모으고 AI 문서 및 정적 검사로 페이지별 스타일 재정의를 방지합니다.

## 변경 경계

- `shared/ui/page-header`: 기존 HStack/VStack·shadcn Badge와 의미 있는 header/h1을 조합합니다. 문구와 액션만 받고 className·size·variant 덮어쓰기는 공개하지 않습니다.
- `pages`: 제목·설명·칩·액션을 공통 헤더에 전달합니다. 데이터, 폼, 검색, 페이지 본문은 유지합니다.
- 번역: 한국어·영어 제목을 갱신하고 사용하지 않는 Overview eyebrow 키를 제거합니다.
- 검사·문서: 기존 아키텍처 검사와 workspace E2E 범주에 계약을 넣습니다. 정책 상세는 [페이지 헤더](../design/page-headers.md)에 둡니다.

## 검증

- 기본 정적 검사: `pnpm check`.
- 새 가드레일의 허용/금지 사례만 선택해 로컬 재현합니다. 전체 로컬 단위/E2E/빌드는 실행하지 않습니다.
- 필요한 화면에서 제목·칩 크기, 중심 정렬, 세 화면 구간과 언어를 수동 확인합니다.
- 기존 workspace E2E의 페이지 탐색 흐름에서 공통 제목과 칩 스타일의 계산값을 비교합니다. 사용자 지시로 Actions·PR·main 머지는 보류합니다.

## 완료 기록

- 공통 헤더를 9개 페이지에 적용했고 Sample·Workspace·Blueprint standards 모두 같은 Badge 조합을 사용합니다.
- 가드레일 관련 11개 선택 테스트가 통과했습니다. 전체 로컬 단위/브라우저 테스트·빌드는 실행하지 않았습니다.
- `pnpm check`의 포맷·ESLint·TypeScript·아키텍처·E2E 범주 검사가 통과했습니다.
- Chrome에서 1440px Projects·834px Analytics·390px Inbox의 제목 크기 24px, 제목/칩 박스 중심 차이 0px, 페이지 가로 넘침 0px를 확인했습니다. Projects와 Inbox는 한국어에서도 중심 차이가 0px였습니다.
- Overview는 h1 하나의 ‘Overview’ 제목과 기존 설명·액션만 표시합니다. 1440×1000에서 문서 높이는 1584px로, 기존 gutter 회귀 검사의 긴 페이지 조건도 유지됩니다.
- 기존 workspace E2E 탐색에 9개 페이지 제목과 모든 헤더 칩의 스타일·정렬 검사를 넣었습니다. E2E/Actions 실행·PR·main 머지는 사용자 지시로 보류합니다.
