# Lighthouse 실측과 개선

## 2026-11-06: 라우트 분리와 숫자 계산 재사용

기준은 main `7758183`의 [CI production artifact](https://github.com/cha2hyun/boilerplate/actions/runs/42038839255), 변경은 `52f1e27`의 [PR CI artifact](https://github.com/cha2hyun/boilerplate/actions/runs/42051214037)다. 조회 스키마와 Page를 같은 barrel에서 가져오던 정적 연결을 [ADR 006](../adr/006-search-public-entrypoints.md)의 제한된 `search.ts`로 분리했다. formatter와 숫자 모션의 계산·예약 트리를 재사용하고 초기 언어 변경 이벤트 중복을 제거했다. URL·표시값·300ms 모션·폭 예약·reduced motion 계약은 유지한다.

### 확정한 코드 크기 변화

| 범위                                  | 이전 raw bytes | 이후 raw bytes |  감소 |
| ------------------------------------- | -------------: | -------------: | ----: |
| main entry 하나                       |        781,385 |        304,777 | 61.0% |
| entry와 정적 의존 파일 합             |      1,428,104 |        808,425 | 43.4% |
| Overview 첫 진입 JS 합, demo MSW 포함 |      1,826,833 |      1,725,214 |  5.6% |
| Projects 첫 진입 JS 합, demo MSW 포함 |      1,826,828 |      1,344,231 | 26.4% |

파일의 중복을 제거하고 CI artifact의 실제 bytes를 합산했다. 첫 진입 합은 entry·해당 route·demo MSW의 정적 의존 그래프와 실제 브라우저의 요청 파일 목록을 대조한다. main 감소율을 전체 다운로드 감소율로 해석하지 않는다. Projects에서 Recharts와 Orders/Customers/Inbox UI를 가져오지 않으며, Overview는 화면에 필요한 차트를 계속 가져온다. HTML modulepreload는 14→6개다. 전체 요청 JS 파일 수는 Overview 17→26개, Projects 17→24개로 늘어 네트워크 환경에 따른 비용이 남는다. Vite는 route의 정적 의존 파일을 병렬 preload하며 추가 중첩 lazy wrapper는 없다.

Lighthouse/Resource Timing의 전송 크기 합은 절감률 근거에서 제외했다. 변경 후 뒤늦게 요청한 청크가 demo Service Worker를 거치면서 `fromServiceWorker: true`, `fromDiskCache: false`, `transferSize: 0`으로 기록됐다. 표시상 약 642KB→464KB는 이 집계 차이를 포함한다. 위 표는 압축 전 파일 크기이며 배포 CDN의 실제 전송량이 아니다. 같은 파일별 gzip(level 6) 합계는 Overview 584,062→562,659 bytes(3.7%), Projects 584,059→451,934 bytes(22.6%) 감소했다. 이것도 동일한 압축 조건의 잠재 body 크기이며 네트워크 실측은 아니다.

### Lighthouse와 CPU 관측

동일 Lighthouse 13.6.0 설정, 모바일 412×823/DPR 1.75, simulated CPU 4배, 기본 light/demo, 실제 폰트 CDN으로 각 조합을 한 번 실행했다. 전후 configSettings는 같다.

| 화면     | 성능    | FCP / LCP (ms) | TBT (ms)      | raw main-thread (ms) | benchmark index   |
| -------- | ------- | -------------- | ------------- | -------------------- | ----------------- |
| Overview | 69 → 73 | 1,638 → 1,644  | 2,447 → 1,562 | 1,667 → 1,358        | 1,378.5 → 1,919.5 |
| Projects | 67 → 75 | 2,611 → 1,625  | 1,142 → 1,191 | 812 → 734            | 2,478 → 2,831     |

FCP/LCP/TBT는 시뮬레이션 지표이고 raw main-thread는 `diagnostics.totalTaskTime`의 관측 합이다. Lighthouse의 main-thread breakdown은 simulate 모드에서 4배가 적용되므로 raw 합과 섞지 않는다. TBT를 단순히 4로 나눠 실제 지연으로 추정하지 않는다. 접근성·Best Practices는 전후 모두 100, SEO는 의도된 noindex로 63이며, CLS는 Overview 0.000138 / Projects 0으로 유지됐다.

실행 근거: [이전 Overview](https://github.com/cha2hyun/boilerplate/actions/runs/42048704323), [이후 Overview](https://github.com/cha2hyun/boilerplate/actions/runs/42051281153), [이전 Projects](https://github.com/cha2hyun/boilerplate/actions/runs/42047207907), [이후 Projects](https://github.com/cha2hyun/boilerplate/actions/runs/42051287191). 네 비교 보고서에 runtime error/warning은 없다. 최초 [Overview 기준 실행](https://github.com/cha2hyun/boilerplate/actions/runs/42047202837)은 benchmark 241과 명시적인 CPU 경고가 있어 제외하고 해당 화면만 한 번 재측정했다.

runner 차이는 남는다. 이후 Overview는 AMD EPYC 7763 / Chrome 156.0.8078.79 / image `20261101.186.1`, Projects는 EPYC 9V45 / Chrome 156.0.8078.47 / image `20261026.180.1`이다. 이전에는 정확한 CPU 모델과 Chrome patch를 기록하지 않았다. benchmark 차이도 있어 점수 상승을 코드 효과로 확정하지 않는다. Projects의 TBT는 오히려 49ms 증가했으며 일괄적인 CPU 시간 개선을 주장하지 않는다.

별도 동일 Mac/Playwright Chromium 156.0.8078.4의 CDP CPU 4배 진단에서도 긴 작업 합은 Overview 593→722ms, Projects 328→351ms였다. 양쪽 모두 production artifact, 새 브라우저 context, 412×823/light, 고정 폰트·환율 응답을 사용하고 데이터 loading/skeleton/숫자 전환 종료 후까지 기록했다. 브라우저 오류는 없었다. 이 단일 trace는 profiler 오버헤드를 포함한 병목 진단이며 Lighthouse나 실제 사용자 성능과 직접 비교하지 않는다. 현재 LCP는 페이지 설명문이므로 LCP가 데이터 준비 완료를 뜻하지도 않는다.

현재 확정한 효과는 불필요한 페이지 코드 제거와 반복 계산 재사용이다. 잔여 main-thread 비용과 청크 수 증가의 네트워크 영향은 실제 배포 조건에서 재검토해야 한다. 기능·모션을 숨기거나 테스트 데이터를 축소해 점수를 높이지 않았다.

새 workflow는 기존 조건을 유지하며 source SHA, runner/CPU/Chrome, warning, raw/simulated 지표의 summary JSON과 trace/DevTools log를 보관한다. 이후 두 실행에서 모두 유효한 파일을 확인했으며 artifact 보관은 기존 3일이다. 원본은 저장소에 커밋하지 않는다.

## 2026-11-05: 현재 CDN 구성의 Actions 재측정

폰트 CDN 전환 이후 실제 production 번들을 표준 GitHub-hosted Ubuntu/Chrome 156 runner에서 Lighthouse 13.6.0의 기본 모바일 프로필로 측정했다. 기본 demo, 기본 light 테마, 실제 폰트 CDN 요청, 공개 origin 미설정이다. E2E의 외부 요청 fixture는 사용하지 않았다. 아래는 각 조합 1회의 실험실 측정이다.

| 코드 / 화면                    | 성능 | 접근성 | Best Practices | SEO | FCP / LCP (ms) | TBT (ms) | CLS      |
| ------------------------------ | ---- | ------ | -------------- | --- | -------------- | -------- | -------- |
| 기존 main `8b2b6d8` / Overview | 72   | 96     | 100            | 63  | 1,638 / 1,638  | 1,622    | 0        |
| 개선 `01716fb` / Overview      | 73   | 96     | 100            | 63  | 1,614 / 1,614  | 1,536    | 0.000138 |
| 대비 수정 `2ba2bb6` / Overview | 77   | 100    | 100            | 63  | 1,568 / 1,568  | 1,006    | 0.000138 |
| 개선 `01716fb` / Projects      | 68   | 100    | 100            | 63  | 2,553 / 2,553  | 1,123    | 0        |

실행 근거: [기존 main Overview](https://github.com/cha2hyun/boilerplate/actions/runs/42035431392), [개선 Overview](https://github.com/cha2hyun/boilerplate/actions/runs/42034735087), [개선 Projects](https://github.com/cha2hyun/boilerplate/actions/runs/42034963167), [대비 수정 후 Overview](https://github.com/cha2hyun/boilerplate/actions/runs/42036040040). 네 보고서 모두 runtime error와 run warning이 없었다. 원본 HTML/JSON은 해당 Actions artifact에서 3일 동안 보관한다.

과거 아래 macOS 수치와 실행 환경·테마·폰트 공급 방식이 다르므로 98→73을 코드 회귀로 단정하지 않는다. 같은 runner 종류의 main/PR 비교도 단일 실행이며 benchmark index가 1,800/2,084로 달라 1점 차이를 개선으로 주장하지 않는다. 현재 재현된 과제는 모바일 main-thread 작업량이다. 실제 사용자 지표나 모든 페이지의 성능 보증은 아니다. 기능 제거, 지연 시간 숨김, 테스트용 데이터 축소로 점수를 바꾸지 않았다.

Overview 접근성 실패는 밝은 테마 Avatar 이니셜의 `muted-foreground` / `muted` 조합(12px, 4.34:1)이었다. 이 조합을 공통 Avatar의 `foreground` / `muted`로 바꾸고 실제 텍스트·배경의 두 테마 대비를 브라우저 회귀로 추가했다. 수정 후 Overview 접근성은 100이며 해당 대비 실패가 사라졌다. 성능 77은 benchmark index 2,257인 별도 단일 측정이므로 색상 변경의 성능 개선으로 해석하지 않는다. SEO 63은 의도된 `noindex, nofollow` 정책이며 점수를 위해 색인을 허용하지 않는다.

## 2026-11-03: 이전 로컬 측정 기록

측정일: 2026-11-03. Chrome 156.0.8078.80 / Lighthouse 13.6.0 / macOS / production `pnpm preview` (`127.0.0.1:4173`). 기본 demo 데이터와 OS를 따르는 dark 테마에서 측정했다. `VITE_SITE_URL`은 설정하지 않았다.

후속 변경(2026-11-05): 폰트 제공을 [jsDelivr CDN](../design/typography.md)으로 전환해 번들 폰트와 Vite font inlining 설정을 제거했다. 아래 폰트/CSS 용량과 성능 수치는 전환 전 기록이며 CDN 전환 후 재측정한 값이 아니다.

### 범위와 결과

Overview의 모바일·PC, Projects의 모바일을 수정 전후 각각 한 번씩 **순차 실행**했다. 모바일은 Lighthouse 기본 simulated throttling과 412×823 화면, PC는 공식 desktop preset을 사용했다. 각 실행은 별도 headless Chrome 프로필을 사용한다. 개발 서버/전체 단위/E2E suite를 중복 검사하지 않았다. 모든 보고서에 runtime error와 run warning은 없다.

| 화면 / 기기       | 성능          | 접근성       | Best Practices | SEO     |
| ----------------- | ------------- | ------------ | -------------- | ------- |
| Overview / PC     | 92 → **100**  | 100 → 100    | 100 → 100      | 54 → 63 |
| Overview / 모바일 | 98 → **98**   | 100 → 100    | 100 → 100      | 54 → 63 |
| Projects / 모바일 | 100 → **100** | 97 → **100** | 100 → 100      | 54 → 63 |

| 화면 / 기기       | FCP (ms)    | LCP (ms)    | TBT (ms)  | CLS                     |
| ----------------- | ----------- | ----------- | --------- | ----------------------- |
| Overview / PC     | 287 → 288   | 287 → 288   | 0 → 0     | 0.183565 → **0.000031** |
| Overview / 모바일 | 1212 → 1057 | 1212 → 1057 | 168 → 172 | 0 → 0                   |
| Projects / 모바일 | 1207 → 1058 | 1207 → 1058 | 81 → 65   | 0.007595 → 0.007595     |

수치는 단일 실험실 측정이며 반복 측정의 중앙값이나 실제 사용자 지표가 아니다. 특히 TBT의 수 ms 차이는 개선/회귀로 단정하지 않는다. CPU, 캐시, 네트워크, 실행 환경에 따라 점수가 달라진다는 [Lighthouse의 해석 기준](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)을 따른다. 다른 페이지, tablet, light 테마, 실제 API/인증, 배포 CDN/캐시/압축/HTTPS는 이번 측정 범위에 포함하지 않았다.

### 적용한 개선

1. **Overview 로딩 공간 예약**: analytics 응답 전 KPI만 표시하다가 chart/activity가 삽입되어 프로젝트 표가 약 한 영역만큼 밀렸다. 기존 shadcn Card/Skeleton으로 전체 영역을 예약했다. 성공 화면, 실제 데이터 흐름, demo 지연은 유지했다. PC의 주요 CLS가 제거됐다.
2. **폰트의 불필요한 CSS 포함 제거**: 작은 Pretendard subset 3개가 Vite 기본 임계값에 의해 base64로 CSS에 포함되어 미사용 글리프도 전송됐다. [assetsInlineLimit callback](https://vite.dev/config/build-options#build-assetsinlinelimit)으로 폰트만 별도 해시 자산으로 출력한다. 276개 font-face와 400/500/600, 한글/영문 범위, WOFF fallback은 유지한다. CSS gzip은 **76,629 → 62,162 bytes (18.9% 감소)**, inline font 수는 3 → 0이다. CSS 절감에는 작은 새 skeleton/접근성 유틸리티도 반영되어 있다.
3. **프로젝트 표의 클릭 영역 겹침 해소**: 16px 전체 선택 체크박스에 정렬 버튼의 음수 margin이 겹쳤다. 체크박스는 24px로 확대하고 인접 정렬 버튼의 음수 margin을 제거했다. `target-size` 실패가 해결됐다.
4. **검색 단축키와 접근 가능한 이름 정리**: 화면의 `Search ⌘ K`와 접근 가능한 이름 `Search workspace`가 일치하지 않았다. 단축키는 비상호작용 보조 표기로 분리하고 실제 지원하는 `Meta+K Control+K`를 `aria-keyshortcuts`로 선언했다. `label-content-name-mismatch`가 해결됐다. 이 항목은 초기 접근성 점수 100에도 별도 실패로 존재했으므로 점수만으로 판단하지 않았다.
5. **유효한 robots.txt 제공**: 없는 `/robots.txt` 요청에 SPA HTML이 반환되어 37개 구문 오류가 발생했다. 정적 텍스트 파일을 제공하여 `robots-txt` 검사를 통과했다.

### SEO 63점과 남은 개선 후보

SEO의 남은 실패는 **`is-crawlable` 하나**다. 실제 배포 origin이 없는 기본 빌드의 의도적인 `noindex, nofollow` 정책을 유지했다. 점수를 높이기 위해 가짜 도메인을 넣거나 색인을 허용하지 않았다. 공개 배포 시 실제 `VITE_SITE_URL`과 호스트 경로 설정을 적용하고 재측정해야 한다. 관리자/비공개 화면의 색인 정책은 제품 요구에 맞춰 별도로 결정한다. OG와 색인 정책/배포 설정은 [메타데이터 가이드](../seo.md)를 따른다.

다음은 측정에 남은 진단이며 즉시 결함으로 취급하지 않는다.

- **초기 JS**: Overview 미사용 JavaScript 추정 약 129 KiB. Recharts와 React, 공통 셸 번들에 포함된 상호작용 기능도 이 추정에 들어간다. 제품 화면이 커지면 차트·검색 패널·편집 흐름의 추가 지연 로드를 실제 interaction trace와 함께 검토한다. 현재 시점에는 기능 제거/라이브러리 교체 없이 모바일 98점을 유지한다.
- **CSS/폰트**: 미사용 CSS 추정 약 39 KiB, 모바일 render-blocking 절감 추정 440 ms. 다른 페이지의 shadcn 유틸리티와 다국어 unicode-range 선언이 포함된다. 한 페이지의 coverage만으로 폰트/스타일을 삭제하지 않는다. 전체 subset preload도 추가하지 않았다.
- **배포 환경**: 로컬 preview는 실제 호스트의 CDN·지연·캐시 정책을 대표하지 않는다. 공개 URL이 생기면 실제 배포 응답을 대상으로 확인한다.

### 재현과 보고서

[Lighthouse CLI](https://github.com/GoogleChrome/lighthouse#using-the-node-cli)를 일회 실행하므로 앱 의존성을 추가하지 않았다. 같은 빌드를 사용하는 별도 터미널에서 실행한다.

```sh
pnpm build
pnpm preview --port 4173 --strictPort
```

```sh
mkdir -p test-results/lighthouse
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  pnpm dlx lighthouse@13.6.0 http://127.0.0.1:4173/ \
  --chrome-flags='--headless' \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output=html \
  --output-path=test-results/lighthouse/overview-mobile \
  --no-enable-error-reporting --quiet
```

PC는 `--preset=desktop`, Projects는 URL `/projects`를 선택한다. 동일 장비에서 audit/build/테스트를 동시에 돌리지 않는다. 요청 없는 로컬 반복 측정은 기본 절차가 아니다.

이번 원본 HTML/JSON 12개는 로컬의 `test-results/lighthouse/2026-11-03/`에 보관했다. 파일 이름은 `{before,after}-{overview-desktop,overview-mobile,projects-mobile}.report.{html,json}`이며 git에서 제외된다. 이후에는 **Lighthouse Actions → Run workflow → page/device 선택**으로 한 조합만 검사할 수 있다. 한 job/build/audit, artifact 3일 정책이며 자동 PR 검사와 중복하지 않는다. [실행 정책](../testing.md#선택-실행-lighthouse)을 참고한다.

개선 후 보고서 이름은 `after-overview-desktop.report.html`, `after-overview-mobile.report.html`, `after-projects-mobile.report.html`이다. 이 파일은 저장소에 커밋되지 않고 로컬 정리 시 삭제될 수 있으므로 영구 링크로 제공하지 않는다. 새 측정이 필요하면 Actions artifact를 사용한다. 위 측정 기록은 당시 결과이며 현재 변경의 성능 점수를 보증하지 않는다.

### 검증 기록

- 변경 후 production build 성공, HTML/JSON 실측 보고서 6쌍 생성.
- `pnpm check`의 포맷·ESLint·타입·아키텍처 정적 검사 통과.
- `/robots.txt` HTTP 200 및 `text/plain`, CSS의 276 font-face 보존과 base64 폰트 0개를 확인했다.
- 수동 Actions workflow의 Bash/내장 Node 문법과 포맷을 정적 확인했다. 원격 Actions는 아직 실행하지 않았다.
- 전체 unit/E2E suite는 실행하지 않았다. 요청된 Lighthouse 실측과 로딩 레이아웃 확인을 위한 좁은 DOM 측정만 수행했다.
