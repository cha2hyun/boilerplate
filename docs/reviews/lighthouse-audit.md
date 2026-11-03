# Lighthouse 실측과 개선

측정일: 2026-11-03. Chrome 156.0.8078.80 / Lighthouse 13.6.0 / macOS / production `pnpm preview` (`127.0.0.1:4173`). 기본 demo 데이터와 OS를 따르는 dark 테마에서 측정했다. `VITE_SITE_URL`은 설정하지 않았다.

## 범위와 결과

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

## 적용한 개선

1. **Overview 로딩 공간 예약**: analytics 응답 전 KPI만 표시하다가 chart/activity가 삽입되어 프로젝트 표가 약 한 영역만큼 밀렸다. 기존 shadcn Card/Skeleton으로 전체 영역을 예약했다. 성공 화면, 실제 데이터 흐름, demo 지연은 유지했다. PC의 주요 CLS가 제거됐다.
2. **폰트의 불필요한 CSS 포함 제거**: 작은 Pretendard subset 3개가 Vite 기본 임계값에 의해 base64로 CSS에 포함되어 미사용 글리프도 전송됐다. [assetsInlineLimit callback](https://vite.dev/config/build-options#build-assetsinlinelimit)으로 폰트만 별도 해시 자산으로 출력한다. 276개 font-face와 400/500/600, 한글/영문 범위, WOFF fallback은 유지한다. CSS gzip은 **76,629 → 62,162 bytes (18.9% 감소)**, inline font 수는 3 → 0이다. CSS 절감에는 작은 새 skeleton/접근성 유틸리티도 반영되어 있다.
3. **프로젝트 표의 클릭 영역 겹침 해소**: 16px 전체 선택 체크박스에 정렬 버튼의 음수 margin이 겹쳤다. 체크박스는 24px로 확대하고 인접 정렬 버튼의 음수 margin을 제거했다. `target-size` 실패가 해결됐다.
4. **검색 단축키와 접근 가능한 이름 정리**: 화면의 `Search ⌘ K`와 접근 가능한 이름 `Search workspace`가 일치하지 않았다. 단축키는 비상호작용 보조 표기로 분리하고 실제 지원하는 `Meta+K Control+K`를 `aria-keyshortcuts`로 선언했다. `label-content-name-mismatch`가 해결됐다. 이 항목은 초기 접근성 점수 100에도 별도 실패로 존재했으므로 점수만으로 판단하지 않았다.
5. **유효한 robots.txt 제공**: 없는 `/robots.txt` 요청에 SPA HTML이 반환되어 37개 구문 오류가 발생했다. 정적 텍스트 파일을 제공하여 `robots-txt` 검사를 통과했다.

## SEO 63점과 남은 개선 후보

SEO의 남은 실패는 **`is-crawlable` 하나**다. 실제 배포 origin이 없는 기본 빌드의 의도적인 `noindex, nofollow` 정책을 유지했다. 점수를 높이기 위해 가짜 도메인을 넣거나 색인을 허용하지 않았다. 공개 배포 시 실제 `VITE_SITE_URL`과 호스트 경로 설정을 적용하고 재측정해야 한다. 관리자/비공개 화면의 색인 정책은 제품 요구에 맞춰 별도로 결정한다. OG와 색인 정책/배포 설정은 [메타데이터 가이드](../seo.md)를 따른다.

다음은 측정에 남은 진단이며 즉시 결함으로 취급하지 않는다.

- **초기 JS**: Overview 미사용 JavaScript 추정 약 129 KiB. Recharts와 React, 공통 셸 번들에 포함된 상호작용 기능도 이 추정에 들어간다. 제품 화면이 커지면 차트·검색 패널·편집 흐름의 추가 지연 로드를 실제 interaction trace와 함께 검토한다. 현재 시점에는 기능 제거/라이브러리 교체 없이 모바일 98점을 유지한다.
- **CSS/폰트**: 미사용 CSS 추정 약 39 KiB, 모바일 render-blocking 절감 추정 440 ms. 다른 페이지의 shadcn 유틸리티와 다국어 unicode-range 선언이 포함된다. 한 페이지의 coverage만으로 폰트/스타일을 삭제하지 않는다. 전체 subset preload도 추가하지 않았다.
- **배포 환경**: 로컬 preview는 실제 호스트의 CDN·지연·캐시 정책을 대표하지 않는다. 공개 URL이 생기면 실제 배포 응답을 대상으로 확인한다.

## 재현과 보고서

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

## 검증 기록

- 변경 후 production build 성공, HTML/JSON 실측 보고서 6쌍 생성.
- `pnpm check`의 포맷·ESLint·타입·아키텍처 정적 검사 통과.
- `/robots.txt` HTTP 200 및 `text/plain`, CSS의 276 font-face 보존과 base64 폰트 0개를 확인했다.
- 수동 Actions workflow의 Bash/내장 Node 문법과 포맷을 정적 확인했다. 원격 Actions는 아직 실행하지 않았다.
- 전체 unit/E2E suite는 실행하지 않았다. 요청된 Lighthouse 실측과 로딩 레이아웃 확인을 위한 좁은 DOM 측정만 수행했다.
