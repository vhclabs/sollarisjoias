import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console for debugging — visible in browser devtools
    console.error("[Sollaris ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch {
      /* noop */
    }
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* noop */
    }
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="storefront min-h-screen flex items-center justify-center px-6 py-16 bg-background text-foreground">
        <div className="max-w-md w-full text-center">
          <p className="font-sans text-[10px] tracking-[0.32em] uppercase text-muted-foreground mb-6">
            Sollaris
          </p>
          <h1 className="font-serif text-3xl leading-tight mb-3">
            Algo saiu do lugar
          </h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Tivemos um soluço ao carregar a página. Tente recarregar — se o problema persistir,
            limpe os dados locais e abra a loja novamente.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={this.handleReload}
              className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground text-[11px] tracking-[0.2em] uppercase hover:opacity-90 transition-opacity"
            >
              Recarregar
            </button>
            <button
              onClick={this.handleReset}
              className="w-full sm:w-auto px-6 py-3 border border-border text-[11px] tracking-[0.2em] uppercase hover:bg-secondary transition-colors"
            >
              Limpar e voltar à loja
            </button>
          </div>
          {this.state.error?.message && (
            <details className="mt-8 text-left text-xs text-muted-foreground/80">
              <summary className="cursor-pointer">Detalhes técnicos</summary>
              <pre className="mt-3 p-3 bg-muted/40 rounded overflow-auto text-[11px]">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
