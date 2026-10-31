import { Component, type ReactNode } from 'react'

interface SceneBoundaryProps {
  /** Rendered instead of the children when the 3D scene throws (no WebGL, lost context, failed import). */
  fallback: ReactNode
  children: ReactNode
}

interface SceneBoundaryState {
  failed: boolean
}

export class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false }

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
