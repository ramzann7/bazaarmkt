// src/services/onboardingService.js

const ONBOARDING_KEY = 'food_finder_onboarding';

export const onboardingService = {
  // Check if user has completed onboarding
  hasCompletedOnboarding: (userId) => {
    try {
      const onboardingData = localStorage.getItem(`${ONBOARDING_KEY}_${userId}`);
      if (!onboardingData) return false;
      
      const data = JSON.parse(onboardingData);
      return data.completed || false;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  },

  // Mark onboarding as completed
  markOnboardingCompleted: (userId) => {
    try {
      const onboardingData = {
        completed: true,
        completedAt: new Date().toISOString(),
        userId: userId
      };
      localStorage.setItem(`${ONBOARDING_KEY}_${userId}`, JSON.stringify(onboardingData));
    } catch (error) {
      console.error('Error marking onboarding completed:', error);
    }
  },

  // Check if user is new (first time after registration)
  isNewUser: (userId) => {
    try {
      const onboardingData = localStorage.getItem(`${ONBOARDING_KEY}_${userId}`);
      return !onboardingData; // No onboarding data means new user
    } catch (error) {
      console.error('Error checking if user is new:', error);
      return false;
    }
  },

  // Get onboarding data
  getOnboardingData: (userId) => {
    try {
      const onboardingData = localStorage.getItem(`${ONBOARDING_KEY}_${userId}`);
      return onboardingData ? JSON.parse(onboardingData) : null;
    } catch (error) {
      console.error('Error getting onboarding data:', error);
      return null;
    }
  },

  // Clear onboarding data (useful for testing or reset)
  clearOnboardingData: (userId) => {
    try {
      localStorage.removeItem(`${ONBOARDING_KEY}_${userId}`);
    } catch (error) {
      console.error('Error clearing onboarding data:', error);
    }
  },

  // Check if user should be redirected to profile setup
  shouldRedirectToProfile: (userId) => {
    return onboardingService.isNewUser(userId);
  }
};
