# 작업별 문서 지도

먼저 변경할 책임을 고르고 **해당 행의 문서와 실제 소유 코드만** 확인하세요. 이 문서는 탐색용입니다. 상세 규칙을 여기에 복제하지 않습니다.

| 작업                            | 시작 문서                                                       | 구현 소유 위치                                                                  |
| ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 새 제품 초기화·브랜드·데모 정리 | [새 제품 도입](new-project.md)                                  | 패키지 이름, 브랜드/메타, 저장 namespace, 환경, 샘플 코드                       |
| 레이어/새 기능 배치             | [아키텍처](architecture.md)                                     | `src/app`, `pages`, `widgets`, `features`, `entities`, `shared`                 |
| UI·레이아웃·폰트·문구           | [디자인 시스템](design-system.md) → 해당 주제                   | `src/shared/ui`, `src/app/styles/globals.css`, 해당 화면                        |
| 숫자·통화·비율·축약 표시        | [숫자 표시](number-formatting.md)                               | `src/shared/lib/format.ts`, `src/shared/lib/i18n`, 해당 표시 경계               |
| 언어·번역·표시 통화·환율        | [언어와 표시 통화](i18n.md)                                     | `src/shared/lib/i18n`, `src/entities/exchange-rate`, 앱 provider                |
| 로딩·skeleton·숫자 모션         | [로딩과 모션](loading-and-motion.md)                            | 해당 Query 소비 화면과 모션 기능                                                |
| 캐시·새로고침·mutation 반영     | [Query 캐시](query-cache.md)                                    | `src/entities/*/api`, QueryClient                                               |
| API·응답·데모 저장              | [API 계약](api-contract.md)                                     | `src/entities/*`, `src/shared/api`                                              |
| 테스트·CI·최소 로컬 재현        | [테스트 정책](testing.md)                                       | `package.json`, `e2e`, `.github/workflows`                                      |
| Dependabot·보안·버전 갱신       | [의존성 유지보수](dependency-maintenance.md)                    | `package.json`, `pnpm-lock.yaml`, `.github/dependabot.yml`, `.github/workflows` |
| 메타데이터·공유·아이콘          | [SEO](seo.md)                                                   | 메타 registry, HTML 생성, 브랜드 자산                                           |
| 실제 서비스 연결                | [운영 전환](production-readiness.md)                            | 환경 설정과 API 경계                                                            |
| 작업 순서·완료·커밋             | [AI 작업 흐름](ai-workflow.md), [기여 규칙](../CONTRIBUTING.md) | 해당 변경 범위                                                                  |

여러 레이어나 계약을 바꾸는 작업만 [계획 템플릿](plans/_template.md)을 사용합니다. 기존 결정의 이유가 필요할 때 [ADR](adr/)과 [리뷰](reviews/)를 읽습니다. 과거 계획/리뷰는 현재 구현의 증거가 아니므로 실제 코드를 확인합니다.

문서와 코드가 다르면 작업 범위 안에서 소유 문서를 고치고 중복된 규칙을 없앱니다. 외부 참고 자료는 설계 근거이며 저장소 경계나 사용자의 권한을 대체하지 않습니다.
