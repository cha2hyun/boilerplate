# Settings

<!-- page-route: /settings -->

## 목적과 범위

브라우저의 워크스페이스 이름·탐색 밀도·테마를 설정합니다. 서버 계정 설정, 조직 관리, 권한, 청구 기능이 아닙니다. 브라우저 저장을 사용할 수 없을 때의 지속성 한계는 공통 저장 구현을 따릅니다.

## 정보 구조와 주요 행동

PageHeader → 일반/외관 탭입니다. 일반에는 이름 입력·compact 탐색 스위치·초기화·저장, 외관에는 테마 선택이 있습니다. 일반 폼 저장이 주 행동이며 테마는 선택 즉시 반영합니다. [화면 조합](../design/compositions.md)의 설정 폼 구조입니다.

설정 진입은 사이드바 Resources 그룹의 Settings 메뉴를 사용합니다. 하단에 같은 경로로 이동하는 프로필·워크스페이스 영역을 중복 표시하지 않습니다.

## 조회·조작 계약

- 일반 입력은 로컬 초안입니다. 저장 전에는 전역 이름/밀도를 바꾸지 않으며 변경이 없으면 저장이 비활성화됩니다. 저장은 스키마 검증과 정규화를 거쳐 전역 설정에 반영합니다.
- 일반 초기화는 저장된 이름·밀도와 현재 폼을 함께 구성된 기본값으로 돌리고 오류를 지웁니다. 테마·언어·통화를 초기화하지 않습니다.
- 저장하지 않은 이름·밀도가 있으면 앱 이동과 뒤로/앞으로에서 폐기를 확인하고, 새로고침·탭 닫기는 브라우저 기본 경고를 사용합니다. 계속 편집하면 초안을 유지하고 이름 입력 또는 일반 탭으로 초점을 복구합니다. clean·원복·저장·초기화 후에는 경고하지 않습니다. 자동 초안 복원은 없으며 [미저장 입력 보호 계약](../unsaved-changes.md)을 따릅니다.
- 테마는 별도 저장 없이 즉시 적용·지속합니다. 일반 폼 저장과 묶지 않습니다. 탭은 URL에 보존되지 않으며 페이지 재진입 시 초안도 새로 초기화됩니다. 내보내기는 없습니다.

## 상태별 화면

서버 Query가 없어 최초 로딩·재조회·네트워크 오류·빈 목록 상태는 없습니다. 이름 검증 실패는 입력에 연결된 오류로 설명하고 입력을 유지합니다. 저장/초기화 성공은 토스트로 알립니다. 저장은 로컬 동기 갱신이므로 네트워크 저장 중 상태를 가장하지 않습니다. 저장소 사용 불가 시 메모리 대체 동작이므로 성공 토스트를 서버 저장 성공으로 설명하지 않습니다.

## 반응형 동작

| 구간                | 배치·스크롤·초점                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 모바일 `< 768px`    | 한 열 폼과 세로 테마 선택. 작은 화면에서는 저장/초기화를 같은 너비로 세로 배치하며 입력·도움말·오류와 함께 도달 가능해야 합니다. |
| 태블릿 `768–1279px` | 제한된 본문 폭의 폼, 테마 선택 3열입니다.                                                                                        |
| PC `≥ 1280px`       | 동일한 최대 폭을 유지해 폼이 불필요하게 넓어지지 않습니다.                                                                       |

긴 번역과 이름에서도 설명/오류를 잘라내지 않고 스위치와 저장 버튼을 밀어내지 않습니다. [긴 콘텐츠](../design/content-overflow.md)를 따릅니다.
320px 영어와 200% 텍스트에서도 저장/초기화 문구와 테마 설명을 줄바꿈해 버튼 전체를 카드 안에 유지합니다.

## 상태 소유권과 구현 근거

- URL/Query: [라우트](../../src/app/routes/settings.tsx)는 페이지별 조회 조건과 Query를 만들지 않습니다.
- 영구 설정: [preferences store와 스키마](../../src/features/workspace-preferences/model/store.ts), [저장 경계](../../src/shared/lib/preference-storage.ts), [theme provider](../../src/app/providers/theme-provider.tsx).
- 임시 상태: [화면](../../src/pages/settings/ui/settings-page.tsx)의 이름·밀도 초안과 오류, Tabs의 선택. 이름과 밀도의 기본값은 store만 소유합니다.
- 탐색 보호: [공통 hook](../../src/shared/hooks/use-unsaved-changes.ts)과 [AlertDialog 조합](../../src/shared/ui/unsaved-changes-dialog.tsx). Router가 앱 이동과 브라우저 종료 경고 등록을 소유합니다.

저장한 워크스페이스 이름은 [앱 셸](../../src/widgets/app-shell/ui/app-shell.tsx)의 첫 탐색 그룹 제목에 즉시 반영됩니다. 접힌 탐색 레일에서는 그룹 제목과 그 공간을 함께 접으며, 펼치거나 모바일 탐색을 열면 긴 이름도 줄바꿈해 전체를 확인합니다. 전환 중에는 이름의 줄바꿈 폭을 유지하여 숨은 문구가 메뉴를 밀어내지 않습니다. 아이콘 기준선·행 높이와 빠른 반전·움직임 줄이기는 [사이드바 모션 계약](../design/motion.md)을 따릅니다. 하단 프로필·전환 블록은 추가하지 않습니다.

## 수용 기준

- 검증·저장·새로고침·초기화와 실제 사이드바 이름 반영: [workspace E2E](../../e2e/workspace.spec.ts)의 `validates, saves and resets workspace preferences across reloads`.
- 초기화 후 폼과 저장 값 일치, 미저장 변경 없음: [설정 테스트](../../src/pages/settings/ui/settings-page.test.tsx)의 `resets the form and persisted store to configured defaults without leaving unsaved changes`.
- 초안 유지·폐기·원복·저장 이후 해제와 일반 탭 초점 복구: 같은 설정 테스트의 `settings unsaved input`. 실제 앱 탐색과 브라우저 기록·새로고침: [입력 보호 E2E](../../e2e/unsaved-changes.spec.ts)의 `keeps settings drafts when navigation is cancelled and discards only on confirmation`, `protects settings against browser history and reload without trapping a saved form`.
- 테마 지속과 shell 유지: [workspace E2E](../../e2e/workspace.spec.ts)의 `persists the theme and keeps the shell stable through command palette navigation`. 저장 경계의 복구는 [store 테스트](../../src/features/workspace-preferences/model/store.test.ts)를 확인합니다.
- 작은 화면과 확대 텍스트의 버튼 경계·키보드 도달: 같은 workspace E2E의 `keeps support-page actions, tabs, and example text within narrow content areas`.
