# Settings

<!-- page-route: /settings -->

## 목적과 범위

브라우저의 워크스페이스 이름·탐색 밀도·테마를 설정합니다. 서버 계정 설정, 조직 관리, 권한, 청구 기능이 아닙니다. 브라우저 저장을 사용할 수 없을 때의 지속성 한계는 공통 저장 구현을 따릅니다.

## 정보 구조와 주요 행동

PageHeader → 일반/외관 탭입니다. 일반에는 이름 입력·compact 탐색 스위치·초기화·저장, 외관에는 테마 선택이 있습니다. 일반 폼 저장이 주 행동이며 테마는 선택 즉시 반영합니다. [화면 조합](../design/compositions.md)의 설정 폼 구조입니다.

## 조회·조작 계약

- 일반 입력은 로컬 초안입니다. 저장 전에는 전역 이름/밀도를 바꾸지 않으며 변경이 없으면 저장이 비활성화됩니다. 저장은 스키마 검증과 정규화를 거쳐 전역 설정에 반영합니다.
- 일반 초기화는 저장된 이름·밀도와 현재 폼을 함께 구성된 기본값으로 돌리고 오류를 지웁니다. 테마·언어·통화를 초기화하지 않습니다.
- 테마는 별도 저장 없이 즉시 적용·지속합니다. 일반 폼 저장과 묶지 않습니다. 탭은 URL에 보존되지 않으며 페이지 재진입 시 초안도 새로 초기화됩니다. 내보내기는 없습니다.

## 상태별 화면

서버 Query가 없어 최초 로딩·재조회·네트워크 오류·빈 목록 상태는 없습니다. 이름 검증 실패는 입력에 연결된 오류로 설명하고 입력을 유지합니다. 저장/초기화 성공은 토스트로 알립니다. 저장은 로컬 동기 갱신이므로 네트워크 저장 중 상태를 가장하지 않습니다. 저장소 사용 불가 시 메모리 대체 동작이므로 성공 토스트를 서버 저장 성공으로 설명하지 않습니다.

## 반응형 동작

| 구간                | 배치·스크롤·초점                                                                |
| ------------------- | ------------------------------------------------------------------------------- |
| 모바일 `< 768px`    | 한 열 폼과 세로 테마 선택. 입력·도움말·오류·저장/초기화가 도달 가능해야 합니다. |
| 태블릿 `768–1279px` | 제한된 본문 폭의 폼, 테마 선택 3열입니다.                                       |
| PC `≥ 1280px`       | 동일한 최대 폭을 유지해 폼이 불필요하게 넓어지지 않습니다.                      |

긴 번역과 이름에서도 설명/오류를 잘라내지 않고 스위치와 저장 버튼을 밀어내지 않습니다. [긴 콘텐츠](../design/content-overflow.md)를 따릅니다.

## 상태 소유권과 구현 근거

- URL/Query: [라우트](../../src/app/routes/settings.tsx)는 페이지별 조회 조건과 Query를 만들지 않습니다.
- 영구 설정: [preferences store와 스키마](../../src/features/workspace-preferences/model/store.ts), [저장 경계](../../src/shared/lib/preference-storage.ts), [theme provider](../../src/app/providers/theme-provider.tsx).
- 임시 상태: [화면](../../src/pages/settings/ui/settings-page.tsx)의 이름·밀도 초안과 오류, Tabs의 선택. 이름과 밀도의 기본값은 store만 소유합니다.

## 수용 기준

- 검증·저장·새로고침·초기화: [workspace E2E](../../e2e/workspace.spec.ts)의 `validates, saves and resets workspace preferences across reloads`.
- 초기화 후 폼과 저장 값 일치, 미저장 변경 없음: [설정 테스트](../../src/pages/settings/ui/settings-page.test.tsx)의 `resets the form and persisted store to configured defaults without leaving unsaved changes`.
- 테마 지속과 shell 유지: [workspace E2E](../../e2e/workspace.spec.ts)의 `persists the theme and keeps the shell stable through command palette navigation`. 저장 경계의 복구는 [store 테스트](../../src/features/workspace-preferences/model/store.test.ts)를 확인합니다.
