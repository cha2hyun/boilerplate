/** Public product identity. Keep secrets and per-user values out of this module. */
export const product = {
  name: 'Blueprint',
  wordmark: 'blueprint',
  author: 'cha2hyun',
  repositoryUrl: 'https://github.com/cha2hyun/boilerplate',
  documentationUrl: 'https://github.com/cha2hyun/boilerplate#readme',
  defaultWorkspaceName: 'Acme Studio',
} as const

/** Preserve these values for existing users; a fork should choose its own namespace. */
export const storageKeys = {
  theme: 'blueprint-theme',
  workspacePreferences: 'blueprint-preferences',
  localePreferences: 'blueprint-locale-preferences',
  demoProjects: 'orbit.demo.projects.v1',
  demoOrders: 'orbit.demo.orders.v1',
  demoCustomers: 'orbit.demo.customers.v1',
  demoWorkspaceUsers: 'orbit.demo.workspace-users.v1',
  demoSession: 'blueprint.demo.session.v1',
} as const
