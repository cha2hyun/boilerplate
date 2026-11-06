# 주문 기록만 남기는 최소 어드민 포크

새 제품에 데모 화면를 모두 가져갈 필요는 없습니다. 이 예시의 사용자는 주문 기록을 찾아 내용을 고치는 담당자입니다. 첫 화면은 주문 목록, 다른 메뉴는 브라우저 환경 설정 하나뿐입니다. **아래 경로는 포크에서 선택할 변경이며 이 저장소의 화면을 삭제하는 지시가 아닙니다.** 주문 상태 변경은 기록 편집입니다. 실제 결제·배송, 사용자 인증·권한, 운영 백엔드는 제공되지 않습니다.

## 1. 라우트·메뉴·명세를 같은 단위로 줄이기

| 경로                                                                                                             | 포크에서의 역할           | 직접 바꿀 소유 파일과 확인 사항                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                                              | `/orders`로 보내는 진입점 | [index 라우트](../../src/app/routes/index.tsx)의 Overview 조회/화면 조합을 `beforeLoad` 리다이렉트로 대체합니다. `/` 라우트는 남으므로 [Overview 명세](../pages/overview.md)도 삭제하지 않고 진입·리다이렉트 동작을 적습니다.                                                             |
| `/orders`                                                                                                        | 시작 업무 화면            | [라우트](../../src/app/routes/orders.tsx)·[페이지](../../src/pages/orders)·[편집 feature](../../src/features/order-editor)·[entity](../../src/entities/order)와 [주문 명세](../pages/orders.md)를 함께 유지합니다. 목록 조건/상세 ID는 URL, 데이터는 Query, 폼 초안은 feature 소유입니다. |
| `/settings`                                                                                                      | 브라우저의 이름·밀도·테마 | [라우트](../../src/app/routes/settings.tsx)·[설정 페이지](../../src/pages/settings)·[워크스페이스 설정](../../src/features/workspace-preferences)과 [설정 명세](../pages/settings.md)를 유지합니다. 계정·조직 설정으로 이름을 바꾸지 않습니다.                                            |
| `/projects`, `/analytics`, `/customers`, `/inbox`, `/components`, `/foundations`, `/login`, `/users`, `/account` | 운영 메뉴에 없는 예제     | [라우트 폴더](../../src/app/routes)와 대응 [페이지 명세 목록](../pages/README.md)에서 같은 경로를 정리합니다. Overview 페이지와 프로젝트 표/매출 위젯도 소비자가 없을 때만 제거합니다. 공유 Input·Card·ThemeProvider처럼 남은 화면이 쓰는 코드는 유지합니다.                              |

예를 들어 포크의 `src/app/routes/index.tsx`는 아래처럼 시작할 수 있습니다.

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    redirect({ throw: true, to: '/orders' })
  },
})
```

- [탐색 레지스트리](../../src/widgets/app-shell/model/navigation.ts)에는 Orders/Settings와 실제로 사용하는 그룹만 남깁니다. [셸](../../src/widgets/app-shell/ui/app-shell.tsx)의 로고·검색 팔레트·모바일 drawer·문서 링크, [404 복구](../../src/app/routes/__root.tsx)의 귀환 링크와 문구도 첫 업무를 가리키게 합니다. `/`만 남기고 화면의 “Overview로 돌아가기”를 놓치지 마세요.
- [메타 레지스트리](../../src/app/seo/metadata.ts)의 두 언어에 `/`, `/orders`, `/settings`만 둡니다. `/`의 소개도 주문 시작점에 맞춥니다. [라우트/메타 타입 계약](../../src/app/seo/route-contract.ts)과 [정적 HTML 생성](../../scripts/route-metadata.ts)을 유지합니다. 공개 origin을 지정해도 관리자 경로는 비색인 상태로 둡니다.
- 라우트 정리 후 `pnpm routes:generate`로 생성 트리를 갱신합니다. `routeTree.gen.ts`를 손으로 편집하지 않습니다. [페이지 명세 인덱스](../pages/README.md)는 유지한 세 경로의 목적과 소유 코드·테스트로 다시 연결합니다.

## 2. 남은 참조를 소비자부터 따라가기

| 대상                    | 이 예시에서 유지할 것                                                                                                                                                                                               | 줄일 때 함께 볼 것                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 번역                    | [common·workspace·admin·orderEditor](../../src/shared/lib/i18n/resources.ts)에서 실제 셸/설정/주문/오류/도움말 키                                                                                                   | `admin` 전체를 삭제하면 주문도 깨집니다. `examples`·`customerEditor`와 샘플 키는 두 언어에서 함께 정리하고 [키·변수 대칭 검사](../../src/shared/lib/i18n/resources.test.ts)의 namespace 기대값도 바꿉니다.                                                                                                                                                                                          |
| 데이터·표시 환경        | [Orders HTTP](../../src/entities/order/api/http.ts), [Query](../../src/entities/order/api/queries.ts), [MSW 시작](../../src/app/mocks/start.ts), [데모 handlers](../../src/app/mocks/handlers.ts)의 주문 엔드포인트 | `handlers.ts`의 다른 도메인 import/초기화가 남으면 번들에 샘플이 계속 들어갑니다. USD/KRW 표시를 유지한다면 [CurrencyProvider](../../src/app/providers/currency-provider.tsx)와 환율 entity도 남깁니다.                                                                                                                                                                                             |
| 제품 이름·브라우저 저장 | [제품 구성](../../src/shared/config/product.ts)의 제품명·링크·고유 저장 namespace                                                                                                                                   | 제거한 seed/키의 import까지 찾아 정리합니다. 원본 사이트나 다른 제품의 localStorage 전체를 지우지 않습니다.                                                                                                                                                                                                                                                                                         |
| 검증                    | 주문 목록→상세→편집, 저장 실패·입력 보호, 설정 저장·초점·키보드, 샘플 표시와 404                                                                                                                                    | [workspace](../../e2e/workspace.spec.ts)·[commerce](../../e2e/commerce.spec.ts)·[query-cache](../../e2e/query-cache.spec.ts) 등 여러 경로를 한 파일에서 검증하므로 파일째 삭제하지 않습니다. 제거한 경로의 시나리오만 정리하고 유지한 기능을 대체 시나리오에 연결합니다. [E2E 범주](../../package.json), [search 공개 경로 예외](../../scripts/search-entrypoints.mjs)와 시각 기준도 다시 맞춥니다. |

포크에서 `rg -n '/(projects|analytics|customers|inbox|components|foundations|login|users|account)' src e2e scripts docs/pages`로 남은 경로 참조를 검토하세요. 라이브러리 패키지명·설명용 예시 같은 검색 결과까지 일괄 삭제하지 않습니다.

## 3. 다음 도메인을 넣는 순서: 반품 요청 기록

예를 들어 `/returns`를 추가한다면 첫 완료 조건을 “담당자가 `접수` 상태만 찾아 상세를 열고, 사유를 수정해 저장한 뒤 같은 목록 위치로 돌아간다”로 적습니다. 실제 환불 실행은 이 기능에 포함하지 않습니다.

1. [페이지 템플릿](../pages/_template.md)에 조회 조건의 URL 복원, 성공/빈 결과/실패/재시도, 저장 중·불확실한 저장과 폐기 확인을 먼저 씁니다. `entities/return-request`에는 ID·상태·사유와 입력/응답 Zod 스키마를 둡니다. API 응답과 편집 제한은 필요에 따라 분리합니다.
2. [Orders HTTP adapter](../../src/entities/order/api/http.ts)처럼 목록·상세·수정에 공통 transport와 `AbortSignal`을 사용합니다. 예시 경로는 `GET /api/return-requests?status=received&page=1`, `GET/PATCH /api/return-requests/:id`입니다. 목록 계약에는 항목·유효 페이지·페이지 크기·전체 건수를 명시합니다. [MSW handlers](../../src/app/mocks/handlers.ts)에 같은 경로·스키마를 연결해 **데모에서도 UI → fetch → MSW → 검증된 응답**을 지나게 합니다. 페이지에 fixture 배열을 직접 넣지 않습니다.
3. [Orders Query](../../src/entities/order/api/queries.ts)처럼 검증된 조회 조건별 키를 만들고 상세 ID와 목록 키를 분리합니다. 수정 후 목록/상세가 함께 맞아야 하며, 결과 불확실 시 쓰기를 자동 재전송하지 않습니다. `features/return-request-editor`는 입력·저장·폐기, `pages/returns`는 화면 조합만 소유합니다. URL 조회 검증을 UI 없는 별도 `search.ts`로 공개해야 한다면 [공개 경로 예외와 검사](../../scripts/search-entrypoints.mjs)를 해당 파일 하나에 한해 검토합니다.
4. `/returns` 라우트·메뉴·메타·명세·양쪽 언어를 같은 변경으로 추가합니다. 목록/상세 응답 검증, 검색 중 취소, 저장 실패·복구 단위 검사와 URL→상세→수정→목록/초점 브라우저 시나리오를 추가합니다. 실제 API 제공 전에는 데모임을 표시합니다.

## 포크의 완료 증거

- `/`로 직접 들어오면 `/orders`가 열리고 새로고침한 상세 링크도 복원됩니다. 셸·검색·모바일 탐색에는 Orders/Settings만 나오며 제거한 경로는 404에서 주문으로 돌아갈 수 있습니다.
- 데모 주문을 만들고 수정한 뒤 새로고침하면 같은 브라우저에서 결과를 확인할 수 있습니다. 저장소 차단 시 세션 한계가 표시되고, 미저장 편집의 취소/이탈에는 초안 보호가 작동합니다. 기록 변경을 결제·배송 성공으로 표시하지 않습니다.
- `pnpm check`와 포크 최종 SHA의 Actions에서 남은 라우트·명세·메타 대응, 두 언어, 단위/E2E 범주, 빌드를 확인합니다. 대표 테스트를 제거해 통과시키지 않고 [테스트 정책](../testing.md)과 [운영 전환](../production-readiness.md)의 미구현 경계를 유지합니다.

주문·설정만 남기면 셸의 계정 메뉴와 로그인 전용 레이아웃 분기도 함께 제거한다. 샘플 로그인을 유지하는 포크는 구성원 상세와 내 계정 라우트를 보존하고 운영 전환 때 서버 세션으로 교체한다.
