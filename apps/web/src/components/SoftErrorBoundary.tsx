import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Keeps marketing pages up when optional WebGL / 3D toys fail (headless, no GPU). */
export class SoftErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[SoftErrorBoundary]', error.message, info.componentStack)
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null
    return this.props.children
  }
}
