# Orders

<!-- page-route: /orders -->

## 목적과 범위

주문을 찾아 처리·결제 상태, 상품과 배송지, 금액을 확인합니다. 읽기 전용 샘플이며 주문 생성·상태 변경·결제·환불·실제 배송 처리는 없습니다.

## 정보 구조와 주요 행동

PageHeader → 전체 주문 상태 요약 → 상태 탭/검색/정렬 → 넓은 주문 표 → 페이지 이동 순서입니다. 주문 번호 버튼이 상세 Sheet를 열어 상품·금액·고객·목적지를 보여줍니다. [화면 조합](../design/compositions.md)의 조회 목록+상세 구조를 따릅니다.

## 조회·조작 계약

- 검색은 주문 번호·고객 이름·이메일에 적용하고 상태 탭과 함께 행을 좁힙니다. 상단 요약은 필터 전 전체 데이터 기준입니다.
- 검색·상태·정렬 변경은 첫 페이지로 이동합니다. 페이지 크기는 화면 구현이 소유하며 선택 컨트롤은 없습니다.
- 초기화/빈 결과의 필터 지우기는 **검색·상태·정렬·페이지 전체**를 스키마 기본값으로 돌리고 검색창에 초점을 줍니다. Projects의 일부 조건 초기화와 다릅니다.
- 상세는 선택 ID에 대응하는 최신 Query 데이터를 보여주고 갱신으로 대상이 사라지면 닫힙니다. 행 선택·열 숨김·내보내기는 없습니다.

## 상태별 화면

최초 로딩은 요약·표 skeleton, 최초 오류는 결측 요약과 표 오류/재시도입니다. 캐시 재조회 중 기존 데이터와 열린 상세를 유지하고 실패는 상단 재조회 오류/재시도로 알립니다. 전체 빈 데이터와 필터 빈 결과의 설명을 구분하며 후자에만 필터 지우기를 제공합니다. 로딩·성공·빈 상태에서 표 프레임을 유지하고 성공한 조회 뒤에만 범위 밖 URL 페이지를 보정합니다.

## 반응형 동작

| 구간                | 배치·스크롤·초점                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 모바일 `< 768px`    | 요약 1열, 탭과 도구 줄바꿈. 표 내부 가로 스와이프와 세로 페이지 스크롤을 허용하고 상세는 화면 폭 안에 표시합니다. |
| 태블릿 `768–1279px` | 요약 2열, 읽을 수 있는 표 너비와 내부 스크롤을 유지하고 상세 Sheet는 제한된 폭을 사용합니다.                      |
| PC `≥ 1280px`       | 요약 4열. 넓은 표는 여전히 내부 스크롤 가능하며 주문 번호 첫 열을 고정합니다.                                     |

표 스크롤 영역에 이름·초점·설명을 제공하고 키보드 좌우 이동을 보존합니다. 상세를 닫으면 유효한 주문 버튼, 없으면 검색창으로 초점을 돌립니다. 긴 고객·상품 문구는 [긴 콘텐츠](../design/content-overflow.md)에 따라 표의 축약과 상세의 전문을 구분합니다.

## 상태 소유권과 구현 근거

- URL: [라우트](../../src/app/routes/orders.tsx), [조회 스키마](../../src/pages/orders/model/search.ts).
- Query: [주문 조회](../../src/entities/order/api/queries.ts). 필터·정렬·페이지는 원본 목록 캐시에 클라이언트 계산을 적용합니다.
- 임시 상태: [화면](../../src/pages/orders/ui/orders-page.tsx)의 상세 ID·초점 복구 대상. [정렬·금액 계산](../../src/pages/orders/model/sample-orders.ts)이 데이터 계산을 소유하고 표시 통화는 공통 [국제화](../i18n.md)를 따릅니다.

## 수용 기준

- 상태와 검색 조합·빈 결과 복구: [상거래 E2E](../../e2e/commerce.spec.ts)의 `combines order status and customer search, and recovers from empty results`.
- 페이지·정렬·상세·초점: 같은 파일의 `paginates and sorts orders, then opens details with keyboard focus restored`. 실제 터치/키보드 스크롤·화면 폭: `keeps commerce tables and detail sheets inside the viewport`.
- 잘못된 URL과 로드 뒤 페이지 보정: 같은 파일의 `recovers invalid commerce URL filters and clamps pages after data loads`. 상세 최신성: `/orders keeps open details current and contains long customer text`.
- 캐시 재방문·재조회 중 기존 데이터와 카드 공간: [캐시 E2E](../../e2e/query-cache.spec.ts)의 `Orders keeps card geometry and cached data through real demo requests`. 최초/재조회 실패·전체 빈 응답은 이 테스트가 검증하지 않으므로 해당 상태 변경 시 별도로 확인합니다. 조회 값 복구는 [스키마 테스트](../../src/pages/orders/model/search.test.ts)에서 확인합니다.
