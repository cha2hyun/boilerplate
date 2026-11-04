export default {
  breadcrumb: 'breadcrumb',
  sidebar: 'Sidebar',
  sidebarDescription: 'Displays the mobile sidebar.',
  closeToast: 'Close toast',
  command: {
    title: 'Command Palette',
    description: 'Search for a command to run...',
    suggestions: 'Suggestions',
  },
  startup: {
    title: 'Unable to start the demo',
    description: 'The sample data service could not start. Reload this page to try again.',
    reload: 'Reload page',
  },

  close: 'Close',
  toggleSidebar: 'Toggle Sidebar',
  more: 'More',
  previousPage: 'Go to previous page',
  nextPage: 'Go to next page',
  notifications: 'Notifications',
  linkNewTab: 'Opens in a new tab',
  errors: {
    timeoutWrite:
      'The request timed out. Your changes may have been saved. Refresh to check before trying again.',
    uncertainWrite:
      'The result could not be confirmed. Your changes may have been saved. Refresh to check before trying again.',
    network: 'Unable to connect. Check your connection and try again.',
    timeout: 'The request timed out. Please try again.',
    invalidResponse: 'The server returned an unexpected response.',
    notFound: 'This item could not be found. Refresh and try again.',
    request: 'The request could not be completed. Please try again.',
    unexpected: 'Something went wrong. Please try again.',
  },
  route: {
    notFound: '404 · PAGE NOT FOUND',
    backTitle: "Let's get you back on track.",
    back: 'Back to overview',
    errorTitle: 'Something went wrong',
    errorDescription: "Your workspace couldn't load. Try again or refresh this page.",
    retry: 'Try again',
  },
} as const
