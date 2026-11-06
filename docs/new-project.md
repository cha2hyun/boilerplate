# 새 제품으로 시작하기

포크한 저장소에서 [실행 안내](../README.md#실행)에 따라 의존성을 설치하고 기본 데모를 띄웁니다. 이어서 새 제품의 첫 업무를 다음 세 문장으로 정하세요.

1. **담당자와 목적** — 누가 어떤 상황에서 어떤 일을 끝내는가?
2. **업무 레코드** — 목록의 한 행은 무엇이며 어떤 식별자·필드·상태를 갖는가?
3. **완료 기준** — 어느 주소에서 어떤 변경을 일으키고 재조회했을 때 무엇이 보여야 하는가?

이 답으로 새 entity·feature·page를 하나씩 만든 뒤 라우트·메뉴·메타·번역·테스트를 함께 연결합니다. [설비 점검 앱으로 교체하는 실습](examples/minimal-admin.md)은 새로운 도메인의 목록 조회와 변경 한 건을 처음부터 연결하고, 이후 어떤 샘플을 없애는지 보여줍니다. 제품별 API·인증·배포 수용 기준은 [운영 전환](production-readiness.md)에서 확인하세요.

## 제품 설정 체크리스트

- [ ] **이름과 문구:** `package.json`의 이름, README, `src/shared/lib/i18n/locales`의 앱 문구, `src/app/seo/metadata.ts`의 두 언어 제목/설명과 `og:site_name`, `public/site.webmanifest`의 이름을 제품에 맞게 바꾼다. 앱 이름·워드마크·작성자·저장소/문서 링크·워크스페이스 기본 이름은 `src/shared/config/product.ts`의 `product`에서 바꾼다. 셸과 페이지 메타데이터는 이 구성을 사용한다. 번역의 제품 설명, Foundations 예제와 정적 manifest/SVG는 실제 제품 내용에 맞게 별도로 검토한다. 설정 초기화는 store가 반환하는 기본값을 사용하므로 화면에 기본값을 다시 적지 않는다. 관련 테스트의 기대 문구도 함께 갱신한다.
- [ ] **브랜드 자산:** `public/favicon.svg`와 `public/og/blueprint.svg`를 교체하고 `pnpm assets:generate`로 PNG/ICO를 재생성한다. 공유 이미지 이름을 바꾸면 생성 스크립트와 메타 registry의 경로도 바꾼다. 아이콘 크기와 연결 위치는 [SEO 가이드](seo.md)를 따른다.
- [ ] **저장 namespace:** `src/shared/config/product.ts`의 `storageKeys`에 테마, 워크스페이스/언어 환경 설정, 프로젝트·주문·고객·구성원 데모와 탭 세션 키가 있다. 포크는 저장 키를 제품 고유 namespace로 바꾼다. 원본의 기존 키 값(`blueprint-theme`, `blueprint-preferences`, `blueprint-locale-preferences`, `orbit.demo.projects.v1`, `orbit.demo.orders.v1`, `orbit.demo.customers.v1`)은 호환성을 위해 유지한다. 같은 origin의 다른 복제 앱과 데이터가 섞이지 않는지 확인하며, 이미 사용자가 있으면 키 교체 전 이관/폐기 정책을 정한다. 다른 앱의 저장소 전체를 지우지 않는다.
- [ ] **공개 환경 값:** `.env.example`을 바탕으로 환경별 `VITE_DATA_SOURCE`, `VITE_API_BASE_URL`, `VITE_SITE_URL`을 정한다. 운영 API는 `api` 모드로 연결하고 실제 공개 origin이 정해지면 `VITE_SITE_URL`을 설정한다. 이 값은 빌드 시 공개되므로 비밀을 넣지 않으며 변경 후 재빌드한다. [API 계약](api-contract.md)과 [공개 도메인 설정](seo.md#공개-도메인-설정)을 확인한다.
- [ ] **데모 범위:** 각 기존 화면을 유지·교체·제거로 분류하고, 새 업무에 필요한 공통 셸·설정·UI만 선택한다. 화면을 제거할 때 `src/app/routes`, 대응 page/widget/feature/entity, `widgets/app-shell/model/navigation.ts`, 두 언어 번역, 메타 registry, 관련 E2E를 함께 검토한다. 생성된 `routeTree.gen.ts`는 직접 편집하지 않고 `pnpm routes:generate`로 갱신한다. 사용하지 않는 seed, demo adapter, MSW 시작 코드/worker 자산은 실제 참조를 확인한 뒤 제거한다. 남긴 데모는 계속 샘플임을 표시한다.
- [ ] **원격 main 보호:** 첫 PR 검사 성공 후 `CI Gate`와 `Conventional PR title`을 GitHub Actions 제공 필수 검사로 지정하고 관리자 포함·최신 base 반영·PR 병합을 요구한다. 포크로 보호 설정이 복사됐다고 가정하지 않고 [CI Gate 설정](ci-gate.md)을 확인한다.
- [ ] **검증과 운영 연결:** 단위 테스트는 `scripts/unit-test-categories.ts`의 정확히 한 범주에 배정한다. 남긴 E2E 파일은 `package.json`의 `test:e2e:core` 또는 `test:e2e:samples` 중 한 곳에만 등록한다. 로컬 `pnpm check`와 해당 커밋의 Actions 결과를 확인하고 [운영 전환 체크리스트](production-readiness.md)를 이어서 수행한다. 전체 테스트/빌드의 실행 위치는 [테스트 정책](testing.md)을 따른다.

제품명 변경 후 `rg -n 'Blueprint|blueprint|orbit\.demo|Acme Studio' src public scripts package.json README.md`로 남은 참조를 검토하세요. 라이선스 고지나 의도적으로 보존한 샘플은 이유를 남기며, 검색 결과를 무조건 일괄 치환하지 않습니다.

## 복제 후 확인할 사용자 결과

1. `product`를 바꾼 뒤 로고 이름·접근 가능한 홈 링크·작성자·문서 링크·HTML 제목과 OG site name이 새 제품을 가리키는지 확인한다. 워크스페이스 이름은 설정에서 저장한 값이며 제품 이름과 분리된다.
2. 새 업무의 레코드 한 건을 조회하고 변경한 뒤 결과를 다시 조회한다. 예를 들어 점검 한 건을 완료하면 목록에 반영돼야 한다. 새로고침했을 때의 결과가 팀이 정한 저장 정책에 맞고 원본 앱의 브라우저 데이터를 읽거나 덮어쓰지 않는지 확인한다.
3. 남긴 라우트·내비게이션·메타·페이지 명세·테스트가 일치하고 제거한 데모 링크가 남지 않는지 `pnpm check`로 확인한다. 테스트의 브랜드 기대값도 의도한 변경과 함께 검토한다.
4. README 대표 이미지는 해당 커밋의 production 번들에서 다시 캡처한다. 소개 이미지를 시각 회귀 승인 이미지로 대신 사용하지 않는다.
