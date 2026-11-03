# 디자인 시스템 규칙

이 보일러플레이트는 기본 shadcn UI의 중립적인 모양을 유지합니다. 화면별 버튼·폼·카드 변형을 새로 만들지 않고, 설치된 컴포넌트와 의미 토큰을 조합합니다.

## 서체와 세 가지 두께

기본 UI 서체는 [Pretendard 1.3.9](https://github.com/orioncactus/pretendard/tree/v1.3.9)의 **동적 subset**입니다. 공식 패키지의 Regular/Medium/SemiBold CSS만 가져오며 unicode-range에 해당하는 글리프 조각을 브라우저가 선택해서 요청합니다. Vite가 폰트를 같은 출처의 해시 자산으로 배포하므로 런타임 외부 CDN이 필요하지 않습니다. 전체 폰트/모든 subset을 preload하지 않습니다.

작은 폰트 조각도 CSS에 base64로 포함하지 않도록 Vite의 font asset inlining을 끕니다. 그래야 화면에 쓰이지 않는 글리프가 초기 CSS와 함께 전송되지 않고 `unicode-range`에 따라 요청됩니다. 다른 작은 자산은 Vite 기본 정책을 유지합니다.

| 두께         | Tailwind        | 역할                                             |
| ------------ | --------------- | ------------------------------------------------ |
| 400 Regular  | `font-normal`   | 본문, 설명, 입력값, 표 데이터, 보조 문구         |
| 500 Medium   | `font-medium`   | 버튼·탭·메뉴, 필드 레이블, 행 제목, 작은 강조    |
| 600 SemiBold | `font-semibold` | 페이지·카드·대화상자 제목, KPI 숫자, 중요한 강조 |

크기·간격·의미 토큰으로 위계를 표현하고 추가 두께를 만들지 않습니다. `font-bold`/700을 포함한 나머지 두께, 임의 weight(`font-[650]`), inline fontWeight, font-variation-settings override는 금지합니다. `b`/`strong`도 600으로 제한합니다. 합성 굵기를 막으며 세 weight 외 Tailwind weight 토큰은 초기화합니다. 기존 shadcn의 400/500/600 사용은 그대로 둡니다.

문서/코드/키보드 표기의 의미 있는 monospace는 허용하지만 일반 UI에 별도 장식 폰트를 도입하지 않습니다. 글꼴 로딩 실패 시 시스템 sans-serif로 대체합니다.

## 색상 의미

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

## 반응형 기준

| 모드   | 범위         | 기본 구성                                                     |
| ------ | ------------ | ------------------------------------------------------------- |
| 모바일 | `< 768px`    | 1열, Sidebar Sheet, 리스트→상세 이동, 테이블 내부 가로 스크롤 |
| 태블릿 | `768–1279px` | 1–2열, 접을 수 있는 Sidebar, 필터 줄바꿈, 충분한 상세 너비    |
| PC     | `≥ 1280px`   | 2–4열, Sidebar, 필요 시 목록/상세 동시 표시                   |

페이지 구성에는 기본 모바일 + `md:` + `xl:`을 사용합니다. shadcn 자체 컴포넌트의 기존 breakpoint는 임의로 재작성하지 않습니다. 테이블은 내부에서만 스크롤하며 페이지 전체를 옆으로 밀지 않습니다. 메뉴·Sheet·Dialog의 키보드 접근성과 닫힌 뒤 초점 복귀를 유지합니다.

## 검증과 변경

`pnpm check:architecture`가 금지 weight, 하드코딩 색상, FSD와 UI 경계를 검사합니다. 폰트/색상 표시는 Components 화면에서 확인할 수 있습니다. 문서만으로 모든 대비나 런타임 동작이 보장되지는 않으므로 관련 변경 시 필요한 화면만 확인합니다. 전체 테스트 실행 위치와 선택 실행 방법은 [테스트 정책](testing.md)을 따릅니다.
