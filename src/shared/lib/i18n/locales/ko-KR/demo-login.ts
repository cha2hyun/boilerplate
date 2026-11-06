import type en from '../en-US/demo-login'

export default {
  title: '로그인',
  description: '아래 공개 계정으로 이 탭에서 데모 워크스페이스를 열 수 있습니다.',
  browseDashboard: '대시보드 둘러보기',
  demoAccount: '공개 데모 계정',
  fill: '데모 계정 채우기',
  email: '이메일',
  password: '비밀번호',
  submit: '로그인',
  language: '언어 선택',
  emailRequired: '위에 표시된 공개 데모 이메일을 입력해 주세요.',
  passwordRequired: '위에 표시된 공개 데모 비밀번호를 입력해 주세요.',
  useDemoEmail: '공개 데모 계정에 표시된 이메일을 사용해 주세요.',
  useDemoPassword: '공개 데모 계정에 표시된 비밀번호를 사용해 주세요.',
} satisfies Record<keyof typeof en, string>
