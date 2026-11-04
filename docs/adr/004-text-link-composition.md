# ADR 004: shadcn 조합으로 공통 텍스트 링크 제공

상태: 채택 — 컴포넌트 구현 전에 계약 정의

## 맥락

푸터에 제작자 표시와 저장소 링크가 필요하다. 사용자는 밑줄·우측 위 화살표와 외부 주소의 새 탭 열기를 일관된 전용 컴포넌트로 요청했다. 설치된 shadcn에는 Button의 link variant와 asChild 조합이 있으며, 저장소의 외부 링크 정책까지 소유하는 전용 컴포넌트는 없다.

## 결정

`TextLink`는 설치된 shadcn Button과 native anchor의 제한된 조합으로 허용한다. `RouterTextLink`는 TanStack의 공식 createLink로 경로 타입과 탐색을 유지한다. 새로운 UI 프레임워크·토큰·CSS나 임의 primitive 추가를 일반적으로 허용하는 예외가 아니다.

세부 API, 외부 origin 판별, 새 탭 정책, 접근성과 검증의 단일 소유 문서는 [텍스트 링크 규칙](../design/text-links.md)이다. 링크 탐색은 anchor, 사용자 동작은 Button이 소유한다. Sidebar/Breadcrumb 등 기존 shadcn 탐색 컨트롤을 교체하지 않는다.
