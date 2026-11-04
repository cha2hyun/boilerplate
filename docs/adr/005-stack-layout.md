# ADR 005: 중앙 정렬을 소유하는 HStack·VStack

상태: 승인됨

## 문제

배지와 설명을 나란히 놓은 KPI 하단에서 `items-start`로 세로 중심이 어긋났다. 가로 정렬을 권고하는 문서만으로는 반복되는 레이아웃을 일관되게 유지하지 못했다. 사용자는 정렬을 가장 중요한 규칙으로 정하고 공통 Stack 사용을 요청했다.

## 결정

`shared/ui/stack.tsx`에 HStack·VStack만 추가한다. 둘 다 교차축 중앙 정렬을 기본으로 하고 다른 정렬은 명시적인 `align`/`justify` props로 표현한다. 기존 shadcn과 같은 `cn`·Tailwind·설치된 Radix Slot의 `asChild` 조합을 사용하며 새 의존성·CSS·토큰 체계는 추가하지 않는다.

직접 작성하는 가로·세로 layout div는 Stack으로 통일한다. 그리드와 일반 문서 구조, 설치된 shadcn 내부는 유지한다. 페이지/폼은 `align="stretch"`, 의미 있는 태그나 Card 슬롯은 `asChild`로 유지한다. asChild에서는 Stack의 data-slot을 전달하지 않아 shadcn의 슬롯 계약을 보존한다.

이 결정은 컨트롤을 다시 구현할 권한이 아니다. Button/Input 등은 계속 shadcn만 사용한다. 전체 API와 반응형·예외·검증의 단일 소유 문서는 [레이아웃](../design/layout.md)이다.

## 검증

기존 아키텍처 검사에 직접 layout div와 Stack 정렬 덮어쓰기 검사를 추가하고 허용/금지 회귀 사례를 작성한다. KPI 비교 행은 실제 배지·설명의 박스 중심을 기존 캐시 E2E에서 확인한다. CI와 전체 테스트 실행은 사용자의 최신 지시를 따른다.
