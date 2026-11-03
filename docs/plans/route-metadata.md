# 작업 계획: CSR 페이지 메타데이터와 북마크 자산

상태: 구현 완료, 원격 CI/운영 배포 검증 대기

## 완료 조건

- SSR 없이 각 고정 경로의 title/description/OG/Twitter 메타를 관리한다.
- 같은 정의에서 클라이언트 탐색과 경로별 정적 HTML head를 만든다.
- 공개 origin이 있을 때만 canonical과 절대 공유 이미지 URL을 출력한다.
- favicon, Apple touch icon, web manifest를 연결하고 배포/확장 방법을 문서화한다.
- 새 메타 계약·빌드 훅 테스트만 로컬에서 실행하고 전체 테스트는 CI에 맡긴다.

## 범위

React의 화면은 계속 클라이언트에서 렌더링한다. 빌드 시 HTML head만 경로에 맞게 변경하며 사용자/프로젝트의 비공개 데이터는 포함하지 않는다. 동적 콘텐츠의 검색 색인과 인증은 이 작업의 범위가 아니다.

## 검증

메타 계약 단위 테스트 12개, 빌드 훅 테스트 3개, TypeScript 및 구조 정적 검사를 통과했다. E2E에는 production HTML 원문과 CSR 탐색 메타를 확인하는 desktop 전용 사례를 추가했다. 전체 단위/E2E 테스트는 로컬에서 실행하지 않았다. 배포 origin과 정적 호스트의 directory index 우선 처리는 배포 환경에서 확인한다.

통합 `pnpm check`와 production build를 통과했다. 실제 preview 요청에서 `/projects`가 홈 HTML을 반환하는 문제를 발견해 preview 전용 디렉터리 index 연결을 추가했다. 해당 미들웨어 회귀 1개(요청 변형 7개)를 선택 검증했고, 기존 번들을 재사용하여 8개 경로 및 query/trailing slash 요청의 원문 제목을 HTTP로 확인했다. favicon/Apple icon/manifest/OG 이미지도 올바른 content-type과 HTTP 200을 반환했다. 원격 배포 도메인은 설정하지 않았으며 실제 공유 서비스의 재수집은 수행하지 않았다.
