# 텍스트 링크

본문·설명·푸터의 텍스트 탐색은 `TextLink`가 소유합니다. 앱 내부 경로는 같은 표현을 사용하는 `RouterTextLink`로 연결합니다. 사이드바·Breadcrumb·메뉴·버튼 형태의 탐색은 해당 shadcn 컴포넌트를 유지합니다.

## 구성과 의미

- 설치된 shadcn의 `Button variant="link"` + `asChild`를 조합합니다. 별도 UI 라이브러리나 CSS를 추가하지 않습니다. 이 조합만 허용하는 이유는 [ADR 004](../adr/004-text-link-composition.md)에 기록합니다.
- 최종 DOM은 `href`가 있는 **`<a>`**입니다. 클릭 가능한 `span`이나 `role="button"`으로 탐색을 흉내 내지 않습니다. 내부 `span`은 글자·아이콘 정렬과 접근성 설명에만 사용합니다.
- 저장·삭제·열기 같은 동작은 `Button`의 책임입니다. 링크를 버튼처럼 쓰거나 링크 안에 다른 링크/버튼을 넣지 않습니다.

## URL과 탭 정책

| 대상                        | 기본 동작           | 호출자가 바꿀 수 있는 값            |
| --------------------------- | ------------------- | ----------------------------------- |
| 현재 origin의 경로·해시·URL | 현재 탭 `_self`     | `target="_blank"`로 새 탭 요청 가능 |
| 다른 origin의 HTTP(S) URL   | 항상 새 탭 `_blank` | `_self`를 전달해도 외부 정책이 우선 |
| 지원하지 않는 URL           | 탐색하지 않음       | 실행 가능한 href를 만들지 않음      |

외부 여부는 문자열에 도메인이 포함되는지로 판단하지 않습니다. 브라우저의 현재 URL을 기준으로 `new URL()`로 해석하고 **origin(프로토콜·호스트·포트)**을 비교합니다. 다른 서브도메인·포트·프로토콜도 외부로 취급합니다. 상대 경로, 해시, protocol-relative URL도 같은 해석을 따릅니다.

현재 범위는 웹 탐색용 HTTP(S)·상대 경로·해시입니다. `javascript:`, `data:`, `file:` 등 다른 프로토콜과 자격 증명이 포함된 URL은 전달하지 않습니다. 유효하지 않은 값은 href 없는 `aria-disabled` 상태로 처리해 실행을 막으며 화면 전체를 오류로 바꾸지 않습니다. 메일·전화·다운로드는 필요할 때 별도 계약으로 추가합니다.

`target`은 HTML과 같은 이름으로 `_self` / `_blank`만 지원합니다. `blank`, `newTab`, `external` 같은 중복 속성은 두지 않습니다. 외부 링크를 현재 탭으로 강제하는 예외도 두지 않습니다.

`disabled`는 Router의 비활성 상태도 같은 계약으로 받습니다. `true`이면 href를 제거하고 탭 순서와 클릭 탐색에서 제외합니다. 유효한 URL은 브라우저가 해석한 절대 URL로 정규화합니다.

새 탭 링크에는 `rel="noopener noreferrer"`를 보장합니다. 호출자의 `nofollow` 등 추가 rel 토큰은 보존하고 `opener`는 제거합니다. 최종 href·target·rel은 컴포넌트가 결정하므로 props 전달 순서로 정책을 덮어쓰지 않습니다.

## 시각 표현과 접근성

- **항상 밑줄**을 표시하고 `underline-offset-4`를 사용합니다. 오른쪽에 Lucide `ArrowUpRight`를 배치하며 장식 아이콘에는 `aria-hidden="true"`를 둡니다. 아이콘만 보고 새 탭 여부를 알아야 하는 구조로 만들지 않습니다.
- shadcn의 primary/ring 의미 토큰과 focus-visible 표현을 재사용합니다. 부모의 글자 크기와 줄 높이를 따르고 링크용 고정 높이·버튼 패딩을 없앱니다. 긴 텍스트는 줄바꿈하고 모바일에서 가로 넘침을 만들지 않습니다.
- 새 탭에는 한국어 `새 탭에서 열림`, 영어 `Opens in a new tab` 설명을 `aria-describedby`로 연결합니다. 기존 설명 ID와 함께 유지하며 `aria-label`을 지정해도 설명이 사라지지 않게 합니다.
- `className`, `ref`, `title`, `aria-*`, `data-*`, 기본 포인터/키보드 이벤트 등 anchor 속성을 전달할 수 있습니다. inline style, HTML 주입, `download`, 임의 `asChild`로 정책을 우회하지 않습니다. 명확한 보이는 링크 문구를 제공하며 focus ring/밑줄을 제거하는 클래스는 사용하지 않습니다.
- 기본 탐색을 위한 `window.open`, `preventDefault` 또는 키 이벤트를 추가하지 않습니다. 브라우저의 Enter·중간 클릭·수정 키 동작을 유지합니다.

## 사용 API

소유 파일은 `src/shared/ui/text-link.tsx`, URL 판별은 `src/shared/lib/link-policy.ts`, 공통 새 탭 설명은 `shared/lib/i18n`의 common 리소스입니다.

```tsx
// 외부: 항상 새 탭
<TextLink href="https://github.com/cha2hyun/boilerplate">GitHub</TextLink>

// 문서 안의 위치: 현재 탭
<TextLink href="#details">상세 내용</TextLink>

// 앱 경로: TanStack Router의 경로/params/search 타입과 SPA 탐색 유지
<RouterTextLink to="/projects">프로젝트</RouterTextLink>
<RouterTextLink to="/projects" target="_blank">프로젝트 새 탭</RouterTextLink>
```

`RouterTextLink`는 공식 `createLink`로 같은 anchor를 연결합니다. 라우터의 `to`/`params`/`search` 타입을 string으로 바꾸거나 별도 라우터를 만들지 않습니다. 내부 경로를 일반 href로 연결해 전체 페이지를 다시 로드하지 않습니다. 비활성 링크나 잘못된 URL에서는 Router handler도 탐색하지 않아야 합니다.

## 현재 적용과 검증

공통 푸터 왼쪽은 한국어 `cha2hyun이 만들었습니다`, 영어 `Made by cha2hyun`으로 표시합니다. 문장은 author 보간을 사용하는 번역 리소스가 소유합니다. 오른쪽 `GitHub`는 프로젝트 저장소를 가리키는 TextLink입니다. 모바일·태블릿·PC 모두 좌우와 세로 중심 정렬을 유지합니다.

계약 테스트는 외부 `_self` 강제 무시, 같은 origin/상대 URL, 잘못된 프로토콜, rel 보존, 번역된 새 탭 설명, 실제 Router 탐색과 새 탭 동작을 확인합니다. 단순 class 스냅샷이나 스타일 구현을 복제하는 테스트는 만들지 않습니다. 로컬 기본 검증은 정적 검사이며 전체 테스트·Actions 실행 시점은 사용자의 최신 지시를 따릅니다.

공식 근거: [shadcn Radix Button의 Link/As Child](https://ui.shadcn.com/docs/components/radix/button#as-child), [TanStack Router createLink](https://tanstack.com/router/latest/docs/framework/react/guide/custom-link), [HTML anchor](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a).
