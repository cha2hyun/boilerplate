# Orders

<!-- page-route: /orders -->

## 목적과 범위

주문을 찾아 처리·결제 상태, 상품과 배송지, 금액을 확인하고 주문 기록을 생성·수정·삭제합니다. 데모 변경은 현재 브라우저에 저장됩니다. 상태 변경은 기록 편집이며 실제 결제·환불·배송을 실행하지 않습니다.

## 정보 구조와 주요 행동

PageHeader의 새 주문 → 전체 주문 상태 요약(모바일 기본 접힘) → 상태 탭/검색/정렬 → 필수 열 주문 표 → 페이지 크기/페이지 이동 순서입니다. 주문 번호 버튼이 URL의 `detail`을 갱신하고 상세 Sheet에서 상품·수량·단가·배송비·금액·고객·목적지·변경 기록을 보여줍니다. 상세에서 바로 수정하거나 같은 상세를 새 탭으로 열어 링크를 공유할 수 있습니다. 각 행의 작업 메뉴는 상세 보기·수정·삭제를 제공합니다. [화면 조합](../design/compositions.md)의 조회 목록+상세 구조를 따릅니다.

## 조회·조작 계약

- 검색은 주문 번호·고객 이름·이메일에 적용하고 상태 탭과 함께 행을 좁힙니다. 상단 요약은 필터 전 전체 데이터 기준입니다.
- 검색·상태·정렬·페이지 크기 변경은 첫 페이지로 이동합니다. 페이지 크기는 URL에 저장하며 6/12/24개 중 선택하고 기본값은 조회 스키마가 소유합니다.
- 초기화/빈 결과의 필터 지우기는 **검색·상태·정렬·페이지**를 스키마 기본값으로 돌리고 검색창에 초점을 줍니다. 사용자가 선택한 페이지 크기와 열린 상세 ID는 보존합니다. Projects의 일부 조건 초기화와 다릅니다.
- 상세는 URL `detail` ID에 대응하는 최신 Query 데이터를 보여줍니다. 직접 링크·새로고침·뒤로/앞으로에서 복원하고 목록 필터 밖의 레코드도 조회할 수 있습니다. 최초 로딩·조회 오류는 Sheet 안에서도 안내하며, 조회 성공 후 없는 ID 또는 갱신으로 삭제된 ID에는 찾을 수 없다는 설명과 목록 복귀를 제공합니다. 사용자가 닫으면 `detail`만 비우고 다른 조건은 유지합니다. 행 선택·열 숨김·내보내기는 없습니다.
- 생성·수정은 고객 이름/이메일, 날짜, 주문/결제 상태, 도시/국가, 배송비, 상품을 편집합니다. 상품은 1–50개, 수량은 1–10,000의 정수이며 이름과 주소는 길이를 검증합니다. 금액 입력은 표시 통화와 관계없이 USD이고 소수점 둘째 자리까지 허용합니다. 빈 값·음수·소수 수량·범위 초과는 오류로 안내하고 USD 정수 cents로 변환해 전송합니다. 항목 단가·배송비는 각각 최대 USD 1,000,000이며 가능한 전체 합계도 안전한 정수 범위 안입니다.
- 생성 성공 후 현재 필터·정렬·페이지를 유지한 채 새 주문 상세를 엽니다. 수정으로 행이 필터 밖으로 이동해도 조회 조건은 보존합니다. 삭제 등으로 페이지 범위를 벗어나면 대화상자를 닫은 뒤 페이지를 보정합니다.
- 주문의 고객 정보는 저장 시점의 스냅샷입니다. Customers의 프로필·구매 이력과 독립적이며 주문 생성·삭제나 고객 수정·삭제로 연쇄 변경하지 않습니다.
- 변경 기록은 실제 데모 생성 시 주문/결제의 초기 값과 수정 시 달라진 상태만 기록하며 최근 100개를 최신순으로 보여줍니다. 기존 샘플의 과거 이력을 꾸며내지 않고 비어 있으면 기록 없음으로 안내합니다. UTC 절대 시각을 표시하며 변경자 인증·불변성을 보장하는 운영 감사 로그로 표현하지 않습니다.
- 삭제는 별도 AlertDialog에서 확인합니다. 미저장 편집의 취소·Escape·바깥 클릭·닫기·페이지 이동은 공통 폐기 확인을 거치며 저장 중에는 닫기를 차단합니다. 실패하면 입력과 오류를 유지하고, 결과가 불확실한 쓰기는 자동 재전송 없이 재조회와 확인 안내를 제공합니다.

## 상태별 화면

최초 로딩은 요약·표 skeleton, 최초 오류는 결측 요약과 표 오류/재시도입니다. 캐시 재조회 중 기존 데이터와 열린 상세를 유지하고 실패는 상단 재조회 오류/재시도로 알립니다. 전체 빈 데이터와 필터 빈 결과의 설명을 구분하며 후자에만 필터 지우기를 제공합니다. 로딩·성공·빈 상태에서 표 프레임을 유지하고 성공한 조회 뒤에만 범위 밖 URL 페이지를 보정합니다.

## 반응형 동작

| 구간                | 배치·스크롤·초점                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 모바일 `< 768px`    | 요약은 전체 건수와 펼치기 버튼만 기본 표시하고 펼치면 MetricCard 1열입니다. 탭과 도구는 줄바꿈합니다. 표 내부 가로 스와이프와 세로 페이지 스크롤을 허용하고 상세는 화면 폭 안에 표시합니다. |
| 태블릿 `768–1279px` | 요약 2열, 읽을 수 있는 표 너비와 내부 스크롤을 유지하고 상세 Sheet는 제한된 폭을 사용합니다.                                                                                                |
| PC `≥ 1280px`       | 요약 4열. 표는 주문 번호·고객·상태·결제·날짜·합계·작업 7열이며 최소 960px입니다. 주문 번호 첫 열과 작업 마지막 열을 고정합니다.                                                             |

표 스크롤 영역에 이름·초점·설명을 제공하고 키보드 좌우 이동을 보존합니다. 상세를 닫으면 유효한 열기 버튼, 직접 링크 등 열기 버튼이 없으면 검색창으로 초점을 돌립니다. 상세에서 수정한 뒤에는 상세의 수정 버튼으로 초점을 돌립니다. 편집·삭제도 키보드로 연 행 작업 버튼으로 돌아가며 행이 사라지면 검색창을 사용합니다. 편집창의 본문은 화면 안에서 세로 스크롤하고 하단 취소·저장 버튼은 유지합니다. 긴 고객·상품 문구는 [긴 콘텐츠](../design/content-overflow.md)에 따라 표의 축약과 상세의 전문을 구분합니다.

## 상태 소유권과 구현 근거

- URL: [라우트](../../src/app/routes/orders.tsx), [조회 스키마](../../src/pages/orders/model/search.ts).
- Query: [주문 조회·mutation](../../src/entities/order/api/queries.ts). 성공한 쓰기는 이전 GET을 취소하고 목록 캐시를 갱신한 뒤 재조회합니다. 불확실한 쓰기도 GET 취소 후 재조회하되 추측으로 캐시를 변경하지 않습니다. 필터·정렬·페이지는 원본 목록 캐시에 클라이언트 계산을 적용합니다. [순수 selector](../../src/pages/orders/model/selectors.ts)는 입력 배열을 변경하지 않고, 금액 정렬 시 항목 합계를 레코드마다 한 번 계산합니다. 화면의 memo는 조회 조건만 구독하므로 상세 열기/닫기와 폼 상태 변경이 정렬을 다시 실행하지 않습니다.
- 저장: [스키마](../../src/entities/order/model/schema.ts), [HTTP 어댑터](../../src/entities/order/api/http.ts), [데모 저장](../../src/entities/order/api/demo.ts). demo/api 모두 HTTP 경계를 사용하고 demo MSW가 `orbit.demo.orders.v1`의 버전 1 저장소로 연결합니다. 손상된 저장값은 샘플로 복구하며 저장소 접근 실패는 메모리 세션으로 전환합니다.
- 조합: [화면](../../src/pages/orders/ui/orders-page.tsx)은 Query·mutation 창·URL·초점, [목록](../../src/pages/orders/ui/orders-list.tsx)은 필터·표·페이지 도구, [상세](../../src/pages/orders/ui/order-details-sheet.tsx)는 상세 조회와 편집 진입, [변경 기록](../../src/pages/orders/ui/order-history.tsx)은 기록 표시를 소유합니다.
- 임시 상태: 화면의 초점 복구 대상·편집/삭제 대상·[모바일 요약](../../src/pages/orders/ui/orders-summary.tsx)의 펼침 여부와 [편집기](../../src/features/order-editor/ui/order-editor-dialog.tsx)의 초안·오류. [정렬·금액 계산](../../src/pages/orders/model/sample-orders.ts)이 데이터 계산을 소유하고 표시 통화는 공통 [국제화](../i18n.md)를 따릅니다.

## 수용 기준

- 주문 생성·수정 모달의 날짜 입력은 일반 입력과 높이·같은 열의 좌우 경계를 맞춥니다. 빈 값/입력된 값 모두 폼과 모달 내부에 가로 넘침이 없어야 하며 하단 저장·취소는 세로 스크롤과 함께 접근할 수 있어야 합니다. 아래 CRUD E2E가 실제 치수와 모든 입력 조상의 스크롤 너비를 검사하고 [폼 조합](../design/compositions.md#폼)이 공통 규칙을 소유합니다.
- 짧은 모바일 390×360에서도 초기 초점과 Tab 순환으로 돌아온 고객 이름 입력이 고정 푸터 뒤에 가려지지 않습니다. 아래 CRUD E2E가 실제 Tab·Shift+Tab 이동과 초점 대상의 전체 노출을 확인합니다.
- 상태와 검색 조합·빈 결과 복구: [상거래 E2E](../../e2e/commerce.spec.ts)의 `combines order status and customer search, and recovers from empty results`.
- 페이지·정렬·상세·초점: 같은 파일의 `paginates and sorts orders, then opens details with keyboard focus restored`. 실제 터치/키보드 스크롤·화면 폭: `keeps commerce tables and detail sheets inside the viewport`.
- 잘못된 URL과 로드 뒤 페이지 보정: 같은 파일의 `recovers invalid commerce URL filters and clamps pages after data loads`. 상세 최신성: `/orders keeps open details current and contains long customer text`.
- 캐시 재방문·재조회 중 기존 데이터와 카드 공간: [캐시 E2E](../../e2e/query-cache.spec.ts)의 `Orders keeps card geometry and cached data through real demo requests`. 최초/재조회 실패·전체 빈 응답은 이 테스트가 검증하지 않으므로 해당 상태 변경 시 별도로 확인합니다. 조회 값 복구는 [스키마 테스트](../../src/pages/orders/model/search.test.ts)에서 확인합니다.
- CRUD·초안 보호·새로고침 지속성·합계·초점: [상거래 E2E](../../e2e/commerce.spec.ts)의 `creates, edits and deletes an order with protected drafts and persisted totals`.
- 데이터 검증: [주문 스키마](../../src/entities/order/model/schema.test.ts), [정확한 USD 변환](../../src/features/order-editor/model/form.test.ts), [데모 지속성·저장소 실패·취소](../../src/entities/order/api/demo.test.ts), [HTTP 계약](../../src/entities/order/api/http.test.ts), [성공/불확실 쓰기와 늦은 GET 경합](../../src/entities/order/api/queries.test.tsx).

- 페이지 크기·상세 직접 링크·새로고침·history·없는 ID 회복·모바일 요약: [상거래 E2E](../../e2e/commerce.spec.ts)의 `orders restores shared details and page size through reload and history`.
- 생성 → 상세에서 결제 상태 수정 → 기록 확인 → 새로고침 후 주문 상태 변경 기록 보존은 기존 CRUD E2E가 함께 검증합니다. 실제 삭제된 상세는 설명을 확인한 후 명시적으로 닫으며 나중에 같은 ID가 다시 나타나도 임의로 열리지 않습니다.
- 대량 계산의 의미: [selector 테스트](../../src/pages/orders/model/selectors.test.ts)는 10,000개 주문의 합계 정렬·두 번째 페이지·원본 순서 보존을 확인합니다. 실행 시간 기준이나 실제 대량 렌더링 성능 보증으로 사용하지 않습니다.
