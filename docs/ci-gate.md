# CI Gate와 main 보호

`CI Gate`는 모든 PR과 main push에 생성되는 최종 검사입니다. 무거운 테스트 실행 여부와 최종 성공 조건을 분리해 문서 변경도 필수 검사를 끝낼 수 있게 합니다.

## 실행 계약

- `changes`는 전체 Git 이력을 읽고 PR은 merge base부터 head, push는 before부터 after까지 비교합니다. rename은 이전·이후 경로 모두 확인합니다.
- 루트 `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `THIRD_PARTY_NOTICES.md`와 `docs/` 아래 Markdown 파일만 변경됐을 때 문서 전용으로 판단합니다.
- 새 경로·설정·코드 변경, 빈 비교 결과, 이력 부족, 수동 실행은 전체 검사 대상입니다. 분류 실패는 성공으로 바꾸지 않습니다.
- 코드 변경은 quality의 정적·가드레일·단위·빌드·초기 JS 예산과 core/samples 브라우저 검사가 모두 성공해야 합니다. production 번들은 한 번 만들고 두 브라우저 job에서 공유합니다.
- 브라우저 테스트가 첫 실행에 실패하고 재시도에만 성공해도 CI는 실패합니다. `failOnFlakyTests`가 이를 강제하며 같은 실패 artifact에 trace·스크린샷·보고서를 남깁니다. 재시도 성공을 정상 성공으로 바꾸지 않습니다.
- 문서 전용 변경은 quality/browser를 생략하고, changes에서 앱 전체 설치 없이 정확한 Prettier 한 개로 변경 Markdown의 포맷, 루트/`docs`의 로컬 파일·Markdown 절 링크, 페이지 기획 누락·필수 항목을 검사한 뒤 gate를 실행합니다. 문서 삭제 시 변경되지 않은 문서의 끊긴 링크도 잡습니다. 코드 변경에서는 같은 검사를 `pnpm check`가 실행합니다.
- gate는 `always()`로 의존 job 종료 후 결과를 확인합니다. 코드 변경에서 실패·취소·skip·누락된 결과는 실패입니다. 문서 전용일 때만 두 무거운 job의 skip을 허용합니다.
- 수동 `all/core/samples` 결과는 `Manual CI result`로 표시합니다. 선택한 범주만 검증하며 PR의 `CI Gate`를 대신하지 않습니다.
- 같은 PR이나 main push의 새 실행은 같은 ref의 이전 자동 실행을 취소합니다. 수동 실행은 별도 그룹을 사용해 자동 검사를 보존하고, 같은 ref에서 같은 범주를 다시 요청했을 때만 이전 수동 실행을 취소합니다.

분류·gate 회귀 검사는 `scripts/ci-gate.test.mjs`가 소유합니다. 코드→문서 rename, 공백·줄바꿈 파일명, base에만 추가된 코드, 실패·취소·누락 등 실제 경계를 검사합니다.

## 포크 후 설정

Git 파일이나 fork 작업만으로 원격 main 보호가 설정되지 않습니다. 새 저장소에서 첫 PR의 `CI Gate`와 `Conventional PR title`이 성공한 후 저장소 관리자가 main의 보호 규칙에 다음을 설정합니다.

1. PR을 통한 병합과 상태 검사 통과를 요구합니다.
2. 필수 검사는 **CI Gate**, **Conventional PR title**입니다. 제공 앱은 실제 실행에서 확인한 **GitHub Actions**로 제한합니다.
3. 병합 전 최신 base 반영을 요구하고 관리자에게도 규칙을 적용합니다.
4. force push와 branch deletion을 허용하지 않습니다. 개인 개발 기본값에서 타인 승인 수는 0으로 두며 팀 리뷰 승인은 제품의 협업 정책에 맞게 추가합니다.
5. quality/browser 개별 job과 `Manual CI result`는 필수 상태로 등록하지 않습니다. 문서 전용과 수동 부분 실행의 의미가 다릅니다.

설정 뒤 코드 PR의 전체 성공, 문서 전용 PR의 가벼운 성공, 필수 검사 이름·제공 앱·관리자 적용 상태를 확인하세요. 실패를 통과시키려고 보호를 해제하거나 `--admin`으로 우회하지 않습니다. 기본 브랜치명을 바꾸면 workflow의 main push 조건과 보호 대상도 함께 바꿉니다.

현재 저장소의 적용 여부는 파일이 아닌 GitHub 설정/API로 확인합니다. 브랜치 보호 조회와 최종 커밋의 실행 링크를 작업 기록에 남기며, 권한이 부족하면 미적용 상태를 명확히 기록합니다.

[GitHub 필수 검사와 skip 처리](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks), [브랜치 보호 API](https://docs.github.com/en/rest/branches/branch-protection)를 따릅니다.

## 적용 기록

2026-11-05 `cha2hyun/boilerplate`의 main에 위 두 필수 검사를 GitHub Actions 제공 검사로 설정했습니다. 관리자 적용·최신 base 요구·PR 필수·승인 수 0·force push 및 삭제 차단을 API로 다시 확인했고, [PR #19](https://github.com/cha2hyun/boilerplate/pull/19)를 우회 없이 병합했습니다. 전체 검사와 문서 전용 검증 근거는 [작업 기록](plans/fork-readiness-contracts.md)을 따릅니다. 이 과거 기록으로 다른 포크나 현재 원격 설정을 추정하지 않습니다.
