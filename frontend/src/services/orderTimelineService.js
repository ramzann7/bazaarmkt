/**
 * Order Timeline Service (Frontend)
 * Interfaces with backend OrderTimelineService for comprehensive order timeline management
 * Phase 1 Implementation
 */

import api from './apiClient';
import config from '../config/environment.js';

const API_URL = config.API_URL;

export const orderTimelineService = {
  /**
   * Calculate timeline for an order
   */
  calculateOrderTimeline: async (orderId, includeCapacity = false) => {
    try {
      console.log('🕐 Calculating order timeline for:', orderId);
      
      const response = await api.post(`${API_URL}/orders/${orderId}/timeline/calculate`, {
        includeCapacity: includeCapacity
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error calculating order timeline:', error);
      throw new Error(`Failed to calculate timeline: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Get customer-friendly completion estimate
   */
  getCustomerCompletionEstimate: async (orderId) => {
    try {
      console.log('📅 Getting completion estimate for order:', orderId);
      
      const response = await api.get(`${API_URL}/orders/${orderId}/timeline/estimate`);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error getting completion estimate:', error);
      return null;
    }
  },

  /**
   * Update timeline with production events
   */
  updateTimelineWithEvents: async (orderId, events) => {
    try {
      console.log('🔄 Updating timeline with events for order:', orderId);
      
      const response = await api.post(`${API_URL}/orders/${orderId}/timeline/update`, {
        events: events
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error updating timeline:', error);
      throw error;
    }
  },

  // Production queue methods removed - artisans now work directly with order status
};

/**
 * Timeline Display Helper Functions
 */
export const timelineDisplayHelpers = {
  /**
   * Format timeline dates for display
   */
  formatTimelineDate: (date) => {
    if (!date) return 'TBD';
    
    const dateObj = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((dateObj - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return `In ${diffDays} day${diffDays === 1 ? '' : 's'}`;
    }
  },

  /**
   * Get timeline status color and message
   */
  getTimelineStatus: (timeline) => {
    if (!timeline || !timeline.overallTimeline) {
      return { color: 'gray', message: 'Timeline unavailable', icon: '⏳' };
    }

    const { overallTimeline } = timeline;
    const now = new Date();
    const estimatedReady = new Date(overallTimeline.estimatedReadyDate);
    
    // If already completed
    if (overallTimeline.actualCompletionDate) {
      return { color: 'green', message: 'Completed', icon: '✅' };
    }
    
    // If in progress
    if (overallTimeline.actualStartDate) {
      const progress = overallTimeline.progressPercentage || 0;
      if (progress >= 90) {
        return { color: 'blue', message: 'Almost ready', icon: '🎯' };
      } else if (progress >= 50) {
        return { color: 'yellow', message: 'In progress', icon: '⚙️' };
      } else {
        return { color: 'orange', message: 'Production started', icon: '🔨' };
      }
    }
    
    // If not started yet
    const daysUntilReady = Math.ceil((estimatedReady - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilReady <= 1) {
      return { color: 'blue', message: 'Ready soon', icon: '🏃' };
    } else if (daysUntilReady <= 3) {
      return { color: 'yellow', message: 'Production scheduled', icon: '📅' };
    } else {
      return { color: 'gray', message: 'In queue', icon: '⏳' };
    }
  },

  /**
   * Calculate progress percentage for display
   */
  calculateDisplayProgress: (timeline) => {
    if (!timeline || !timeline.overallTimeline) return 0;
    
    const { overallTimeline } = timeline;
    
    // If completed, 100%
    if (overallTimeline.actualCompletionDate) return 100;
    
    // If has explicit progress, use that
    if (overallTimeline.progressPercentage) {
      return overallTimeline.progressPercentage;
    }
    
    // Calculate based on timeline position
    const now = new Date();
    const orderDate = new Date(overallTimeline.orderConfirmedDate);
    const estimatedReady = new Date(overallTimeline.estimatedReadyDate);
    
    if (now <= orderDate) return 0;
    if (now >= estimatedReady) return 90; // Cap at 90% until actually completed
    
    const totalTime = estimatedReady - orderDate;
    const elapsedTime = now - orderDate;
    
    return Math.max(5, Math.min(90, (elapsedTime / totalTime) * 100));
  },

  /**
   * Get human-readable timeline summary
   */
  getTimelineSummary: (timeline, isCustomerView = true) => {
    if (!timeline || !timeline.overallTimeline) {
      return 'Timeline information is being calculated...';
    }

    const { overallTimeline } = timeline;
    const status = timelineDisplayHelpers.getTimelineStatus(timeline);
    
    if (overallTimeline.actualCompletionDate) {
      const completedDate = timelineDisplayHelpers.formatTimelineDate(overallTimeline.actualCompletionDate);
      return `Order completed ${completedDate}`;
    }
    
    if (overallTimeline.actualStartDate) {
      const readyDate = timelineDisplayHelpers.formatTimelineDate(overallTimeline.estimatedReadyDate);
      if (isCustomerView) {
        return `Production in progress. Expected ready ${readyDate}`;
      } else {
        const progress = overallTimeline.progressPercentage || 0;
        return `Production ${Math.round(progress)}% complete. Ready ${readyDate}`;
      }
    }
    
    const readyDate = timelineDisplayHelpers.formatTimelineDate(overallTimeline.estimatedReadyDate);
    if (isCustomerView) {
      return `Your order will be ready ${readyDate}`;
    } else {
      return `Production scheduled. Ready ${readyDate}`;
    }
  },

  /**
   * Get confidence indicator for timeline
   */
  getConfidenceIndicator: (timeline) => {
    // This would typically come from the backend calculation
    // For now, provide a simple heuristic
    
    if (!timeline || !timeline.overallTimeline) {
      return { level: 'low', percentage: 60, message: 'Preliminary estimate' };
    }
    
    const { overallTimeline } = timeline;
    const now = new Date();
    const estimatedReady = new Date(overallTimeline.estimatedReadyDate);
    const daysUntilReady = Math.ceil((estimatedReady - now) / (1000 * 60 * 60 * 24));
    
    // Higher confidence for sooner dates and started orders
    let confidence = 85;
    
    if (overallTimeline.actualStartDate) confidence += 10;
    if (daysUntilReady > 7) confidence -= 10;
    if (daysUntilReady > 14) confidence -= 10;
    if (overallTimeline.totalProductionHours > 40) confidence -= 5;
    
    confidence = Math.max(60, Math.min(95, confidence));
    
    let level = 'medium';
    let message = 'Good estimate';
    
    if (confidence >= 90) {
      level = 'high';
      message = 'High confidence';
    } else if (confidence < 75) {
      level = 'low';
      message = 'Preliminary estimate';
    }
    
    return { level, percentage: confidence, message };
  }
};

// Production queue display helpers removed - artisans work directly with orders now

export default orderTimelineService;
