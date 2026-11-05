# Overview

<!-- page-route: / -->

## 목적과 범위

워크스페이스의 매출·고객·주문·전환 요약을 보고 프로젝트 작업으로 진입합니다. 지표와 활동은 샘플이며 실시간 운영 지표가 아닙니다. 프로젝트 생성·편집·삭제는 실제로 동작하는 데모 저장 흐름이고 운영 인증·권한을 제공하지 않습니다.

## 정보 구조와 주요 행동

PageHeader와 새 프로젝트 → KPI → 매출 차트와 최근 활동 → 프로젝트 요약 표 순서입니다. 새 프로젝트는 편집 대화상자를 열고, 활동 하단과 전체 보기 링크는 Projects로 이동합니다. 요약 표의 이름/행 메뉴로 편집·삭제를 이어갑니다. [화면 조합](../design/compositions.md)의 대시보드 구조를 사용합니다.

## 조회·조작 계약

- 기간은 **매출 차트의 데이터 구간·합계·비교·날짜 설명만** 바꿉니다. 상단 KPI, 활동, 프로젝트에는 적용되지 않습니다. 원본 매출 캐시를 클라이언트에서 선택하므로 기간별 요청을 만들지 않습니다.
- 프로젝트 요약 정렬은 URL에 보존하며 매출 기간을 유지합니다. 요약에는 검색·상태 필터·행 선택·페이지 이동·내보내기·초기화 컨트롤이 없습니다. 전체 작업은 Projects에서 합니다.
- 생성·수정·삭제 결과는 공유 프로젝트 Query를 통해 요약과 Projects에 반영됩니다. 입력/실패 처리 계약은 [Projects](projects.md)를 따릅니다.

## 상태별 화면

최초 조회는 KPI·차트·활동·프로젝트에 각 영역 크기를 유지하는 skeleton을 표시합니다. 데이터가 있는 재조회에서는 내용을 유지합니다. 분석 조회 오류는 상단 경고와 재시도, 데이터 없는 차트 오류는 차트 안의 복구 동작을 제공합니다. 프로젝트 오류는 요약 표의 독립적인 재시도로 처리합니다. 빈 매출·빈 활동·빈 프로젝트는 각 영역에 표시하고 없는 KPI는 결측 표시로 남깁니다. 캐시 재조회 오류를 성공한 빈 데이터로 바꾸지 않습니다.

## 반응형 동작

| 구간                | 배치·스크롤·초점                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| 모바일 `< 768px`    | KPI와 차트/활동 1열, 표만 내부 스크롤. 생성 대화상자의 저장·오류가 화면 안에서 도달 가능해야 합니다. |
| 태블릿 `768–1279px` | KPI 2열, 차트 다음 활동. 표의 최소 열 너비를 보존합니다.                                             |
| PC `≥ 1280px`       | KPI 4열, 매출과 활동 병렬, 요약 표는 아래 전체 너비입니다.                                           |

활동은 이름 있는 키보드 접근 가능 스크롤 영역이며 긴 문구를 줄바꿈합니다. 프로젝트 전문은 편집 대화상자로 확인합니다. [긴 콘텐츠](../design/content-overflow.md)를 따릅니다.

PC에서 나란히 놓인 매출·활동 카드는 상단·하단·푸터 구분선·푸터 내용의 세로 중심을 모두 맞춥니다. 부모 grid의 헤더/본문/푸터 행을 공유하고 공통 CardFooter의 bordered variant를 사용합니다. 푸터가 여러 줄이 되면 두 카드의 푸터 행이 함께 늘어납니다. 추가 높이는 매출 차트의 실제 그래프 영역이 채우며 footer 앞뒤에 빈 공간으로 남기지 않습니다. 로딩·빈 결과·오류도 같은 차트 프레임을 사용합니다. 모바일·태블릿에서는 각 카드가 내용 높이를 유지하고 그래프 영역은 240px입니다.

## 상태 소유권과 구현 근거

- URL: [라우트](../../src/app/routes/index.tsx), [Overview 스키마](../../src/pages/overview/model/search.ts), [매출 기간 모델](../../src/widgets/revenue-chart/model/search.ts). 기본값과 허용 값은 이 코드가 소유합니다.
- Query: [분석 조회](../../src/entities/analytics/api/queries.ts), [프로젝트 조회·mutation](../../src/entities/project/api/queries.ts). 기간 선택은 [매출 위젯](../../src/widgets/revenue-chart/ui/revenue-chart.tsx)이 수행합니다.
- 임시 상태: [화면](../../src/pages/overview/ui/overview-page.tsx)의 생성 창, [프로젝트 표](../../src/widgets/project-table/ui/project-table.tsx)의 편집/삭제 창. 영구 표시 환경은 [국제화](../i18n.md)와 공통 provider가 소유합니다.

## 수용 기준

- 기간 변경 → 매출 구간 변경, URL·새로고침·뒤로/앞으로 복원: [workspace E2E](../../e2e/workspace.spec.ts)의 `loads the overview without browser errors and changes the revenue period`.
- 같은 workspace E2E에서 PC의 두 카드 상·하단 정렬과 실제 그래프의 높이 확장, 모바일·태블릿의 세로 배치와 240px 그래프 높이를 확인합니다. 푸터 정렬 matrix는 en-US/ko-KR와 기본/간결한 레이아웃의 loading→loaded에서 구분선·내용 중심·여백·잘림을 확인하며, desktop의 확대된 푸터 문구에서도 공유 행이 함께 늘어나는지 검증합니다.
- 기간과 요약 정렬은 독립적으로 유효성 검사: [스키마 테스트](../../src/pages/overview/model/search.test.ts)의 `composes revenue period and recent project sorting independently`.
- 최초 로딩·캐시 재방문·재조회 중 카드 공간과 기존 데이터를 유지: [캐시 E2E](../../e2e/query-cache.spec.ts)의 `Overview keeps card geometry and cached data through real demo requests`. 오류·빈 응답 상태는 이 테스트가 검증하지 않으므로 해당 상태 변경 시 별도로 확인합니다.
- 기간 변경이 KPI·활동에 전파되지 않는 범위와 생성 뒤 두 페이지의 반영은 관련 소유 코드와 함께 검토합니다. 위 테스트 이름만으로 이 모든 의미가 자동 검증됐다고 보고하지 않습니다.
