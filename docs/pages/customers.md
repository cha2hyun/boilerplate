# Customers

<!-- page-route: /customers -->

## 목적과 범위

고객을 찾아 구매 활동·연락 정보·위치를 확인합니다. 읽기 전용 샘플 프로필이며 고객 생성/수정, 연락 발송, 개인정보 운영 관리 기능은 없습니다.

## 정보 구조와 주요 행동

PageHeader → 전체 고객 요약 → 검색/상태/정렬 → 고객 표 → 페이지 이동입니다. 고객 이름 버튼이 상세 Sheet를 열어 상태·주문/지출 요약·연락/위치·가입일과 최근 주문일을 보여줍니다. [화면 조합](../design/compositions.md)의 조회 목록+상세를 사용합니다.

## 조회·조작 계약

- 검색은 이름·이메일·국가·도시에 적용하고 상태와 조합합니다. 상단 요약은 필터 전 전체 목록 기준입니다.
- 검색·상태·정렬을 바꾸면 첫 페이지로 이동합니다. 페이지 크기는 구현 고정값이며 조회 스키마에 중복 저장하지 않습니다.
- 초기화/빈 결과 복구는 검색·상태·정렬·페이지 전체를 기본값으로 되돌리고 검색창에 초점을 줍니다.
- 상세는 ID로 선택해 Query 갱신을 반영하며 대상이 사라지면 닫힙니다. 행 선택·열 선택·내보내기·데이터 수정은 없습니다.

## 상태별 화면

최초 로딩은 요약·표 skeleton, 최초 실패는 결측 요약과 표 오류/재시도입니다. 캐시 재조회는 기존 목록/상세를 유지하고 재조회 오류는 상단 경고와 재시도로 알립니다. 전체 빈 목록과 필터 빈 결과를 구분하고 후자에 필터 지우기를 제공합니다. 성공한 조회 뒤에만 URL 페이지 범위를 보정합니다. 표의 행 공간은 결과가 적거나 없어도 유지합니다.

## 반응형 동작

| 구간                | 배치·스크롤·초점                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| 모바일 `< 768px`    | 요약 1열, 필터 줄바꿈, 표 내부 스크롤. 상세는 화면 폭 안에서 읽으며 좁은 상세 요약은 1열입니다. |
| 태블릿 `768–1279px` | 요약 2열, 상세 Sheet는 제한된 폭. 상세 요약은 실제 컨테이너 폭이 허용하면 2열입니다.            |
| PC `≥ 1280px`       | 요약 4열, 전체 폭 표와 오른쪽 상세를 사용합니다.                                                |

닫기 후 유효한 고객 버튼 또는 검색창으로 초점을 복구합니다. 긴 이름은 상세에서 줄바꿈하고 이메일은 긴 문자열도 화면 밖으로 밀지 않습니다. [긴 콘텐츠](../design/content-overflow.md)를 따릅니다.

## 상태 소유권과 구현 근거

- URL: [라우트](../../src/app/routes/customers.tsx), [조회 스키마](../../src/pages/customers/model/search.ts).
- Query: [고객 조회](../../src/entities/customer/api/queries.ts). 클라이언트 검색·정렬·페이지가 같은 원본 목록을 재사용합니다.
- 임시 상태: [화면](../../src/pages/customers/ui/customers-page.tsx)의 상세 ID와 초점 대상. [정렬 계산](../../src/pages/customers/model/sample-customers.ts)과 공통 [국제화](../i18n.md)가 숫자·통화 표시 근거입니다.

## 수용 기준

- 검색·상태·정렬·페이지·상세: [상거래 E2E](../../e2e/commerce.spec.ts)의 `filters, sorts, paginates and inspects sample customer profiles`.
- 잘못된 조회/범위 밖 페이지: 같은 파일의 `recovers invalid commerce URL filters and clamps pages after data loads`. 상세 최신성과 긴 문자열: `/customers keeps open details current and contains long customer text`.
- 최초 로딩·캐시 재방문·재조회 중 카드 공간과 기존 데이터 유지: [캐시 E2E](../../e2e/query-cache.spec.ts)의 `Customers keeps card geometry and cached data through real demo requests`. 최초/재조회 실패·전체 빈 응답은 이 테스트가 검증하지 않으므로 해당 상태 변경 시 별도로 확인합니다.
- 필드별 URL 복구: [스키마 테스트](../../src/pages/customers/model/search.test.ts)의 `recovers invalid fields independently without discarding valid filters`.
