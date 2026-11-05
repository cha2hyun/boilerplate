# API 계약과 데이터 모드

`src/shared/config/parse-env.ts`가 환경 변수 계약을 소유합니다. Vite가 mode·envDir·process 우선순위를 적용한 값은 `scripts/application-env.ts`에서 dev/build 설정 확정 시 검증하고, 브라우저의 `env.ts`도 같은 parser를 사용합니다. 잘못된 값은 앱 번들을 만들거나 서버를 시작하기 전에 실패합니다. `VITE_DATA_SOURCE=demo`가 기본이며 API 모드는 `VITE_DATA_SOURCE=api`로 선택합니다. `VITE_API_BASE_URL` 기본값은 `/api`입니다. 루트 상대 경로 또는 자격증명/query/hash 없는 `http://`·`https://` 절대 URL을 허용합니다. 역슬래시, 내부 공백, 빈 query/hash 구분자와 `https:host` 같은 모호한 주소는 거부합니다. 실제 백엔드 서버는 포함하지 않으며 demo의 주문·고객 조회/쓰기 HTTP와 분석 조회는 MSW가 브라우저에서 처리합니다.

## HTTP 계약

JSON 요청/응답을 사용하며 envelope 없이 아래 객체/배열을 반환합니다. 현재 목록 필터/정렬/페이지 나누기는 클라이언트에서 처리합니다. 서버 페이지네이션을 도입하면 Query key, API 계약, UI를 함께 변경해야 합니다.

| 요청                            | 요청 body       | 성공 응답              |
| ------------------------------- | --------------- | ---------------------- |
| `GET /projects`                 | 없음            | `200 Project[]`        |
| `POST /projects`                | `ProjectInput`  | `200/201 Project`      |
| `PATCH /projects/:id`           | `ProjectInput`  | `200 Project`          |
| `DELETE /projects/:id`          | 없음            | `204` (body 없음)      |
| `GET /analytics`                | 없음            | `200 Analytics`        |
| `GET /traffic?period=7\|14\|30` | 없음            | `200 Traffic`          |
| `GET /orders`                   | 없음            | `200 SampleOrder[]`    |
| `GET /customers`                | 없음            | `200 SampleCustomer[]` |
| `POST /orders`                  | `OrderInput`    | `201 SampleOrder`      |
| `PATCH /orders/:id`             | `OrderInput`    | `200 SampleOrder`      |
| `DELETE /orders/:id`            | 없음            | `204` (body 없음)      |
| `POST /customers`               | `CustomerInput` | `201 SampleCustomer`   |
| `PATCH /customers/:id`          | `CustomerInput` | `200 SampleCustomer`   |
| `DELETE /customers/:id`         | 없음            | `204` (body 없음)      |

경로는 `VITE_API_BASE_URL` 뒤에 연결됩니다. `PATCH`에는 현재 계약상 수정 가능한 모든 필드를 보냅니다.

```ts
type ProjectInput = {
  name: string // trim 후 2~80자
  description: string // trim 후 최대 240자
  status: 'active' | 'paused' | 'archived'
}

type Project = ProjectInput & {
  id: string
  owner: { name: string; email: string; initials: string }
  progress: number // 0~100
  updatedAt: string // ISO 8601 datetime
}

type Analytics = {
  kpis: {
    id: string
    label: string
    value: number
    change: number
    format: 'currency' | 'number' | 'percent'
    description: string
  }[]
  revenue: {
    date: string // YYYY-MM-DD
    revenue: number // >= 0
    previousRevenue: number // >= 0
  }[]
  activity: {
    id: string
    title: string
    description: string
    time: string // ISO 8601 datetime
    type: 'project' | 'member' | 'billing'
  }[]
}
```

실제 런타임 계약은 `src/entities/project/model/schema.ts`와 `src/entities/analytics/model/schema.ts`가 기준입니다. 계약 변경 시 스키마, API 어댑터, 테스트, 이 문서를 함께 수정합니다.

Project의 `updatedAt`은 UTC와 offset이 있는 ISO datetime을 모두 허용하며, 화면 정렬은 문자열 대신 실제 timestamp를 비교합니다. Analytics의 `revenue`는 날짜당 최대 한 항목만 허용하고 중복 날짜는 응답 검증 실패로 처리합니다. API의 배열 순서는 자유이며 entity 검증 경계에서 날짜 오름차순으로 정규화합니다. 최근 N일은 응답의 마지막 제공일을 포함한 UTC 달력 날짜 범위로 선택합니다. 누락된 날짜를 오래된 항목으로 채우거나 매출 0으로 가정하지 않으며, 고정 기준일을 가진 데모도 현재 시스템 날짜와 무관하게 같은 범위를 표시합니다.

Traffic/Order/Customer의 계약은 각각 `entities/traffic`, `entities/order`, `entities/customer`의 `model/schema.ts`가 소유합니다. Traffic은 선택 기간의 일별 방문·세션·페이지뷰와 유입/페이지/기기별 요약을 반환합니다. 주문/고객은 상세 Sheet에 필요한 필드를 포함한 전체 목록이며 생성·편집·삭제를 지원합니다. 목록의 검색·정렬·페이지 나누기는 클라이언트에서 수행하며 서버 필터를 구현한 것으로 설명하지 않습니다.

Traffic의 `days`는 날짜당 최대 한 항목만 허용하고 중복 날짜는 응답 검증 실패로 처리합니다. API 배열 순서는 자유이며 검증 경계에서 날짜 오름차순으로 정규화합니다. 일별 값과 기간 요약은 `visitors ≤ sessions ≤ pageViews`, 일별 이탈은 `bounces ≤ sessions`를 만족해야 합니다. 누락일을 채우거나 합계를 다시 만들지 않으며, 기간별 고유 방문자는 일별 고유 방문자의 합과 같다고 가정하지 않습니다. 0인 값과 빈 일별 배열은 허용합니다.

프로젝트·주문·고객 목록의 ID는 목록 안에서 유일해야 합니다. 중복 ID를 합치거나 마지막 값으로 덮지 않고 전체 응답을 `INVALID_RESPONSE`로 거부합니다. 갱신 응답이 잘못됐을 때 이미 검증된 Query 데이터는 유지합니다.

주문 입력은 `customer: { name, email }`, `date`, `status`, `payment`, `city`, `country`, `shipping`, `items: [{ name, quantity, unitPrice }]`입니다. `shipping`/`unitPrice`는 USD 정수 cents이며 상품은 최소 한 개가 필요합니다. 화면의 USD 소수 입력은 저장 전에 cents로 변환하며 빈 값·음수·지원 범위를 넘는 값은 거부합니다. 허용 상태, 길이·금액·수량·상품 개수 상한은 `orderInputSchema`가 소유합니다.

주문 응답에는 선택적인 `history`가 있습니다. 예전 API 응답이나 version 1 브라우저 저장 데이터에 필드가 없으면 `[]`로 복원하며 seed에는 과거 이력을 만들어 넣지 않습니다. 검증된 `SampleOrder`의 `history`는 항상 배열입니다. 각 항목은 `OrderHistoryEntry`이며 `field: 'status' | 'payment'`, `occurredAt`(offset이 있는 ISO datetime), 해당 필드의 `from`/`to` 값을 포함합니다. `from: null`은 신규 주문 생성 시 초기값 설정이며 같은 값으로의 변경이나 다른 필드의 상태값은 허용하지 않습니다. 사용자 입력의 `history`는 제거하므로 HTTP 요청에 포함하거나 데모 저장에 주입할 수 없습니다.

데모 생성은 현재 시각의 상태·결제 초기값 두 항목을 기록합니다. 수정은 실제로 달라진 상태·결제 필드만 작업 적용 순서로 추가하며, 같은 값 저장이나 주소·상품 편집은 상태 이력을 늘리지 않습니다. 유효성 실패·없는 대상·취소된 요청은 이력을 남기지 않습니다. 저장소 쓰기가 거부되면 기존 정책대로 변경과 이력이 현재 세션 메모리에만 유지됩니다. 주문 하나당 최근 **100개 필드 변경**(`orderLimits.history`)만 유지하고 이전 항목은 버립니다. API가 이력을 제공할 때도 이 응답 한도를 지켜야 합니다. 삭제한 주문의 이력은 함께 제거됩니다. 상태 전이는 기존 CRUD가 허용하는 열거형 사이의 변경을 유지하며 배송·환불에 새로운 상업 규칙을 가정하지 않습니다.

이 이력은 브라우저 시계와 수정 가능한 데모 저장소에 기반한 사용자 흐름 예시입니다. 주문·결제의 실제 실행, 사용자 식별, 서버 감사 로그, 변조 방지, 법적 보존, 변경 충돌 방지를 구현한 것이 아닙니다. 운영 API는 인증된 작성자, 서버 시각, 보존·페이지네이션·경합 정책을 별도로 설계하며 현재 API에서는 이력 필드를 생략할 수 있습니다.

고객 입력은 `name`, `email`, `status`, `city`, `country`, `joined`입니다. 서버/데모 어댑터가 ID와 이니셜을 생성하며 구매 이력(`orders`, `spent`, `lastOrder`)은 사용자 입력으로 받지 않습니다. 새 고객 이력은 0/0/null이고 프로필 편집은 기존 이력을 유지합니다. 주문 고객 정보는 시점별 스냅샷이며 고객 프로필 삭제·수정에 연쇄 변경하지 않습니다. 기존 고객 이력은 주문 목록과 독립된 샘플이므로 주문 쓰기로 구매 합계를 만들어내지 않습니다. 실제 연결 관계·집계가 필요하면 백엔드 계약부터 바꿉니다.

잘못된 JSON/입력은 `400`, 없는 수정·삭제 대상은 `404`입니다. 입력·응답은 각각 entity 스키마로 검증하고 알 수 없는 속성을 저장하지 않습니다. PATCH는 모든 편집 가능한 필드를 보내는 계약이며 부분 입력을 임의로 채우지 않습니다.

API는 차트 색상이나 `fill` 같은 스타일 값을 반환하지 않습니다. Traffic의 기기 항목은 `device`와 `sessions`만 포함하며, 화면이 로컬 의미 토큰으로 색상을 지정합니다. 응답에 알 수 없는 스타일 필드가 있어도 스키마 검증 결과에서 제거되므로 화면에 전달하지 않습니다.

금액의 원본 통화는 USD입니다. Analytics KPI/수익 차트는 달러 단위, Order 상품 가격·배송비와 Customer 누적 금액은 cents입니다. 선택 통화로 변환하기 전에 cents 호출부는 `/ 100`을 적용합니다. 외부 `https://api.frankfurter.dev/v2/rate/USD/KRW` 요청은 `VITE_API_BASE_URL`이나 demo 데이터 모드와 별개이며 `entities/exchange-rate`가 응답을 검증합니다. 공급자·변환·캐시 계약은 [언어와 표시 통화](i18n.md)를 따릅니다.

## 목업 HTTP와 시작 경계

`app/mocks/start.ts`는 demo에서만 MSW를 동적으로 가져와 worker 준비를 기다린 뒤 React 앱을 시작합니다. 운영 API 모드에서는 해당 import/worker 시작을 수행하지 않습니다. 실패하면 shadcn 오류 화면과 Reload 버튼을 제공하며 가짜 성공 데이터로 바꾸지 않습니다. worker에는 secure context(HTTPS 또는 localhost)가 필요합니다.

핸들러는 분석·방문·주문·고객 조회와 주문·고객 POST/PATCH/DELETE만 처리합니다. 주문·고객은 도메인별 데모 저장 어댑터를 공유하며, 테스트에서는 새 어댑터를 주입해 저장 상태를 격리합니다. 프로젝트는 기존 직접 호출 demo 저장 어댑터를 유지하고, 그 외 요청은 통과시킵니다. 따라서 외부 환율은 demo에서도 실제 API를 사용하며 런타임 샘플 환율을 주입하지 않습니다. 고정된 450ms 지연과 `Cache-Control: no-store`로 Query 캐시의 동작을 구분할 수 있습니다. HTTP 목업은 dev와 production demo preview에서 동일하게 동작합니다. 실제 API의 인증/권한/백엔드를 제공하는 기능은 아닙니다.

`public/mockServiceWorker.js`는 MSW CLI가 생성하는 자산이며 내용/무결성 코드를 직접 편집하지 않습니다. MSW 버전을 바꾸면 `pnpm exec msw init public --save`로 재생성합니다. formatter/ESLint는 이 생성 파일 하나만 제외합니다. 정적 호스트는 이 파일을 SPA fallback보다 먼저 JavaScript로 제공해야 합니다. Query 키/캐시 수명·검증 방법은 [Query 캐시](query-cache.md)가 소유합니다.

## 실패, 취소, 캐시

공통 transport는 `Accept: application/json`을 설정하고 body가 있으면 JSON으로 직렬화합니다. 응답 body는 Zod 스키마로 검증합니다. `204`는 `null`로 처리합니다. 네트워크 실패는 `ApiError`의 `NETWORK_ERROR`, 비정상 HTTP 상태는 `HTTP_ERROR`, 읽을 수 없거나 스키마에 맞지 않는 응답은 `INVALID_RESPONSE`가 됩니다. HTTP 응답이 있으면 `status`도 전달합니다. 서버의 임의 오류 body를 사용자에게 그대로 출력하지 않습니다.

HTTP 요청은 응답 헤더와 JSON body 읽기를 합쳐 15초로 제한하며 초과 시 요청을 중단하고 `ApiError`의 `TIMEOUT`으로 전달합니다. `ApiError.mayHaveSucceeded`는 기본 `false`이며 읽기 전용(GET/HEAD)이 아닌 요청의 timeout·네트워크 실패·5xx·2xx 응답의 JSON/스키마 검증 실패에서는 `true`입니다. 응답을 받거나 해석하지 못했어도 서버 변경은 적용됐을 수 있기 때문입니다. 특히 502/504는 gateway가 upstream 응답을 정상적으로 받지 못했음을 나타내며 저장 실패나 rollback의 증거가 아닙니다. 공통 HTTP 경계에는 서버의 commit/rollback 보장 계약이 없으므로 모든 쓰기 5xx를 보수적으로 불확실하게 처리합니다. 4xx 쓰기 거부와 읽기 요청은 `mayHaveSucceeded: false`를 유지하며 HTTP 오류의 `code: HTTP_ERROR`와 원래 `status`도 보존합니다. `useErrorMessage`는 이 구조화된 값으로 언어를 바꿔도 저장 성공 가능성과 결과 재확인 안내를 유지하며 영어 오류 문자열을 해석하지 않습니다. 응답 헤더를 받은 뒤 시간이 초과되면 해당 `status`도 보존합니다. 불확실한 mutation 결과는 목록을 다시 조회해 확인하고 재시도하도록 안내하며 mutation 자체를 자동 재시도하지 않습니다. 서버 idempotency나 작업 결과 조회 계약을 구현한 것으로 간주하지 않습니다.

GET 요청의 AbortSignal을 transport까지 전달합니다. 호출자가 취소한 요청은 timeout 오류나 별도 `ApiError`로 감싸지 않습니다. 프로젝트·주문·고객 mutation이 성공하면 진행 중인 목록 요청을 먼저 취소하고 Query 캐시를 갱신한 뒤 목록을 무효화합니다. 따라서 초기 조회가 늦게 도착해 이미 성공한 변경을 가리지 않습니다. 서버가 거부한 mutation을 성공으로 표시하지 않습니다.

프로젝트·주문·고객 mutation 결과가 불확실하면 이전 목록 요청을 취소하고 해당 도메인 Query를 무효화해 활성 목록을 재조회합니다. 확인되지 않은 응답으로 캐시를 직접 수정하거나 성공 알림을 보여주지 않으며, 원래 mutation 오류와 재확인 안내는 유지합니다. 재조회도 실패할 수 있으므로 사용자는 목록/새로고침 결과를 확인한 뒤 다시 저장해야 합니다.

현재 인증 토큰 주입, refresh token 처리, 401 재인증, 권한 정책은 구현되어 있지 않습니다. 교차 출처 쿠키 인증을 선택하면 CORS, credentials, CSRF를 서버 정책과 함께 설계하고 테스트해야 합니다. 임의 토큰을 localStorage에 넣어 인증 구현을 대신하지 마세요.

## 데모 저장소

데모 프로젝트는 `orbit.demo.projects.v1` localStorage 키에 `{ version: 1, projects }` 형태로 저장됩니다. 잘못된 JSON/스키마는 샘플 데이터로 복구합니다. 저장소 접근이 거부되면 메모리로 동작하며 새로고침 이후 보존을 보장하지 않습니다.

주문은 `orbit.demo.orders.v1`에 `{ version: 1, orders }`, 고객은 `orbit.demo.customers.v1`에 `{ version: 1, customers }`를 저장합니다. 각 어댑터가 복원 데이터를 검증하고 저장소 실패 시 현재 세션의 메모리를 유지합니다. 이 저장소는 Query의 메모리 캐시와 별개입니다. 새로고침 후 HTTP GET이 저장 데이터를 다시 읽습니다. API 모드에서는 이 어댑터를 쓰지 않으며 실제 서버가 영속성을 소유합니다.

세 도메인 모두 저장된 목록의 중복 ID를 손상 데이터로 취급하고 기존 복구 정책에 따라 검증된 seed로 초기화합니다. 생성 ID가 기존 데이터와 충돌하면 `409`를 반환하고 기존 목록을 보존합니다. ID만 보고 서로 다른 레코드를 임의로 합치지 않습니다. 저장 키는 `shared/config/product.ts`의 `storageKeys`가 소유하며 이번 중앙화로 키 값이나 저장 버전은 바뀌지 않습니다.

데모 프로젝트 생성 항목에는 샘플 소유자 Alex Morgan과 0% 진행률을 부여합니다. 이것은 현재 로그인 사용자로부터 얻은 값이 아닙니다. 분석 데이터와 활동은 2026-10-05~2026-11-03 기준의 고정 샘플이며 프로젝트 편집과 결제/수익 데이터가 연동되어 있지 않습니다.

데모 데이터 전체를 초기화하려면 브라우저 개발자 도구의 저장소 화면에서 해당 키만 삭제한 뒤 새로고침하세요. API 모드에서는 데모 저장소가 실제 서버 데이터로 업로드되거나 마이그레이션되지 않습니다.

Zustand 워크스페이스 환경 설정도 검증된 저장소를 사용합니다. 손상된 값/지원하지 않는 버전은 기본 설정으로 복구하며 저장소 거부/용량 부족 시 세션 내 메모리로 계속 동작합니다. 이 경우 새로고침 후 설정 보존을 보장하지 않습니다.

언어와 표시 통화는 별도 `blueprint-locale-preferences` 키의 검증된 Zustand 환경 설정이며 상세 저장 형식은 [언어와 표시 통화](i18n.md)가 소유합니다. 환율 응답은 영구 저장하지 않습니다.

테마는 별도 `blueprint-theme` 키에 `light`, `dark`, `system` 중 하나로 저장합니다. 잘못된 값이나 읽기 실패는 기본 system 테마로 처리하고, 쓰기 실패 시에도 현재 세션에서 테마를 변경할 수 있습니다.
