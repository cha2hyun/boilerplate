import { env } from '@/shared/config'

export async function startDemoMocks() {
  if (env.dataSource !== 'demo') return

  // Built demo previews need the same network boundary as development.
  const { worker } = await import('./browser')
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledFrame: 'bypass',
    quiet: true,
  })
}
