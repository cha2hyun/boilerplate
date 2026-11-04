# ADR 002: shadcn 생성 코드의 좁은 품질 보완

상태: 채택

## 맥락

`src/shared/ui`의 컴포넌트는 shadcn registry의 new-york/Radix 컴포넌트를 기준으로 생성했습니다. 공식 neutral CSS 변수 테마를 사용합니다. 생성 코드에도 이 저장소의 strict TypeScript, React Hooks, typed ESLint를 적용합니다.

## 결정

컴포넌트의 공개 API와 shadcn 구조를 유지하면서 다음만 보완합니다.

- registry가 추가한 `cn` 패키지 import를 기존 `@/shared/lib/utils`로 통일합니다.
- 필요한 type-only import, 명시적 문자열 변환, nullish coalescing을 적용합니다.
- Recharts payload의 `fill`을 `unknown`에서 검사하고 키를 문자열/숫자에서만 만듭니다. Tooltip formatter에는 Recharts 계약에 맞게 전체 payload 배열을 전달합니다.
- Progress의 현재 값을 Radix Root에도 전달하여 `aria-valuenow`가 제공되도록 합니다.
- `useIsMobile`은 `matchMedia`를 `useSyncExternalStore`로 구독합니다. effect 안에서 동기 setState를 하지 않으며 정리 시 구독을 해제합니다.
- 사이드바 skeleton은 렌더 중 난수 대신 고정 Tailwind 너비를 사용합니다.
- 모바일 Sidebar는 자체 Trigger로 열리는 Sheet이므로 열기 전 초점을 기억하고 닫힐 때 복원합니다. 열었던 요소가 탐색으로 사라졌다면 Sidebar Trigger로 돌아갑니다.
- CommandDialog는 기존 props에 선택적 `onOpenAutoFocus`/`onCloseAutoFocus`를 추가하여 내부 DialogContent로 전달합니다. 앱 셸은 키보드나 버튼으로 열기 전 초점을 복원하고, 명령으로 페이지를 이동한 경우 main으로 옮깁니다.
- Table은 선택적 `containerProps`를 기존 가로 스크롤 div에 전달합니다. 실제 overflow 요소의 ref·이름·설명·tabIndex·로딩 상태·높이를 설정하며 table의 native props/ref와 분리합니다. 기본 `overflow-x-auto`, `touch-auto`, `overscroll-x-contain`으로 네이티브 터치 스크롤을 유지하고 별도 드래그 UI나 이벤트 가로채기를 추가하지 않습니다.
- Sonner는 `shared/lib/theme`의 context를 사용합니다. Vite 테마 provider의 배경은 [ADR 003](003-vite-theme-provider.md)에 기록합니다.

전역 lint 규칙을 비활성화하지 않습니다. shadcn의 variants/컴포넌트 동시 export 특성 때문에 `shared/ui`에서만 Fast Refresh의 export 전용 규칙을 제외합니다. 차트/사이드바 등 생성 코드의 동적 style과 내부 CSS 변수는 아키텍처 검사에서 허용합니다.

## 검증과 업데이트

모바일 미디어 쿼리의 초기값/변경/구독 해제, tooltip formatter payload 계약, Progress 접근성 값과 Sidebar/CommandDialog의 닫기 후 초점 복원을 회귀 테스트로 검증합니다. `pnpm ui:add ... --overwrite` 전에 로컬 diff를 확인하고 registry 업데이트 후 이 보완과 테스트를 다시 검토합니다. 생성 파일이라는 이유만으로 수정 내용을 덮어쓰지 않습니다.
