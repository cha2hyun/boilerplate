# 기여 가이드

Node.js 24 LTS와 `package.json`의 `packageManager`에 고정된 pnpm을 사용합니다. `pnpm install --frozen-lockfile`로 설치한 뒤 `pnpm dev`로 실행하세요. 의존성을 의도적으로 변경할 때만 `pnpm add`/`pnpm update`를 사용하고 lockfile을 함께 제출합니다.

Dependabot PR·보안 알림의 시작/완료 점검, 정확한 버전 고정, 그룹 업데이트와 임시 보류는 [의존성 유지보수](docs/dependency-maintenance.md)를 따릅니다.

## 변경 단위

브랜치는 `feat/project-search`, `fix/dialog-focus`, `chore/update-tooling`처럼 목적을 드러내세요. PR은 하나의 사용자 문제 또는 유지보수 목적을 중심으로 작성합니다. FSD 배치와 import 규칙은 [아키텍처](docs/architecture.md)에 정의되어 있습니다.

작은 수정은 관련 파일과 테스트를 바로 변경해도 됩니다. 여러 레이어, API 계약, 저장 형식이 바뀌면 [계획 템플릿](docs/plans/_template.md)으로 범위와 검증 조건을 먼저 적으세요.

## 커밋과 PR

Conventional Commits를 사용합니다. 제목은 100자 이내이며 한국어 subject도 허용합니다.

```text
feat(projects): 프로젝트 상태 필터 추가
fix(api): 취소된 요청을 오류 알림에서 제외
docs: 운영 전환 체크리스트 보완
```

허용 타입은 `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`입니다. PR 제목도 같은 규칙을 따르며 별도 경량 `PR Title` workflow에서 검사합니다. 제목 수정 시 제목 검사만 갱신하고 전체 테스트를 다시 실행하지 않습니다. `style`은 포맷 변경이며 UI 동작 변경에는 목적에 맞게 `feat`/`fix`를 사용합니다.

승인된 기능 작업을 끝내면 관련 정적 검증 후 해당 변경만 커밋하고 작업 브랜치에 즉시 푸시합니다. 여러 기능이 쌓일 때까지 커밋·푸시를 미루지 않습니다. 사용자가 특정 작업에서 커밋·푸시를 금지하면 그 지시가 우선입니다. main 머지는 요청 범위에 포함될 때 PR의 CI 결과를 확인한 뒤 수행하며, 실패한 검사 우회나 force push는 기본 절차가 아닙니다.

Husky는 커밋 전 staged 파일에 ESLint/Prettier를 적용하고 전체 소스의 아키텍처를 검사합니다. `commit-msg`에서 제목 형식을 검사합니다. hooks는 로컬 편의 장치이며 CI를 대신하지 않습니다. 설치나 포크만으로 서버의 브랜치 보호 설정이 바뀌지는 않습니다. `CI Gate`와 `Conventional PR title`의 필수 검사·관리자 적용은 [CI Gate 절차](docs/ci-gate.md)를 따릅니다.

## 검증

```sh
pnpm check
```

로컬 기본 검증은 포맷/린트/타입/아키텍처 정적 검사입니다. 단위/가드레일/E2E의 전체 실행은 GitHub Actions에 맡깁니다. 사용자가 요청하거나 문제 해결에 반드시 필요한 경우에만 로컬에서 테스트를 실행하고, 우선 관련 파일/테스트/화면 크기를 선택하세요. 전체 테스트와 watch/coverage는 자동 로컬 작업이 아닙니다.

Actions는 품질 검사와 단위 테스트 후 production build를 한 번 생성합니다. `core`와 `samples` 브라우저 job은 같은 번들을 내려받아 Chromium 데스크톱/태블릿/모바일에서 검증합니다. 수동 실행에서는 브라우저 범주를 `all`/`core`/`samples` 중 선택할 수 있습니다. 명령과 비용/범위 정책은 [테스트 가이드](docs/testing.md)를 참고하세요.

PR에는 실제로 실행한 검사와 Actions 결과를 적으세요. UI 변경은 필요한 범위에서 화면 크기, 키보드, 다크 모드, 로딩/오류/빈 상태를 확인합니다. API 변경은 응답 스키마, 캐시 무효화, 취소/실패 동작을 확인합니다. CI 실패를 해결하기 위해 가드레일이나 타입 검사를 약하게 만들지 마세요.

의존성 유지보수는 최신 PR head의 CI 확인에 더해 최종 push/merge 후 최신 `main` SHA의 CI 성공까지 확인해야 완료입니다. 실패하면 원인을 수정해 다시 검증하고, 최종 SHA·실행 링크·남은 PR/보류 사유를 남기세요.

데이터/인증 관련 구현을 바꾸기 전 [API 계약](docs/api-contract.md), 배포 전 [운영 전환](docs/production-readiness.md)을 확인하세요.
