# Analytics

<!-- page-route: /analytics -->

## 목적과 범위

동일한 기간의 방문자·세션·조회·이탈 지표와 유입·기기·인기 페이지를 비교합니다. 데이터는 샘플이며 실제 추적 수집·실시간 분석·운영 보고서 생성은 없습니다.

## 정보 구조와 주요 행동

PageHeader의 기간 선택 → 조회 날짜 안내 → KPI → 방문 추이와 기기 분포 → 유입 경로와 인기 페이지 표입니다. 기간 선택이 유일한 조회 행동입니다. [화면 조합](../design/compositions.md)의 분석 대시보드를 따릅니다.

## 조회·조작 계약

기간을 바꾸면 **KPI·차트·기기·유입·페이지 표 전체**를 같은 기간의 Query로 조회합니다. Overview의 매출 위젯과 영향 범위가 다릅니다. 캐시는 기간별로 구분하며 날짜 안내는 받은 데이터에 근거합니다. 별도 초기화·행 선택·정렬·내보내기는 없습니다. 기간의 허용 값과 기본값은 스키마를 기준으로 합니다.

## 상태별 화면

데이터 없는 최초 조회/새 기간 조회는 각 영역의 skeleton과 로딩 안내를 제공합니다. 캐시가 있는 기간으로 돌아오거나 재조회하면 기존 내용을 유지합니다. 최초 실패는 결측 KPI·사용 불가 안내와 재시도, 캐시 재조회 실패는 기존 결과 위의 재조회 오류와 재시도입니다. 성공한 빈 배열은 차트/표별 빈 데이터로 구분합니다. 요청이 없는 완료 상태를 로딩 예제로 덮지 않습니다.

## 반응형 동작

| 구간                | 배치·스크롤·초점                                        |
| ------------------- | ------------------------------------------------------- |
| 모바일 `< 768px`    | KPI·차트·표 1열, 기간 선택은 헤더에서 접근 가능합니다.  |
| 태블릿 `768–1279px` | KPI 2열, 나머지 비교 영역은 위아래 배치합니다.          |
| PC `≥ 1280px`       | KPI 4열, 추이/기기 병렬, 유입/인기 페이지 표 2열입니다. |

표 내용은 카드 내부 세로 스크롤을 사용합니다. 축약된 경로/유입 이름은 현재 별도 상세 화면이 없으므로 긴 콘텐츠 변경 시 전문 확인 수단까지 함께 검토해야 합니다. 공통 기준은 [긴 콘텐츠](../design/content-overflow.md)입니다.

## 상태 소유권과 구현 근거

- URL: [라우트](../../src/app/routes/analytics.tsx), [조회 스키마](../../src/pages/analytics/model/search.ts).
- Query: [기간별 traffic 조회](../../src/entities/traffic/api/queries.ts). [화면](../../src/pages/analytics/ui/analytics-page.tsx)이 한 응답을 모든 영역에 배분합니다.
- 임시 선택/영구 페이지 설정은 없습니다. 언어·숫자 표시는 공통 [국제화](../i18n.md) 계약을 사용합니다.

## 수용 기준

- 기간 변경 → 모든 지표/차트/표 갱신과 URL 복원: [분석 E2E](../../e2e/analytics-inbox.spec.ts)의 `analytics period updates the metrics, charts, and traffic tables together`.
- 캐시 재방문·재조회 중 기존 데이터와 카드 공간: [캐시 E2E](../../e2e/query-cache.spec.ts)의 `Analytics keeps card geometry and cached data through real demo requests`. 최초/재조회 실패·빈 응답은 이 테스트가 검증하지 않으므로 해당 상태 변경 시 별도로 확인합니다.
- 무관한 URL 필드가 페이지 상태에 남지 않음: [조회 테스트](../../src/pages/analytics/model/search.test.ts)의 `defaults omitted parameters and excludes unrelated URL state`.
