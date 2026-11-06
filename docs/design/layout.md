# 레이아웃과 간격

**같은 행의 아이콘·배지·텍스트·컨트롤은 세로 중심을 맞춥니다.** 이 기준은 선택 사항이 아니며 새 화면과 수정한 화면의 완료 조건입니다. 컨트롤은 설치된 shadcn을 사용하고, 행·열 배치는 `shared/ui/stack`의 **HStack·VStack**이 소유합니다.

나란히 놓인 카드의 외곽·구분선·푸터 내용 중심도 함께 정렬합니다. 구현과 실제 좌표 검증 기준은 [공통 조합](compositions.md)이 소유합니다.

## 기본값과 사용 경계

- `HStack`: 가로 방향, `align="center"`로 세로 중심 정렬, `justify="start"`로 왼쪽부터 배치합니다.
- `VStack`: 세로 방향, `align="center"`로 가로 중심 정렬, `justify="start"`로 위에서부터 배치합니다.
- 페이지·폼처럼 자식이 가로 폭을 채워야 하는 세로 구조에는 `VStack align="stretch"`를 명시합니다. 본문을 가운데 정렬하거나 카드·입력 폭을 줄이는 규칙이 아닙니다.
- 제목·본문을 왼쪽으로 모으는 세로 구조는 `align="start"`를 사용할 수 있습니다. 가로 행의 `align="start"`/`baseline`은 여러 문단의 시작점처럼 의도된 예외에만 사용하며 단일 배지+설명 행에는 사용하지 않습니다.
- 직접 작성한 `div`의 `flex`, `inline-flex`, `space-x-*`, `space-y-*` 레이아웃은 금지합니다. 반응형·조건부 클래스도 같습니다. 간격은 Stack의 `gap-*`로 관리합니다.
- 그리드·스크롤 영역·일반 문서 구조의 `div`는 유지합니다. `flex-1`, `shrink-0`처럼 자식 크기를 정하는 클래스도 사용할 수 있습니다. 모든 HTML 태그를 의미 없이 Stack으로 바꾸지 않습니다.
- 설치된 shadcn 내부의 Flex/Grid 구현은 변경하지 않습니다. CardHeader·CardContent·CardFooter의 배치를 조정할 때는 Stack `asChild`로 조합합니다. 좁은 예외의 이유는 [ADR 005](../adr/005-stack-layout.md)에 기록합니다.

## API와 축

| 속성        | 값                                                      | 책임                                               |
| ----------- | ------------------------------------------------------- | -------------------------------------------------- |
| `align`     | `start`, `center`, `end`, `stretch`, `baseline`         | 교차축 정렬, 기본 `center`                         |
| `justify`   | `start`, `center`, `end`, `between`, `around`, `evenly` | 진행 방향의 배치, 기본 `start`                     |
| `wrap`      | boolean                                                 | 필요한 가로 행 줄바꿈, 기본 false                  |
| `asChild`   | boolean                                                 | 자식의 HTML/shadcn 구조를 유지하고 레이아웃만 적용 |
| `className` | Tailwind                                                | 간격·크기·반응형·의미 토큰                         |

기본 방향은 HStack/VStack 선택으로, 기본 정렬은 props로 지정합니다. `className`에서 무접두사 `items-*`, `justify-*`, `flex-row/col`로 덮어쓰지 않습니다. 반응형 방향 전환은 `md:flex-row md:items-center`처럼 명시할 수 있습니다. 방향이 바뀌면 교차축도 바뀌므로 해당 구간의 정렬을 함께 확인합니다.

```tsx
// 배지와 한 줄/여러 줄 설명의 세로 중심을 일치시킨다.
<HStack className="gap-2">
  <Badge variant="secondary" className="shrink-0">+19.2%</Badge>
  <span className="min-w-0 text-xs text-muted-foreground">이전 30일 대비</span>
</HStack>

// 같은 DOM과 shadcn 패딩을 유지한다. 슬롯 선택자를 덮지 않는다.
<HStack asChild justify="between" className="gap-3">
  <CardFooter>
    <span>진행 상태</span>
    <Button>계속</Button>
  </CardFooter>
</HStack>

<VStack asChild align="stretch" className="gap-4">
  <section aria-labelledby="projects-title">
    <h2 id="projects-title">프로젝트</h2>
    <HStack wrap className="gap-2">{/* shadcn 필터 */}</HStack>
  </section>
</VStack>

<VStack align="stretch" className="gap-3 md:flex-row md:items-center md:justify-between">
  {/* 모바일 세로 → 태블릿부터 가로 */}
</VStack>
```

`asChild`에는 한 개의 요소를 전달하고 의미와 이벤트를 그 자식에 유지합니다. `form`, `section`, `dl`, `li`, `span`, `footer`를 추가 div 없이 조합합니다. 자식에 상충하는 방향·정렬 클래스를 남기지 않습니다. inline style이나 별도 CSS, 외부 레이아웃 패키지는 추가하지 않습니다.

반복 간격은 행 내부 `gap-2/3`, 폼·카드 `gap-4/6`, 페이지 섹션 사이 `gap-6`을 사용합니다. 모든 페이지 최상위 `VStack`은 `align="stretch"`, `min-w-0 gap-6`, `data-slot="page-content"`를 유지합니다. 최대 읽기 너비는 페이지 역할에 맞게 제한할 수 있습니다. KPI·필터·폼의 반복 구조는 [화면 조합](compositions.md)이 소유합니다. `space-y-*`에서 전환할 때는 자식이 flex item이 된다는 점을 확인합니다. 고정 높이의 스크롤 영역에서는 필요한 행·차트·skeleton에 `shrink-0`를 두어 높이가 압축되지 않게 합니다.

## 세 가지 화면 구간

| 모드   | 범위         | 구성                                              |
| ------ | ------------ | ------------------------------------------------- |
| 모바일 | `< 768px`    | 1열, Sidebar Sheet, 목록→상세, 테이블 내부 스크롤 |
| 태블릿 | `768–1279px` | 1–2열, 접힌 아이콘 탐색, 필터 줄바꿈              |
| PC     | `≥ 1280px`   | 2–4열, 펼친 Sidebar, 필요 시 목록/상세 동시 표시  |

그리드는 Tailwind로 유지합니다. 예: `grid gap-4 md:grid-cols-2 xl:grid-cols-3`. 그리드 안의 배지·텍스트 비교 행에도 중앙 정렬 기준을 동일하게 적용합니다. 긴 텍스트는 `min-w-0`, 고정 아이콘/액션은 `shrink-0`로 크기 책임을 명시합니다. 표/코드 이외의 가로 넘침과 고정 높이로 문구를 잘라내는 방식은 허용하지 않습니다. 줄바꿈·목록 생략·전체 값 확인은 [긴 콘텐츠](content-overflow.md)를 따릅니다.

아이콘 탐색 레일은 동일한 너비 안에서 중심을 맞춥니다. 감춘 텍스트·배지·avatar의 크기로 중심이 달라지지 않아야 합니다. 버튼의 이름·초점·Tooltip을 보존하고 배지는 펼친 상태나 상세 영역에 표시합니다. 낮은 가로 화면에서도 레일의 세로 스크롤을 유지하여 하단 탐색 항목을 선택할 수 있어야 합니다. 아이콘 모드의 가로 넘침 제한으로 세로 스크롤까지 막지 않습니다. 모바일 Sidebar Sheet는 사용자 글꼴 확대 시에도 viewport 폭을 넘지 않고, 헤더와 겹치지 않는 닫기 버튼을 제공합니다.

앱 Sidebar의 접힘/펼침은 아이콘의 왼쪽 기준을 공유합니다. 브랜드의 2rem 로고 영역과 메뉴 아이콘을 같은 중심선에 두고, 브랜드 행 3rem·모든 탐색 행(외부 문서 링크 포함) 2.5rem·메뉴 gap은 상태 변경 중에도 유지합니다. 기본 글꼴에서는 각각 32/48/40px이며 글꼴 확대에 비례합니다. 접힌 버튼을 `mx-auto`로 재중앙 정렬하거나 높이를 함께 줄이지 않습니다. inset 레일은 실제로 없는 border 두께를 추가하지 않으며 border가 있는 floating 변형은 그 두께를 유지합니다.

그룹 제목의 긴 워크스페이스명은 펼쳤을 때 줄바꿈해 전체를 표시합니다. 데스크톱에서는 제목 내용의 폭을 펼친 Sidebar 기준으로 고정하고, 별도의 grid 접힘 영역 안에서 감춥니다. 그 영역의 안쪽에 `min-h-0`과 overflow clip을 두어 접힌 최종 높이가 0이 되게 하며, 음수 margin으로 가변 높이를 상쇄하지 않습니다. 모바일 Sheet의 제목은 실제 컨테이너 폭을 따라 줄바꿈하므로 글꼴 확대나 `max-w-full` 제한에서도 잘리지 않습니다. Resources 그룹의 `mt-auto`는 하단 고정 목적의 의도된 공간이며, 낮은 화면에서는 기존 content 영역의 세로 스크롤을 유지합니다.

사이드바에는 실제 기능과 일치하는 탐색 항목만 표시합니다. 계정 메뉴나 워크스페이스 전환 기능이 없으면 프로필·전환 드롭다운처럼 보이는 장식용 컨트롤을 추가하지 않습니다. 사이드바의 Settings는 Resources 그룹에 둡니다. 로그인한 사용자는 헤더 아바타 메뉴에서도 같은 워크스페이스 설정을 열 수 있습니다.

### 앱 헤더 오른쪽 아이콘

검색·테마·언어·통화·로그인/계정과 앞으로 추가하는 동작은 [우측 헤더 폴더](../../src/widgets/app-shell/ui/header-actions)에 둡니다. 트리거는 [HeaderActionButton](../../src/widgets/app-shell/ui/header-actions/header-action-button.tsx)을 사용합니다. 이 조합이 기존 shadcn Button의 `ghost`·`icon-sm`, 버튼 2rem 정사각형과 아이콘 1rem을 소유합니다. 기본 배경은 투명하고 테두리·그림자는 없습니다. 링크와 메뉴 버튼은 동작에 맞는 HTML 의미, 번역된 접근성 이름과 키보드 초점을 유지합니다.

로그인 전에는 로그인 아이콘을, 로그인 후 같은 위치에는 1.5rem 프로필 이미지를 표시합니다. 모바일·태블릿 계정 트리거는 2rem 정사각형이며 데스크톱에서는 같은 높이에 닉네임이 보이도록 너비만 늘립니다. 닉네임이 없으면 전체 이름을 사용합니다. 데스크톱 검색은 검색 문구와 단축키를 위한 별도 예외입니다. 다른 동작의 크기와 스타일은 공통 규칙을 따릅니다. 이 규칙의 범위는 앱 셸의 우측 도구 행입니다. 페이지 폼의 제출 버튼, 사이드바, 메뉴를 펼친 뒤 표시되는 항목은 각 조합의 규칙을 따릅니다.

`pnpm check:architecture`는 헤더 트리거의 공통 조합과 스타일 사용을 검사합니다. [헤더 브라우저 검사](../../e2e/workspace-users.spec.ts)는 우측 행에 렌더된 동작을 찾아 크기·중앙 정렬·배경·테두리·그림자·접근성 이름을 확인합니다. 새 동작을 추가할 때도 이 행 안에 배치하면 검사 대상에 포함됩니다.

### 개발 도구 실행 버튼

통합 TanStack Devtools의 기본 실행 버튼은 모든 화면 크기에서 `bottom-right` + `fixed`로 배치합니다. 화면 중간에 떠서 KPI를 가리지 않게 하며 기존 shadcn 32px 버튼을 유지합니다. 위치는 [공식 config](https://tanstack.com/devtools/latest/docs/configuration)가 소유하고 자식 아이콘만 별도 fixed/transform으로 옮기지 않습니다.

저장된 설정이 config보다 우선하므로, 개발 전용 모듈이 마운트되기 전에 이전 기본값 `middle-right` + `fixed` 조합의 위치만 이전합니다. 다른 위치·floating 설정·패널 및 앱 환경 설정은 보존합니다. 현재 문서는 `viewport-fit=cover`를 사용하지 않으며, Devtools를 위해 앱 전체 viewport 정책을 변경하지 않습니다. 개발 전용 UI이므로 위치·스크롤·뷰포트 크기 변경·패널 열기/닫기는 개발 서버에서 좁혀 확인하고 production E2E에는 중복하지 않습니다.

## 검사와 완료 조건

### 넓은 표와 터치 스크롤

많은 열을 작은 화면에 강제로 압축하거나 주요 필드를 숨기지 않습니다. Orders는 실제 주문 데이터 12개 열과 읽을 수 있는 최소 열 너비를 가진 예제입니다. 스크롤은 페이지가 아닌 shadcn Table의 기존 컨테이너 안에 한정합니다.

- `Table.containerProps`로 **실제 overflow 요소**에 `role="region"`, 번역된 이름/설명, `tabIndex={0}`, `aria-busy`와 높이를 부여합니다. 같은 이름의 바깥 region을 중첩하지 않습니다.
- `overflow-x-auto` + `touch-auto`로 가로 스와이프, 세로 페이지 스크롤, 핀치 확대를 브라우저에 맡깁니다. `touch-pan-x`, `touch-none`, 터치 `preventDefault()`나 직접 scrollLeft를 조작하는 드래그 핸들러로 기본 동작을 막지 않습니다. `overscroll-x-contain`은 수평 끝에서의 스크롤 전파를 제한합니다.
- 포커스된 표는 좌우 화살표 키로 이동할 수 있어야 합니다. overflow가 있는 카드 안에서는 안쪽 초점 테두리를 사용합니다. 고정한 첫 열은 불투명한 의미 색상과 stacking을 갖춰 뒤 셀이 비치지 않게 합니다.
- 열·colgroup·스켈레톤 셀·빈 행 colspan은 일치해야 합니다. 로딩/성공/빈 결과의 높이를 유지하고 일반 스크롤바의 높이까지 예약합니다. Orders의 표 프레임은 496px입니다.
- 실제 터치 회귀 검사는 Chromium의 터치 입력으로 scrollLeft 변화와 상세창 오작동 여부를 확인합니다. DOM touch 이벤트 dispatch나 scrollLeft 직접 대입을 터치 검증이라고 보고하지 않습니다. 관련 테스트는 기존 commerce 범주에 포함합니다.

### 정렬 검사

`pnpm check:architecture`는 shared/ui와 테스트를 제외한 native div의 직접 행·열 배치와 Stack의 기본 정렬 덮어쓰기를 거부합니다. 정적 검사는 계산된 클래스나 실제 픽셀 중심을 모두 증명하지 못하므로 변경된 행은 화면에서 확인합니다.

- Sidebar는 펼침/접힘의 최종 좌표뿐 아니라 전환 중과 빠른 반전에서도 아이콘 중심선·행 높이·행 간격이 유지되는지 확인합니다. 긴 워크스페이스명, 그룹 제목의 0 높이 수렴, inset 본문 여백의 연속 이동과 실행 중 reduced motion 변경을 함께 검증합니다.
- 아이콘/배지/텍스트 박스의 세로 중심 차이가 1px 이내인지 확인합니다. 폰트의 line-height 차이도 눈으로 검토합니다.
- 한국어·영어, 모바일·태블릿·PC, 긴 설명이 두 줄이 되는 경우를 확인합니다.
- 로딩과 데이터 표시의 카드 크기·행 공간을 유지합니다. skeleton에도 같은 Stack 구조를 사용합니다.
- 재발 가능한 결함은 기존 기능 E2E에 실제 bounding box 검증을 추가합니다. 새 테스트 job을 중복 생성하지 않습니다. 실행 시점은 [테스트 정책](../testing.md)과 사용자의 최신 지시를 따릅니다.

## 텍스트 방향

본문 정렬은 `text-start`, 방향성 있는 여백은 `ms-*`, `me-*`, `ps-*`, `pe-*`를 우선합니다. 현재 RTL은 지원하지 않습니다. [국제화](international-design.md)를 함께 확인하세요.
