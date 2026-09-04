import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack?: string | null;
  remountKey: number;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({
  error,
  resetError,
  componentStack,
}: ErrorFallbackProps & { componentStack?: string | null }) {
  return (
    <div className="noise grid min-h-[100dvh] w-full place-items-center bg-background p-6 text-foreground">
      <div className="surface w-full max-w-lg rounded-2xl p-8 text-center border border-zinc-800 bg-zinc-950/90 shadow-2xl backdrop-blur-xl">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-xs font-black text-zinc-950 shadow-md shadow-amber-400/20">
          NG
        </span>
        <p className="eyebrow mt-5 text-amber-400 text-xs font-mono font-bold tracking-widest uppercase">
          Workspace Interruption
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-100">
          Something needs a second look.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          This view hit an error. Your trip records are safe; try the request again.
        </p>
        {import.meta.env.DEV ? (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-left text-xs text-amber-300 max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
            {error.message || String(error)}
            {componentStack ? `\n\nComponent Stack:\n${componentStack}` : ""}
          </pre>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={resetError}
            className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-300 shadow-lg shadow-amber-400/25 transition-all cursor-pointer"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition-all cursor-pointer"
          >
            Reload Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, componentStack: null, remountKey: 0 };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error: toError(error), componentStack: null };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.setState({ componentStack: info.componentStack });
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState((prev) => ({
      error: null,
      componentStack: null,
      remountKey: prev.remountKey + 1,
    }));
  };

  render(): ReactNode {
    const { error, componentStack, remountKey } = this.state;
    if (error === null) {
      return <div key={remountKey} className="contents">{this.props.children}</div>;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return (
      <Fallback
        error={error}
        resetError={this.resetError}
        componentStack={componentStack}
      />
    );
  }
}
