# URL 조회 상태

차트 기간, 목록 검색·필터·정렬·페이지는 TanStack Router의 search state가 소유합니다. 새로고침, 직접 링크, 브라우저 뒤로/앞으로 이동에서 같은 조회 조건을 복원합니다. 이 상태를 useState·Zustand·localStorage에 복제하지 않습니다.

## 화면별 계약

| 경로         | 저장하는 값                                        |
| ------------ | -------------------------------------------------- |
| `/`          | 매출 `period`, 프로젝트 요약 표의 `sort`, `order`  |
| `/projects`  | `q`, `status`, `sort`, `order`, `page`, `pageSize` |
| `/analytics` | 지표·차트·유입 표가 공유하는 `period`              |
| `/orders`    | `q`, `status`, `sort`, `page`                      |
| `/customers` | `q`, `status`, `sort`, `page`                      |
| `/inbox`     | `q`, `view`                                        |

페이지 번호는 URL에서 1부터 시작합니다. Orders/Customers의 페이지 크기는 6으로 고정하며 Projects의 선택 가능한 크기만 저장합니다. 필터·정렬·페이지 크기를 바꾸면 페이지를 1로 되돌립니다. 차트 기간은 기존 화면의 7/14/30일을 사용합니다.

열 표시, 행 선택, 열린 대화상자·상세 패널은 임시 UI 상태입니다. Inbox의 읽음/보관 변경은 기존 메모리 샘플이며 URL에 저장하지 않습니다. 언어·통화·테마는 기존 환경 설정 계약을 유지합니다. 컴포넌트·디자인 기준 페이지의 체험용 컨트롤은 목록 조회 조건이 아닙니다.

## 검증과 소유 위치

- 화면의 `model/search.ts`에서 Zod 스키마·출력 타입·기본값을 정의하고 슬라이스의 `index.ts`로 공개합니다. 여러 화면이 쓰는 프로젝트 표·매출 기간 계약은 해당 위젯 모델이 소유합니다.
- `app/routes`가 Zod 4 스키마를 `validateSearch`에 직접 전달합니다. 추가 어댑터는 필요하지 않습니다. 검증된 search와 탐색 콜백을 페이지·위젯에 props로 전달합니다.
- 기본값은 스키마와 탐색에서 공유하고 `stripSearchParams`로 기본값인 필드를 URL에서 생략합니다. 앱의 `search.strict`로 스키마에 없는 필드가 탐색 상태에 전파되지 않게 합니다.
- 필드마다 `.default`와 `.catch`로 누락·잘못된 값을 복구합니다. 한 필드 오류 때문에 나머지 정상 조건을 지우거나 페이지 오류 화면을 띄우지 않습니다.
- 공통 검색어는 최대 200자, 페이지는 1~100,000의 정수만 허용합니다. 배열·객체·boolean을 문자열/숫자로 무조건 강제 변환하지 않습니다. 입력창에도 같은 최대 길이를 적용합니다.
- Router는 URL의 JSON 값을 먼저 파싱합니다. 숫자로 파싱되는 기간은 허용된 기간으로만 변환하고, 숫자 검색어는 문자열로 복원합니다. URL은 Router로 직렬화하며 `URLSearchParams`/`window.history`를 직접 수정하지 않습니다.
- 조회 성공 후 실제 마지막 페이지보다 큰 번호는 마지막 페이지로 `replace`합니다. 데이터가 아직 없거나 조회 중·실패인 시점에 페이지 번호를 초기화하지 않습니다.

## 탐색과 Query

선택 필터·정렬·탭·페이지 이동·초기화는 history push를 사용합니다. 텍스트 입력은 현재 항목을 replace하여 글자마다 방문 기록을 만들지 않습니다. 따라서 뒤로 가기는 선택 단계나 이전 페이지로 돌아가며 글자 단위 실행 취소가 아닙니다. 조회 조건 변경은 `resetScroll: false`로 화면 위치를 유지합니다.

여러 조건을 한 번에 바꿀 때 한 search updater로 원자적으로 갱신하고, 다른 조건은 보존합니다. URL을 읽은 뒤 별도 effect로 로컬 필터와 양방향 동기화하지 않습니다. Query 키에는 실제 요청을 바꾸는 검증된 조건만 포함합니다. Analytics는 기존 기간별 Query 키를 사용하고, 클라이언트에서 거르는 표는 기존 원본 목록 캐시를 재사용합니다. URL에 비밀이나 인증 토큰을 넣지 않습니다.

## 검증

- 스키마 테스트: 기본값, 허용 값, JSON 형태가 다른 입력, 범위 밖 페이지, 잘못된 필드와 정상 필드의 공존을 검사합니다.
- 기존 E2E 범주에서 컨트롤→URL, 새로고침, 뒤로/앞으로, 잘못된 직접 링크, 데이터 조회 뒤 페이지 보정을 검증합니다.
- 공통 Router 직렬화 테스트는 한국어·예약 문자·숫자 검색어를 확인합니다. 전체 브라우저 검사는 Actions의 기존 production 번들과 2-job/2-worker 구성을 사용합니다.

기반 API는 [TanStack Router 검색 파라미터 검증](https://tanstack.com/router/latest/docs/how-to/validate-search-params)과 [탐색 옵션](https://tanstack.com/router/latest/docs/api/router/NavigateOptionsType)을 따릅니다.
