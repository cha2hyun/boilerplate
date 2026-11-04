import commonEn from './locales/en-US/common'
import commonKo from './locales/ko-KR/common'
import workspaceEn from './locales/en-US/workspace'
import workspaceKo from './locales/ko-KR/workspace'
import adminEn from './locales/en-US/admin'
import adminKo from './locales/ko-KR/admin'
import examplesEn from './locales/en-US/examples'
import examplesKo from './locales/ko-KR/examples'

export const resources = {
  'en-US': { common: commonEn, workspace: workspaceEn, admin: adminEn, examples: examplesEn },
  'ko-KR': { common: commonKo, workspace: workspaceKo, admin: adminKo, examples: examplesKo },
} as const
