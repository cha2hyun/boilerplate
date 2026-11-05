# 모션의 목적

모션은 값·상태·초점의 변화를 이해할 때만 사용합니다. 메뉴/대화상자는 설치된 shadcn의 동작을 유지하고 페이지 진입마다 장식적인 이동·확대·순차 등장을 추가하지 않습니다. 정보가 읽히거나 작업을 시작하는 시점을 모션 끝까지 늦추지 않습니다.

**로딩·숫자의 시간, 지연, skeleton, 숫자 전환과 reduced-motion 계약은 [로딩과 모션](../loading-and-motion.md) 한 곳에서 관리합니다.** 아래는 공유 컨트롤의 공간 전환 범위입니다. 페이지 예시에서 별도의 duration 또는 대기 타이머를 만들지 않습니다.

공간 이동·확대·반복 회전은 OS의 움직임 줄이기 설정에서 중단합니다. Dialog/AlertDialog/Sheet/Popover/Select/Dropdown/Tooltip의 공유 컴포넌트가 이를 소유하며, 화면에서 열린 상태를 바꾸거나 키보드 동작을 재구현하지 않습니다. Progress 값과 Switch thumb, Sidebar의 크기/위치 변경도 최종 상태로 즉시 표시합니다. 색상·초점 등의 상태 피드백은 유지합니다.

설치된 `tw-animate-css`의 `enter`/`exit`는 opacity와 transform을 하나의 animation으로 실행합니다. 따라서 duration만 줄이지 않고 해당 공유 컴포넌트에 `motion-reduce:animate-none!`을 적용합니다. 이 한정된 important는 `data-state` 선택자의 우선순위보다 높여 열린/닫힌 상태 모두에서 animation을 끄기 위한 것입니다. 위치 정렬용 translate나 Popper 배치를 지우지 않습니다. 공간 transition은 `motion-reduce:transition-none`으로 끄며 전역 `*` reset이나 별도 모션 라이브러리를 추가하지 않습니다.

Skeleton과 NumberDisplay는 [기존 로딩 계약](../loading-and-motion.md)을 유지합니다. spinner도 reduced motion에서 멈추되 처리 중 문구는 남깁니다. 새 애니메이션을 추가할 때는 이 설정의 실행 중 변경까지 고려하고, [접근성 합격 조건](accessibility.md)의 실제 브라우저 검증에 연결합니다.

검토할 질문:

- 변화가 없는데 움직이지 않는가? 사용자 행동이나 실제 데이터 변화와 연결되는가?
- 로딩 중에도 기존 데이터와 레이아웃, 키보드 초점을 유지하는가?
- 움직임 없이도 상태·결과·오류를 이해할 수 있는가?
- OS의 움직임 줄이기를 존중하고 화면낭독기에 중간 숫자를 반복해서 읽히지 않는가?
