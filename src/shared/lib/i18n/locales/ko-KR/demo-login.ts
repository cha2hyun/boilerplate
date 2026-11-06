import type en from '../en-US/demo-login'

export default {
  title: '워크스페이스 로그인',
  description: '데모 계정으로 Blueprint에 로그인하세요.',
  previewLabel: '워크스페이스 미리보기',
  previewOrderNumber: '주문 번호',
  browseDashboard: '대시보드 둘러보기',
  or: '또는',
  microsoft: 'Microsoft로 로그인',
  email: '이메일',
  password: '비밀번호',
  submit: '로그인',
  language: '언어 선택',
  emailRequired: '데모 이메일을 입력해 주세요.',
  passwordRequired: '데모 비밀번호를 입력해 주세요.',
  useDemoEmail: '데모 계정의 이메일과 다릅니다. 새로고침하면 기본값으로 돌아갑니다.',
  useDemoPassword: '데모 계정의 비밀번호와 다릅니다. 새로고침하면 기본값으로 돌아갑니다.',
} satisfies Record<keyof typeof en, string>
