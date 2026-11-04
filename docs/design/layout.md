# 레이아웃과 간격

**같은 행의 아이콘·배지·텍스트·컨트롤은 세로 중심을 맞춥니다.** 이 기준은 선택 사항이 아니며 새 화면과 수정한 화면의 완료 조건입니다. 컨트롤은 설치된 shadcn을 사용하고, 행·열 배치는 `shared/ui/stack`의 **HStack·VStack**이 소유합니다.

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

반복 간격은 행 내부 `gap-2/3`, 폼·카드 `gap-4/6`, 섹션 `gap-6/8`을 기준으로 주변 화면에 맞춥니다. `space-y-*`에서 전환할 때는 자식이 flex item이 된다는 점을 확인합니다. 고정 높이의 스크롤 영역에서는 필요한 행·차트·skeleton에 `shrink-0`를 두어 높이가 압축되지 않게 합니다.

## 세 가지 화면 구간

| 모드   | 범위         | 구성                                              |
| ------ | ------------ | ------------------------------------------------- |
| 모바일 | `< 768px`    | 1열, Sidebar Sheet, 목록→상세, 테이블 내부 스크롤 |
| 태블릿 | `768–1279px` | 1–2열, 접힌 아이콘 탐색, 필터 줄바꿈              |
| PC     | `≥ 1280px`   | 2–4열, 펼친 Sidebar, 필요 시 목록/상세 동시 표시  |

그리드는 Tailwind로 유지합니다. 예: `grid gap-4 md:grid-cols-2 xl:grid-cols-3`. 그리드 안의 배지·텍스트 비교 행에도 중앙 정렬 기준을 동일하게 적용합니다. 긴 텍스트는 `min-w-0`, 고정 아이콘/액션은 `shrink-0`로 크기 책임을 명시합니다. 표/코드 이외의 가로 넘침과 고정 높이로 문구를 잘라내는 방식은 허용하지 않습니다.

아이콘 탐색 레일은 동일한 너비 안에서 중심을 맞춥니다. 감춘 텍스트·배지·avatar의 크기로 중심이 달라지지 않아야 합니다. 버튼의 이름·초점·Tooltip을 보존하고 배지는 펼친 상태나 상세 영역에 표시합니다.

## 검사와 완료 조건

`pnpm check:architecture`는 shared/ui와 테스트를 제외한 native div의 직접 행·열 배치와 Stack의 기본 정렬 덮어쓰기를 거부합니다. 정적 검사는 계산된 클래스나 실제 픽셀 중심을 모두 증명하지 못하므로 변경된 행은 화면에서 확인합니다.

- 아이콘/배지/텍스트 박스의 세로 중심 차이가 1px 이내인지 확인합니다. 폰트의 line-height 차이도 눈으로 검토합니다.
- 한국어·영어, 모바일·태블릿·PC, 긴 설명이 두 줄이 되는 경우를 확인합니다.
- 로딩과 데이터 표시의 카드 크기·행 공간을 유지합니다. skeleton에도 같은 Stack 구조를 사용합니다.
- 재발 가능한 결함은 기존 기능 E2E에 실제 bounding box 검증을 추가합니다. 새 테스트 job을 중복 생성하지 않습니다. 실행 시점은 [테스트 정책](../testing.md)과 사용자의 최신 지시를 따릅니다.

본문 정렬은 `text-start`, 방향성 있는 여백은 `ms-*`, `me-*`, `ps-*`, `pe-*`를 우선합니다. 현재 RTL은 지원하지 않습니다. [국제화](international-design.md)를 함께 확인하세요.
