import commonEn from './locales/en-US/common'
import commonKo from './locales/ko-KR/common'
import workspaceEn from './locales/en-US/workspace'
import workspaceKo from './locales/ko-KR/workspace'
import adminEn from './locales/en-US/admin'
import adminKo from './locales/ko-KR/admin'
import examplesEn from './locales/en-US/examples'
import examplesKo from './locales/ko-KR/examples'

import orderEditorEn from './locales/en-US/order-editor'
import orderEditorKo from './locales/ko-KR/order-editor'
import customerEditorEn from './locales/en-US/customer-editor'
import customerEditorKo from './locales/ko-KR/customer-editor'

import demoLoginEn from './locales/en-US/demo-login'
import demoLoginKo from './locales/ko-KR/demo-login'
import workspaceUsersEn from './locales/en-US/workspace-users'
import workspaceUsersKo from './locales/ko-KR/workspace-users'

export const resources = {
  'en-US': {
    common: commonEn,
    demoLogin: demoLoginEn,
    workspaceUsers: workspaceUsersEn,
    workspace: workspaceEn,
    admin: adminEn,
    examples: examplesEn,
    orderEditor: orderEditorEn,
    customerEditor: customerEditorEn,
  },
  'ko-KR': {
    common: commonKo,
    demoLogin: demoLoginKo,
    workspaceUsers: workspaceUsersKo,
    workspace: workspaceKo,
    admin: adminKo,
    examples: examplesKo,
    orderEditor: orderEditorKo,
    customerEditor: customerEditorKo,
  },
} as const
