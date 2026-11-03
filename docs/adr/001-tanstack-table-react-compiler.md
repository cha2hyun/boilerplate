# ADR 001: TanStack Table v8의 React Compiler 경고 범위

상태: 채택

## 맥락

프로젝트 테이블은 TanStack Table v8의 `useReactTable`을 사용합니다. React Hooks의 `incompatible-library` 규칙은 이 API의 변경 가능한 내부 모델이 React Compiler 자동 메모이제이션과 호환되지 않을 수 있음을 알립니다. 현재 Vite 구성에는 React Compiler가 활성화되어 있지 않습니다.

## 결정

`src/widgets/project-table/ui/project-table.tsx`의 `useReactTable` 호출 한 줄에만 `react-hooks/incompatible-library` 예외를 적용합니다. 다른 React Hooks 규칙과 나머지 파일의 검사는 유지합니다. 테이블 인스턴스를 자동/수동 메모이제이션으로 숨기지 않고 TanStack Table의 상태 업데이트 API를 사용합니다.

## 대안과 결과

이 경고만을 피하기 위해 테이블을 직접 구현하면 정렬/필터/페이지 나누기의 검증 범위가 커집니다. 라이브러리의 지원 범위 안에서 사용하고, 향후 Compiler를 활성화하거나 Table 메이저 버전을 올릴 때 호환성을 다시 확인합니다.

## 검증과 재검토 조건

프로젝트 목록의 필터, 정렬, 페이지 이동, 편집 후 갱신을 브라우저 테스트에서 확인합니다. Compiler 활성화 전 이 예외를 재검토하고 해당 흐름이 오래된 화면을 표시하지 않는지 검증해야 합니다.

근거: [React incompatible-library 규칙](https://react.dev/reference/eslint-plugin-react-hooks/lints/incompatible-library).
