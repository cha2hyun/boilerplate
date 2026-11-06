# 국제화

앱 UI는 `en-US`와 `ko-KR`를 지원하며 선택 언어를 저장합니다. 기본 언어는 `en-US`, 날짜 기본 시간대는 `UTC`입니다. 언어와 `USD`/`KRW` 표시 통화는 독립적으로 선택합니다. 번역 리소스, 저장 형식, 실제 환율의 경계는 [언어와 표시 통화](../i18n.md)가 소유합니다. 두 언어 모두 LTR이며 RTL 지원은 포함하지 않습니다.

## 데이터와 표현

- 숫자·통화·비율은 [숫자 표시](../number-formatting.md)의 공통 formatter를 사용합니다. 화면의 `useFormatters()`는 선택 언어를 구독하고 날짜·상대 시간에도 같은 언어를 적용합니다. `Intl.NumberFormat`은 순수 공통 숫자 formatter 내부에서만 사용합니다.
- 언어 변경은 통화를 바꾸지 않습니다. 통화 변경 시 USD 주요 단위 금액은 `formatMoney`/`MoneyDisplay`에서 실제 API 환율로 변환합니다. 순수 `formatNumber`는 이미 선택한 단위의 숫자 형식만 바꿉니다.
- 실제 시각은 offset이 있는 ISO timestamp로 저장합니다. 날짜 formatter의 기본 UTC를 유지하며 다른 시간대는 명시적으로 지정합니다. 기한·내보내기·감사 정보에는 필요한 시간대를 함께 표시합니다.
- 날짜만 의미하는 `YYYY-MM-DD`는 timestamp와 구분합니다. 기본 UTC 출력으로 현지 시각 변환 때문에 전날로 밀리지 않게 합니다.
- 상세 화면에는 상대 시간과 함께 절대 날짜를 제공합니다. 샘플의 고정 날짜를 현재 시각이라고 표현하지 않습니다. 환율의 API 기준 날짜는 검증·캐시에 보존하며 메뉴의 표시 범위는 [언어와 표시 통화](../i18n.md#실제-환율과-캐시)를 따릅니다. 현재 메뉴에서는 날짜를 생략하고 환율을 조회 시각이나 실시간 체결가로 표현하지 않습니다.
- 이름, 주소, 이메일, 사용자가 입력한 프로젝트 내용과 메시지 본문은 그대로 유지합니다. 알려진 상태 코드만 표시 경계에서 번역합니다.

```tsx
const { formatDate, formatNumber } = useFormatters()

formatDate('2026-11-04', { year: 'numeric' })
formatDate('2026-11-04T06:30:00Z', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Seoul',
})
// 비교 예시에만 표시 언어를 명시적으로 덮어쓴다.
formatNumber(100400, { locale: 'ko-KR', notation: 'compact' })
```

## 문장과 레이아웃

메시지는 `react-i18next`의 완성된 문장 단위로 번역하고 값은 interpolation으로 전달합니다. 번역된 단어 조각을 이어 붙이지 않습니다. 수량을 문구에 넣을 때도 공통 숫자 formatter를 통과시킵니다. 컴포넌트 안에서 `useTranslation(namespace)`를 호출하여 언어 변경이 즉시 반영되게 합니다.

버튼·탭·표 헤더는 긴 번역의 줄바꿈과 너비를 확인합니다. 본문은 고정 높이로 자르지 않습니다. 사용자 입력과 긴 이름은 `min-w-0`, 필요한 `break-words`와 전체 값 확인 수단을 제공합니다. 사람이름·주소·전화번호에 한 국가의 형식을 일반화하지 않습니다. 오류·빈 결과·로딩·도움말과 접근 가능한 이름도 두 언어로 확인합니다.

방향성은 [레이아웃의 logical property 규칙](layout.md#방향과-길이)을 따릅니다. 향후 RTL을 지원할 때는 앱 `dir`, Radix 방향 context, 표/차트, 날짜 입력, 탐색 아이콘, 혼합 문자열과 키보드를 함께 검증합니다.

지원 언어·환율·formatter 동작은 이 저장소의 [국제화 계약](../i18n.md)과 [API 계약](../api-contract.md)을 기준으로 확장합니다.
