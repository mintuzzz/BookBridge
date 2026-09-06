import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('⚠️ [React ErrorBoundary Caught Error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }} className="card">
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-dark)' }}>
            Something went wrong loading this view
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred. Please try refreshing.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-emerald"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
