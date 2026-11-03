# Dependabot 정리와 최신 main 검증

상태: 호환 수정·정적 검사 완료. 최종 PR 및 main CI 결과는 해당 Actions 실행에서 확인한다.

## 처리 범위

- 기존 PR #2–6, #8: Actions 네 패키지, Recharts 3.10.1, TypeScript 6.0.3을 최신 main 위에서 통합한다. 날짜 tooltip/legend와 TypeScript paths의 호환성을 함께 수정한다.
- 기존 PR #7, #9: Node 24 타입 기준과 shadcn Table v8 API를 유지한다. [유지보수 정책](../dependency-maintenance.md)의 임시 보류 근거·해제 조건을 기록하고 원본 PR을 정리한다.
- 의존성 그래프·Dependabot 보안 알림·보안 업데이트를 활성화한다. minimatch 보안 수정은 한 버전에 제한한 override로 적용하고, deepmerge는 공식 CVE 철회 근거에 따라 해당 오탐만 정리한다.
- 일반 업데이트는 매일 확인하며 호환 그룹을 구성한다. 보안 우선 처리와 완료 시 최신 원격 SHA 검증을 AI 진입 지침과 상세 문서에 연결한다.

## 검증과 전달

- `pnpm check`와 `pnpm check:mcp` 통과. 전체 로컬 unit/E2E/build는 실행하지 않았다.
- 기존 main `99b4c9f`의 [push CI](https://github.com/cha2hyun/boilerplate/actions/runs/41667749630)는 성공을 확인했다. 이것으로 새 업데이트의 성공을 대신하지 않는다.
- 새 PR head의 quality/core/samples 성공 후 머지하며, 최종 main push CI가 성공할 때까지 실패 원인을 수정한다.
- PR Title은 `pull_request_target`이므로 action pin은 머지 이후 PR 이벤트에서 새 기본 브랜치 버전의 실제 실행을 확인한다.
- 통합 반영 확인 후 원본 봇 PR을 닫고, 완료 직전에 열린 PR·보안 알림·최신 main SHA를 다시 확인한다.
