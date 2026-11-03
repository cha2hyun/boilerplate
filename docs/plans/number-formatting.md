# 작업 계획: 숫자 표시와 선택적 모션 통일

상태: 구현 완료 (원격 검증 결과는 PR에 기록)

## 문제와 완료 조건

- 화면마다 숫자·통화·비율·차트 문자열을 다르게 만들고 숫자 모션은 별도 formatter 콜백을 받는다.
- 모든 수량의 표시를 공통 `formatNumber`와 옵션 객체로 통일한다. 데이터/API/계산의 원시 숫자와 식별자·날짜·입력 편집·원시 CSV의 의미는 유지한다.
- 천 단위 구분, USD/KRW 등 통화와 기호 표시 여부, `100400 → 100.4K` 축약을 같은 API로 선택한다.
- `NumberDisplay`는 기본 정적 표시이며 `animate`를 켤 때 고정 300ms로 동작한다. 주요 KPI는 명시적으로 모션을 유지하고 reduced motion, hidden 문서, 최종 너비, 접근성을 보존한다.
- Foundations에서 숫자 형식·구분·통화 기호·축약·애니메이션을 확인하고 현재 문서에서 표시/모션 소유권을 연결한다.
- 새 의존성, UI primitive, CSS 파일, 환율 변환, 전체 국제화는 범위 밖이다.

## 확인한 근거

- 표시 소유 코드: `src/shared/lib/format.ts`, `src/features/number-motion`와 각 화면의 숫자 소비 위치.
- 디자인 예시: `src/pages/foundations/ui/foundations-page.tsx`.
- 기존 계약: [로딩과 모션](../loading-and-motion.md), [국제화](../design/international-design.md), [아키텍처](../architecture.md).
- 과거 계획/리뷰의 240ms 기록은 당시 검증 근거로 남기고 현재 소유 문서만 300ms로 갱신한다.

## 변경 경계

- shared: `NumberFormatOptions`와 단일 숫자 formatter. 통화에는 코드가 필수이며 비율 입력은 사람이 읽는 단위다.
- features: `NumberDisplay`의 옵션 기반 표시, 기본 `animate={false}`, 고정 300ms 모션.
- pages/widgets: 숫자 표시와 차트 formatter를 공통 API로 교체하고 기존 핵심 수치에는 `animate`를 명시한다.
- 문서: [숫자 표시](../number-formatting.md)가 형식 규칙, [로딩과 모션](../loading-and-motion.md)이 모션 규칙을 소유한다. 탐색 문서는 이 소유 문서로 연결한다.
- 저장 형식/API 변경은 없으며 없는 숫자는 0 대신 `—`로 표시한다.

## 실행과 검증

1. formatter 옵션과 모션 공개 API를 구현하고 소비 화면을 같은 계약으로 전환한다.
2. 경계값·통화/축약/비율 옵션과 정적/모션 전환에 필요한 대상 테스트를 보완한다.
3. 로컬은 `pnpm check` 정적 검사와 필요한 대상 테스트만 실행한다. 전체 테스트·빌드는 Actions 정책을 따른다.
4. Foundations와 현재 소유 문서를 갱신하고 직접 숫자 formatting 잔여를 검색한다.

## 완료 기록

- 숫자 소비 화면과 차트 tooltip을 공통 포맷으로 전환하고 기존 USD KPI 정수/주문·고객 금액 2자리 표기를 유지했다.
- 모션은 300ms, 기본 off이며 최종값과 중간값 너비를 함께 예약한다. 초기 렌더와 effect 사이의 reduced motion/visibility 변경도 완료 상태를 유지한다.
- Astra xhigh 재리뷰: formatter/모션/가드레일 범위 95/100. 축약 중간값 잘림, 설정 변경 경합, 비정상 옵션 캐시 충돌을 수정했다.
- 로컬 `pnpm check` 통과. 변경 계약과 발견한 결함 재현에 한정해 `pnpm exec vitest run src/shared/lib/format.test.ts src/features/number-motion/ui/number-display.test.tsx` 52개 통과. 로컬 전체 테스트·브라우저 suite·build는 실행하지 않았다.
- Actions는 전체 단위/가드레일, production build 1회와 core/samples E2E를 수행한다. Foundations 옵션 연결과 축약 모션의 실제 너비·잘림 회귀 검사를 core에 추가했다. 최종 PR head/main SHA의 실행 결과는 PR 검증란에서 추적한다.
- 포맷/모션 계약을 분리해 문서 지도에서 연결했다. 전체 앱 번역, 환율 변환과 임의 사용자 문자열에서의 숫자 추출은 제공하지 않는다.
