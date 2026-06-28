import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Quorum] app surface failed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid-lines flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="cell w-full max-w-lg p-6">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="mono-label mb-2">Runtime guard</div>
          <h1 className="text-[20px] font-semibold tracking-tight">This surface failed to load</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-secondary">
            Quorum kept the app contained. Reload the current view, or return to Pipeline while
            this issue is investigated.
          </p>
          <code className="mt-4 block overflow-x-auto rounded border border-border bg-bg p-3 font-mono text-[11px] text-tertiary">
            {this.state.error.message}
          </code>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary h-9 px-4"
            >
              Reload view
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/pipeline")}
              className="btn-secondary h-9 px-4"
            >
              Open Pipeline
            </button>
          </div>
        </div>
      </div>
    );
  }
}
