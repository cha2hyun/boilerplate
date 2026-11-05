# 새 제품으로 시작하기

저장소를 복제한 뒤 아래 항목으로 제품의 이름과 범위를 정리하세요. 실행 환경은 [README](../README.md), 서버 연결과 배포 검증은 [운영 전환](production-readiness.md)이 소유합니다. 기본 데모가 실행된다는 사실은 운영 연결의 완료 근거가 아닙니다.

- [ ] **이름과 문구:** `package.json`의 이름, README, `src/shared/lib/i18n/locales`의 앱 문구, `src/app/seo/metadata.ts`의 두 언어 제목/설명과 `og:site_name`, `public/site.webmanifest`의 이름을 제품에 맞게 바꾼다. 워크스페이스 기본 이름은 `src/features/workspace-preferences/model/store.ts`에 있다. 설정 초기화는 store가 반환하는 기본값을 사용하므로 화면에 기본값을 다시 적지 않는다. 관련 테스트의 기대 문구도 함께 갱신한다.
- [ ] **브랜드 자산:** `public/favicon.svg`와 `public/og/blueprint.svg`를 교체하고 `pnpm assets:generate`로 PNG/ICO를 재생성한다. 공유 이미지 이름을 바꾸면 생성 스크립트와 메타 registry의 경로도 바꾼다. 아이콘 크기와 연결 위치는 [SEO 가이드](seo.md)를 따른다.
- [ ] **저장 namespace:** `blueprint-theme`(`app/app.tsx`, theme provider 기본값), `blueprint-preferences`(workspace store), `blueprint-locale-preferences`(`shared/config/preference-keys.ts`, 언어 store와 오류 복구가 공유), `orbit.demo.projects.v1`(project demo adapter)를 제품 고유 키로 바꾼다. 같은 로컬 origin을 쓰는 다른 복제 앱의 데이터가 섞이지 않는지 확인한다. 이미 사용자가 있다면 키 교체 전 이전 값의 이관/폐기 정책을 정하고, 다른 앱의 저장소 전체를 지우지 않는다.
- [ ] **공개 환경 값:** `.env.example`을 바탕으로 환경별 `VITE_DATA_SOURCE`, `VITE_API_BASE_URL`, `VITE_SITE_URL`을 정한다. 운영 API는 `api` 모드로 연결하고 실제 공개 origin이 정해지면 `VITE_SITE_URL`을 설정한다. 이 값은 빌드 시 공개되므로 비밀을 넣지 않으며 변경 후 재빌드한다. [API 계약](api-contract.md)과 [공개 도메인 설정](seo.md#공개-도메인-설정)을 확인한다.
- [ ] **데모 범위:** 사용할 샘플 화면만 남긴다. 화면을 제거할 때 `src/app/routes`, 대응 page/widget/feature/entity, `widgets/app-shell/model/navigation.ts`, 두 언어 번역, 메타 registry, 관련 E2E를 함께 검토한다. 생성된 `routeTree.gen.ts`는 직접 편집하지 않고 `pnpm routes:generate`로 갱신한다. 사용하지 않는 seed, demo adapter, MSW 시작 코드/worker 자산은 실제 참조를 확인한 뒤 제거한다. 남긴 데모는 계속 샘플임을 표시한다.
- [ ] **원격 main 보호:** 첫 PR 검사 성공 후 `CI Gate`와 `Conventional PR title`을 GitHub Actions 제공 필수 검사로 지정하고 관리자 포함·최신 base 반영·PR 병합을 요구한다. 포크로 보호 설정이 복사됐다고 가정하지 않고 [CI Gate 설정](ci-gate.md)을 확인한다.
- [ ] **검증과 운영 연결:** 단위 테스트는 `scripts/unit-test-categories.ts`의 정확히 한 범주에 배정한다. 남긴 E2E 파일은 `package.json`의 `test:e2e:core` 또는 `test:e2e:samples` 중 한 곳에만 등록한다. 로컬 `pnpm check`와 해당 커밋의 Actions 결과를 확인하고 [운영 전환 체크리스트](production-readiness.md)를 이어서 수행한다. 전체 테스트/빌드의 실행 위치는 [테스트 정책](testing.md)을 따른다.

제품명 변경 후 `rg -n 'Blueprint|blueprint|orbit\.demo|Acme Studio' src public scripts package.json README.md`로 남은 참조를 검토하세요. 라이선스 고지나 의도적으로 보존한 샘플은 이유를 남기며, 검색 결과를 무조건 일괄 치환하지 않습니다.
