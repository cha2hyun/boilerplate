# 페이지 메타데이터와 북마크

화면은 React CSR로 실행합니다. SSR이나 화면 사전 렌더링은 사용하지 않습니다. `src/app/seo/metadata.ts`의 페이지 정의가 브라우저의 제목/description/OG/Twitter 메타와 빌드 결과의 HTML head를 함께 만듭니다. 앱의 초기 body는 빈 React root를 유지합니다.

## 경로별 동작

현재 `/`, `/projects`, `/analytics`, `/orders`, `/customers`, `/inbox`, `/components`, `/settings`, `/foundations`에 고유한 제목과 설명이 있습니다. 기본 공유 이미지는 `/og/blueprint.png`이며 각 항목에 `image`와 `imageAlt`를 추가하면 페이지별 이미지로 바꿀 수 있습니다. 설명에는 샘플/데모 범위만 적으며 프로젝트 이름, 고객 이메일 등 사용자 데이터는 넣지 않습니다.

`DocumentHead`가 Router의 경로와 언어 설정을 구독하여 `data-page-meta` 태그를 교체합니다. 서버가 내보낸 정적 태그와 CSR 태그가 중복되지 않으며 favicon이나 번들 관련 태그는 보존합니다. 제목 변경은 이 모듈이 소유합니다.

정적 HTML은 기본 `en-US` 제목/설명과 `og:locale=en_US`를 제공합니다. 브라우저에서는 저장된 언어를 복원하거나 전환하면 제목/설명/이미지 대체 텍스트와 `og:locale`이 `en-US`/`ko-KR`에 맞춰 바뀝니다. URL과 canonical은 같습니다. 공유 봇은 개인의 localStorage 설정을 읽지 않으므로 기본 영어 메타를 받습니다. 언어별 공유 URL이나 `hreflang`은 지원하지 않으며 SSR도 추가하지 않습니다.

Vite의 `transformIndexHtml`/`generateBundle` 훅이 한 번 빌드한 HTML shell을 경로별로 복사하고 head만 변경합니다. JS/CSS는 같은 해시 번들을 참조합니다. 출력 예시는 `dist/index.html`, `dist/orders/index.html`, `dist/settings/index.html`입니다. `dist/404.html`도 같은 앱 shell에 없는 경로용 제목과 `noindex`를 담습니다. 훅과 순서는 [Vite Plugin API](https://vite.dev/guide/api-plugin.html#transformindexhtml)를 따릅니다.

이 정적 HTML 덕분에 JavaScript를 실행하지 않는 공유 봇도 각 경로의 메타를 읽을 수 있습니다. CSR의 실제 화면 콘텐츠까지 HTML에 담기는 것은 아닙니다. 소셜 서비스의 재수집 시점과 캐시는 서비스별로 다릅니다.

## 공개 도메인 설정

배포할 실제 origin을 `VITE_SITE_URL`에 넣고 빌드하세요. 예를 들어 팀이 소유한 서비스의 `https://서비스도메인` 형태입니다. 이 값은 공개 빌드 설정이며 비밀 값이 아닙니다.

- `http` 또는 `https` origin과 선택적인 끝 `/`만 허용합니다. 자격증명, 하위 경로, query, hash는 거부합니다.
- 설정하지 않으면 canonical, `og:url`, OG/Twitter 이미지의 절대 URL을 생략하고 `noindex, nofollow`를 출력합니다. localhost나 가상의 운영 도메인을 대신 넣지 않습니다.
- 개발 서버에서만 CSR 메타가 현재 브라우저의 실제 origin을 사용하여 로컬 공유 이미지와 SEO inspector를 확인할 수 있습니다. 개발 메타는 `noindex`를 유지하며 이 fallback은 production HTML/번들 동작에 적용되지 않습니다.
- 설정하면 알려진 페이지에 canonical과 공유 이미지의 절대 URL이 생깁니다. 관리자 페이지의 기본 `noindex, nofollow`는 유지하며 query/hash는 canonical에 포함하지 않습니다.
- 검색 공개는 별도 코드 정책인 `src/app/seo/metadata.ts`의 `publicIndexablePaths`에서 경로별로 선택합니다. 기본 목록은 비어 있습니다. 공개하기로 결정한 경로만 이 타입 검증된 목록에 추가하며, 해당 경로도 공개 origin이 없거나 개발 서버에서 실행되면 `noindex`입니다. 정적 HTML과 CSR은 같은 정책을 사용합니다.
- 알 수 없는 경로는 도메인 설정과 관계없이 `noindex, nofollow`이며 알려진 페이지의 canonical을 재사용하지 않습니다.
- 현재 앱과 메타 생성은 origin 루트 배포(`base: '/'`)를 전제로 합니다. 하위 경로 배포를 지원하려면 Router basepath, 정적 자산, manifest, 메타 URL 생성을 함께 바꿔야 합니다.

`VITE_SITE_URL` 변경은 재빌드가 필요합니다. 운영용 빌드의 값이 preview 배포에 들어가면 운영 canonical을 가리키므로 환경별로 값을 관리하세요. `noindex`는 접근 제어가 아니며 실제 비공개 서비스는 서버 인증/권한이 필요합니다.

`public/robots.txt`는 모든 크롤러의 페이지 접근을 허용합니다. 크롤러가 HTML의 robots 메타를 읽을 수 있어야 하므로 도메인 미설정 시에도 크롤링 자체를 차단하지 않습니다. 검색 색인 허용 여부는 공개 origin과 별도의 `publicIndexablePaths` 허용 목록을 함께 확인하는 페이지별 robots 메타 정책을 따릅니다. 실제 공개 도메인이 정해지기 전에는 sitemap URL을 넣지 않습니다.

## 정적 호스팅 순서

호스트는 `/orders`와 `/orders/` 요청에 **`orders/index.html`을 먼저 제공**해야 합니다. 모든 요청을 `/index.html`로 강제 rewrite하면 공유 봇이 다시 Overview 메타만 읽게 됩니다. 실제 파일과 디렉터리 index를 먼저 찾고, 없는 경로에는 `404.html`을 HTTP 404 상태로 제공하세요. `404.html` 안의 앱은 원래 요청 URL로 실행될 때 Router의 없는 페이지 화면을 보여줍니다.

로컬/CI의 `pnpm preview`에는 `configurePreviewServer` 미들웨어가 이 우선순위를 적용합니다. 알려진 경로의 GET/HEAD 요청만 해당 디렉터리 HTML로 연결하며 query를 보존합니다. 이는 preview 서버 설정이므로 실제 배포 호스트에도 위 경로 처리를 별도로 설정해야 합니다.

서브 경로의 HTML도 `/assets/...` 절대 경로로 같은 번들을 사용합니다. 호스팅 제품의 clean URL/directory index 설정을 확인하고, 배포 후 JavaScript 실행 없이 각 경로의 응답 HTML을 확인하세요. 소스에 있는 SPA 메타만 확인하는 것으로 배포 검증을 대신하지 않습니다.

`/robots.txt` 요청에는 빌드에 복사된 텍스트 파일을 제공해야 합니다. 파일을 누락하거나 SPA fallback으로 HTML을 반환하면 Lighthouse의 robots.txt 구문 검사가 실패합니다. 배포 후 응답 본문이 robots 지시문인지도 확인하세요.

Router의 기본 동작에 맞춰 CSR 메타는 `/Projects` 같은 대소문자 변형도 `/projects`의 canonical로 정규화합니다. 정적 파일명은 registry의 소문자 경로를 따르므로 호스트에서도 대소문자 별칭을 canonical 경로로 redirect해야 합니다.

## 아이콘과 공유 이미지

`index.html`은 SVG favicon, ICO fallback, 180×180 Apple touch icon, `site.webmanifest`를 연결합니다. manifest에는 192×192와 512×512 PNG 아이콘과 앱 이름이 있습니다. manifest의 `display: browser`는 현재 웹앱에 맞는 설정이며 오프라인 기능이나 서비스 워커를 제공하지 않습니다.

브랜드 소스는 `public/favicon.svg`와 `public/og/blueprint.svg`입니다. 수정 후 `pnpm assets:generate`를 실행하면 ICO/Apple/manifest용 PNG 및 1200×630 공유 PNG를 다시 만듭니다. 생성기는 개발 의존성만 사용하며 방문자의 브라우저에 이미지 변환 코드를 보내지 않습니다. 페이지별 공유 이미지를 추가할 때는 `public/og/`에 자산을 넣고 페이지 정의의 `image`/`imageAlt`를 지정하세요.

## 새 페이지와 검증

새 Router 경로를 추가하면 메타 registry에도 항목을 추가합니다. `route-contract.ts`가 생성된 Router 목적지와 메타 경로의 일치를 타입 검사합니다. 경로별 HTML 출력도 이 목록을 따릅니다.

- `src/app/seo/metadata.test.ts`: 공개 origin 검증, canonical 정규화, CSR 메타 교체/없는 경로 정리.
- `scripts/route-metadata.test.mjs`: HTML 이스케이프, 실제 Vite 훅의 경로별 shell 생성, 번들 참조 보존, preview의 경로별 HTML 우선 처리. 기존 `test:guardrails` 실행에 포함됩니다.
- `e2e/workspace.spec.ts`: Actions에서 production preview의 원문 HTML과 클라이언트 탐색 후 메타를 확인합니다. head는 화면 크기와 무관하므로 이 사례는 desktop에서만 실행합니다.

전체 빌드/브라우저 테스트는 기존 CI 정책을 따릅니다. 운영 도메인과 호스트 rewrite가 정해지기 전에는 실제 소셜 플랫폼의 공유 미리보기 성공을 보장하지 않습니다.
