# Components

<!-- page-route: /components -->

## 목적과 범위

제품을 만드는 사람이 설치된 UI 구성 요소의 조합·상태·토큰·서체를 체험합니다. 입력·진행·알림은 화면 데모이며 프로젝트 저장이나 사용자 알림 설정을 변경하지 않습니다. 문서/프로젝트 링크 이동은 실제 탐색입니다.

## 정보 구조와 주요 행동

PageHeader와 외부 UI 문서 → 컴포넌트/토큰/타이포그래피 탭입니다. 컴포넌트 탭은 링크·버튼·상태·입력·피드백·진행·로딩 예제를 제공합니다. 탭으로 탐색하고 개별 예제를 조작합니다. [화면 조합](../design/compositions.md)의 예제 카드 구조를 사용합니다.

## 조회·조작 계약

버튼은 토스트, 스위치는 현재 예제의 설명, 진행 버튼은 진행 값과 완료 후 초기화를 바꿉니다. 대화상자는 닫기/Escape/확인으로 종료합니다. 입력/체크박스는 로컬 체험이며 저장 버튼이나 API 제출은 없습니다. 탭과 컨트롤은 URL·전역 설정에 저장하지 않습니다. 전체 초기화·내보내기는 없고 진행 초기화만 해당 예제에 적용합니다. 내부 링크·새 탭·외부 링크는 [텍스트 링크](../design/text-links.md)의 계약을 따릅니다.

## 상태별 화면

페이지 Query가 없으므로 최초 로딩·재조회·네트워크 오류·빈 결과는 없습니다. 보이는 skeleton·비활성 처리 버튼·상태 배지·알림은 각각의 표현 예제이고 실제 요청 상태가 아닙니다. 대화상자의 초점 가두기·종료 후 초점 복구는 실제 상호작용입니다.

## 반응형 동작

| 구간                | 배치·스크롤·초점                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------- |
| 모바일 `< 768px`    | 카드·토큰·서체 예제 1열, 탭 자체 가로 스크롤, 버튼 묶음 줄바꿈, 대화상자 화면 안 배치입니다. |
| 태블릿 `768–1279px` | 컴포넌트 카드는 1열, 토큰은 3열이며 액션은 폭에 따라 줄바꿈합니다.                           |
| PC `≥ 1280px`       | 컴포넌트 2열, 토큰/서체 예제 3열입니다.                                                      |

한국어/영어 라벨과 긴 예제 설명이 카드 밖으로 넘치지 않는지 [긴 콘텐츠](../design/content-overflow.md) 기준으로 확인합니다.
탭은 좁은 화면과 확대 텍스트에서 키보드로 끝까지 이동할 수 있어야 하며 본문을 가로로 밀지 않습니다. 초점을 받은 탭은 자체 스크롤 영역 안에 표시합니다. 예제 버튼·알림 제목은 줄바꿈으로 전체 문구를 보존하며 카드의 최소 콘텐츠 폭이 본문을 밀어내지 않습니다. 한 줄 버튼은 기본 36px·작은 크기 32px를 유지하고, PC에서 같은 행의 예제 카드 상·하단 경계를 맞춥니다.

## 상태 소유권과 구현 근거

- URL/Query: [라우트](../../src/app/routes/components.tsx)는 조회 조건과 Query를 만들지 않습니다.
- 임시 상태: [화면](../../src/pages/components/ui/components-page.tsx)의 스위치·대화상자·진행 값과 primitive 내부 입력/탭 상태. 새로고침에 지속하지 않습니다.
- 공통 소유: [색상](../design/color.md), [서체](../design/typography.md), [국제화](../i18n.md). 값이나 번역 문자열을 이 명세에 복제하지 않습니다.

## 수용 기준

- 대화상자 열기/닫기 → 원래 버튼으로 초점 복구: [workspace E2E](../../e2e/workspace.spec.ts)의 `recovers from an unknown route and returns focus after closing a component dialog`.
- 화면 구간별 헤더와 탐색: 같은 파일의 `keeps page titles and header badges consistent through responsive sidebar navigation`. 링크 동작의 단위 근거는 [링크 정책 테스트](../../src/shared/lib/link-policy.test.ts)입니다.
- 토스트 종류·진행 초기화·체험 입력 비지속성 전체는 현재 개별 자동 검사가 없습니다. 해당 예제 변경 시 상호작용을 수동 확인하고 기존 검사가 증명하는 범위와 구분합니다.
- 작은 화면·확대 텍스트의 탭 이동과 PC 카드 경계: 같은 workspace E2E의 `keeps support-page actions, tabs, and example text within narrow content areas`, `aligns paired component example card edges on desktop`.

주요 카드의 섹션 제목은 `CardTitle asChild`와 h2로 구성합니다. KPI 값은 heading으로 노출하지 않으며 제목 계층의 기준과 검증은 [접근성 계약](../design/accessibility.md)을 따릅니다.
