# Customers

<!-- page-route: /customers -->

## 목적과 범위

고객을 찾고 생성·수정·삭제하며 구매 활동·연락 정보·위치를 확인합니다. 데모 변경은 브라우저 저장소에 남아 새로고침 후 복원됩니다. 실제 고객 계정·연락 발송·운영 인증·권한 관리는 제공하지 않습니다.

## 정보 구조와 주요 행동

PageHeader의 새 고객 → 전체 고객 요약 → 검색/상태/정렬 → 고객 표 → 페이지 이동입니다. 새 고객 버튼은 생성 폼을, 행 메뉴는 수정 폼이나 삭제 확인을 엽니다. 고객 이름 버튼이 상세 Sheet를 열어 상태·주문/지출 요약·연락/위치·가입일과 최근 주문일을 보여줍니다. [화면 조합](../design/compositions.md)의 조회 목록+상세를 사용합니다.

## 조회·조작 계약

- 검색은 이름·이메일·국가·도시에 적용하고 상태와 조합합니다. 상단 요약은 필터 전 전체 목록 기준입니다.
- 검색·상태·정렬을 바꾸면 첫 페이지로 이동합니다. 페이지 크기는 구현 고정값이며 조회 스키마에 중복 저장하지 않습니다.
- 초기화/빈 결과 복구는 검색·상태·정렬·페이지 전체를 기본값으로 되돌리고 검색창에 초점을 줍니다.
- 상세는 ID로 선택해 Query 갱신을 반영하며 대상이 사라지면 닫힙니다. 생성 성공 뒤에는 새 고객 상세를 열어 저장 결과를 보여줍니다. 생성·수정·삭제는 검색·상태·정렬·페이지를 유지하며, 마지막 행 삭제 등으로 페이지가 범위를 벗어나면 성공한 재조회 후 편집·삭제 창이 닫히면 보정합니다. 행 선택·열 선택·내보내기는 없습니다.
- 입력은 이름(공백 제거 후 2~80자), 이메일(254자 이하), 상태, 도시·국가(각 1~100자), 가입일(유효한 ISO 날짜)입니다. 이니셜은 이름에서 계산합니다. 누적 주문 수·지출·최근 주문일은 수정할 수 없으며 새 고객은 0·0·없음으로 시작하며 상세의 고객 유형도 주문 없음으로 표시합니다. 주문 목록은 독립된 샘플 스냅샷이므로 고객 수정·삭제로 연쇄 변경하지 않습니다.
- 폼이 열린 시점의 값과 달라지면 취소·Escape·바깥 클릭·닫기 버튼 및 앱 이동에서 폐기를 확인합니다. 계속 편집하면 입력을 유지하고 이름으로 초점을 돌립니다. 변경 없음·원복·저장 성공에는 확인하지 않습니다. 저장 중에는 변경 여부와 관계없이 닫기·중복 제출·앱 이동을 막고 브라우저 종료 경고를 유지합니다. [입력 보호](../unsaved-changes.md) 계약을 따릅니다.

## 상태별 화면

최초 로딩은 요약·표 skeleton, 최초 실패는 결측 요약과 표 오류/재시도입니다. 캐시 재조회는 기존 목록/상세를 유지하고 재조회 오류는 상단 경고와 재시도로 알립니다. 전체 빈 목록과 필터 빈 결과를 구분하고 후자에 필터 지우기를 제공합니다. 성공한 조회 뒤에만 URL 페이지 범위를 보정합니다. 표의 행 공간은 결과가 적거나 없어도 유지합니다. 필드 오류는 입력 옆에 표시하고 저장 실패 시 입력과 창을 유지합니다. 다른 탭에서 삭제된 대상의 수정·삭제는 404 오류를 설명합니다. 응답 손실 등으로 저장 결과가 불확실하면 이전 조회를 취소하고 다시 조회하며 mutation을 자동 재시도하지 않습니다. 삭제는 확인 후 실행하고 요청 중에는 취소·닫기·앱 이동을 막습니다.

## 반응형 동작

| 구간                | 배치·스크롤·초점                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| 모바일 `< 768px`    | 요약 1열, 필터 줄바꿈, 표 내부 스크롤. 상세는 화면 폭 안에서 읽으며 좁은 상세 요약은 1열입니다. |
| 태블릿 `768–1279px` | 요약 2열, 상세 Sheet는 제한된 폭. 상세 요약은 실제 컨테이너 폭이 허용하면 2열입니다.            |
| PC `≥ 1280px`       | 요약 4열, 전체 폭 표와 오른쪽 상세를 사용합니다.                                                |

상세를 닫으면 유효한 고객 버튼(생성 상세는 새 고객 버튼) 또는 검색창으로 초점을 복구합니다. 편집·삭제 후에는 원래 작업 버튼 또는 검색창으로 복구합니다. 짧은 화면에서 폼 전체와 오류·저장 버튼은 대화상자 안에서 세로 스크롤로 접근합니다. 긴 이름은 상세에서 줄바꿈하고 이메일은 긴 문자열도 화면 밖으로 밀지 않습니다. [긴 콘텐츠](../design/content-overflow.md)를 따릅니다.

## 상태 소유권과 구현 근거

- URL: [라우트](../../src/app/routes/customers.tsx), [조회 스키마](../../src/pages/customers/model/search.ts).
- Query/저장: [고객 Query와 mutation](../../src/entities/customer/api/queries.ts), [HTTP 어댑터](../../src/entities/customer/api/http.ts), [데모 저장 어댑터](../../src/entities/customer/api/demo.ts), [입력·응답 스키마](../../src/entities/customer/model/schema.ts). 모든 모드에서 HTTP를 사용하고 데모 HTTP 처리기가 버전 1 브라우저 저장소를 사용합니다. 저장소가 차단되면 메모리에서 동작합니다. 클라이언트 검색·정렬·페이지가 같은 원본 목록을 재사용합니다.
- 임시 상태: [화면](../../src/pages/customers/ui/customers-page.tsx)의 상세 ID·생성·수정·삭제 대상과 초점 대상, [편집 기능](../../src/features/customer-editor/ui/customer-editor-dialog.tsx)의 입력·검증·미저장 보호입니다. [정렬 계산](../../src/pages/customers/model/sample-customers.ts)과 공통 [국제화](../i18n.md)가 숫자·통화 표시 근거입니다.

## 수용 기준

- 고객 생성·수정 모달의 가입일 입력은 일반 입력과 같은 높이·너비를 유지합니다. 빈 값/입력된 값 모두 가로 넘침 없이 저장 버튼까지 세로로 접근해야 합니다. 아래 CRUD E2E가 실제 치수와 입력부터 Dialog까지의 스크롤 너비를 검사하고 [폼 조합](../design/compositions.md#폼)이 공통 규칙을 소유합니다.
- 검색·상태·정렬·페이지·상세: [상거래 E2E](../../e2e/commerce.spec.ts)의 `filters, sorts, paginates and inspects sample customer profiles`.
- 잘못된 조회/범위 밖 페이지: 같은 파일의 `recovers invalid commerce URL filters and clamps pages after data loads`. 상세 최신성과 긴 문자열: `/customers keeps open details current and contains long customer text`.
- 최초 로딩·캐시 재방문·재조회 중 카드 공간과 기존 데이터 유지: [캐시 E2E](../../e2e/query-cache.spec.ts)의 `Customers keeps card geometry and cached data through real demo requests`. 최초/재조회 실패·전체 빈 응답은 이 테스트가 검증하지 않으므로 해당 상태 변경 시 별도로 확인합니다.
- 필드별 URL 복구: [스키마 테스트](../../src/pages/customers/model/search.test.ts)의 `recovers invalid fields independently without discarding valid filters`.
- 생성·수정·삭제·새로고침 지속성·필터 유지·페이지 보정: [상거래 E2E](../../e2e/commerce.spec.ts)의 `retains failed customer input and persists CRUD while clamping the final page`. 응답 손실 후 저장 결과 확인·자동 재전송 방지는 `reconciles a committed customer with a lost response without resending the draft`.
- 입력 정규화와 읽기 전용 이력 제거: [스키마 테스트](../../src/entities/customer/model/schema.test.ts). 저장소 복원·손상·차단·quota·취소·404·구매 이력 보존: [데모 테스트](../../src/entities/customer/api/demo.test.ts).
- HTTP 메서드·인코딩·body·서버 응답 캐시: [HTTP 계약 테스트](../../src/entities/customer/api/http-contract.test.tsx). 이전 GET 취소와 불확실한 변경의 재조회·자동 재시도 방지: [경합 테스트](../../src/entities/customer/api/queries-race.test.tsx).
- clean·원복·폐기 후 재진입·저장 중 이동 차단·응답 손실 입력 보존: [편집창 테스트](../../src/features/customer-editor/ui/customer-editor-dialog.test.tsx).
