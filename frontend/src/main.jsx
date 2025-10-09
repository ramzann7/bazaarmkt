// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Toaster } from "react-hot-toast";
import { setupChunkLoadErrorHandler, isChunkLoadError, showReloadPrompt } from "./utils/chunkLoadHandler";

// Initialize chunk load error handler
setupChunkLoadErrorHandler();

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error);
    console.error('Error Info:', errorInfo);
    
    // Check if it's a chunk loading error
    if (isChunkLoadError(error)) {
      showReloadPrompt(error);
      return;
    }
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
            <h1 className="text-2xl font-bold text-red-600 mb-4">App Error</h1>
            <p className="text-gray-700 mb-4">The app encountered an error and crashed.</p>
            <div className="bg-gray-100 p-4 rounded text-sm font-mono overflow-auto">
              <pre>{this.state.error?.message || 'Unknown error'}</pre>
              <pre className="mt-2 text-xs">{this.state.error?.stack}</pre>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Test component to load the app with error handling
function AppLoader() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [App, setApp] = React.useState(null);

  React.useEffect(() => {
    const loadApp = async () => {
      try {
        console.log('Loading App component...');
        const { default: AppComponent } = await import('./app.jsx');
        console.log('App component loaded successfully');
        setApp(() => AppComponent);
      } catch (err) {
        console.error('Failed to load App component:', err);
        
        // Check if it's a chunk loading error
        if (isChunkLoadError(err)) {
          showReloadPrompt(err);
          return;
        }
        
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadApp();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Loading Error</h1>
          <p className="text-gray-700 mb-4">Failed to load the application.</p>
          <div className="bg-gray-100 p-4 rounded text-sm font-mono overflow-auto">
            <pre>{error}</pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!App) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">App Not Loaded</h1>
          <p className="text-gray-600">The App component failed to load.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <App />
      <Toaster position="top-right" reverseOrder={false} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppLoader />
    </ErrorBoundary>
  </React.StrictMode>
);
// Cache bust comment - Thu Sep 25 22:58:54 EDT 2025
