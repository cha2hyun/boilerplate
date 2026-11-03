import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/app'
import { startDemoMocks } from '@/app/mocks/start'
import { StartupError } from '@/app/mocks/startup-error'
import '@/app/styles/globals.css'
const root = document.getElementById('root')
if (!root) throw new Error('Application root element is missing')
const reactRoot = createRoot(root)

void startDemoMocks()
  .then(() => {
    reactRoot.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((error: unknown) => {
    console.error('The demo data service failed to start.', error)
    reactRoot.render(<StartupError />)
  })
