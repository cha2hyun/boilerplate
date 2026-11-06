# 의존성 유지보수

Dependabot PR은 일반 버전 업데이트일 수도 있고 보안 수정일 수도 있습니다. 봇이 만든 PR이라는 이유만으로 취약점이라고 부르거나 자동으로 머지하지 않습니다. 알림의 advisory, 영향 버전, 심각도, 실제 사용 경로와 수정 버전을 확인해 우선순위를 정합니다.

devDependency와 전이 의존성도 조사 대상입니다. production bundle 포함 여부뿐 아니라 로컬 개발·CI·생성 도구에서 공격자가 제어한 입력에 도달하는지 확인하고, 개발용이라는 이유만으로 알림을 무시하지 않습니다.

## 시작과 완료 시 확인

작업 시작과 완료 때 열린 Dependabot PR, Dependabot 보안 알림, 최신 원격 `main`과 작업 브랜치/PR head의 Actions 상태를 확인합니다. PR 목록이 비었다는 사실만으로 보안 알림이 없다고 판단하지 않습니다. 알림 API의 권한 오류나 조회 실패도 알림 0건이 아니며, 확인할 수 없는 범위와 이유를 남깁니다.

각 PR의 패키지/Action, 기존·제안 버전, 보안 수정 여부, CI 결과, 충돌과 호환성 영향을 확인합니다. 시작할 때 이미 실패한 최신 CI가 있으면 로그와 실패 job을 먼저 읽습니다. 완료할 때는 처음 읽은 SHA를 재사용하지 말고 원격 최신 SHA와 미처리 PR을 다시 조회합니다.

## 처리 우선순위와 보류

- 악용이 확인됐거나 critical/high인 보안 알림은 즉시 조사하고 수정합니다. 패치·minor로 안전하게 해결할 수 있는 보안/일반 업데이트도 같은 유지보수 세션에서 처리합니다. 긴급한 보안 수정을 다음 정기 그룹 업데이트까지 기다리게 하지 않습니다.
- 그 외 보안 알림도 영향 범위와 수정 가능성을 확인하고, 수정 버전이 있으면 검증해 반영합니다. major 변경이라는 이유만으로 보안 수정 검토를 생략하지 않습니다.
- 일반 major 업데이트는 릴리스 노트, 런타임/peer 요구사항, 사용 중인 API와 마이그레이션 범위를 확인합니다. 필요한 호환성 수정이 작고 검증 가능하면 같은 세션에서 함께 처리합니다.
- 수정 버전 부재, 명확한 API 비호환, 지원 런타임 변경, 외부 서비스 장애 등 구체적인 차단 사유가 있으면 대상 PR/알림, 이유와 영향, 재검토 조건을 아래 보류 기록 또는 연결된 이슈에 남깁니다. 보안 알림은 도달 가능한 입력/실행 경로, 적용한 완화 조치와 남은 위험, 추적 담당자도 기록합니다. 단순히 작업량이 늘어난다는 이유로 검토 없이 미루지 않습니다.

수정 버전이 없으면 상위 패키지의 대응과 실제 입력 경로를 조사해 완화·대체 가능성을 평가합니다. 스캔 결과만 없애기 위한 취약 버전 다운그레이드나 패치 근거 없는 임의 대체는 하지 않습니다. 전이 의존성 override도 실제 수정 여부와 상위 패키지 호환성을 확인하고 검증한 경우에만 사용합니다.

오탐 처리는 공식 advisory 철회나 CVE 발급기관의 거절 등 확인 가능한 근거가 있을 때만 해당 알림에 한정합니다. 근거 링크·확인 날짜·재검토 조건을 남기고, 단순히 CI가 통과하거나 패치가 없다는 이유로 dismiss하지 않습니다.

PR을 다른 변경으로 대체했다면 실제 버전과 lockfile/Action SHA 반영을 확인하고 대체 변경을 연결해 원본 PR을 정리합니다. 보류 PR을 닫는 경우에도 이유와 재검토 조건을 남깁니다. 큐가 비어 보이게 만들기 위한 일괄 종료, 알림 해제, 영구 버전 ignore는 하지 않습니다.

## 업데이트와 자동화 설정

패키지 작업에는 pnpm만 사용합니다. 직접 의존성은 `package.json`의 정확한 버전을 유지하고, 의도적인 업데이트와 `pnpm-lock.yaml` 변경을 함께 제출합니다. 예상 밖의 전이 의존성 변경과 peer/engine 경고를 검토하고 frozen lockfile 설치가 가능한 상태를 유지합니다. Node 실행 버전, `@types/node`, `packageManager`와 CI 환경의 계약도 함께 확인합니다.

GitHub Actions는 릴리스와 대응 관계를 확인한 전체 commit SHA에 고정하고 버전 주석을 함께 갱신합니다. tag만으로 바꾸거나, 새 버전이 요구하는 runtime/input/권한 변경을 확인하지 않은 채 SHA만 교체하지 않습니다. 메타데이터 전용 workflow의 읽기 전용 권한과 PR 코드를 실행하지 않는 경계를 유지합니다.

[Dependabot 설정](../.github/dependabot.yml)은 다음 원칙을 따릅니다.

- 일반 버전 확인은 매일 수행합니다. 호환되는 npm minor/patch는 한 그룹, Actions 버전 업데이트는 한 그룹으로 모아 중복 설치·빌드·브라우저 실행을 줄입니다. npm major는 개별 호환성을 검토합니다.
- 보안 업데이트는 일반 버전 업데이트와 구분한 그룹으로 처리합니다. dependency graph, Dependabot alerts, security updates의 원격 활성 상태도 확인합니다. 저장소 YAML만으로 이 설정이나 알림 상태를 증명하지 않습니다.
- 일반 버전 PR 상한은 npm 3개, Actions 2개로 유지합니다. 상한은 오래된 PR을 방치할 이유가 아니며 보안 알림 조회를 대신하지 않습니다.
- ignore는 아래에 기록한 런타임/API 제약의 major 업데이트에만 한정합니다. fixed version이나 전체 패키지를 영구 제외하지 않습니다. major 제외가 필요한 보안 수정까지 가릴 가능성을 검토하고, 다음 유지보수 때 제외 필요성을 다시 판단합니다.

봇 PR의 무검토 자동 머지는 사용하지 않습니다. CI/타입/가드레일을 끄거나 보안 알림을 무시하는 설정으로 업데이트 큐를 없애지 않습니다. 공개 저장소의 표준 runner에서도 중복 실행과 artifact 보관을 줄이는 [테스트 비용 정책](testing.md#github-free-사용량)을 유지합니다.

## 검증과 완료 조건

1. 변경 범위의 diff와 릴리스 정보를 검토하고 로컬에서 `pnpm check` 정적 검사를 수행합니다. 전체 단위·가드레일·E2E·build를 로컬에서 반복하지 않습니다. 필요한 결함 재현만 좁힌 범위로 실행합니다.
2. 호환되는 업데이트를 한 변경으로 모아 푸시하고 최신 PR head에 해당하는 Actions 결과를 확인합니다. Actions의 quality job이 만든 production bundle 하나를 `core`/`samples`가 공유하며 기존 2-job/2-worker 정책을 유지합니다.
3. CI가 실패하면 해당 실행의 로그와 artifact로 원인을 수정하고 다시 푸시합니다. 코드/설정 문제를 해결하지 않은 반복 재실행이나 검사 약화로 통과시키지 않습니다. 일시적인 runner/서비스 장애가 확인된 경우에만 같은 SHA를 재실행합니다.
4. 머지 범위가 승인된 작업은 PR CI 확인 후 머지하고, **머지 후 최신 원격 `main` SHA에 대한 CI 성공까지 확인**합니다. 직접 `main`에 푸시한 경우도 최종 push SHA가 기준입니다. PR의 성공이나 이전 `main`의 성공은 최종 커밋의 성공을 대신하지 않습니다. 경로 필터 때문에 실행이 없더라도 의존성 유지보수의 최종 `main` 검증이 필요하면 그 ref에서 CI를 수동 실행합니다.
5. 완료 직전에 최신 SHA를 다시 조회하고 실행의 `headSha`, branch, event, conclusion을 대조합니다. 필수 quality/두 브라우저 job이 모두 성공한 실행 링크와 SHA, 처리한 PR, 보류 항목을 보고합니다. 다른 push가 생겼으면 새 최신 SHA를 확인합니다. 실패·진행 중·취소·실행 없음은 성공으로 보고하지 않습니다.

원격 권한, 서비스 장애 등으로 완료할 수 없으면 마지막 확인 SHA/실행과 차단 사유, 다음 확인 조건을 남깁니다. 보류 기록이 있어도 미완료 CI를 완료로 표현하지 않습니다. 사용자가 이번 작업의 커밋/푸시/머지를 금지했다면 그 범위를 지키고 원격 검증 미실행을 명확히 구분합니다.

## 임시 보류 기록

아래는 2026-11-04에 검토한 호환성 제약입니다. 영구 제외 목록이 아니며 **다음 의존성 유지보수 세션 또는 관련 보안 알림 발생 시** 다시 확인합니다. 보류 중인 버전에 취약점이 발견되면 지원 버전의 수정 릴리스를 우선 확인하고, major만 수정된 경우 마이그레이션과 대안을 즉시 검토합니다.

| 대상                                                                                | 이유와 범위                                                                                                                                                                                                            | 재검토·해제 조건                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`@types/node` 26 / PR #7](https://github.com/cha2hyun/boilerplate/pull/7)          | CI와 개발 기준은 Node 24이며 `@types/node` 24를 유지합니다. 더 새 런타임의 타입으로 실제 기준에 없는 API가 허용되지 않도록 해당 패키지의 major 버전 업데이트를 일시 제외합니다. Node 24 계열의 수정은 계속 검토합니다. | 다음 유지보수 때 Node 기준을 확인합니다. 런타임 기준 상향 시 `.nvmrc`, CI, engine 범위와 타입을 함께 검증하고 제외를 제거합니다. 관련 보안 알림이나 지원 정책 변경도 재검토 조건입니다.                                                                                  |
| [`@tanstack/react-table` 9 / PR #9](https://github.com/cha2hyun/boilerplate/pull/9) | 기존 shadcn 테이블과 `useReactTable` v8 API를 사용하므로 major 버전 업데이트를 일시 제외합니다. 정렬·필터·페이지 이동·선택 등 사용 중인 계약의 마이그레이션 확인이 필요합니다. v8 범위의 수정은 계속 검토합니다.       | 다음 유지보수 때 v9 마이그레이션과 shadcn의 호환 API를 확인합니다. 사용 중인 테이블 흐름을 이전하고 Actions로 검증할 수 있으면 제외를 제거합니다. 관련 보안 알림이나 React Compiler 도입 시에도 [ADR 001](adr/001-tanstack-table-react-compiler.md)과 함께 재검토합니다. |

## 보안 대응 기록: 2026-11-04

저장소 관리자가 추적하며 다음 유지보수 또는 관련 advisory 변경 때 다시 확인합니다. 아래는 당시 조사 기록이며 현재 알림 목록은 원격에서 다시 조회해야 합니다.

- **minimatch / GHSA-g3hv-75wg-m249:** 공격자가 제어한 glob 패턴의 과도한 확장 문제입니다. ESLint/config-array, typescript-eslint 및 shadcn CLI의 ts-morph를 통해 개발·CI 도구에 도달합니다. 상위 패키지가 아직 10.2.6을 요구하고 10.x 패치가 없어 `pnpm-workspace.yaml`에서 정확히 `minimatch@10.2.6`만 **11.0.4**로 교체합니다. Node 24/CJS/ESM을 지원하며 실제 소비자가 v11에서 제거된 makeRe/AST API를 사용하지 않음을 확인했습니다. 패턴 처리 변경은 정적 검사·shadcn MCP 확인·CI로 검증합니다. 상위 패키지가 수정 버전을 직접 선택하면 override를 제거하고 lockfile을 다시 검증합니다. [공식 변경 사항](https://github.com/isaacs/minimatch/blob/v11.0.4/changelog.md), [수정 커밋](https://github.com/isaacs/minimatch/commit/77a0f5c4b80bdc641c3c930a1d9edf5ad2db57f8).
- **deepmerge / GHSA-gcqx-w48m-w2h4 / CVE-2026-93753:** shadcn CLI/registry의 전이 의존성 4.3.1을 유지합니다. 발급기관 VulnCheck는 **2026-11-02에 CVE를 REJECTED**로 변경했고, 보안 취약점을 기술하지 않는다고 명시했습니다. GitHub advisory 반영 지연으로 남은 해당 알림만 `inaccurate`로 정리하며 라이브러리를 다운그레이드하거나 임의 패치하지 않습니다. 새 advisory나 거절 상태 변경 시 재조사합니다. [공식 CVE 기록](https://github.com/CVEProject/cvelistV5/blob/main/cves/2026/93xxx/CVE-2026-93753.json), [CVE API](https://cveawg.mitre.org/api/cve/CVE-2026-93753).

설정 옵션과 그룹의 의미는 [GitHub 공식 Dependabot 옵션](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)을 참고합니다. 이 정책이 상시 실행되는 별도 에이전트나 무인 머지 서비스를 뜻하지는 않습니다.

## 2026-11-06 패치 검토

- [Dependabot #40](https://github.com/cha2hyun/boilerplate/pull/40): `pnpm/action-setup` 6.1.1의 [공식 릴리스](https://github.com/pnpm/action-setup/releases/tag/v6.1.1)는 native bootstrap과 cache 디렉터리 처리를 수정합니다. annotated `v6.1.1` 태그가 가리키는 commit `73e46992e05b19abd31f2f3c20e0e7370d762115`, `node24` runtime, 기존 입력/읽기 권한 유지 여부를 확인했습니다. 프로젝트 pnpm은 계속 `packageManager`가 고정한 11.25.0입니다.
- [Dependabot #41](https://github.com/cha2hyun/boilerplate/pull/41): Query·ESLint plugin·Query Devtools 5.105.3은 [취소된 retry의 뒤늦은 pause](https://github.com/TanStack/query/commit/3f4de1b40cce4314f7572b515ad8fd26dd85fe04)와 [데이터 없는 static query 판정](https://github.com/TanStack/query/commit/969e58019bf650fb17c273fddd0e8d2adf56d4d9) 등을 수정합니다. [Tailwind와 Vite plugin 4.3.4](https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.3.4)는 생성 CSS와 소스 탐색 수정입니다. PR의 두 package/lock 파일을 함께 반영했으며 frozen install을 확인했습니다. API·캐시·시각 결과는 최종 SHA의 quality/core/samples CI로 확인합니다.
- [Dependabot npm updater 로그](https://github.com/cha2hyun/boilerplate/actions/runs/42134946420)는 위 5개 패치 PR을 만들었으나 `vitest`/`@vitest/coverage-v8` 개별 갱신에서 strict peer 설치를 해결하지 못했습니다. 이 자동 업데이트 작업의 실패는 앱 CI 실패와 별개입니다. 이번 PR에 포함되지 않은 둘은 5.0.5로 같은 버전을 유지하며 다음 유지보수에서 호환되는 쌍을 함께 검토합니다. strict peer 정책을 끄거나 이 패키지의 미래 업데이트를 제외하지 않습니다.
