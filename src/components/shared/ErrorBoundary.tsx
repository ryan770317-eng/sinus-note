import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional fallback renderer. Defaults to a minimal recovery screen. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-4">
          <div className="w-full max-w-sm border border-border bg-card p-6">
            <h1 className="type-heading mb-2">發生錯誤</h1>
            <p className="type-meta mb-4 whitespace-pre-wrap">
              {this.state.error.message || '介面載入異常，您的資料仍然安全。'}
            </p>
            <div className="flex gap-2">
              <button onClick={this.reset} className="btn text-xs">
                重試
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary text-xs"
              >
                重新整理頁面
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
