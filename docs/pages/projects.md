# Projects

<!-- page-route: /projects -->

## 목적과 범위

프로젝트를 찾고 생성·편집·삭제하며 진행 상태를 관리합니다. 데모 모드의 변경은 브라우저 저장소에 남고 새로고침 후 복원됩니다. API 연결 경계는 있으나 현재 워크스페이스가 운영 인증·권한·공유 협업을 제공한다는 뜻은 아닙니다.

데모 모드의 PageHeader는 샘플 배지와 명시적인 데모 설명을 제공합니다. API 모드에서는 해당 데모 배지·설명을 사용하지 않습니다.

## 정보 구조와 주요 행동

PageHeader의 새 프로젝트 → 전체 프로젝트 요약(모바일 기본 접힘) → 조회 도구가 있는 표 → 페이지 도구 순서입니다. 프로젝트명을 누르면 읽기 전용 상세가 열립니다. 상세에서 **프로젝트 수정**을 선택하면 그 위에 편집 대화상자가 열립니다. 행 메뉴에는 수정·삭제 바로가기가 있습니다. 생성·편집은 검증된 폼으로 저장하고 삭제는 확인 대화상자에서 완료합니다. [화면 조합](../design/compositions.md)의 요약+관리 목록 구조를 따릅니다.

## 조회·조작 계약

- 검색은 이름·설명·담당자 이름/이메일, 상태 필터는 표의 행을 좁힙니다. 상단 요약은 전체 Query 데이터 기준으로 유지합니다. 검색·상태·정렬·페이지 크기 변경은 첫 페이지로 이동합니다.
- 초기화는 **검색·상태·페이지만** 되돌립니다. 정렬·정렬 방향·페이지 크기·표 보기 설정·행 선택은 유지합니다. 검색이나 상태 필터가 있을 때만 활성화됩니다.
- [프로젝트 상세 패널](../../src/widgets/project-table/ui/project-details-sheet.tsx)의 주소는 `/projects?detail=<프로젝트 ID>`입니다. 검색·필터·정렬·페이지는 유지합니다. 링크를 새 탭에서 열거나 새로고침해도 같은 상세를 표시하며, 전체 목록에서 ID로 찾으므로 현재 필터나 페이지 밖의 프로젝트도 확인할 수 있습니다.
- 상세에는 전체 이름과 설명, 상태, 진행률, 담당자, 수정일을 표시합니다. 편집을 저장하면 상세에 새 값이 표시되고, 취소하면 기존 상세로 돌아갑니다. 상세에서 연 편집창을 닫으면 수정 버튼, 상세를 닫으면 가능한 경우 원래 프로젝트명으로 초점이 복원됩니다.
- **보기 설정**에서 열 표시·순서·너비·왼쪽/오른쪽 고정과 행 간격(촘촘하게/기본/여유롭게)을 조절합니다. 머리글의 이동 핸들로 드래그하거나 키보드로 순서를 바꾸고, 열 경계에서 너비를 조절할 수 있습니다. 설정 창의 앞/뒤 이동·너비 입력도 같은 동작을 제공합니다. 선택·행 메뉴 열은 잠겨 있고 프로젝트명은 숨길 수 없습니다.
- 보기 설정은 `projects` 표 전용으로 이 브라우저에 저장되고 새로고침 후 복원됩니다. **기본값 복원**은 보기 설정만 되돌리며 URL 검색·필터·정렬·페이지와 행 선택을 유지합니다. Overview의 최근 프로젝트 표는 별도의 기존 요약 배치를 유지합니다. 실제 계정별 서버 저장이나 기기 간 동기화는 제공하지 않습니다.
- 행 선택은 임시 UI이며 프로젝트 ID로 관리합니다. 머리글 선택은 현재 페이지 행에 적용합니다.
- 내보내기는 현재 필터 안에 선택된 행이 있으면 그 행들, 없으면 현재 필터에 맞는 전체 행을 CSV로 만듭니다. 현재 페이지만 또는 보이는 열만 내보내는 기능이 아닙니다. CSV 필드는 고정이고 수식처럼 해석될 수 있는 셀은 안전하게 처리합니다. 로딩·최초 오류·빈 결과에서는 내보내기를 사용할 수 없습니다.
- 생성·수정 창의 이름·설명·상태가 창을 연 시점과 다르면 취소·Escape·바깥 클릭·닫기 버튼 및 앱 이동·뒤로/앞으로에서 폐기를 확인합니다. 계속 편집하면 입력과 이름 초점을 유지하며, 폐기 후 다시 열면 저장 값/새 프로젝트 기본값으로 시작합니다. 변경 없음·원복·저장 성공에는 확인하지 않습니다. 새로고침·탭 닫기 경고와 자동 저장이 없는 한계는 [미저장 입력 보호 계약](../unsaved-changes.md)을 따릅니다.

## 상태별 화면

최초 로딩은 요약과 표 skeleton, 최초 실패는 결측 요약과 표 오류/재시도입니다. 캐시 재조회 중 기존 행을 유지하고 재조회 실패는 표 설명의 오류와 재시도로 알립니다. 전체 빈 목록과 검색 결과 없음은 구분하고 필터 빈 결과에는 초기화를 제공합니다. 데이터가 성공적으로 도착한 뒤에만 범위 밖 페이지를 보정합니다. 저장 중 중복 제출을 막고, 실패하면 입력을 유지해 오류를 설명합니다. 편집 중 다른 탭에서 대상이 삭제되어 저장이 실패하면 초안과 오류를 편집창에 유지합니다. 상세만 열려 있으면 조회 성공 후 없는 ID에 대해 안내하고 목록으로 돌아갈 수 있게 합니다.

저장 중에는 dirty 여부와 무관하게 창 닫기와 앱 이동을 차단하고 브라우저 종료 경고를 유지합니다. 실패·저장 결과 불확실 상태에서 입력을 자동 폐기하거나 요청을 자동 재전송하지 않습니다. 기존 mutation 재조회와 오류 설명을 유지하고 성공한 저장 후에만 보호를 해제합니다.

## 반응형 동작

| 구간                | 배치·스크롤·초점                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 모바일 `< 768px`    | 전체 건수와 요약 펼치기 버튼을 먼저 표시하며 펼친 요약은 1열입니다. 도구 줄바꿈, 표 내부 가로/세로 스크롤. 짧은 화면에서도 폼의 오류·저장 버튼에 도달합니다. |
| 태블릿 `768–1279px` | 요약 3열, 필터·페이지 도구는 가능한 폭에 맞춰 줄바꿈합니다.                                                                                                  |
| PC `≥ 1280px`       | 요약 3열과 전체 폭 표, 행 메뉴·열 선택·내보내기를 함께 사용합니다.                                                                                           |

표의 가로 스크롤은 표 내부에 유지합니다. 고정한 열이 좁은 화면에서 본문을 가리면 해당 화면의 고정 표시를 해제하되 저장한 설정은 유지합니다. 행 간격을 바꿔도 로딩·오류·빈 결과의 바깥 viewport 크기를 유지합니다.

표에서 줄여 표시한 이름·설명·담당자는 상세 패널에서 줄바꿈해 전체 값을 표시합니다. 대화상자 종료 시 유효한 원래 버튼 또는 표로 초점을 복구합니다. [긴 콘텐츠](../design/content-overflow.md)를 따릅니다.

## 상태 소유권과 구현 근거

- URL: [라우트](../../src/app/routes/projects.tsx), [표 조회 스키마](../../src/widgets/project-table/model/search.ts). 타입·기본값·페이지 크기는 이 모델이 소유합니다.
- Query/저장: [프로젝트 Query와 mutation](../../src/entities/project/api/queries.ts), [데모 adapter](../../src/entities/project/api/demo.ts). Overview와 같은 캐시를 사용합니다.
- 임시 상태: [화면](../../src/pages/projects/ui/projects-page.tsx)의 생성 창, [표](../../src/widgets/project-table/ui/project-table.tsx)의 선택/편집·삭제, [편집 폼](../../src/features/project-editor/ui/project-editor-dialog.tsx). 조회 조건을 Zustand에 복제하지 않습니다.
- 보기 환경 설정: [공통 표 보기 기능](../../src/features/table-view/index.ts)이 열 설정·행 간격과 브라우저 저장을 소유합니다. 조회 조건과 서버 데이터는 저장하지 않습니다.
- 표 조합: [열 정의](../../src/widgets/project-table/ui/use-project-columns.tsx), [조회·내보내기 도구](../../src/widgets/project-table/ui/project-table-toolbar.tsx), [행·로딩·빈 상태](../../src/widgets/project-table/ui/project-table-viewport.tsx), [페이지 이동](../../src/widgets/project-table/ui/project-table-pagination.tsx), [CSV 변환·다운로드](../../src/widgets/project-table/lib/export-projects.ts). URL·선택·대화상자·초점 상태의 소유자는 기존 표 조합으로 유지합니다.

## 수용 기준

- 홈과 전체 목록에서 이름 선택 → 상세 → 수정 → 저장 또는 취소 후 상세 복귀를 확인합니다. 상세 URL을 직접 열고 새로고침해도 같은 프로젝트를 볼 수 있어야 합니다. [프로젝트 브라우저 검사](../../e2e/projects.spec.ts)

- 생성·수정·삭제와 새로고침 지속성: [프로젝트 E2E](../../e2e/projects.spec.ts)의 `validates, creates, edits and deletes a project with persistence across reloads`.
- 삭제 확인의 이름은 공백 없는 최대 80자도 줄바꿈하며 제목·설명·유지/삭제 버튼이 모달과 화면 안에 남습니다. 같은 CRUD E2E가 저장된 긴 이름과 삭제창의 가로 스크롤 너비·두 버튼의 전체 노출을 확인합니다.
- 검색·상태·초기화·열 표시: 같은 파일의 `searches owners and projects, filters status, resets empty results, and changes visible columns`. 선택 CSV: `paginates projects and exports only selected rows as a safe CSV`.
- 보기 설정의 새로고침 복원·기본값 복원·조회 조건 보존·Overview 독립성: 같은 파일의 `persists project table views and restores defaults without changing list queries`.
- 짧은 화면의 폼과 삭제된 대상 수정 오류: 같은 파일의 `keeps project validation and save controls reachable in a short viewport`, `keeps an edit open and explains the error when another tab deletes the project`.
- 닫기 경로별 폐기 확인과 초점: [입력 보호 E2E](../../e2e/unsaved-changes.spec.ts)의 `protects project drafts for Escape, cancel, outside click and close while retaining focus`. clean·원복·폐기 후 재진입·저장 중 이동 차단·성공 후 해제·응답 손실 오류 보존: [편집창 테스트](../../src/features/project-editor/ui/project-editor-dialog.test.tsx).
- URL 페이지가 최초 응답으로 초기화되지 않음: [표 테스트](../../src/widgets/project-table/ui/project-table.test.tsx)의 `keeps a restored page while loading and after a successful response`. 초기화의 보존 값 전체는 변경 시 코드와 함께 확인합니다.

- [접근성 E2E](../../e2e/accessibility.spec.ts)의 `keeps project summaries optional and management instructions complete at 200% text`는 모바일 요약의 기본 접힘·펼치기와 320px 한국어/412px 영어 200% 글꼴에서 목록 설명·결과 수 전체 표시를 확인합니다. 검색 필터와 행 선택 후에도 설명·검색·상태·내보내기·초기화·보기 컨트롤 전체가 카드 좌우 경계 안에 있어야 합니다. 목록 안내와 페이지 도구는 최소 높이만 유지하고 필요한 만큼 줄바꿈합니다.
