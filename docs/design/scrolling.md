# 스크롤과 스크롤바

문서·표·활동 목록의 스크롤은 브라우저 기본 동작을 사용합니다. 전역 스타일은 `src/app/styles/globals.css`에서 관리하며, 표준 `scrollbar-width: thin`과 `scrollbar-color: var(--muted-foreground) transparent`로 가는 neutral 스크롤바를 적용합니다. light/dark 모두 기존 의미 토큰을 따릅니다.

실제 두께·모양·표시 시점은 브라우저와 운영체제가 정합니다. 픽셀 단위의 동일한 모양을 강제하거나 스크롤바를 숨기지 않습니다. 표준 속성을 지원하지 않는 환경에서는 기본 스크롤바를 사용합니다. 기존 shadcn ScrollArea는 둥근 thumb와 투명 트랙 구조를 유지하며 같은 `muted-foreground` 색을 사용합니다.

## 페이지 너비 유지

`html`에 `scrollbar-gutter: stable`을 적용합니다. 일반 스크롤바를 사용하는 환경에서는 짧은 페이지에도 세로 스크롤바 공간을 예약하므로 긴 페이지와 짧은 페이지 사이를 이동해도 본문 너비가 바뀌지 않습니다. overlay 스크롤바 환경에서는 별도 공간을 만들지 않습니다. 이 속성은 `body`에서 문서 viewport로 전파되지 않으므로 root에 둡니다. [CSS Overflow 표준](https://www.w3.org/TR/css-overflow-3/#scrollbar-gutter-property)

Radix Dialog·Sheet·DropdownMenu·Select는 배경 스크롤을 잠글 때 `react-remove-scroll`을 통해 `body[data-scroll-locked]`에 오른쪽 margin 보정을 추가합니다. 이미 root gutter가 공간을 예약하므로 `scrollbar-gutter: stable` 지원 환경에서만 이 margin을 `0 !important`로 상쇄합니다. 라이브러리가 추가하는 `!important`를 이기기 위한 좁은 예외이며, 스크롤 잠금·초점 관리·모달 동작은 그대로 유지합니다. 잠금 중에도 root gutter를 유지하고 별도 overflow나 padding 보정을 중복하지 않습니다.

## 입력과 접근성

- 네이티브 스크롤 영역의 `touch-auto`와 키보드 초점을 유지합니다. 가로 스와이프·세로 페이지 스크롤·핀치 확대를 막는 이벤트 핸들러나 `touch-pan-x`를 추가하지 않습니다. 넓은 표의 세부 계약은 [레이아웃](layout.md#넓은-표와-터치-스크롤)을 따릅니다.
- 스크롤 가능한 목록·표에는 접근 가능한 이름과 필요한 `tabIndex`를 실제 overflow 요소에 부여합니다. 페이지 전체를 새 ScrollArea로 감싸지 않습니다. [Radix ScrollArea 가이드](https://www.radix-ui.com/primitives/docs/components/scroll-area#accessibility)
- forced colors에서는 표준 `scrollbar-color`가 `auto`로 조정되어 사용자 색상 설정을 따릅니다. shadcn ScrollArea의 별도 thumb는 `CanvasText` 시스템 색상을 사용합니다. `forced-color-adjust: none`으로 사용자 설정을 끄지 않습니다. [CSS Color Adjustment 표준](https://drafts.csswg.org/css-color-adjust-1/#forced-colors-properties)

## 회귀 검사

기존 `e2e/workspace.spec.ts`의 테마·명령 팔레트 흐름에서 긴 Overview → 짧은 Settings 이동과 팔레트 열기·닫기 전후의 실제 `main`·header 가로 위치와 너비를 비교합니다. 데스크톱에서는 두 페이지의 문서 높이가 각각 viewport를 넘거나 들어오는지도 확인합니다. overlay 환경의 검사는 실제 공간을 차지하는 일반 스크롤바 환경의 검증을 대체하지 않습니다. 새 테스트 job은 추가하지 않으며 실행 시점은 [테스트 정책](../testing.md)과 사용자의 최신 지시를 따릅니다.
