import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';
import { useTranslation } from '../contexts/I18nContext';

interface Props { 
  children: ReactNode;
  title?: string;
  message?: string;
  reloadButton?: string;
}
interface State { hasError: boolean; }

class ErrorBoundaryClass extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-full flex items-center justify-center p-6 pt-safe pb-safe bg-bocado-cream text-center">
          <div className="bg-white p-8 rounded-3xl shadow-bocado max-w-sm">
            <span className="text-4xl mb-4 block">🥗</span>
            <h2 className="text-xl font-bold text-bocado-dark-green mb-2">{this.props.title}</h2>
            <p className="text-sm text-bocado-gray mb-6">{this.props.message}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-bocado-green text-white font-bold py-3 rounded-full shadow-bocado hover:bg-bocado-dark-green transition-all"
            >
              {this.props.reloadButton}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrapper funcional que provee las traducciones
const ErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  
  return (
    <ErrorBoundaryClass
      title={t('errorBoundary.title')}
      message={t('errorBoundary.message')}
      reloadButton={t('errorBoundary.reload')}
    >
      {children}
    </ErrorBoundaryClass>
  );
};

export default ErrorBoundary;
