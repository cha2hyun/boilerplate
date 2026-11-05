# 미저장 입력 보호

Settings의 일반 설정 초안과 프로젝트·주문·고객 편집창의 생성·수정 입력을 보호합니다. 임시 폼 상태는 해당 화면이 소유하고, 공통 이동 판정은 [`useUnsavedChanges`](../src/shared/hooks/use-unsaved-changes.ts), 확인 UI는 기존 shadcn AlertDialog를 조합한 [`UnsavedChangesDialog`](../src/shared/ui/unsaved-changes-dialog.tsx)가 소유합니다. feature 간 import나 별도 UI 라이브러리는 추가하지 않습니다.

## 보호 범위

| 상태                                 | 앱 내부 이동 | 편집창 닫기                                    | 새로고침·탭 닫기   |
| ------------------------------------ | ------------ | ---------------------------------------------- | ------------------ |
| 변경 없음·원래 값으로 복원·저장 성공 | 즉시 허용    | 즉시 허용                                      | 경고 없음          |
| 미저장 변경                          | 폐기 확인    | 취소·Escape·바깥 클릭·닫기 버튼 모두 폐기 확인 | 브라우저 기본 경고 |
| 폼 저장 중                           | 차단         | 차단, 취소/저장 비활성화, 닫기 버튼 숨김       | 브라우저 기본 경고 |

앱 내부 탐색에는 사이드바, 명령 팔레트, Router 이동, 브라우저 뒤로/앞으로가 포함됩니다. Router가 관리하는 탐색을 우회하는 `ignoreBlocker`를 입력 보호 흐름에서 사용하지 않습니다. 확인창의 **계속 편집**과 Escape는 이동을 취소하고 입력을 유지합니다. 확인창 바깥 클릭은 폐기를 승인하지 않습니다. **변경 사항 버리기**만 해당 요청을 진행하며 저장소에 초안을 쓰지 않습니다. 확인창이 열린 동안 들어오는 추가 요청은 거절해 처음 선택한 목적지를 바꾸지 않습니다. 다른 폼의 blocker를 우회하지 않습니다.

Settings는 현재 이름·compact 값과 저장된 설정을 비교합니다. 검증 오류가 있는 입력도 보호하며, 저장·초기화 후에는 즉시 해제합니다. 외관·언어·통화는 즉시 적용되는 별도 설정이므로 일반 폼의 dirty 상태에 포함하지 않습니다. 확인 취소 시 이름 입력으로 초점을 복구하고, 외관 탭 때문에 입력이 없으면 일반 탭으로 복구해 키보드로 초안을 다시 열 수 있게 합니다.

ProjectEditor는 창을 연 시점의 이름·설명·상태와 입력을 비교합니다. 새 창의 빈 값과 기본 상태는 clean입니다. 저장 대기 여부는 dirty와 독립적으로 보호합니다. 실패하면 입력과 오류를 유지하며, 응답 손실 등으로 실제 저장 여부를 모르는 기존 mutation 재조회·안내 계약을 보존합니다. 성공한 저장만 보호를 해제하고 창을 닫습니다. 폐기한 창을 다시 열면 기존 저장 값 또는 새 프로젝트 기본값에서 시작합니다. 확인 취소 시 이름 입력으로 초점을 복구하고, 편집창 자체가 닫힐 때는 기존 열기 버튼/표 초점 복구를 유지합니다.

주문·고객 편집창도 같은 보호 계약을 적용합니다. 주문은 고객 정보·날짜·상태·배송지·상품·금액 입력, 고객은 프로필 입력의 변경을 비교합니다. 유효하지 않은 입력도 버리지 않으며 저장 성공만 보호를 해제합니다. 삭제 확인창은 입력 초안이 없지만 요청 중 중복 삭제와 닫기를 막습니다.

## 공통 구현 계약

`useUnsavedChanges({ dirty, pending, focusRef, fallbackFocusRef })`는 안정적인 `requestLeave(): Promise<boolean>`와 `dialogProps`, 성공 시 동기 해제용 `markSaved()`를 제공합니다. `pending`과 `fallbackFocusRef`는 선택 사항입니다. `requestLeave`가 `true`인 경우에만 호출자가 로컬 닫기 동작을 실행합니다. 저장 성공 경로는 `markSaved()` 후 닫아서 다음 React 커밋 이전의 오래된 dirty 값으로 확인창이 열리지 않도록 합니다.

앱 탐색은 TanStack Router의 `useBlocker({ shouldBlockFn, enableBeforeUnload })`를 사용합니다. `shouldBlockFn`은 같은 확인 Promise를 사용하며 `enableBeforeUnload`는 현재 dirty/pending을 명시적으로 확인합니다. 별도 `beforeunload` listener를 중복 설치하지 않습니다. 미해결 확인은 폼이 unmount되거나 clean으로 바뀌면 취소로 종료하며, blocker 등록은 Router hook이 해제합니다.

새로고침·탭 닫기는 브라우저 기본 확인이므로 앱 문구, 버튼, 초점 흐름을 재정의할 수 없습니다. 사용자 상호작용 유무와 브라우저 정책에 따라 표시되지 않을 수 있으며 모바일 앱 강제 종료까지 보장하지 않습니다. 초안을 자동 저장·복원하지 않으며, 실제 종료가 승인되거나 브라우저가 종료되면 미저장 입력은 사라집니다. 이 기능은 저장 성공을 보장하거나 실패한 요청을 자동 재전송하지 않습니다.

공식 API 근거: [TanStack navigation blocking](https://tanstack.com/router/latest/docs/framework/react/guide/navigation-blocking), [useBlocker options](https://tanstack.com/router/latest/docs/framework/react/api/router/useBlockerHook).

## 검증 근거

- [공통 hook 테스트](../src/shared/hooks/use-unsaved-changes.test.tsx): 실제 memory router의 이동, 중복 요청, 확인 Promise 정리, 여러 blocker 보존.
- [Settings 테스트](../src/pages/settings/ui/settings-page.test.tsx): 초안 유지/폐기, compact 변경과 원복, clean·저장·초기화 이후 이동, 숨겨진 일반 탭의 초점 복구.
- [ProjectEditor 테스트](../src/features/project-editor/ui/project-editor-dialog.test.tsx): clean/dirty 닫기, 재진입 초기화, 원복, 실제 Query/HTTP 경계의 대기·성공·응답 손실. 저장 중 clean 폼도 이동을 막습니다.
- [입력 보호 E2E](../e2e/unsaved-changes.spec.ts): `keeps settings drafts when navigation is cancelled and discards only on confirmation`, `protects settings against browser history and reload without trapping a saved form`, `protects project drafts for Escape, cancel, outside click and close while retaining focus`.

[주문·고객 E2E](../e2e/commerce.spec.ts)는 주문 편집의 폐기 취소, 고객 저장 거부와 응답 손실에서 입력 보존, 실제 HTTP 저장 후 새로고침 지속성을 검증합니다.

설치된 memory history의 back/forward는 browser history의 POP blocker 구현을 실행하지 않으므로 단위 테스트의 PUSH/REPLACE 검증을 실제 브라우저 뒤로/앞으로 검증으로 설명하지 않습니다. 네이티브 종료 확인과 실제 포인터/키보드·초점 흐름은 E2E 범위입니다. 실행 위치와 범위는 [테스트 정책](testing.md)을 따릅니다.
