# 숫자 표시

이 문서가 숫자·금액·비율의 표시 형식을 소유합니다. 순수 숫자 형식은 `@/shared/lib/format`의 `formatNumber`가 소유하고 화면은 `@/shared/lib/i18n`의 `useFormatters()`로 선택 언어를 반영합니다. USD/KRW 전환과 실제 환율 계약은 [언어와 표시 통화](i18n.md)를 따릅니다. 숫자 애니메이션의 시간·접근성·너비 예약은 [로딩과 모션](loading-and-motion.md)이 소유합니다.

## 데이터와 표시를 분리한다

- API 응답, 도메인 모델, 상태, 계산에는 원래 `number`를 유지하고 마지막 표시 경계에서만 포맷합니다. 화면용 문자열을 숫자로 되돌려 계산하지 않습니다.
- 표 셀, 페이지/선택 개수, 배지, 요약, 차트 축/tooltip, 접근 가능한 이름과 수량을 포함한 문구에도 같은 함수를 사용합니다. 호출부에서 직접 `Intl.NumberFormat`, `toLocaleString`, `toFixed` 또는 천 단위 문자열 조합으로 별도 규칙을 만들지 않습니다.
- 식별자/주문 번호, 날짜·시각, 전화번호, 버전, 코드 예시는 수량이 아니므로 숫자 formatter를 적용하지 않습니다. 날짜는 날짜 formatter를 사용합니다. API payload, 계산용 원시 CSV, 편집 중인 숫자 입력값에도 표시 포맷을 적용하지 않습니다.
- 통화 코드와 단위는 데이터/업무 계약을 따릅니다. 순수 `formatNumber`의 통화 옵션은 형식만 바꿉니다. 앱의 선택 통화로 환산하는 금액은 `formatMoney` 또는 `MoneyDisplay`를 사용하며 원본 USD 데이터를 수정하지 않습니다.

## 공통 함수

```ts
import { formatNumber, type NumberFormatOptions } from '@/shared/lib/format'

formatNumber(100400) // '100,400'
formatNumber(100400, { useGrouping: false }) // '100400'
formatNumber(100400, { notation: 'compact' }) // '100.4K'
formatNumber(12480.5, { style: 'currency', currency: 'USD' }) // '$12,480.50'
formatNumber(12480.5, { style: 'currency', currency: 'KRW' }) // '₩12,481'
formatNumber(12480.5, { style: 'currency', currency: 'USD', showCurrency: false }) // '12,480.50'
formatNumber(12.4, { style: 'percent' }) // '12.4%'
formatNumber(null) // '—'
```

`formatNumber(value: number | null | undefined, options?: NumberFormatOptions): string`은 모든 숫자 형식을 생성하는 순수 함수입니다. `useFormatters().formatNumber`와 `NumberDisplay`는 이 함수에 선택 언어를 전달합니다. 명시적 `locale`은 선택 언어를 덮어쓰며 형식 비교 예시에만 사용합니다. 환산 금액은 아래의 `formatMoney`/`MoneyDisplay` 경계를 사용합니다.

| 옵션                                             | 의미와 기본값                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `locale`                                         | 기본 `en-US`. 로케일에 맞는 구분 기호·기호 위치·축약 단위를 사용합니다.                                    |
| `style`                                          | `decimal`(기본), `currency`, `percent`.                                                                    |
| `currency`                                       | `style: 'currency'`일 때 필수인 통화 코드. 예: `USD`, `KRW`.                                               |
| `showCurrency`                                   | 통화에서만 사용하며 기본 `true`. `false`는 기호/코드/이름만 감추고 통화의 소수 정밀도와 부호를 유지합니다. |
| `currencyDisplay`, `currencySign`                | 통화에서만 사용하는 `Intl` 옵션. 기호/코드/이름과 일반/회계 음수 표기를 선택합니다.                        |
| `notation`, `compactDisplay`                     | `standard`(기본) 또는 `compact`, 축약 길이 `short`(기본) 또는 `long`.                                      |
| `useGrouping`                                    | 구분 기호 사용 여부. 생략하면 해당 로케일·표기법의 `Intl` 기본값을 사용합니다.                             |
| `minimumFractionDigits`, `maximumFractionDigits` | 표시할 소수 자릿수. 업무 정밀도가 필요할 때 명시합니다.                                                    |
| `signDisplay`                                    | 양수/0/음수의 부호를 다루는 `Intl` 옵션. 기본 `auto`.                                                      |

일반 표기의 통화 정밀도는 `Intl`의 통화 기본값을 사용합니다(USD 소수 2자리, KRW 0자리). 축약 표기와 비율은 정밀도를 지정하지 않으면 최대 소수 1자리입니다. 따라서 `100400`의 기본 영어 축약은 `100.4K`이며 정수로 미리 반올림하지 않습니다. 비율 입력은 사람이 읽는 단위입니다. `12.4`는 `12.4%`이고 `0.124`를 전달해 12.4%로 해석하지 않습니다.

`null`, `undefined`, `NaN`, 무한대는 `—`로 표시하고 음수 0은 0으로 정규화합니다. 값이 없는 상태를 0으로 바꾸지 않습니다. 잘못된 로케일·통화·소수 자릿수 옵션은 숨기지 않고 `Intl`의 오류로 드러냅니다. formatter 인스턴스 캐시는 공유 구현이 소유하므로 화면마다 캐시나 formatter 함수를 만들지 않습니다.

## 정적 표시와 선택적 애니메이션

문자열만 필요한 표·축·문구는 `useFormatters()`에서 받은 `formatNumber`를 호출합니다. 환산 금액에는 같은 hook의 `formatMoney(valueUSD, options?)`를 사용합니다. `valueUSD`는 달러 단위이며 주문/고객의 cents는 호출부에서 `/ 100`으로 바꿉니다. KRW는 Query가 제공한 환율을 곱한 뒤 형식을 적용하고 유효한 환율이 없으면 `—`로 표시합니다. USD는 환율에 의존하지 않습니다.

숫자 표시에서 애니메이션을 켜고 끌 필요가 있으면 공개 컴포넌트를 사용합니다.

```tsx
import { MoneyDisplay, NumberDisplay } from '@/features/number-motion'

<MoneyDisplay value={revenueUSD} animate />
<MoneyDisplay value={orderTotalInCents / 100} />
<NumberDisplay value={total} format={{ notation: 'compact' }} animate />
```

`MoneyDisplay`의 `format`은 `style`/`currency`를 제외한 `MoneyFormatOptions`이며 통화는 저장된 환경 설정을 따릅니다. 변환은 중간 반올림 없이 수행하고 표·차트 축·tooltip·KPI·상세 합계 모두 같은 경계를 사용합니다. `NumberDisplay`는 일반 수량이나 이미 특정 통화 단위인 형식 예시에 사용합니다.

`animate`의 기본값은 `false`이며 `format`에는 콜백 대신 공통 옵션 객체를 전달합니다. 주요 KPI의 모션은 호출부에서 `animate`를 명시합니다. 모션의 완료 시간과 reduced motion은 [로딩과 모션](loading-and-motion.md#숫자-모션은-선택적으로-300ms-동안-실행한다) 한 곳에서 관리합니다.

좁은 KPI·상세 요약에는 `NumberDisplay`/`MoneyDisplay`의 `wrap`을 명시해 긴 전체 문자열을 줄바꿈합니다. 기본값은 `false`이며 숫자 형식과 모션 시간에는 영향을 주지 않습니다. 폭이 부족하다는 이유로 `notation: 'compact'`, 통화 기호 생략, 페이지별 작은 글자를 자동 적용하지 않습니다. 구체적인 표시 경계와 전체 값 접근은 [긴 콘텐츠](design/content-overflow.md)를 따릅니다.

소유 코드: `src/shared/lib/format.ts`, `src/shared/lib/i18n`, `src/features/number-motion`. 화면 표본: Foundations → 피드백(형식/구분/기호/축약/모션), 문구·국제화(로케일).
