/**
 * Chunk Load Error Handler
 * Handles dynamic import failures and prompts users to reload when assets are outdated
 */

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Check if error is a chunk loading error
 */
export const isChunkLoadError = (error) => {
  if (!error) return false;
  
  const message = error.message || error.toString();
  const chunkErrorPatterns = [
    'failed to fetch dynamically imported module',
    'loading chunk',
    'loading css chunk',
    'dynamically imported module',
    'failed to fetch',
  ];
  
  return chunkErrorPatterns.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
};

/**
 * Retry loading a chunk with exponential backoff
 */
export const retryChunkLoad = async (importFn, retries = RETRY_ATTEMPTS) => {
  try {
    return await importFn();
  } catch (error) {
    if (retries === 0 || !isChunkLoadError(error)) {
      throw error;
    }
    
    // Wait before retrying (exponential backoff)
    const delay = RETRY_DELAY * (RETRY_ATTEMPTS - retries + 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log(`Retrying chunk load... (${RETRY_ATTEMPTS - retries + 1}/${RETRY_ATTEMPTS})`);
    return retryChunkLoad(importFn, retries - 1);
  }
};

/**
 * Show reload prompt to user
 */
export const showReloadPrompt = (error) => {
  const message = 
    'A new version of the app is available. Please reload the page to continue.';
  
  // Create custom modal for better UX
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  
  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    ">
      <div style="
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #111827;
      ">
        🔄 Update Available
      </div>
      <p style="
        color: #6b7280;
        margin-bottom: 20px;
        line-height: 1.5;
      ">
        ${message}
      </p>
      <button id="reload-btn" style="
        width: 100%;
        padding: 12px;
        background: #f97316;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      ">
        Reload Now
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const reloadBtn = document.getElementById('reload-btn');
  reloadBtn.addEventListener('click', () => {
    // Clear all caches and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload(true);
  });
  
  reloadBtn.addEventListener('mouseenter', () => {
    reloadBtn.style.background = '#ea580c';
  });
  
  reloadBtn.addEventListener('mouseleave', () => {
    reloadBtn.style.background = '#f97316';
  });
};

/**
 * Handle chunk load error globally
 */
export const handleChunkLoadError = (error) => {
  console.error('Chunk load error detected:', error);
  
  if (isChunkLoadError(error)) {
    showReloadPrompt(error);
    return true;
  }
  
  return false;
};

/**
 * Set up global error listener for chunk loading failures
 */
export const setupChunkLoadErrorHandler = () => {
  // Handle unhandled promise rejections (common for dynamic imports)
  window.addEventListener('unhandledrejection', (event) => {
    if (handleChunkLoadError(event.reason)) {
      event.preventDefault(); // Prevent default error logging
    }
  });
  
  // Handle regular errors
  window.addEventListener('error', (event) => {
    if (handleChunkLoadError(event.error)) {
      event.preventDefault();
    }
  });
  
  console.log('✅ Chunk load error handler initialized');
};

/**
 * Create a lazy loader with automatic retry and error handling
 */
export const lazyWithRetry = (importFn) => {
  return async () => {
    try {
      return await retryChunkLoad(importFn);
    } catch (error) {
      if (isChunkLoadError(error)) {
        showReloadPrompt(error);
      }
      throw error;
    }
  };
};

