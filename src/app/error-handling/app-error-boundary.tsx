import { Component, type ReactNode } from 'react'
import { reportError } from '@/shared/lib/error-reporting'
import { ErrorFallback } from './error-fallback'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    reportError(error, { source: 'app-boundary' })
  }

  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children
  }
}
