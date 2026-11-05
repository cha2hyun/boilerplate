# 페이지 기획 명세

페이지의 목적, 정보 순서, 조작 영향과 수용 기준은 이 폴더의 **페이지당 한 문서**에서 관리합니다. 구현 전 해당 명세를 갱신하고, 구현 후 실제 동작·소유 코드·검증 근거와 맞춥니다. 여러 페이지에 걸친 실행 순서는 [계획](../plans/_template.md)에 남기되 페이지 계약을 복제하지 않습니다.

| 경로           | 명세                          | 핵심 역할                             |
| -------------- | ----------------------------- | ------------------------------------- |
| `/`            | [Overview](overview.md)       | 워크스페이스 요약과 프로젝트 진입     |
| `/projects`    | [Projects](projects.md)       | 프로젝트 생성·조회·편집·삭제·내보내기 |
| `/analytics`   | [Analytics](analytics.md)     | 같은 기간의 방문 지표 비교            |
| `/orders`      | [Orders](orders.md)           | 주문 조회와 상세 확인                 |
| `/customers`   | [Customers](customers.md)     | 고객 조회와 프로필 확인               |
| `/inbox`       | [Inbox](inbox.md)             | 메모리 샘플 메시지 분류와 읽기        |
| `/settings`    | [Settings](settings.md)       | 브라우저 환경 설정                    |
| `/components`  | [Components](components.md)   | UI 구성 요소 체험                     |
| `/foundations` | [Foundations](foundations.md) | 디자인 원칙과 표시 방식 체험          |

## 작성과 변경

1. [템플릿](_template.md)을 복사하고 실제 라우트를 `<!-- page-route: /path -->`로 한 번 선언합니다. 기본 경로 `/`는 `overview.md`, 다른 경로는 경로 이름의 `.md`를 사용합니다. 중첩 경로는 `/`를 `-`로 바꾸고 이름 있는 동적 segment는 보존합니다. 예를 들어 `/projects/$projectId`는 `projects-$projectId.md`입니다. index 라우트의 마지막 `/`는 경로와 파일명에서 생략합니다.
2. 목적과 기능/데모 경계, 정보 순서, 각 조작의 영향·초기화·내보내기, 상태별 화면, 세 화면 구간, URL/Query/임시·영구 상태 소유권, 수용 기준을 작성합니다. 해당하지 않는 상태는 이유를 적습니다.
3. 기본값·Zod 타입·Query 키·색상값·번역 문자열은 복사하지 않고 실제 소유 파일에 연결합니다. [화면 조합](../design/compositions.md), [긴 콘텐츠](../design/content-overflow.md), [URL 상태](../url-state.md), [Query 캐시](../query-cache.md)를 공통 계약으로 사용합니다.
4. 수용 기준마다 기존 테스트 파일과 관련 시나리오 이름을 연결합니다. 자동 검사가 없는 행동은 수동 확인 또는 미검증으로 명시합니다. 이름을 적었다고 테스트가 그 문장 전체를 검증한다고 보지 않습니다.

## 경량 검사 범위

`node scripts/check-page-specs.mjs`는 Node 내장 모듈만 사용합니다. `src/app/routes`의 문자열 literal `createFileRoute` 선언과 명세의 1:1 대응, 정해진 섹션, 소유 코드·테스트의 실제 파일 링크, 이 폴더의 로컬 inline Markdown 링크 대상 존재와 저장소 내부 경로를 확인합니다. 일반 정적 경로와 이름 있는 동적 segment, index 마지막 `/`를 지원합니다. pathless layout·route group·splat 등 다른 라우트 관례는 조용히 건너뛰지 않고 지원 범위 갱신을 요구합니다. 링크는 `[이름](상대/경로)` 형식으로 쓰며 공백이 있는 경로는 `<상대 경로>` 또는 URL 인코딩을 사용합니다. 경로의 Markdown escape도 해석합니다. 코드 예시는 검사하지 않습니다.

자연어 의미, 테스트 시나리오 이름의 실행 여부, 링크의 앵커, 원격 URL, 화면 픽셀·접근성을 검증하지 않습니다. 참조식 링크로 구현 근거를 대신하지 않습니다. 검사기의 회귀 검사는 `node --test scripts/check-page-specs.test.mjs`이며 실제 화면 검증은 [테스트 정책](../testing.md)을 따릅니다.
