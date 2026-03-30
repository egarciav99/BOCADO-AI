import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "../utils/logger";
import { useTranslation } from "../contexts/I18nContext";

interface Props {
  children: ReactNode;
  title?: string;
  message?: string;
  reloadButton?: string;
  retryButton?: string;
}

interface State {
  hasError: boolean;
  // ✅ FIX: guardar el error para reporte y debug
  error: Error | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  // ✅ FIX: displayName para React DevTools
  static displayName = "ErrorBoundary";

  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ErrorBoundary caught an error:", error, errorInfo);

    // ✅ FIX: reportar a Sentry u otro servicio si está configurado
    // Ejemplo: Sentry.captureException(error, { extra: errorInfo });
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    }
  }

  // ✅ FIX: reset del boundary sin recargar la página
  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-full flex items-center justify-center p-6 pt-safe pb-safe bg-bocado-cream text-center">
          <div className="bg-white p-8 rounded-3xl shadow-bocado max-w-sm">
            <span className="text-4xl mb-4 block">🥗</span>
            <h2 className="text-xl font-bold text-bocado-dark-green mb-2">
              {this.props.title}
            </h2>
            <p className="text-sm text-bocado-gray mb-6">
              {this.props.message}
            </p>

            {/* ✅ FIX: reintentar primero, recargar como última opción */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-bocado-green text-white font-bold py-3 rounded-full shadow-bocado hover:bg-bocado-dark-green transition-all"
              >
                {this.props.retryButton}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full text-bocado-gray font-medium py-2 text-sm hover:text-bocado-dark-gray transition-colors"
              >
                {this.props.reloadButton}
              </button>
            </div>

            {/* ✅ Mostrar detalles del error solo en desarrollo */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-bocado-gray cursor-pointer">
                  Error details
                </summary>
                <pre className="text-xs text-red-500 mt-2 overflow-auto max-h-32 bg-red-50 p-2 rounded-lg">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
    <ErrorBoundaryClass
      title={t("errorBoundary.title")}
      message={t("errorBoundary.message")}
      retryButton={t("errorBoundary.retry")}
      reloadButton={t("errorBoundary.reload")}
    >
      {children}
    </ErrorBoundaryClass>
  );
};

export default ErrorBoundary;
