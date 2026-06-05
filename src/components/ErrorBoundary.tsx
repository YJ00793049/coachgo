// @ts-nocheck
import { Component, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Uncaught error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--paper)' }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(188,90,72,0.1)', border: '1px solid rgba(188,90,72,0.25)' }}>
            <span className="text-2xl">⚠</span>
          </div>
          <h1 className="font-display text-3xl mb-3" style={{ color: 'var(--ink)' }}>Something went wrong</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-soft)' }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload(); }}
              className="btn-primary py-3 px-6 text-sm"
            >
              Refresh Page
            </button>
            <Link to="/" className="btn-secondary py-3 px-6 text-sm">Go Home</Link>
          </div>
          {this.state.message && (
            <p className="mt-6 text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>
              {this.state.message}
            </p>
          )}
        </div>
      </div>
    );
  }
}
