/**
 * Sentry Error Boundary
 * Captura errores de React y los envía a Sentry
 */

import * as Sentry from "@sentry/react";
import { Component, ReactNode } from "react";
import { useTranslation } from "../contexts/I18nContext";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  message?: string;
  reloadButton?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class SentryErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-bocado-background p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-xl font-bold text-bocado-dark-green mb-2">
              {this.props.title}
            </h1>
            <p className="text-bocado-gray mb-6">{this.props.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-bocado-green text-white px-6 py-3 rounded-full font-bold hover:bg-bocado-dark-green transition-colors"
            >
              {this.props.reloadButton}
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-6 p-4 bg-red-50 text-red-800 text-xs text-left overflow-auto rounded-lg">
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper funcional que provee las traducciones
export const SentryErrorBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => {
  const { t } = useTranslation();

  return (
    <SentryErrorBoundaryClass
      title={t("sentryErrorBoundary.title")}
      message={t("sentryErrorBoundary.message")}
      reloadButton={t("sentryErrorBoundary.reload")}
      fallback={fallback}
    >
      {children}
    </SentryErrorBoundaryClass>
  );
};

export default SentryErrorBoundary;
