'use client';

import React from 'react';
import { logger } from '@/lib/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          color: '#fff',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h1 style={{ fontSize: '48px', margin: '0 0 12px 0', fontWeight: '600' }}>
              🔴 Something went wrong
            </h1>
            <p style={{ fontSize: '14px', opacity: 0.7, margin: '0 0 24px 0', lineHeight: '1.6' }}>
              We encountered an unexpected error. Your data is safe. Try reloading or contact support if the problem persists.
            </p>
            <div style={{
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '24px',
              fontSize: '12px',
              color: '#ff6b6b',
              fontFamily: 'monospace',
              maxHeight: '120px',
              overflowY: 'auto',
            }}>
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button
              onClick={this.handleReset}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#625af6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#7c6fff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#625af6')}
            >
              ↻ Reload App
            </button>
            <p style={{ fontSize: '11px', opacity: 0.5, margin: '16px 0 0 0' }}>
              Error logs have been saved for debugging
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
