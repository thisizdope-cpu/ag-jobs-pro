import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Ag Jobs Pro render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{maxWidth: 760, margin: '48px auto', padding: 24, fontFamily: 'system-ui, sans-serif'}}>
          <h1>Ag Jobs Pro couldn’t load.</h1>
          <p>Please refresh the page. If the problem continues, the current deployment may need to be rolled back.</p>
          <button onClick={() => window.location.reload()}>Reload app</button>
        </main>
      );
    }

    return this.props.children;
  }
}
