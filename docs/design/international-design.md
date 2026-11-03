# 국제화

현재 기본 UI와 공통 formatter는 `en-US`를 사용하며 날짜 기본 시간대는 `UTC`입니다. 앱 전체 번역, 언어 전환 저장, RTL은 아직 구현하지 않았습니다. Foundations의 로케일 미리보기는 `Intl` 출력 차이를 설명하는 국소 예시입니다.

## 데이터를 바꾸지 않고 표현을 바꾸기

- 숫자·통화·비율은 [숫자 표시](../number-formatting.md)의 공통 `formatNumber`에 `locale`을 전달합니다. `Intl.NumberFormat`은 이 함수 내부에서만 사용합니다. 날짜는 `Intl.DateTimeFormat`, 상대 시간은 `Intl.RelativeTimeFormat` 기반의 날짜 formatter를 사용하며 화면마다 천 단위 구분이나 날짜 문자열을 직접 조합하지 않습니다.
- 통화 코드는 API/업무 계약에서 받습니다. 로케일 변경이 USD를 KRW로 환산하지 않습니다. 숫자만 바꾸지 말고 단위·반올림 규칙도 함께 정합니다.
- 실제 시각은 offset이 있는 ISO timestamp로 저장합니다. 출력에는 제품에서 선택한 IANA 시간대를 지정하고, 기한·내보내기·감사 정보에는 필요하면 시간대도 표시합니다.
- 날짜만 의미하는 값은 timestamp와 별도로 다룹니다. `2026-11-04` 같은 업무 날짜를 현지 시각으로 변환해 전날로 밀지 않습니다. API 계약부터 정합니다.
- 상대 시간만으로 정확한 업무 시각을 잃지 않게 상세 화면에서는 절대 날짜를 제공합니다. 고정된 날짜 예시를 현재 시각인 것처럼 표시하지 않습니다.

```ts
import { formatNumber } from '@/shared/lib/format'

const locale = 'ko-KR'
const timeZone = 'Asia/Seoul'

formatNumber(12480, {
  locale,
  style: 'currency',
  currency: 'USD', // 표시 언어와 통화는 별개
})

new Intl.DateTimeFormat(locale, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone,
}).format(new Date('2026-11-04T06:30:00Z'))
```

## 문장과 레이아웃

메시지는 완성된 문장 단위로 번역하고 값은 placeholder로 전달합니다. 단어 조각을 이어 붙이지 않습니다. 향후 복수형/선택형 표현이 필요하면 메시지 도구를 정한 뒤 적용합니다. 현재 번역 프레임워크가 있다고 가정하지 않습니다.

버튼·탭·표 헤더는 긴 번역을 고려해 줄바꿈/너비 정책을 정합니다. 본문은 고정 높이로 자르지 않습니다. 사용자 입력과 긴 이름은 `min-w-0`, 필요한 `break-words`와 전체 값 확인 수단을 제공합니다. 사람이름·주소·전화번호에 한 국가의 형식을 일반화하지 않습니다.

방향성은 [레이아웃의 logical property 규칙](layout.md#방향과-길이)을 따릅니다. 실제 RTL 지원 시 앱의 `dir`, Radix 방향 context, 표/차트, 날짜 입력, 탐색 아이콘, 양방향 혼합 문자열과 키보드를 함께 확인해야 합니다.

## 참고 자료의 적용 범위

[SEED International Design](https://seed-design.io/foundations/international-design)에서 지역별 표기와 문장 길이를 고려하는 관점을 참고했습니다. SEED의 국가별 표기표를 복제하거나 모든 로케일 지원을 약속하지 않습니다. 우리 formatter와 API 계약을 기준으로 지원 범위를 확장합니다.

소유 코드: `src/shared/lib/format.ts`. 날짜/금액 계약 변경 시 [API 계약](../api-contract.md)도 확인합니다.
