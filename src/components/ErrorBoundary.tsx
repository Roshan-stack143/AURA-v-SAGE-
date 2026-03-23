import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong. Please try again later.";
      
      try {
        const message = this.state.error?.message || "";
        if (message.startsWith('{')) {
          const parsed = JSON.parse(message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Database Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path}`;
          }
        }
      } catch {
        // Not a JSON error message
      }

      return (
        <div className="min-h-screen bg-deep-blue flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Oops! An error occurred</h2>
            <p className="text-white/60 mb-8 text-sm leading-relaxed">
              {errorMessage}
            </p>
            <button 
              onClick={this.handleReset}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
