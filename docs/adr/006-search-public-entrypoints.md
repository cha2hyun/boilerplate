# ADR 006: UI를 가져오지 않는 조회 계약 공개 진입점

상태: 승인됨

## 문제와 근거

Router는 전체 라우트의 `validateSearch`를 시작 시 준비하고, 페이지 컴포넌트는 자동 분리한 청크로 가져온다. 그러나 하나의 슬라이스 `index.ts`에서 조회 스키마와 UI를 함께 re-export하면 critical 라우트와 분리된 라우트가 같은 정적 모듈 그래프를 공유한다.

`7758183`의 production 산출물에서 Overview·Projects·Analytics·Inbox의 라우트 청크는 약 300 bytes, Orders·Customers는 390 bytes였고 실제 Page를 781,385-byte main 청크에서 역수입했다. main에는 Projects 첫 진입에 필요 없는 Recharts와 다른 페이지 UI가 포함되어 있었다. 스키마를 가져오지 않는 Settings·Components·Foundations는 실제 페이지가 별도 청크로 분리되었다. 청크 이름은 소유 코드 전체를 뜻하지 않으며 이 수치는 해당 SHA의 관측값이다.

설치된 Router compiler를 단일 라우트에 적용하면 critical 라우트의 Page binding은 제거되지만 같은 barrel의 스키마 import는 남는다. 작은 Rolldown 가상 모듈 재현에서도 이 정적 연결이 UI를 entry에 남겼다. 이는 전페이지 intent preload나 화면 렌더 지연의 문제가 아니다.

## 결정

기존 root `index.ts` 공개 원칙을 유지하면서 아래 여덟 파일만 조회 계약의 추가 공개 진입점으로 허용한다.

- `pages/{overview,projects,analytics,orders,customers,inbox}/search.ts`
- `widgets/{project-table,revenue-chart}/search.ts`

`search.ts`는 기존 스키마·기본값·출력 타입의 named re-export만 한다. 스키마의 소유 모델, URL 값, 복원·탐색 동작은 바꾸지 않는다. 기존 `index.ts`도 같은 계약을 재공개하여 기존 소비자 API를 유지한다. 여섯 라우트는 조회 계약만 `search.ts`로 가져오고 Page는 계속 `index.ts`에서 가져온다. Overview의 조회 모델과 Projects의 공개 조회 계약도 위젯 `search.ts`를 참조한다.

추가 공개 경로는 레이어 방향이나 같은 레이어의 슬라이스 격리를 우회하지 않는다. 허용 목록 밖의 `search.ts`, `model/search.ts` 등 내부 경로는 계속 거부한다. 전체 `moduleSideEffects: false`, 검사 ignore, 새로운 UI 프레임워크는 사용하지 않는다.

## 검토한 대안

| 대안                                             | 결과와 선택하지 않은 이유                                                                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 동일 barrel을 유지하고 공식 `.lazy.tsx`로 이동   | 작은 번들 재현에서 UI가 여전히 entry에 남았다. 분리 대상 wrapper만 옮겨서는 정적 연결이 사라지지 않는다.                                                                                       |
| root index에 lazy Page 또는 dynamic loader 공개  | 기존 auto-split wrapper를 유지하면 wrapper 요청 뒤 UI 요청이 추가된다. Router는 중첩된 lazy Page의 preload를 자동으로 재귀 연결하지 않으므로 intent preload도 별도 관리해야 한다.              |
| root index의 loader를 `Route.lazy()`에 직접 연결 | 단일 UI 요청과 Router preload를 유지할 수 있지만 공개 Page API와 각 라우트 연결을 바꿔야 한다. 위젯의 스키마/UI 혼합은 따로 해결해야 하므로 계약 소유권 이동이나 추가 preload 조합이 필요하다. |
| 조회 스키마를 app/shared로 이동하거나 복제       | 기존 페이지·위젯 소유권을 흐리거나 같은 URL 계약을 여러 곳에서 유지하게 된다.                                                                                                                  |
| 정확히 제한한 조회 공개 진입점                   | 기존 자동 분리와 UI API를 유지하면서 정적 연결만 제거한다. 추가 wrapper나 현재 화면의 지연 단계를 만들지 않아 채택한다.                                                                        |

## 보호와 검증

`scripts/search-entrypoints.mjs`는 공개 경로의 정확한 목록, named re-export 형식, 소스 런타임 import/re-export의 전이 그래프를 검사한다. `.tsx`/`.jsx`, `ui`/`components` 경로, 알려진 컴포넌트 라이브러리와 스타일, side-effect-only import에 연결되면 실패한다. 간접 barrel, 동적 import와 require, 확장자를 생략한 모듈도 확인한다. 해석할 수 없는 내부 경로와 계산된 import는 통과시키지 않는다. 타입 전용 연결은 런타임 그래프에서 제외한다. 단, 현재 `verbatimModuleSyntax`와 Vite/Oxc에서 `import { type T }`는 side-effect import로 남으므로 이 형태는 제외하지 않는다. 런타임 연결 없이 타입만 가져올 때는 `import type`을 사용한다.

UI 없는 entity root의 API/helper는 허용한다. 외부 패키지 내부와 임의 함수 실행의 모든 부작용을 증명하지는 않으며, 이 검사를 tree-shaking 또는 실제 성능 결과로 설명하지 않는다. 기존 FSD 검사가 별도로 모든 import 형태에 적용된다.

선택 가드레일 테스트는 허용된 데이터·타입 연결과 위 금지 경로를 검사하고, 저장소 검사에 전이 그래프 검사가 포함되는지도 확인한다. 최종 수용에는 CI production 산출물에서 Projects 첫 진입의 다른 페이지 UI/Recharts 유입이 제거되었는지 확인하고, intent preload·직접 링크·URL 복원·청크 로딩 실패 복구를 브라우저로 검증한다. 실제 TBT/LCP 효과는 같은 환경의 측정으로 확인하며 이 결정만으로 개선 수치를 보장하지 않는다.
