# 작업 계획: 제품 개발용 React 보일러플레이트

상태: 완료 — 2026-11-03 로컬 통합 검증 완료

## 문제와 완료 조건

비어 있는 저장소에 React/TypeScript/Vite/pnpm 앱을 구성합니다. 사용자는 Tailwind만 사용한 스타일, shadcn UI/토큰, FSD, TanStack Router/Query, Zustand, lucide, ESLint/Prettier/Husky, 커밋/PR 규칙, AI 하네스를 요구했습니다.

완료 조건은 동작하는 대시보드/프로젝트 CRUD/설정, 명시적인 데모 모드, 실제 API로 교체 가능한 경계, 구조 가드레일, 재현 가능한 품질 검사와 브라우저 테스트입니다. 실제 백엔드/인증/권한/배포는 이번 구현 범위에 포함되지 않습니다.

## 실행 경계

1. root 설정, 의존성/lockfile, Vite/Router/Query/providers, 공식 shadcn neutral 토큰을 구성합니다.
2. entities/shared에 검증된 데이터 계약, demo/API 어댑터, 취소/오류/캐시 처리를 구성합니다.
3. features/widgets/pages에 프로젝트 행동과 화면을 구성합니다. 워크스페이스 설정은 Zustand가 소유합니다.
4. FSD import/UI/style 가드레일, Git 훅, CI, 문서, shadcn MCP 설정을 구성합니다.
5. 단위/통합/브라우저 검사 후 실패를 해결하고 동작과 제약을 보고합니다.

작업 영역을 분리하여 병렬 구현하고 package.json/lockfile은 한 작업자가 관리합니다. 최초 하네스와 앱이 함께 작성되어 이 계획은 통합 도중 기록되었습니다.

## 검증 기록

아래는 최초 부트스트랩 당시의 실행 기록입니다. 후속 요청으로 현재 `pnpm check`는 정적 검사만 수행하며 전체 테스트는 Actions에서 실행합니다. 이후 작업에는 [테스트 정책](../testing.md)을 적용하세요.

- 완료: 구조 검사기 회귀 테스트 14개 통과.
- 완료: 생성 UI/모바일 hook의 strict ESLint 보완, 관련 동작 테스트 3개 통과 및 전체 typecheck 통과.
- 완료: pinned GitHub Actions, frozen lockfile 설치, `pnpm check`, production build + Playwright CI job 작성.
- 완료: API 계약, 운영 전환, AI 작업 흐름, 기여 가이드와 ADR 작성.
- 완료: `pnpm check` 통과 — Prettier, ESLint, TypeScript, FSD/UI 가드레일, 회귀 테스트 14개, Vitest 테스트 57개, 프로덕션 빌드.
- 완료: `pnpm test:e2e` 통과 — 데스크톱/모바일 18개 시나리오. CRUD 영속성, 오류 복구, 필터/정렬/CSV, 초점 복귀, 라우팅, 테마, 환경 설정을 확인했습니다.
- 완료: shadcn MCP tool discovery/registry 조회 검증 (통합 담당자 확인).

원격 CI는 push/PR 후 GitHub에서 별도 실행되므로 로컬 검증과 구분합니다.

- 후속 확인: 공식 shadcn Vite 테마 provider로 전환하여 개발 모드의 script 경고를 제거했습니다. 시스템 테마 변화/저장 실패를 포함한 회귀 테스트 5개를 추가했고, 새 개발 서버의 브라우저 오류·경고가 없음을 확인했습니다.
