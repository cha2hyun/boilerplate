# Query 키와 캐시 계약

이 문서는 조회 데이터의 키·수명·무효화를 소유합니다. 응답과 저장 형식은 [API 계약](api-contract.md), 로딩 화면과 숫자 표시는 [로딩과 모션](loading-and-motion.md)을 따릅니다.

## 소유와 공식 API

도메인 슬라이스의 `api/queries.ts`에서 키 팩토리와 TanStack 공식 [`queryOptions`](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)를 함께 정의하고 루트 `index.ts`로 공개합니다. 화면과 테스트는 같은 옵션을 사용합니다. 별도 query-key 라이브러리를 추가하지 않습니다.

키는 직렬화 가능한 배열이며 `도메인 → 조회 종류 → 응답을 바꾸는 파라미터` 순서입니다. 서버 응답을 바꾸는 기간·검색·정렬·페이지·계정/워크스페이스 식별자는 키에 포함합니다. 순서가 불안정한 문자열 조합이나 화면별 하드코딩 키는 쓰지 않습니다. 이 기준은 [공식 Query Keys 가이드](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)를 따릅니다.

| 도메인/화면 | 옵션                         | 실제 키                                                 |
| ----------- | ---------------------------- | ------------------------------------------------------- |
| Overview    | `analyticsQueryOptions()`    | `['analytics', 'summary']`                              |
| Analytics   | `trafficQueryOptions('7')`   | `['traffic', 'summary', { period: '7' }]`               |
| Orders      | `ordersQueryOptions()`       | `['orders', 'list']`                                    |
| Customers   | `customersQueryOptions()`    | `['customers', 'list']`                                 |
| Projects    | `projectsQueryOptions()`     | `['projects', 'list']`                                  |
| 환율        | `exchangeRateQueryOptions()` | `['exchange-rates', 'frankfurter', 'v2', 'USD', 'KRW']` |

```ts
const options = trafficQueryOptions('7')
const query = useQuery(options)
// 다른 소비자도 같은 정의를 사용한다.
await queryClient.query(options)
```

현재 주문/고객/프로젝트의 검색·정렬·페이지 나누기는 내려받은 전체 목록의 클라이언트 표현입니다. 따라서 이 상태는 목록 키에 넣지 않습니다. 서버에서 필터링/페이지 나누기를 시작하면 API 계약과 키를 함께 바꿉니다. 서로 다른 데이터 형태인 목록/상세/infinite query에 같은 키를 재사용하지 않습니다.

## 수명과 화면 동작

업무 샘플 조회의 기본값은 **staleTime 60초**, **gcTime 5분**입니다. staleTime은 데이터의 신선도, gcTime은 마지막 구독자가 떠난 뒤의 보관 기간입니다. 업무 샘플의 도메인 옵션은 전역 기본값과 같습니다. 외부 기준 환율은 일별 갱신 특성에 맞춰 **staleTime 6시간**, **gcTime 24시간**을 사용합니다. 환율 응답·실패·출처 계약은 [언어와 표시 통화](i18n.md)가 소유합니다. [공식 기본 동작](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)을 참고하세요.

- 신선한 캐시로 다시 들어오면 네트워크 요청 없이 데이터를 즉시 표시합니다. 같은 키를 동시에 조회하면 요청을 공유합니다.
- 오래된 캐시가 있으면 기존 데이터를 표시하면서 백그라운드 갱신합니다. `isFetching`만으로 카드 전체를 스켈레톤으로 바꾸지 않습니다.
- 최초 데이터가 없을 때만 로딩 자리표시자를 표시합니다. 실패 시 재시도를 제공하고, 갱신 실패라면 이미 받은 데이터는 유지합니다.
- 포커스 복귀 시 stale 데이터는 Query의 기본 갱신 정책을 따릅니다. 단순히 포커스가 돌아왔다는 이유로 신선한 캐시를 지우지 않습니다.
- 이 캐시는 메모리 캐시입니다. 전체 브라우저 새로고침 후에도 보존된다고 설명하지 않습니다. localStorage에 저장되는 프로젝트 demo 데이터와 Query 캐시는 별개입니다.

## 변경과 취소

프로젝트 mutation 성공 시 도메인 루트로 진행 중인 조회를 취소하고 **정확한 목록 키**를 갱신한 뒤 해당 도메인을 무효화합니다. 늦은 GET이 성공한 변경을 덮지 않도록 순서를 유지합니다. 관계없는 도메인을 전부 무효화하거나 서버 상태를 Zustand에 복제하지 않습니다.

조회 함수는 Query가 준 `signal`을 `apiClient`까지 전달합니다. 로그아웃/계정 변경을 구현할 때는 계정이 바뀌는 모든 키와 민감한 캐시 삭제 정책을 함께 설계해야 합니다. 현재 demo는 실제 계정 격리를 구현했다고 주장하지 않습니다.

## 목업으로 확인하기

demo 모드에서 MSW가 `/api/analytics`, `/api/traffic?period=…`, `/api/orders`, `/api/customers`의 실제 fetch를 처리합니다. 목업 응답은 450ms 지연과 `Cache-Control: no-store`를 사용합니다. 브라우저 HTTP 캐시와 Query 캐시를 혼동하지 않기 위한 설정이며, cache hit에 인위적인 지연을 추가하지 않습니다. 실제 API 모드는 worker를 시작하지 않습니다. 외부 Frankfurter 환율 요청은 demo에서도 MSW를 통과해 실제 API로 전송됩니다. 고정 환율 fixture는 테스트에만 둡니다.

1. 새로고침 후 한 페이지를 열어 Network의 첫 요청과 초기 스켈레톤을 확인합니다.
2. 사이드바로 다른 경로에 갔다가 60초 안에 돌아옵니다. 같은 endpoint 요청은 증가하지 않고 데이터가 바로 표시되어야 합니다.
3. Analytics에서 30일→7일→30일로 바꿉니다. 기간별 키가 따로 생기고 이미 신선한 기간으로 돌아오면 재요청하지 않아야 합니다.
4. 통합 TanStack Devtools의 Query 패널에서 키·dataUpdatedAt·fetch 상태를 확인합니다. 강제 invalidate 시에는 기존 데이터가 유지되면서 요청이 다시 발생해야 합니다.

업무 샘플의 네트워크 요청 수/중복 제거/키 분리/무효화/취소는 `src/app/mocks/queries.test.ts`, 외부 환율 응답 검증과 별도 캐시 수명은 `src/entities/exchange-rate/api/queries.test.ts`, 실제 production 화면의 cold/warm 탐색과 카드 치수는 `e2e/query-cache.spec.ts`가 검증합니다. 전체 실행 위치는 [테스트 정책](testing.md)을 따릅니다.
