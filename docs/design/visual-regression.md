# 시각 기준과 회귀 검사

디자인의 현재 기준은 [공통 조합](compositions.md), [페이지 기획](../pages/README.md), 검토한 Linux 기준 이미지로 연결합니다. 스크린샷만으로 동작·접근성·기획 의도를 증명하지 않습니다. README의 미리보기 이미지는 소개용이며 테스트 기준 이미지가 아닙니다.

## 작은 대표 행렬

`e2e/design-visual.spec.ts`는 기존 core 범주에서 다음 조합만 비교합니다. 같은 production 번들을 재사용하며 별도 build나 브라우저 job을 추가하지 않습니다.

| 표본               | 화면 구간 | 언어·테마    | 확인할 조합                                  |
| ------------------ | --------- | ------------ | -------------------------------------------- |
| Overview           | PC        | 영어·light   | KPI 숫자·레이블·비교 배지·아이콘의 공통 간격 |
| Orders             | 태블릿    | 한국어·light | 필터·탭·가로 스크롤 표·페이지 이동           |
| Analytics          | 모바일    | 한국어·dark  | 세로 KPI 배치와 긴 설명                      |
| 프로젝트 생성 오류 | PC        | 영어·dark    | 폼·필드 오류·대화상자 액션                   |

날짜와 시간대, 언어/통화/테마, 폰트 로딩, 숫자 전환 완료를 고정합니다. 목업 API의 실제 데모 경로는 유지하고 외부 환율과 고정 버전 Pretendard CDN 파일은 기존 fixture로 제공합니다. 변동이 큰 차트 애니메이션이나 전체 페이지를 무조건 이미지로 고정하지 않습니다. 제목 크기·배지 중심·페이지 간격·cold/warm 카드 치수는 기존 DOM/행동 검사도 계속 담당합니다.

## 기준 이미지와 갱신

- `e2e/visual-baselines/linux/<project>/`의 PNG가 Ubuntu 24.04 러너에서 고정 Playwright Noble 이미지와 lockfile의 Chromium으로 비교하는 기준입니다. Playwright/OS/폰트 변경도 시각 변경으로 검토합니다.
- 기본 `updateSnapshots: 'none'`으로 누락된 기준이나 이미지 차이를 실패 처리합니다. CI에서 기준 이미지를 자동 갱신하거나 commit하지 않습니다.
- 최초 기준 또는 의도된 변경은 실패 artifact `playwright-core`의 해당 `*-actual.png`를 확인합니다. 기존 기준이 있으면 expected/actual/diff를 함께 비교하고, 문제 원인을 먼저 판단합니다.
- 확인한 actual만 대응하는 기준 경로에 저장하고, 변경 의도·화면 크기·검토 결과를 PR에 남깁니다. 변경되지 않아야 할 영역의 차이가 있으면 코드부터 고칩니다.
- 기준 이미지를 커밋한 뒤 같은 Linux 환경의 다음 CI 비교가 성공해야 완료입니다. 이미지 허용 오차를 늘려 실패를 숨기지 않습니다.
- macOS 기준을 Linux 경로로 복사하지 않습니다. 로컬 전체 브라우저 실행은 기본 절차가 아닙니다.

참고: [Playwright 시각 비교](https://playwright.dev/docs/test-snapshots)는 동일 환경에서 기준 생성과 비교를 권장합니다. 현재 작은 픽셀 허용치는 렌더링 잡음용이며 배치·크기 변경의 허용 기준이 아닙니다.

차트 축의 대비는 픽셀 기준과 별도로 실제 SVG computed fill을 검사합니다. `renders readable chart axes and avatar initials in both themes`가 Overview·Analytics의 축 글자가 현재 의미 토큰을 사용하는지와 카드 배경 대비를 확인합니다. 라이브러리 내부 DOM 변경으로 공통 선택자가 적용되지 않는 회귀를 포함합니다.

같은 검사는 Overview·Projects의 Avatar 이니셜도 실제 computed color와 배경으로 확인합니다. 이니셜은 `muted` 배경 위 `foreground`를 사용하며, 12px 글자에서 4.5:1을 충족해야 합니다.

2026-11-05 Orders 태블릿 기준은 `2ba2bb6`의 [Linux CI actual](https://github.com/cha2hyun/boilerplate/actions/runs/42036048774)에서 expected/actual/diff를 검토해 갱신했다. 핵심 7열, 오른쪽 고정 작업, 페이지 크기 선택과 결과 수, 이니셜 대비 변경을 승인했으며 필터·탭·행 높이는 유지한다. 허용 픽셀 수는 변경하지 않았다.

2026-11-06에는 `b8fe73e`의 [Linux CI actual과 diff](https://github.com/cha2hyun/boilerplate/actions/runs/42138337131/job/127633210139)를 기존 기준과 비교했다. 태블릿 주문 표에서는 검색·정렬·페이지 컨트롤의 외곽선(1,360픽셀), 데스크톱 프로젝트 오류 폼에서는 설명·상태·취소 컨트롤 외곽선(2,152픽셀)이 달라졌다. 문구·행·오류 위치와 크기는 그대로이며 두 번의 캡처 결과가 일치했다. 컨트롤을 배경과 구분하는 의도대로 두 actual만 반영했고, 다른 기준과 허용 픽셀 수는 유지했다.
