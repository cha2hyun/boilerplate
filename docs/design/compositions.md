# 반복 화면 조합

기존 shadcn과 Stack으로 같은 역할의 화면을 같은 밀도로 조합합니다. 색상·폰트·숫자 형식을 이 문서에 별도로 정의하지 않습니다. [레이아웃](layout.md), [타이포그래피](typography.md), [숫자 표시](../number-formatting.md), [로딩과 모션](../loading-and-motion.md)이 각각의 계약을 소유합니다.

## 페이지와 섹션

페이지 최상위는 `VStack data-slot="page-content" align="stretch" className="min-w-0 gap-6"`를 사용합니다. Settings의 `max-w-4xl`처럼 내용에 맞는 최대 너비는 유지합니다. 제목·설명·칩·주요 동작은 [PageHeader](page-headers.md), KPI 그리드는 `gap-4`, 일반 섹션 사이는 `gap-6`입니다. 페이지마다 `gap-7/8` 또는 별도 Page 래퍼를 추가하지 않습니다.

## 나란한 카드의 경계와 푸터

같은 행의 카드는 **외곽 상·하단, 하단 구분선, 푸터 내용의 세로 중심**을 함께 맞춥니다. 카드 바닥만 같은 검사는 완료 근거가 아닙니다. 이 기준은 최초 로딩·데이터 표시, 한글·영문, 기본·간결한 레이아웃에서 유지합니다.

- Overview의 매출·활동은 PC에서 부모 grid의 헤더/본문/푸터 3개 행을 subgrid로 공유합니다. 두 카드의 행 간격은 24px이며, 한쪽 푸터가 줄바꿈으로 커지면 같은 푸터 행 전체가 함께 커집니다. 각 카드에서 별도의 padding/고정 높이로 구분선을 눈대중 조절하지 않습니다.
- 기존 [`CardFooter`](../../src/shared/ui/card.tsx)의 `variant="bordered"`가 구분선·최소 높이 72px·상하 16px 여백·세로 중앙 정렬을 소유합니다. 이 조합의 Card는 `pb-0`으로 바깥 하단 여백을 중복하지 않습니다. 기본 variant와 다른 shadcn 카드의 배치는 유지합니다.
- 높이는 최소값입니다. 긴 문구는 자연스럽게 줄바꿈하고 푸터를 늘립니다. `h-*`, `truncate`, `overflow-hidden`으로 필요한 설명을 자르거나 버튼 높이에 맞춰 글자 크기를 바꾸지 않습니다.
- 모바일·태블릿의 세로 배치에서는 서로 다른 카드의 절대 Y 좌표를 맞추지 않습니다. 각 푸터의 상하 여백·내용 중심·줄바꿈·키보드 액션 도달을 유지합니다.
- 변경 시 [workspace E2E](../../e2e/workspace.spec.ts)의 실제 bounding box 검사를 유지합니다. desktop의 외곽/구분선/내용 중심 차이는 1px 이내여야 합니다. CSS 클래스 문자열이나 외곽 높이만 확인하는 테스트로 대체하지 않습니다. 확대된 푸터 문구의 자연 높이 증가도 확인합니다.

## KPI 카드

소유 코드: [`MetricCard`](../../src/shared/ui/metric-card.tsx). Overview·Analytics·Projects·Orders·Customers의 상단 요약은 이 조합을 공유합니다. Foundations → 피드백의 숫자 예시도 실제 조합을 사용합니다.

```tsx
<MetricCard
  label={t('analytics.visitors')}
  icon={Users}
  loading={isLoading}
  value={<NumberDisplay animate wrap value={data?.visitors} format={countFormat} />}
  footer={t('analytics.visitorsHint')}
/>
```

- 기존 `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardFooter`, `HStack`, `VStack`, `Skeleton`의 조합입니다. 비즈니스 데이터·Query·formatter·환율을 소유하지 않습니다.
- `label`, `icon`, `value`, `footer`, `loading`만으로 화면을 구성합니다. 페이지가 패딩·글자 크기·테두리·그림자를 재정의하는 `className` API는 제공하지 않습니다. `footerTestId`는 기존 비교 행 테스트의 식별자를 보존합니다.
- 공통 바깥 기준은 `rounded-xl`, `shadow-xs`, 가로/세로 `20px` 패딩, `min-height: 192px`입니다. 레이블은 `text-xs font-medium`, 값은 `text-3xl leading-9 font-semibold tabular-nums`, footer는 `text-xs`입니다.
- 값 영역은 최소 `72px`로 두 줄, footer는 최소 `32px`로 두 줄을 예약합니다. Skeleton과 값은 같은 프레임을 사용합니다. 더 긴 내용은 안전하게 높이를 늘리며 고정 높이·클리핑으로 숨기지 않습니다. 이 예외와 확인 범위는 [긴 콘텐츠](content-overflow.md)를 따릅니다.
- 설명형 footer는 문자열, Overview의 비교형 footer는 기존 Badge와 기간 설명을 전달합니다. 둘 다 공통 중앙 정렬·간격·최소 높이를 사용합니다. 색상만으로 증감을 전달하지 않고 아이콘과 부호를 함께 유지합니다.
- 숫자는 `NumberDisplay`/`MoneyDisplay`에 `animate wrap`을 명시합니다. 금액만 작은 글자로 바꾸거나 자동 축약하지 않습니다. 값이 없으면 기존 `—` 표현을 유지하고, 오류·재시도 안내는 페이지의 Alert/목록이 소유합니다.
- `aria-label`은 레이블, `aria-busy`는 최초 로딩 상태입니다. 기존 shadcn `card`·`card-title`·`card-footer` 슬롯을 유지합니다. 공통 조합은 `[data-metric-card]`, `metric-label`·`metric-value` 슬롯, `[data-metric-footer]`로 찾을 수 있습니다.

## 표와 필터

소유 예제: [`OrdersPage`](../../src/pages/orders/ui/orders-page.tsx), [`CustomersPage`](../../src/pages/customers/ui/customers-page.tsx), [`ProjectTable`](../../src/widgets/project-table/ui/project-table.tsx).

1. CardHeader에 목록 제목·설명을 두고 `VStack asChild align="stretch"`로 CardContent의 검색·필터·표·페이지 안내를 묶습니다. 필터는 `HStack wrap`과 `gap-2`, 입력은 모바일 전체 너비와 중간 화면부터 제한된 너비를 사용합니다.
2. 검색에는 Label 또는 명확한 접근 가능한 이름을 연결하고 Select/Tabs에 번역된 이름을 부여합니다. 변경 콜백은 페이지의 검증된 URL 검색 상태를 갱신하며 필터 변경 시 기존 페이지 초기화 동작을 유지합니다. 초기화는 기존 검색 입력으로 초점을 돌립니다. 상태 소유권은 [URL 조회 상태](../url-state.md)를 따릅니다.
3. Orders·Customers의 넓은 표는 `Table.containerProps`에 `role="region"`, 이름, `tabIndex={0}`, `aria-busy`, 프레임 높이를 전달합니다. 실제 가로 스크롤 요소 하나에 의미와 키보드 진입점을 둡니다. Table 자체의 터치/스크롤 정책은 [레이아웃](layout.md#넓은-표와-터치-스크롤)을 따릅니다.
4. colgroup, Skeleton 셀 수, 빈 행 colspan을 실제 열과 맞춥니다. 로딩·빈 결과·오류의 프레임과 페이지 안내 공간을 유지합니다. 숫자 정렬은 우측·`tabular-nums`, 문자열은 전체 확인 경로에 따라 줄바꿈 또는 목록 생략을 선택합니다.
5. 페이지 안내와 이동 버튼은 좁은 화면에서 쌓이는 grid를 사용합니다. Table의 데이터/상태/액션은 각 페이지와 widget에 남기며 범용 Table/Filter 프레임워크로 감싸지 않습니다.

편집 가능한 레코드 표는 PageHeader의 생성 버튼과 마지막 열의 행 메뉴를 사용합니다. 행 메뉴의 접근 가능한 이름에는 대상 이름/ID를 포함하고 수정은 Dialog, 삭제는 AlertDialog로 확인합니다. 집계·설명용 표에는 임의의 CRUD를 추가하지 않습니다. 주문·고객은 생성 성공 후 기존 URL 필터를 보존하고 새 레코드의 상세를 열어 필터에 가려진 결과도 확인할 수 있게 합니다. 다른 도메인의 저장 후 이동은 해당 페이지 명세가 정합니다. 모달이 닫히면 연결된 열기 버튼으로, 삭제로 버튼이 사라졌다면 검색 입력으로 초점을 복구합니다.

## 폼

소유 예제: [`SettingsPage`](../../src/pages/settings/ui/settings-page.tsx), [`ProjectEditorDialog`](../../src/features/project-editor/ui/project-editor-dialog.tsx).

- `VStack asChild align="stretch"` 안의 실제 `form`이 제출을 소유합니다. 필드 묶음은 `gap-2`, 폼 내용은 `gap-4/6`을 사용하며 Label, Input/Textarea/Select, 도움말 또는 오류를 가까이 배치합니다.
- Label의 `htmlFor`, 컨트롤 `id`, 도움말/오류의 `aria-describedby`를 연결합니다. 검증 오류는 `aria-invalid`와 `role="alert"`로 전달합니다. placeholder가 레이블을 대체하지 않습니다.
- Settings는 로컬 환경 설정, 프로젝트·주문·고객 편집은 각 feature의 검증·mutation을 유지합니다. 제출·취소·초기화의 버튼 종류와 초점 복귀는 해당 흐름이 소유합니다. 반복 외형을 맞추려고 저장 수명·URL·입력 제한을 변경하지 않습니다.
- 긴 오류/도움말을 고정 높이로 가리지 않습니다. Dialog/Sheet의 제목·설명·초점·닫기 동작은 설치된 공통 컴포넌트에 맡깁니다.
- 저장 전 입력을 잃는 이동·닫기는 [미저장 입력 보호](../unsaved-changes.md)를 따릅니다. 확인창은 공통 shadcn AlertDialog 조합을 사용하며 폼마다 다른 문구·색·버튼 순서를 만들지 않습니다.
