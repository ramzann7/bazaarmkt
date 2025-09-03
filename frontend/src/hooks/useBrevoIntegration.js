import { useState, useEffect, useCallback } from 'react';
import { initializeNotificationService } from '../services/notificationService';
import { isBrevoInitialized, getBrevoStatus } from '../services/brevoService';

export const useBrevoIntegration = () => {
  const [brevoApiKey, setBrevoApiKey] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize Brevo with API key
  const initializeBrevo = useCallback(async (apiKey) => {
    if (!apiKey) {
      setError('API key is required');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Initialize the notification service with Brevo
      initializeNotificationService(apiKey);
      
      // Store API key in localStorage (encrypted in production)
      localStorage.setItem('brevo_api_key', apiKey);
      
      setBrevoApiKey(apiKey);
      setIsInitialized(true);
      
      console.log('✅ Brevo integration initialized successfully');
      return true;
    } catch (err) {
      setError(err.message || 'Failed to initialize Brevo integration');
      console.error('❌ Brevo initialization error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Remove Brevo integration
  const removeBrevo = useCallback(() => {
    try {
      localStorage.removeItem('brevo_api_key');
      setBrevoApiKey(null);
      setIsInitialized(false);
      setError(null);
      
      console.log('✅ Brevo integration removed');
      return true;
    } catch (err) {
      setError(err.message || 'Failed to remove Brevo integration');
      return false;
    }
  }, []);

  // Test Brevo connection
  const testBrevoConnection = useCallback(async () => {
    if (!isInitialized) {
      setError('Brevo not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to get Brevo status
      const status = getBrevoStatus();
      
      if (status.initialized) {
        console.log('✅ Brevo connection test successful');
        return true;
      } else {
        throw new Error('Brevo not properly initialized');
      }
    } catch (err) {
      setError(err.message || 'Brevo connection test failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem('brevo_api_key');
    if (storedApiKey) {
      setBrevoApiKey(storedApiKey);
      setIsInitialized(true);
      initializeNotificationService(storedApiKey);
    }
  }, []);

  // Check if Brevo is available
  const checkBrevoStatus = useCallback(() => {
    return isBrevoInitialized();
  }, []);

  // Get Brevo configuration status
  const getBrevoConfigStatus = useCallback(() => {
    return {
      apiKey: brevoApiKey ? '***' + brevoApiKey.slice(-4) : null,
      isInitialized,
      isAvailable: checkBrevoStatus(),
      hasStoredKey: !!localStorage.getItem('brevo_api_key')
    };
  }, [brevoApiKey, isInitialized, checkBrevoStatus]);

  return {
    // State
    brevoApiKey,
    isInitialized,
    isLoading,
    error,
    
    // Actions
    initializeBrevo,
    removeBrevo,
    testBrevoConnection,
    checkBrevoStatus,
    
    // Status
    getBrevoConfigStatus
  };
};
