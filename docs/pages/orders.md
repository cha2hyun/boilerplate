# Orders

<!-- page-route: /orders -->

## 목적과 범위

주문을 찾아 처리·결제 상태, 상품과 배송지, 금액을 확인하고 주문 기록을 생성·수정·삭제합니다. 데모 변경은 현재 브라우저에 저장됩니다. 상태 변경은 기록 편집이며 실제 결제·환불·배송을 실행하지 않습니다.

## 정보 구조와 주요 행동

PageHeader의 새 주문 → 전체 주문 상태 요약 → 상태 탭/검색/정렬 → 넓은 주문 표 → 페이지 이동 순서입니다. 주문 번호 버튼이 상세 Sheet를 열어 상품·금액·고객·목적지를 보여줍니다. 각 행의 작업 메뉴는 상세 보기·수정·삭제를 제공합니다. [화면 조합](../design/compositions.md)의 조회 목록+상세 구조를 따릅니다.

## 조회·조작 계약

- 검색은 주문 번호·고객 이름·이메일에 적용하고 상태 탭과 함께 행을 좁힙니다. 상단 요약은 필터 전 전체 데이터 기준입니다.
- 검색·상태·정렬 변경은 첫 페이지로 이동합니다. 페이지 크기는 화면 구현이 소유하며 선택 컨트롤은 없습니다.
- 초기화/빈 결과의 필터 지우기는 **검색·상태·정렬·페이지 전체**를 스키마 기본값으로 돌리고 검색창에 초점을 줍니다. Projects의 일부 조건 초기화와 다릅니다.
- 상세는 선택 ID에 대응하는 최신 Query 데이터를 보여주고 갱신으로 대상이 사라지면 닫힙니다. 행 선택·열 숨김·내보내기는 없습니다.
- 생성·수정은 고객 이름/이메일, 날짜, 주문/결제 상태, 도시/국가, 배송비, 상품을 편집합니다. 상품은 1–50개, 수량은 1–10,000의 정수이며 이름과 주소는 길이를 검증합니다. 금액 입력은 표시 통화와 관계없이 USD이고 소수점 둘째 자리까지 허용합니다. 빈 값·음수·소수 수량·범위 초과는 오류로 안내하고 USD 정수 cents로 변환해 전송합니다. 항목 단가·배송비는 각각 최대 USD 1,000,000이며 가능한 전체 합계도 안전한 정수 범위 안입니다.
- 생성 성공 후 현재 필터·정렬·페이지를 유지한 채 새 주문 상세를 엽니다. 수정으로 행이 필터 밖으로 이동해도 조회 조건은 보존합니다. 삭제 등으로 페이지 범위를 벗어나면 대화상자를 닫은 뒤 페이지를 보정합니다.
- 주문의 고객 정보는 저장 시점의 스냅샷입니다. Customers의 프로필·구매 이력과 독립적이며 주문 생성·삭제나 고객 수정·삭제로 연쇄 변경하지 않습니다.
- 삭제는 별도 AlertDialog에서 확인합니다. 미저장 편집의 취소·Escape·바깥 클릭·닫기·페이지 이동은 공통 폐기 확인을 거치며 저장 중에는 닫기를 차단합니다. 실패하면 입력과 오류를 유지하고, 결과가 불확실한 쓰기는 자동 재전송 없이 재조회와 확인 안내를 제공합니다.

## 상태별 화면

최초 로딩은 요약·표 skeleton, 최초 오류는 결측 요약과 표 오류/재시도입니다. 캐시 재조회 중 기존 데이터와 열린 상세를 유지하고 실패는 상단 재조회 오류/재시도로 알립니다. 전체 빈 데이터와 필터 빈 결과의 설명을 구분하며 후자에만 필터 지우기를 제공합니다. 로딩·성공·빈 상태에서 표 프레임을 유지하고 성공한 조회 뒤에만 범위 밖 URL 페이지를 보정합니다.

## 반응형 동작

| 구간                | 배치·스크롤·초점                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 모바일 `< 768px`    | 요약 1열, 탭과 도구 줄바꿈. 표 내부 가로 스와이프와 세로 페이지 스크롤을 허용하고 상세는 화면 폭 안에 표시합니다. |
| 태블릿 `768–1279px` | 요약 2열, 읽을 수 있는 표 너비와 내부 스크롤을 유지하고 상세 Sheet는 제한된 폭을 사용합니다.                      |
| PC `≥ 1280px`       | 요약 4열. 넓은 표는 여전히 내부 스크롤 가능하며 주문 번호 첫 열을 고정합니다.                                     |

표 스크롤 영역에 이름·초점·설명을 제공하고 키보드 좌우 이동을 보존합니다. 상세를 닫으면 유효한 열기 버튼, 없으면 검색창으로 초점을 돌립니다. 편집·삭제도 키보드로 연 행 작업 버튼으로 돌아가며 행이 사라지면 검색창을 사용합니다. 편집창의 본문은 화면 안에서 세로 스크롤하고 하단 취소·저장 버튼은 유지합니다. 긴 고객·상품 문구는 [긴 콘텐츠](../design/content-overflow.md)에 따라 표의 축약과 상세의 전문을 구분합니다.

## 상태 소유권과 구현 근거

- URL: [라우트](../../src/app/routes/orders.tsx), [조회 스키마](../../src/pages/orders/model/search.ts).
- Query: [주문 조회·mutation](../../src/entities/order/api/queries.ts). 성공한 쓰기는 이전 GET을 취소하고 목록 캐시를 갱신한 뒤 재조회합니다. 불확실한 쓰기도 GET 취소 후 재조회하되 추측으로 캐시를 변경하지 않습니다. 필터·정렬·페이지는 원본 목록 캐시에 클라이언트 계산을 적용합니다.
- 저장: [스키마](../../src/entities/order/model/schema.ts), [HTTP 어댑터](../../src/entities/order/api/http.ts), [데모 저장](../../src/entities/order/api/demo.ts). demo/api 모두 HTTP 경계를 사용하고 demo MSW가 `orbit.demo.orders.v1`의 버전 1 저장소로 연결합니다. 손상된 저장값은 샘플로 복구하며 저장소 접근 실패는 메모리 세션으로 전환합니다.
- 임시 상태: [화면](../../src/pages/orders/ui/orders-page.tsx)의 상세 ID·초점 복구 대상과 [편집기](../../src/features/order-editor/ui/order-editor-dialog.tsx)의 초안·오류. [정렬·금액 계산](../../src/pages/orders/model/sample-orders.ts)이 데이터 계산을 소유하고 표시 통화는 공통 [국제화](../i18n.md)를 따릅니다.

## 수용 기준

- 주문 생성·수정 모달의 날짜 입력은 일반 입력과 높이·같은 열의 좌우 경계를 맞춥니다. 빈 값/입력된 값 모두 폼과 모달 내부에 가로 넘침이 없어야 하며 하단 저장·취소는 세로 스크롤과 함께 접근할 수 있어야 합니다. 아래 CRUD E2E가 실제 치수와 모든 입력 조상의 스크롤 너비를 검사하고 [폼 조합](../design/compositions.md#폼)이 공통 규칙을 소유합니다.
- 짧은 모바일 390×360에서도 초기 초점과 Tab 순환으로 돌아온 고객 이름 입력이 고정 푸터 뒤에 가려지지 않습니다. 아래 CRUD E2E가 실제 Tab·Shift+Tab 이동과 초점 대상의 전체 노출을 확인합니다.
- 상태와 검색 조합·빈 결과 복구: [상거래 E2E](../../e2e/commerce.spec.ts)의 `combines order status and customer search, and recovers from empty results`.
- 페이지·정렬·상세·초점: 같은 파일의 `paginates and sorts orders, then opens details with keyboard focus restored`. 실제 터치/키보드 스크롤·화면 폭: `keeps commerce tables and detail sheets inside the viewport`.
- 잘못된 URL과 로드 뒤 페이지 보정: 같은 파일의 `recovers invalid commerce URL filters and clamps pages after data loads`. 상세 최신성: `/orders keeps open details current and contains long customer text`.
- 캐시 재방문·재조회 중 기존 데이터와 카드 공간: [캐시 E2E](../../e2e/query-cache.spec.ts)의 `Orders keeps card geometry and cached data through real demo requests`. 최초/재조회 실패·전체 빈 응답은 이 테스트가 검증하지 않으므로 해당 상태 변경 시 별도로 확인합니다. 조회 값 복구는 [스키마 테스트](../../src/pages/orders/model/search.test.ts)에서 확인합니다.
- CRUD·초안 보호·새로고침 지속성·합계·초점: [상거래 E2E](../../e2e/commerce.spec.ts)의 `creates, edits and deletes an order with protected drafts and persisted totals`.
- 데이터 검증: [주문 스키마](../../src/entities/order/model/schema.test.ts), [정확한 USD 변환](../../src/features/order-editor/model/form.test.ts), [데모 지속성·저장소 실패·취소](../../src/entities/order/api/demo.test.ts), [HTTP 계약](../../src/entities/order/api/http.test.ts), [성공/불확실 쓰기와 늦은 GET 경합](../../src/entities/order/api/queries.test.tsx).
