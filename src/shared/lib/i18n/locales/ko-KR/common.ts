import type en from '../en-US/common'
type TranslationShape<T> = { [K in keyof T]: T[K] extends string ? string : TranslationShape<T[K]> }
export default {
  tableView: {
    title: '보기 설정',
    description:
      '변경은 이 표에 바로 적용되며, 저장소를 사용할 수 있으면 현재 브라우저에 저장됩니다.',
    density: '행 간격',
    compact: '촘촘하게',
    default: '기본',
    comfortable: '여유롭게',
    columns: '열 설정',
    show: '{{column}} 표시',
    pin: '열 고정',
    pinColumn: '{{column}} 고정',
    none: '고정 안 함',
    left: '왼쪽',
    right: '오른쪽',
    width: '너비(px)',
    widthOf: '{{column}} 너비',
    earlier: '{{column}} 앞으로 이동',
    later: '{{column}} 뒤로 이동',
    move: '{{column}} 이동',
    resize: '{{column}} 너비 조절',
    moveHint: '같은 고정 영역의 다른 열로 드래그하거나 왼쪽·오른쪽 방향키로 이동하세요.',
    resizeHint: '드래그나 방향키로 조절하고 Home 키로 기본 너비를 복원하세요.',
    dropAt: '놓으면 {{column}} 위치로 이동합니다',
    hint: '열은 같은 고정 영역 안에서 이동합니다. 선택·작업 열은 제자리를 유지합니다. 표가 좁아 스크롤할 공간이 부족하면 열 고정이 잠시 해제됩니다.',
    reset: '기본값 복원',
    done: '완료',
  },
  demoStorage: {
    sessionOnly:
      '브라우저에 저장할 수 없어 일부 데모 변경은 이 탭에서만 유지됩니다. 새로고침하거나 탭을 닫으면 변경이 사라질 수 있습니다.',
  },
  breadcrumb: '현재 위치',
  sidebar: '사이드바',
  sidebarDescription: '모바일 탐색 메뉴입니다.',
  closeToast: '알림 닫기',
  command: {
    title: '명령 팔레트',
    description: '실행할 명령을 검색하세요.',
    suggestions: '추천 항목',
  },
  startup: {
    title: '데모를 시작하지 못했어요',
    description: '샘플 데이터 서비스를 시작하지 못했어요. 새로고침 후 다시 시도해 주세요.',
    reload: '새로고침',
  },

  close: '닫기',
  toggleSidebar: '사이드바 전환',
  more: '더 보기',
  previousPage: '이전 페이지로 이동',
  nextPage: '다음 페이지로 이동',
  notifications: '알림',
  linkNewTab: '새 탭에서 열림',
  unsaved: {
    title: '저장하지 않은 변경 내용을 버릴까요?',
    description: '아직 저장하지 않은 내용이 있어요. 나가면 변경 내용이 사라져요.',
    stay: '계속 편집',
    discard: '변경 내용 버리기',
  },
  appError: {
    title: '화면을 표시하지 못했어요',
    description: '문제가 발생했어요. 새로고침 후 다시 시도해 주세요.',
    reload: '새로고침',
  },
  errors: {
    timeoutWrite:
      '요청 시간이 초과됐어요. 변경 내용이 저장됐을 수 있으니 새로고침으로 확인한 후 다시 시도해 주세요.',
    uncertainWrite:
      '요청 결과를 확인하지 못했어요. 변경 내용이 저장됐을 수 있으니 새로고침으로 확인한 후 다시 시도해 주세요.',
    network: '연결하지 못했어요. 네트워크를 확인한 후 다시 시도해 주세요.',
    timeout: '요청 시간이 초과됐어요. 다시 시도해 주세요.',
    invalidResponse: '서버 응답을 확인하지 못했어요.',
    notFound: '항목을 찾지 못했어요. 새로고침 후 다시 시도해 주세요.',
    request: '요청을 완료하지 못했어요. 다시 시도해 주세요.',
    unexpected: '문제가 발생했어요. 다시 시도해 주세요.',
  },
  route: {
    notFound: '404 · 페이지를 찾을 수 없어요',
    backTitle: '다시 시작할 수 있도록 도와드릴게요.',
    back: '개요로 돌아가기',
    errorTitle: '문제가 발생했어요',
    errorDescription: '워크스페이스를 불러오지 못했어요. 다시 시도하거나 새로고침해 주세요.',
    retry: '다시 시도',
  },
} satisfies TranslationShape<typeof en>
