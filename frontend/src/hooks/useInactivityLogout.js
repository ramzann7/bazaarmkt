/**
 * Inactivity Logout Hook
 * 
 * Automatically logs out users after a period of inactivity.
 * Tracks user activity (mouse, keyboard, touch) and triggers logout
 * when no activity is detected for the specified duration.
 * 
 * Features:
 * - Configurable inactivity timeout
 * - Warning notification before logout
 * - Activity detection (mouse, keyboard, touch, scroll)
 * - Cleanup on unmount
 * - Works with Vercel serverless architecture
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Default configuration
const DEFAULT_CONFIG = {
  // Inactivity timeout in milliseconds (5 minutes)
  inactivityTimeout: 5 * 60 * 1000,
  
  // Warning time before logout in milliseconds (30 seconds)
  warningTime: 30 * 1000,
  
  // Events to track for activity detection
  activityEvents: [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ],
  
  // Enable/disable logging for debugging
  enableLogging: false
};

/**
 * Hook to handle automatic logout due to inactivity
 * 
 * @param {Object} config - Configuration options
 * @param {number} config.inactivityTimeout - Time in ms before logout (default: 5 minutes)
 * @param {number} config.warningTime - Time in ms to show warning before logout (default: 30 seconds)
 * @param {boolean} config.enabled - Enable/disable the hook (default: true)
 * @param {Function} config.onWarning - Callback when warning is shown
 * @param {Function} config.onLogout - Callback when user is logged out
 */
export const useInactivityLogout = (config = {}) => {
  const { isAuthenticated, logout, user } = useAuth();
  
  // Merge config with defaults
  const settings = {
    ...DEFAULT_CONFIG,
    ...config,
    enabled: config.enabled !== false // Default to true
  };
  
  // Refs to store timeout IDs
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const warningToastRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  
  /**
   * Log activity (only when enabled)
   */
  const log = useCallback((message, ...args) => {
    if (settings.enableLogging) {
      console.log(`[InactivityLogout] ${message}`, ...args);
    }
  }, [settings.enableLogging]);
  
  /**
   * Clear all timers
   */
  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    
    // Dismiss any warning toast
    if (warningToastRef.current) {
      toast.dismiss(warningToastRef.current);
      warningToastRef.current = null;
    }
  }, []);
  
  /**
   * Handle automatic logout
   */
  const handleAutoLogout = useCallback(() => {
    log('Auto-logout triggered due to inactivity');
    
    // Call custom callback if provided
    if (settings.onLogout) {
      settings.onLogout();
    }
    
    // Clear timers
    clearTimers();
    
    // Show logout notification
    toast.error('You have been logged out due to inactivity', {
      duration: 5000,
      icon: '⏱️'
    });
    
    // Perform logout
    logout();
  }, [logout, settings, clearTimers, log]);
  
  /**
   * Show warning before logout
   */
  const showWarning = useCallback(() => {
    const warningSeconds = Math.floor(settings.warningTime / 1000);
    log(`Showing warning - logout in ${warningSeconds} seconds`);
    
    // Call custom callback if provided
    if (settings.onWarning) {
      settings.onWarning();
    }
    
    // Show warning toast
    warningToastRef.current = toast.error(
      `You will be logged out in ${warningSeconds} seconds due to inactivity. Move your mouse to stay logged in.`,
      {
        duration: settings.warningTime,
        icon: '⚠️'
      }
    );
    
    // Set final logout timer
    warningTimerRef.current = setTimeout(() => {
      handleAutoLogout();
    }, settings.warningTime);
  }, [settings, handleAutoLogout, log]);
  
  /**
   * Reset inactivity timer
   */
  const resetTimer = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Throttle reset to avoid excessive timer updates (only reset if > 1 second since last activity)
    if (timeSinceLastActivity < 1000) {
      return;
    }
    
    lastActivityRef.current = now;
    log('Activity detected - resetting timer');
    
    // Clear existing timers
    clearTimers();
    
    // Set warning timer (triggers before final logout)
    const warningDelay = settings.inactivityTimeout - settings.warningTime;
    inactivityTimerRef.current = setTimeout(() => {
      showWarning();
    }, warningDelay);
  }, [settings, clearTimers, showWarning, log]);
  
  /**
   * Setup activity listeners
   */
  useEffect(() => {
    // Only enable if user is authenticated and hook is enabled
    if (!isAuthenticated || !settings.enabled || !user) {
      log('Hook disabled - not authenticated or disabled by config');
      return;
    }
    
    log('Inactivity logout enabled', {
      timeout: `${settings.inactivityTimeout / 1000}s`,
      warning: `${settings.warningTime / 1000}s`,
      user: user.email
    });
    
    // Start the timer
    resetTimer();
    
    // Add event listeners for activity detection
    settings.activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });
    
    // Cleanup function
    return () => {
      log('Cleaning up inactivity logout');
      
      // Remove event listeners
      settings.activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      
      // Clear timers
      clearTimers();
    };
  }, [isAuthenticated, user, settings, resetTimer, clearTimers, log]);
  
  // Return utility functions for manual control
  return {
    resetTimer,
    clearTimers,
    getRemainingTime: () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = settings.inactivityTimeout - elapsed;
      return Math.max(0, remaining);
    }
  };
};

export default useInactivityLogout;

