# ADR 003: 공식 Vite recipe 기반 테마 provider

상태: 채택

## 맥락

React 19.3의 개발 모드에서 기존 테마 라이브러리가 React 트리 안에 렌더링한 script 요소에 대한 오류가 발생했습니다. 이 앱은 Vite의 클라이언트 렌더링 앱이며 테마 초기화를 위한 React 내부 script가 필요하지 않습니다.

## 결정

[공식 shadcn Vite dark-mode recipe](https://ui.shadcn.com/docs/dark-mode/vite)의 context, 상태, root class 적용 방식을 사용합니다. 앱 provider는 `src/app/providers/theme-provider.tsx`, context와 hook은 `src/shared/lib/theme.ts`로 분리하여 FSD의 아래 레이어가 app에 의존하지 않도록 합니다. Sonner, 탐색 셸, 설정 페이지는 동일한 context를 사용합니다.

저장 키 `blueprint-theme`와 `light`/`dark`/`system` 설정을 유지합니다. 공식 예제에 저장값 검증, localStorage 읽기/쓰기 실패 처리, `useSyncExternalStore` 기반 시스템 색상 변경 구독을 보완했습니다. 선택한 테마와 실제 적용된 테마를 각각 `theme`, `resolvedTheme`로 제공하며 저장 실패는 세션 내 변경을 막지 않습니다.

## 검증

저장된 설정 복원/저장, 시스템 색상 변경, 수동 선택 우선순위, 잘못된 저장값, 저장소 오류, 구독 해제를 테스트합니다. 실제 Vite 개발 서버의 콘솔과 프로덕션 브라우저 흐름도 통합 검증에서 확인합니다. React 내부 script를 다시 추가하거나 테마 소유권을 여러 store로 분산하지 않습니다.
