# UI 기본 원칙

이 문서는 컴포넌트·아이콘·표면·상태 선택의 기본값을 소유합니다. 아래 규칙은 기존 Blueprint 구현에 맞춘 결정입니다. 별도 디자인 시스템이나 패키지를 추가하지 않습니다.

## 컴포넌트와 토큰

- 시각적 컨트롤은 `src/shared/ui`의 shadcn, 아이콘은 `lucide-react`를 사용합니다. 새 컨트롤이 필요하면 기존 `components.json` 설정으로 추가합니다. 직접 만든 Button/Input, Radix 직접 사용, 다른 UI 라이브러리, HStack/VStack/Text 같은 새 custom primitive는 도입하지 않습니다.
- 레이아웃은 의미 있는 HTML과 Tailwind 조합입니다. 특정 업무에 대한 feature/widget 조합은 허용하며 또 다른 범용 UI API를 만들지 않습니다.
- 본문·푸터 텍스트 탐색은 승인된 shadcn 조합인 `TextLink` / `RouterTextLink`를 사용합니다. 외부 새 탭, 밑줄·화살표, native anchor 의미와 접근성은 [텍스트 링크 규칙](text-links.md)이 소유합니다. 이 예외가 다른 custom primitive를 허용하지는 않습니다.
- CSS는 `src/app/styles/globals.css`의 Tailwind 진입점·의미 토큰·기본 레이어만 둡니다. 화면별 CSS/inline style/고정 팔레트는 추가하지 않습니다. [색상](color.md)과 [타이포그래피](typography.md)를 기준으로 소비합니다.

## 아이콘·표면·밀도

장식 아이콘은 `aria-hidden`, 아이콘 버튼은 명확한 접근 가능한 이름을 제공합니다. 글자 옆 아이콘은 보통 `size-4 shrink-0`로 정렬합니다. 아이콘만으로 오류·선택·중요도를 전달하지 않습니다. [레이아웃](layout.md)의 레일 중앙 정렬 규칙을 따릅니다.

Card/Popover/Dialog의 기본 radius·border·shadow를 유지합니다. 기본 화면 구획은 여백과 border로 구분하고 임의 z-index, 강한 그림자, 장식 gradient로 강조하지 않습니다. 떠 있는 UI는 shadcn overlay/portal이 담당합니다. 새로운 elevation·radius·gradient 토큰 체계를 만들지 않습니다.

밀도를 높일 때 먼저 불필요한 정보를 줄입니다. 클릭 영역을 잘라내거나 제목/본문을 과도하게 작게 만들지 않습니다. 폼과 목록의 간격은 [레이아웃](layout.md)에서 관리합니다.

## 접근성과 상태

페이지의 h1은 하나로 유지하고 섹션은 의미에 맞는 제목 계층으로 구성합니다. Tab으로 모든 행동에 도달할 수 있어야 하며 focus ring을 제거하지 않습니다. Dialog/Sheet는 제목·설명·닫기와 초점 복귀를 보존합니다. 레이블은 placeholder만으로 대체하지 않습니다.

| 상태           | 표시와 행동                                                                   |
| -------------- | ----------------------------------------------------------------------------- |
| 초기 로딩      | [로딩 계약](../loading-and-motion.md)에 맞춰 실제 콘텐츠 구조와 같은 skeleton |
| 갱신 중        | 기존 데이터를 유지하고 갱신 상태를 보조 표시                                  |
| 오류           | 실패한 영역, 고칠 방법/실제 재시도, 필요한 기존 입력 보존                     |
| 빈 결과        | 처음 사용하는 상태와 필터 결과 없음을 구분                                    |
| 비활성         | 실행할 수 없는 이유를 주변 문구로 제공                                        |
| 성공/일반 상태 | neutral Badge + 명확한 텍스트/아이콘                                          |

오류·로딩·수치는 시각 효과와 별도로 접근 가능한 상태를 제공합니다. 긴 텍스트, 확대된 글자, light/dark, 모바일·태블릿·PC를 관련 화면에서 확인합니다. 지원하지 않는 언어·RTL·보조기술 검증을 완료했다고 주장하지 않습니다.
