# 디자인 시스템

Blueprint는 **기존 shadcn UI → Tailwind 의미 토큰 → Pretendard 400/500/600**을 우선합니다. [SEED Foundations](https://seed-design.io/foundations)는 설계 관점을 참고하는 자료입니다. SEED 패키지·토큰·컴포넌트·브랜드 스타일을 설치하거나 복제하지 않습니다.

작업에 해당하는 문서만 읽으세요. 문서 전체를 AGENTS.md나 프롬프트에 붙이지 않습니다.

| 작업                                      | 읽을 계약                                 |
| ----------------------------------------- | ----------------------------------------- |
| 컴포넌트 선택, 아이콘, 표면, 접근성, 상태 | [기본 원칙](design/principles.md)         |
| 글꼴·제목·본문·숫자                       | [타이포그래피](design/typography.md)      |
| neutral/brand, 상태 색상, light/dark      | [색상](design/color.md)                   |
| 가로·세로 정렬, 간격, 반응형, 아이콘 레일 | [레이아웃](design/layout.md)              |
| 날짜·숫자·통화, 긴 번역, 방향성           | [국제화](design/international-design.md)  |
| 서비스의 말투와 상황별 표현               | [보이스와 톤](design/voice-and-tone.md)   |
| 버튼·폼·오류·빈 결과 문구                 | [라이팅](design/writing.md)               |
| 전환·피드백의 목적, reduced motion        | [모션](design/motion.md)                  |
| 수량·통화·백분율·축약 표시                | [숫자 표시](number-formatting.md)         |
| 실제 로딩·skeleton·숫자 전환 구현         | [로딩과 모션 계약](loading-and-motion.md) |

실제 조합은 앱의 **Foundations**, 개별 shadcn 컴포넌트·폰트·색상은 **Components**에서 확인합니다. Foundations는 화면에 적용할 규칙을 보여주는 예시이며, 전체 앱의 번역이나 RTL 지원 완료를 뜻하지 않습니다.

`pnpm check:architecture`는 금지 weight, 하드코딩 색상, FSD/UI 경계를 검사합니다. 대비·긴 문구·초점·모션은 정적 검사만으로 보장되지 않습니다. 검증 범위는 [테스트 정책](testing.md)을 따릅니다. 데이터/빌드 등 다른 작업은 [문서 지도](README.md)에서 시작하세요.
