# 작업 계획: production Lighthouse 측정과 개선

상태: 완료, 원격 Actions 미실행

## 문제와 완료 조건

- 사용자가 Chrome Lighthouse 실측과 개선점 확인을 요청했다.
- production preview의 Overview 모바일/PC와 Projects 모바일을 측정한다.
- 실제 보고서로 확인한 레이아웃 이동, 불필요한 폰트 전송, SEO/접근성 결함을 수정하고 같은 조건으로 다시 측정한다.
- 기존 shadcn 외형, Pretendard 400/500/600, CSR, 도메인 미설정 시 noindex 정책을 유지한다.

## 확인한 근거와 변경 경계

- Overview PC CLS 0.184: analytics 응답 뒤 chart/activity 영역이 삽입되어 아래 표가 이동한다. pages/overview의 로딩 공간을 예약한다.
- 초기 CSS gzip 76,629 bytes: 작은 폰트 3개가 base64로 인라인되어 미사용 글리프도 전송된다. Vite의 폰트 inlining만 비활성화한다.
- robots.txt 요청이 SPA HTML을 반환한다. public 정적 텍스트 파일을 추가한다.
- 검색 버튼의 보조 단축키 텍스트가 accessible name과 불일치한다. widgets/app-shell의 단축키 의미를 정리한다.
- 데이터 계약/저장 형식/환경 변수 변경은 없다. 기존 파일은 모두 untracked이므로 변경 범위를 파일별로 확인한다.

## 실행과 검증

1. Lighthouse 13.6.0 / 설치된 Chrome 156, 기본 simulated mobile 및 desktop preset으로 순차 측정한다.
2. Astra xhigh 서브에이전트가 성능/접근성 근거를 독립 검토한다.
3. 변경 후 정적 검사와 production build를 실행한다. 전체 단위/E2E suite는 실행하지 않는다.
4. 동일한 3개 화면/기기 조합만 재측정하고 결과·재현 명령·한계를 보고서에 남긴다.
5. 사용자의 5173 개발 서버를 유지하고 감사용 4173 preview만 종료한다.

## 완료 기록

Overview PC 성능 92→100/CLS 0.184→0.000031, 모바일 성능 98 유지, Projects 모바일 접근성 97→100을 확인했다. 폰트 inlining 제거로 CSS gzip 18.9%를 줄이고 robots.txt/검색 이름/체크박스 겹침을 수정했다. 동일한 3개 조합을 전후 각 1회 측정했으며 원본 HTML/JSON은 로컬 test-results에 보관했다. production build를 통과했다. 페이지·기기를 선택하는 수동 Actions workflow와 재현/해석 문서를 추가했다.

`pnpm check`의 정적 검사를 통과했다. 전체 unit/E2E 및 원격 Actions는 실행하지 않았다. 실제 배포 origin 없는 noindex 정책을 보존했으므로 SEO는 63점이다. 로컬 측정은 실제 배포 호스트/필드 데이터/키보드 접근성 전체 검사를 대신하지 않는다. 상세 수치와 남은 후보는 [실측 보고서](../reviews/lighthouse-audit.md)에 기록했다.
