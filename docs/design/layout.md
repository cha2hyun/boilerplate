# 레이아웃과 간격

가로 묶음(HStack)과 세로 묶음(VStack)은 **조합의 이름**입니다. 별도 React primitive를 만들지 않고 HTML 구조에 Tailwind를 적용합니다. 컨트롤은 항상 설치된 shadcn UI를 사용합니다.

## 축과 정렬

| 목적                         | 클래스                                            | 주의점                                                         |
| ---------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| 가로 한 줄                   | `flex items-center gap-3`                         | `items-*`는 세로축, `justify-*`는 가로축                       |
| 세로 묶음                    | `flex flex-col gap-2`                             | `items-start`는 가로축, `justify-*`는 세로축                   |
| 양 끝 정렬                   | `flex items-center justify-between gap-3`         | 긴 텍스트에 `min-w-0`, 액션에 `shrink-0`                       |
| 필터/액션 줄바꿈             | `flex flex-wrap items-center gap-2`               | 글자를 자르거나 고정 높이에 숨기지 않음                        |
| 가운데 배치                  | `flex items-center justify-center`                | 아이콘 레일/빈 상태에 사용, 본문까지 무조건 중앙 정렬하지 않음 |
| 모바일 세로 → 넓은 화면 가로 | `flex flex-col gap-3 md:flex-row md:items-center` | 읽기 순서와 키보드 순서가 시각 순서와 같아야 함                |

반복되는 간격은 `gap-*`로 소유합니다. 행 내부는 `gap-2/3`, 폼·카드 내용은 `gap-4/6`, 페이지 섹션은 `gap-6/8`을 기준으로 기존 주변 화면에 맞춥니다. 정확한 디자인 요구가 없는 임의 pixel 간격이나 빈 요소로 공간을 만들지 않습니다.

```tsx
// 긴 제목 + 고정 아이콘/액션: 폭의 책임을 명시한다.
<div className="flex items-center gap-3">
  <Folder className="size-4 shrink-0" aria-hidden="true" />
  <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-medium">연간 운영 보고서</p>
    <p className="text-xs text-muted-foreground">마지막 수정 11월 4일</p>
  </div>
  <Button variant="outline" size="sm" className="shrink-0">열기</Button>
</div>

// 세로 묶음 + 줄바꿈 가능한 가로 묶음
<section className="flex flex-col gap-4">
  <h2 className="text-lg font-semibold">프로젝트</h2>
  <div className="flex flex-wrap items-center gap-2">{/* shadcn 필터 */}</div>
</section>
```

## 세 가지 화면 구간

| 모드   | 범위         | 구성                                              |
| ------ | ------------ | ------------------------------------------------- |
| 모바일 | `< 768px`    | 1열, Sidebar Sheet, 목록→상세, 테이블 내부 스크롤 |
| 태블릿 | `768–1279px` | 1–2열, 접힌 아이콘 탐색, 필터 줄바꿈              |
| PC     | `≥ 1280px`   | 2–4열, 펼친 Sidebar, 필요 시 목록/상세 동시 표시  |

페이지는 모바일 기본값 + `md:` + `xl:`로 조합합니다. 예: `grid gap-4 md:grid-cols-2 xl:grid-cols-3`. shadcn 내부의 기존 breakpoint를 일괄 교체하지 않습니다. 부모와 카드에 필요한 `min-w-0`를 지정하고 가로 스크롤은 표/코드 내부에 한정합니다.

아이콘만 남는 탐색 레일은 각 항목의 동일한 너비 안에 `items-center justify-center`로 아이콘을 놓습니다. 제목용 여백, 감춘 텍스트의 margin, 배지 때문에 중심이 이동하지 않게 합니다. 아이콘은 `shrink-0`, 버튼의 접근 가능한 이름과 Tooltip은 유지합니다. 배지는 펼친 상태나 상세 영역에서 보여줍니다.

## 방향과 길이

본문 정렬은 `text-start`, 방향성 있는 여백은 `ms-*`, `me-*`, `ps-*`, `pe-*`를 우선합니다. `gap`은 양방향에서 동일하게 작동합니다. 앞으로 RTL을 도입할 때 뒤로가기 같은 방향 아이콘은 의미에 따라 검토하며 로고·숫자·상태 아이콘까지 일괄 반전하지 않습니다. 현재 앱 전체 RTL 지원은 미구현입니다. [국제화](international-design.md)를 함께 확인하세요.
