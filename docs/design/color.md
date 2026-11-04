# 색상과 의미 토큰

`primary`는 중요도이고 `brand`는 브랜드 정체성입니다. 둘을 동일하게 취급하지 않습니다. 기본 primary 버튼과 사이드바 선택 상태는 현재의 무채색을 유지합니다.

| 의미           | 사용 토큰/유틸리티                   | 사용 규칙                                                   |
| -------------- | ------------------------------------ | ----------------------------------------------------------- |
| 화면 바탕      | `background` / `foreground`          | 페이지 배경과 기본 텍스트                                   |
| 표면           | `card` / `card-foreground`           | 카드, 섹션, 목록의 기본 표면                                |
| 떠 있는 표면   | `popover` / `popover-foreground`     | 메뉴, 팝오버, 드롭다운                                      |
| 주요 행동      | `primary` / `primary-foreground`     | 페이지의 주 행동, 기본 중요도. 무채색 유지                  |
| 보조 행동/구획 | `secondary` / `secondary-foreground` | 보조 버튼과 중립 배지                                       |
| 낮은 강조      | `muted` / `muted-foreground`         | 설명, 보조 정보, skeleton, 부드러운 배경                    |
| hover/선택     | `accent` / `accent-foreground`       | shadcn 기본 hover와 선택 상태. brand가 아님                 |
| 경계/포커스    | `border`, `input`, `ring`            | 테두리, 입력 경계, 키보드 포커스                            |
| 브랜드         | `brand` / `brand-foreground`         | 브랜드를 의도적으로 강조할 때만. 광범위한 화면 색칠 금지    |
| 파괴/오류      | `destructive`                        | 삭제 확인, 실패, 유효성 오류에 한정                         |
| 데이터 계열    | `chart-1` … `chart-5`                | 기본 무채색 계열. 브랜드/상태 색상의 대용으로 사용하지 않음 |
| 탐색           | `sidebar-*`                          | shadcn Sidebar 전용의 무채색 토큰                           |

단일 브랜드는 **Blueprint Blue**입니다. 공식 shadcn blue 테마에서 가져온 light `oklch(0.546 0.245 262.881)` / dark `oklch(0.623 0.214 259.815)`를 사용합니다. light에서는 밝은 전경, dark에서는 어두운 전경을 짝지어 읽기 대비를 확보합니다. 색상 값은 `src/app/styles/globals.css` 한 곳에서만 정의하고 소비 코드는 `bg-brand text-brand-foreground`처럼 사용합니다. 브랜드 색상은 Components → Theme tokens에서 미리 볼 수 있습니다.

성공/진행/대기마다 녹색·파랑·주황을 추가하지 않습니다. 일반 상태는 neutral Badge의 default/secondary/outline과 **텍스트/아이콘**으로 구분합니다. destructive는 꾸미기나 일반적인 낮은 수치에 쓰지 않습니다. 차트는 범례·레이블을 같이 제공하고 색만으로 의미를 전달하지 않습니다.

토큰 배경에는 대응하는 foreground를 사용합니다. 페이지에 색상 코드, Tailwind 팔레트(`text-blue-600` 등), 검정/흰색 고정값을 추가하지 않습니다. 공식 shadcn primitive의 overlay와 destructive 내부 표현은 설치된 기본 구현을 유지합니다. 브랜드를 사용하려고 기본 Button variant/shape를 재구현하지 않습니다.

## 검토 기준

light/dark 모두 의미 토큰의 배경·전경 쌍을 확인합니다. 선택·오류·상태는 글자나 아이콘으로도 전달하고, 링크와 버튼은 키보드 포커스를 유지합니다. 대비를 확인하지 않고 전경 색의 opacity를 낮추거나 새로운 브랜드 조합을 만들지 않습니다.

이 문서는 기존 shadcn neutral 테마의 계약입니다. 소유 코드: `src/app/styles/globals.css`. 화면 표본: Components → Theme tokens.
