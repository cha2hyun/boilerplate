# API 계약과 데이터 모드

`src/shared/config/env.ts`에서 환경 변수를 검증합니다. `VITE_DATA_SOURCE=demo`가 기본이며 API 모드는 `VITE_DATA_SOURCE=api`로 선택합니다. `VITE_API_BASE_URL` 기본값은 `/api`입니다. 루트 상대 경로 또는 자격증명/query/hash 없는 `http://`·`https://` 절대 URL을 허용합니다. 역슬래시, 내부 공백, 빈 query/hash 구분자와 `https:host` 같은 모호한 주소는 거부합니다. 실제 백엔드 서버는 포함하지 않으며 demo의 조회 HTTP는 MSW가 브라우저에서 처리합니다.

## HTTP 계약

JSON 요청/응답을 사용하며 envelope 없이 아래 객체/배열을 반환합니다. 현재 목록 필터/정렬/페이지 나누기는 클라이언트에서 처리합니다. 서버 페이지네이션을 도입하면 Query key, API 계약, UI를 함께 변경해야 합니다.

| 요청                            | 요청 body      | 성공 응답              |
| ------------------------------- | -------------- | ---------------------- |
| `GET /projects`                 | 없음           | `200 Project[]`        |
| `POST /projects`                | `ProjectInput` | `200/201 Project`      |
| `PATCH /projects/:id`           | `ProjectInput` | `200 Project`          |
| `DELETE /projects/:id`          | 없음           | `204` (body 없음)      |
| `GET /analytics`                | 없음           | `200 Analytics`        |
| `GET /traffic?period=7\|14\|30` | 없음           | `200 Traffic`          |
| `GET /orders`                   | 없음           | `200 SampleOrder[]`    |
| `GET /customers`                | 없음           | `200 SampleCustomer[]` |

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

Traffic/Order/Customer의 계약은 각각 `entities/traffic`, `entities/order`, `entities/customer`의 `model/schema.ts`가 소유합니다. Traffic은 선택 기간의 일별 방문·세션·페이지뷰와 유입/페이지/기기별 요약을 반환합니다. 주문/고객은 상세 Sheet에 필요한 필드를 포함한 읽기 전용 전체 목록입니다. 목록의 검색·정렬·페이지 나누기는 클라이언트에서 수행하며 서버 필터를 구현한 것으로 설명하지 않습니다.

API는 차트 색상이나 `fill` 같은 스타일 값을 반환하지 않습니다. Traffic의 기기 항목은 `device`와 `sessions`만 포함하며, 화면이 로컬 의미 토큰으로 색상을 지정합니다. 응답에 알 수 없는 스타일 필드가 있어도 스키마 검증 결과에서 제거되므로 화면에 전달하지 않습니다.

금액의 원본 통화는 USD입니다. Analytics KPI/수익 차트는 달러 단위, Order 상품 가격·배송비와 Customer 누적 금액은 cents입니다. 선택 통화로 변환하기 전에 cents 호출부는 `/ 100`을 적용합니다. 외부 `https://api.frankfurter.dev/v2/rate/USD/KRW` 요청은 `VITE_API_BASE_URL`이나 demo 데이터 모드와 별개이며 `entities/exchange-rate`가 응답을 검증합니다. 공급자·변환·캐시 계약은 [언어와 표시 통화](i18n.md)를 따릅니다.

## 목업 HTTP와 시작 경계

`app/mocks/start.ts`는 demo에서만 MSW를 동적으로 가져와 worker 준비를 기다린 뒤 React 앱을 시작합니다. 운영 API 모드에서는 해당 import/worker 시작을 수행하지 않습니다. 실패하면 shadcn 오류 화면과 Reload 버튼을 제공하며 가짜 성공 데이터로 바꾸지 않습니다. worker에는 secure context(HTTPS 또는 localhost)가 필요합니다.

핸들러는 위 네 개 조회 endpoint만 처리합니다. 프로젝트는 기존 demo 저장 어댑터를 유지하고, 그 외 요청은 통과시킵니다. 따라서 외부 환율은 demo에서도 실제 API를 사용하며 런타임 샘플 환율을 주입하지 않습니다. 고정된 450ms 지연과 `Cache-Control: no-store`로 Query 캐시의 동작을 구분할 수 있습니다. HTTP 목업은 dev와 production demo preview에서 동일하게 동작합니다. 실제 API의 인증/권한/백엔드를 제공하는 기능은 아닙니다.

`public/mockServiceWorker.js`는 MSW CLI가 생성하는 자산이며 내용/무결성 코드를 직접 편집하지 않습니다. MSW 버전을 바꾸면 `pnpm exec msw init public --save`로 재생성합니다. formatter/ESLint는 이 생성 파일 하나만 제외합니다. 정적 호스트는 이 파일을 SPA fallback보다 먼저 JavaScript로 제공해야 합니다. Query 키/캐시 수명·검증 방법은 [Query 캐시](query-cache.md)가 소유합니다.

## 실패, 취소, 캐시

공통 transport는 `Accept: application/json`을 설정하고 body가 있으면 JSON으로 직렬화합니다. 응답 body는 Zod 스키마로 검증합니다. `204`는 `null`로 처리합니다. 네트워크 실패는 `ApiError`의 `NETWORK_ERROR`, 비정상 HTTP 상태는 `HTTP_ERROR`, 읽을 수 없거나 스키마에 맞지 않는 응답은 `INVALID_RESPONSE`가 됩니다. HTTP 응답이 있으면 `status`도 전달합니다. 서버의 임의 오류 body를 사용자에게 그대로 출력하지 않습니다.

HTTP 요청은 응답 헤더와 JSON body 읽기를 합쳐 15초로 제한하며 초과 시 요청을 중단하고 `ApiError`의 `TIMEOUT`으로 전달합니다. `ApiError.mayHaveSucceeded`는 기본 `false`이며 읽기 전용(GET/HEAD)이 아닌 요청의 timeout·네트워크 실패·2xx 응답의 JSON/스키마 검증 실패에서는 `true`입니다. 응답을 받거나 해석하지 못했어도 서버 변경은 적용됐을 수 있기 때문입니다. 명시적인 HTTP 실패 응답과 읽기 요청은 기존 오류 구분을 유지합니다. `useErrorMessage`는 이 구조화된 값으로 언어를 바꿔도 저장 성공 가능성과 결과 재확인 안내를 유지하며 영어 오류 문자열을 해석하지 않습니다. 응답 헤더를 받은 뒤 시간이 초과되면 해당 `status`도 보존합니다. 불확실한 mutation 결과는 목록을 다시 조회해 확인하고 재시도하도록 안내하며 mutation 자체를 자동 재시도하지 않습니다.

GET 요청의 AbortSignal을 transport까지 전달합니다. 호출자가 취소한 요청은 timeout 오류나 별도 `ApiError`로 감싸지 않습니다. 프로젝트 mutation이 성공하면 진행 중인 목록 요청을 먼저 취소하고 Query 캐시를 갱신한 뒤 목록을 무효화합니다. 따라서 초기 조회가 늦게 도착해 이미 성공한 변경을 가리지 않습니다. 서버가 거부한 mutation을 성공으로 표시하지 않습니다.

프로젝트 mutation 결과가 불확실하면 이전 목록 요청을 취소하고 프로젝트 Query를 무효화해 활성 목록을 재조회합니다. 확인되지 않은 응답으로 캐시를 직접 수정하거나 성공 알림을 보여주지 않으며, 원래 mutation 오류와 재확인 안내는 유지합니다. 재조회도 실패할 수 있으므로 사용자는 목록/새로고침 결과를 확인한 뒤 다시 저장해야 합니다.

현재 인증 토큰 주입, refresh token 처리, 401 재인증, 권한 정책은 구현되어 있지 않습니다. 교차 출처 쿠키 인증을 선택하면 CORS, credentials, CSRF를 서버 정책과 함께 설계하고 테스트해야 합니다. 임의 토큰을 localStorage에 넣어 인증 구현을 대신하지 마세요.

## 데모 저장소

데모 프로젝트는 `orbit.demo.projects.v1` localStorage 키에 `{ version: 1, projects }` 형태로 저장됩니다. 잘못된 JSON/스키마는 샘플 데이터로 복구합니다. 저장소 접근이 거부되면 메모리로 동작하며 새로고침 이후 보존을 보장하지 않습니다.

데모 생성 항목에는 샘플 소유자 Alex Morgan과 0% 진행률을 부여합니다. 이것은 현재 로그인 사용자로부터 얻은 값이 아닙니다. 분석 데이터와 활동은 2026-10-05~2026-11-03 기준의 고정 샘플이며 프로젝트 편집과 결제/수익 데이터가 연동되어 있지 않습니다.

데모 데이터 전체를 초기화하려면 브라우저 개발자 도구의 저장소 화면에서 해당 키만 삭제한 뒤 새로고침하세요. API 모드에서는 데모 저장소가 실제 서버 데이터로 업로드되거나 마이그레이션되지 않습니다.

Zustand 워크스페이스 환경 설정도 검증된 저장소를 사용합니다. 손상된 값/지원하지 않는 버전은 기본 설정으로 복구하며 저장소 거부/용량 부족 시 세션 내 메모리로 계속 동작합니다. 이 경우 새로고침 후 설정 보존을 보장하지 않습니다.

언어와 표시 통화는 별도 `blueprint-locale-preferences` 키의 검증된 Zustand 환경 설정이며 상세 저장 형식은 [언어와 표시 통화](i18n.md)가 소유합니다. 환율 응답은 영구 저장하지 않습니다.

테마는 별도 `blueprint-theme` 키에 `light`, `dark`, `system` 중 하나로 저장합니다. 잘못된 값이나 읽기 실패는 기본 system 테마로 처리하고, 쓰기 실패 시에도 현재 세션에서 테마를 변경할 수 있습니다.
