import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="loading-page">
        <h1>Let’s open a fresh canvas.</h1>
        <p>Something interrupted this screen. Your saved work is safe.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload workspace
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
