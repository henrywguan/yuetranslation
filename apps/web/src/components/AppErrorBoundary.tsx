import { Component, type ErrorInfo, type ReactNode } from 'react'
import { captureDiagnostic } from '../lib/diagnostics'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Keep a throw in one route from wiping `#root` (React default with no boundary).
 * Chat entitlement races previously blanked the whole SPA.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureDiagnostic(
      'error',
      `AppErrorBoundary: ${error.message} ${info.componentStack?.slice(0, 180) || ''}`.slice(0, 240),
    )
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="app-error-boundary" role="alert" style={{ padding: '2rem', maxWidth: '28rem', margin: '10vh auto' }}>
        <h1 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>Something went wrong</h1>
        <p style={{ color: '#6a6b70', margin: '0 0 1rem' }}>
          The page hit an unexpected error. Reload to continue — if this keeps happening on Chat, try a hard refresh.
        </p>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null })
            window.location.reload()
          }}
          style={{
            appearance: 'none',
            border: 0,
            background: '#4d6bfe',
            color: '#fff',
            borderRadius: '0.65rem',
            padding: '0.55rem 0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    )
  }
}
