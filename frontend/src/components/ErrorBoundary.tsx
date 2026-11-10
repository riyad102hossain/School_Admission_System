import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

/**
 * Catches unexpected rendering errors so the user sees a message and a way out
 * instead of a blank page. API errors are handled where they happen; this is the last line.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <section className="narrow">
        <div className="card crash-card" role="alert">
          <h1>কিছু একটা ভুল হয়েছে</h1>
          <p className="muted">
            পাতাটি দেখাতে একটি অপ্রত্যাশিত সমস্যা হয়েছে। আপনার আবেদনের তথ্য সার্ভারে নিরাপদে আছে। পাতাটি আবার লোড করুন।
          </p>
          <div className="actions">
            <button type="button" className="button" onClick={() => window.location.reload()}>
              আবার লোড করুন
            </button>
            <a href="/classes" className="button button-secondary">
              ক্লাস তালিকায় যান
            </a>
          </div>
        </div>
      </section>
    )
  }
}
