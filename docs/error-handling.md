# 앱 오류 복구와 보고

이 보일러플레이트는 오류를 처리하는 위치와 보고 어댑터의 연결점을 제공합니다. **외부 오류 수집 서비스는 연결하지 않았으며 기본 어댑터는 아무것도 전송하거나 저장하지 않습니다.** 실제 운영 모니터링·알림·사용자 세션 기록이 구현됐다고 설명하지 않습니다.

## 복구의 소유자

| 오류 위치                                                | 사용자 동작                                             | 보고 연결                                   |
| -------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| Router가 처리하는 route 렌더/로딩 실패                   | 기존 route 오류 화면에서 다시 시도                      | root route `onCatch`, React `onCaughtError` |
| Router 밖의 앱/Provider 렌더 실패                        | 앱 전체 복구 화면에서 새로고침                          | `AppErrorBoundary`, React `onCaughtError`   |
| i18n 초기화 실패                                         | Provider 없는 앱 복구 화면에서 새로고침                 | `startup`                                   |
| demo mock 시작 실패                                      | 기존 데모 시작 실패 문구와 새로고침                     | `startup`                                   |
| React가 자동 복구하거나 boundary가 잡지 못한 오류        | React의 처리 결과 유지                                  | `onRecoverableError`, `onUncaughtError`     |
| 이벤트 핸들러/전역 실행 오류, 처리되지 않은 Promise 거절 | 정상 화면 유지, 브라우저 기본 오류 처리는 취소하지 않음 | `window.error`, `unhandledrejection`        |

`src/main.tsx`가 `AppErrorBoundary`를 `App` 바깥에 배치하므로 Localization, Theme, Query, Currency Provider까지 포함합니다. React root 콜백은 보고 연결이며 boundary를 대신하지 않습니다. route의 재시도 버튼과 각 데이터/폼 오류 처리는 기존 소유자에 남습니다. 이미 TanStack Router가 처리하는 chunk 재로드에 별도 Vite 핸들러를 중복 등록하지 않습니다.

초기화는 두 작업이 모두 성공했을 때만 앱을 시작합니다. 하나가 실패하면 다른 작업의 완료를 기다리지 않고 실패한 단계의 복구 화면을 표시하며, 나중에 발생하는 두 번째 거절도 처리합니다. 첫 실패의 화면을 유지하고 반복 재마운트하지 않습니다.

복구 화면은 설치된 shadcn Card/Button/Stack과 의미 색상 토큰으로 구성합니다. i18next, Router, Query, 테마 또는 환율 context를 사용하지 않습니다. 제목에 초점을 이동하고 ko/en `common`의 정적 문구만 표시하며 오류 원문을 렌더링하지 않습니다. 언어는 성공적으로 commit한 LocalizationProvider가 남긴 정확한 문서 언어(`en-US`/`ko-KR`) → 검증한 저장 언어 → 영어 순입니다. 초기 HTML의 `lang="en"` 상태에서는 저장 언어를 읽습니다. 저장소가 차단되거나 JSON이 깨졌거나 4,096자를 넘으면 건너뜁니다. 새로고침은 재시도이며 저장하지 않은 앱 메모리를 복원하지 않습니다.

## 어댑터 연결

앱 초기화 시 `setErrorReporter`를 한 번 호출해 서비스가 승인한 transport에 연결합니다. 초기 오류까지 수신하려면 `src/main.tsx`의 전역 이벤트 등록과 초기화 Promise보다 앞에 설치하세요. 설치가 끝난 뒤 반환된 정리 함수를 호출하면 이전 어댑터로 돌아갑니다. 개발 HMR 또는 앱 수명 종료에도 정리할 수 있습니다.

```ts
import { setErrorReporter, type ErrorReport } from '@/shared/lib/error-reporting'

// sendApprovedReport는 제품에서 별도로 구현·검토해야 하는 전송 함수입니다.
function connectErrorReporter(sendApprovedReport: (report: ErrorReport) => Promise<void>) {
  return setErrorReporter((report) => sendApprovedReport(report))
}
```

`reportError(error, { source })`는 원래 오류를 어댑터로 전달하지 않습니다. 현재 payload는 다음 세 필드뿐입니다.

```json
{ "version": 1, "source": "app-boundary", "kind": "object" }
```

- `source`: `app-boundary`, `react-caught`, `react-uncaught`, `react-recoverable`, `route`, `startup`, `window-error`, `unhandled-rejection`, `unknown` 중 하나입니다. 런타임의 허용되지 않은 값이나 읽을 수 없는 context는 `unknown`입니다.
- `kind`: `typeof` 결과 또는 `null`입니다. `Error`도 `object`이며 사용자 정의 오류 이름이나 생성자를 읽지 않습니다.
- `version`: 계약 버전 `1`입니다. payload는 freeze하며 임의 metadata를 복사하지 않습니다.

오류 message/stack/cause/componentStack, URL/path/query/hash, request body, 사용자 입력, 사용자/워크스페이스 식별자를 수집하지 않습니다. 객체 getter, prototype, `toString`, JSON 직렬화를 실행하지 않으므로 순환 객체나 Proxy, 문자열·Symbol throw도 처리할 수 있습니다. 디버깅을 위해 원문을 붙이거나 SDK의 자동 URL/사용자 수집을 켜면 이 계약 밖의 데이터 전송이 됩니다. 외부 연동을 도입할 때는 전송 endpoint, SDK 기본 수집, 데이터 보존과 접근 정책을 함께 검토하고 테스트하세요.

## 중복·실패와 한계

- 같은 객체는 5초 동안 경로에 관계없이 한 번만 전달합니다. React root와 앱/route boundary, 브라우저 이벤트의 중복을 줄이며 첫 보고의 `source`를 유지합니다. 객체는 WeakMap으로 추적합니다.
- primitive는 원문을 보관하지 않고 타입별로 5초 동안 합칩니다. 이 때문에 같은 타입의 별개 오류가 합쳐질 수 있습니다. 다른 객체로 감싼 오류는 같은 사건인지 판별하지 않습니다.
- 어댑터의 동기 throw와 Promise reject는 흡수하며 다시 보고하지 않습니다. 동기 호출 도중의 재귀 보고를 막으며, 이전 Promise가 끝나지 않아도 별개 오류는 전달합니다. 어댑터는 `reportError`를 다시 호출하지 않고 transport에 전달해야 합니다. 큐/자동 재시도는 없으며 시간 제한·전송량 제한은 실제 transport가 소유합니다. 이 연결점은 오류 전달을 보장하는 영속 큐가 아닙니다.
- 전역 이벤트는 정상 화면을 오류 화면으로 바꾸지 않습니다. 컴포넌트 boundary는 이벤트 핸들러·비동기 콜백·자기 자신의 렌더 실패를 복구하지 못합니다. root 콜백도 임의로 화면을 다시 마운트하지 않습니다.
- JavaScript 번들이 로드/평가되기 전의 실패, root DOM 부재, 복구 UI 자체의 실패, 브라우저 종료·오프라인 전송 성공은 보장하지 않습니다. 정적 import 단계의 예외는 앱 초기화 Promise나 boundary보다 먼저 발생할 수 있습니다.
- React root 콜백을 설정하면 React의 기본 오류 출력이 대체되므로 별도의 로컬 `console.error` 진단을 남깁니다. 초기화 실패도 같은 정책을 따릅니다. 개발 모드에서는 원래 오류를 함께 출력하고 프로덕션에서는 고정 문구와 `source`만 출력합니다. 이 로컬 출력은 외부 어댑터 payload와 별개이며, 브라우저가 자체 출력하는 전역 오류 메시지를 취소하거나 지우지 않습니다.

집중 단위 테스트는 privacy/허용 목록, Proxy/getter, root·boundary 중복, adapter throw/reject/재귀, Provider 실패와 정적 ko/en 복구를 검증합니다. 브라우저 복구 시나리오는 프로덕션 번들의 Provider 실패 후 새로고침을 확인합니다. 검사 실행 정책은 [테스트](testing.md)를 따릅니다. React 계약은 공식 [createRoot](https://react.dev/reference/react-dom/client/createRoot)와 [Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)를 참고합니다.
