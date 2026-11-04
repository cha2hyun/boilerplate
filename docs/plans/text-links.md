# 작업 계획: 텍스트 링크 규칙과 푸터

상태: 규칙 정의 완료, 구현 진행

## 문제와 완료 조건

- 컴포넌트 구현 전에 [텍스트 링크 규칙](../design/text-links.md)을 정의한다.
- 기존 shadcn 조합으로 공통 TextLink와 typed RouterTextLink를 제공한다.
- 외부 origin은 항상 새 탭, 내부 경로는 기본 현재 탭으로 탐색한다. 밑줄·우측 위 화살표·키보드 초점·새 탭 설명을 공통 적용한다.
- 푸터 왼쪽에 cha2hyun 제작자 문구, 오른쪽에 프로젝트 GitHub 링크를 표시한다.

## 변경 경계

- `shared/lib`: URL/target/rel 계약. `shared/ui`: shadcn anchor 조합. `shared/lib/i18n`: 새 탭 설명.
- `widgets/app-shell`: 푸터 문구와 정렬. Components에 API 사용 예제를 제공한다.
- 기존 UI 금지 규칙의 예외는 이 조합만 허용하며 ADR과 주제별 문서에서 연결한다.
- 새 의존성·일반 CSS·상태 저장·서버 API를 추가하지 않는다.

## 검증과 완료

- 의미 있는 URL·접근성·Router 계약 테스트를 작성하고 기존 workspace E2E에 푸터 검증을 통합한다.
- 로컬은 `pnpm check`와 꼭 필요한 좁은 재현만 수행한다. 전체 테스트·빌드는 실행하지 않는다.
- 최신 사용자 지시에 따라 Actions·PR 생성·main 머지는 사용자가 마지막에 요청할 때까지 보류한다. 작업 브랜치의 기능 커밋·푸시는 유지한다.
