/**
 * Order Timeline Component
 * Displays comprehensive order timeline information for customers and artisans
 * Phase 1 Implementation
 */

import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  SparklesIcon,
  PlayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { orderTimelineService, timelineDisplayHelpers } from '../services/orderTimelineService';
import toast from 'react-hot-toast';

const OrderTimeline = ({ order, isArtisanView = false, showDetailsButton = true }) => {
  const [timeline, setTimeline] = useState(order?.timeline || null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Early return if no order data
  if (!order) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-gray-400" />
          <span className="text-gray-600">Order information not available</span>
        </div>
      </div>
    );
  }

  // Auto-refresh timeline for active orders
  useEffect(() => {
    if (order?._id && (!timeline || shouldRefreshTimeline())) {
      refreshTimeline();
    }
  }, [order?._id]);

  const shouldRefreshTimeline = () => {
    if (!timeline) return true;
    
    // Refresh if timeline is older than 1 hour
    const lastUpdated = new Date(timeline.lastUpdated || timeline.calculatedAt);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return lastUpdated < oneHourAgo;
  };

  const refreshTimeline = async () => {
    if (!order || !order._id) {
      console.warn('⚠️ Cannot refresh timeline: order or order._id is undefined');
      return;
    }
    
    try {
      setLoading(true);
      const response = await orderTimelineService.calculateOrderTimeline(order._id, true);
      
      if (response.success && response.data) {
        setTimeline(response.data);
      }
    } catch (error) {
      console.error('❌ Error refreshing timeline:', error);
      // Don't show error to user for timeline refresh failures
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      setLoading(true);
      await refreshTimeline();
      toast.success('Timeline updated');
    } catch (error) {
      toast.error('Failed to refresh timeline');
    }
  };

  if (!timeline) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">Timeline calculating...</span>
          </div>
          {showDetailsButton && (
            <button 
              onClick={refreshTimeline}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Calculate Timeline
            </button>
          )}
        </div>
      </div>
    );
  }

  const status = timelineDisplayHelpers.getTimelineStatus(timeline);
  const progress = timelineDisplayHelpers.calculateDisplayProgress(timeline);
  const summary = timelineDisplayHelpers.getTimelineSummary(timeline, !isArtisanView);
  const confidence = timelineDisplayHelpers.getConfidenceIndicator(timeline);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            status.color === 'green' ? 'bg-green-100 text-green-600' :
            status.color === 'blue' ? 'bg-blue-100 text-blue-600' :
            status.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
            status.color === 'orange' ? 'bg-orange-100 text-orange-600' :
            status.color === 'red' ? 'bg-red-100 text-red-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {status.icon}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{status.message}</h3>
            <p className="text-sm text-gray-600">{summary}</p>
          </div>
        </div>
        
        {showDetailsButton && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Refresh timeline"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              status.color === 'green' ? 'bg-green-500' :
              status.color === 'blue' ? 'bg-blue-500' :
              status.color === 'yellow' ? 'bg-yellow-500' :
              status.color === 'orange' ? 'bg-orange-500' :
              'bg-gray-400'
            }`}
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </div>
      </div>

      {/* Key Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Order Date:</span>
          <div className="font-medium">
            {timelineDisplayHelpers.formatTimelineDate(timeline.overallTimeline?.orderConfirmedDate)}
          </div>
        </div>
        
        {timeline.overallTimeline?.estimatedReadyDate && (
          <div>
            <span className="text-gray-500">
              {timeline.overallTimeline?.actualCompletionDate ? 'Completed:' : 'Estimated Ready:'}
            </span>
            <div className="font-medium">
              {timelineDisplayHelpers.formatTimelineDate(
                timeline.overallTimeline?.actualCompletionDate || 
                timeline.overallTimeline?.estimatedReadyDate
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confidence Indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <SparklesIcon className="w-4 h-4" />
        <span>{confidence.message} ({confidence.percentage}% confidence)</span>
      </div>

      {/* Detailed Timeline */}
      {showDetails && (
        <div className="border-t pt-4 space-y-4">
          <h4 className="font-medium text-gray-900">Timeline Details</h4>
          
          {/* Production Requirements */}
          {timeline.productionRequirements && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Production Requirements</h5>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500">Total Production Time:</span>
                  <div>{Math.round(timeline.productionRequirements.totalProductionTime || 0)} hours</div>
                </div>
                <div>
                  <span className="text-gray-500">Longest Item:</span>
                  <div>{Math.round(timeline.productionRequirements.longestLeadTime || 0)} hours</div>
                </div>
              </div>
            </div>
          )}

          {/* Item Timelines */}
          {timeline.items && timeline.items.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Items Timeline</h5>
              {timeline.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.productName}</div>
                    <div className="text-xs text-gray-500">Quantity: {item.quantity}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-gray-500">Est. Time:</div>
                    <div className="font-medium">{Math.round(item.timeline?.leadTimeHours || 0)}h</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Artisan View: Production Actions */}
          {isArtisanView && timeline.overallTimeline && !timeline.overallTimeline.actualCompletionDate && (
            <div className="border-t pt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Actions</h5>
              <div className="flex gap-2">
                {!timeline.overallTimeline.actualStartDate && (
                  <button
                    onClick={() => handleProductionUpdate('start')}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Start Production
                  </button>
                )}
                
                {timeline.overallTimeline.actualStartDate && !timeline.overallTimeline.actualCompletionDate && (
                  <button
                    onClick={() => handleProductionUpdate('complete')}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Production update handler for artisans
  async function handleProductionUpdate(action) {
    if (!order || !order._id) {
      console.warn('⚠️ Cannot update production: order or order._id is undefined');
      toast.error('Order information not available');
      return;
    }
    
    try {
      setLoading(true);
      
      const events = [];
      if (action === 'start') {
        events.push({
          type: 'production_started',
          timestamp: new Date(),
          progress: 10
        });
      } else if (action === 'complete') {
        events.push({
          type: 'production_completed', 
          timestamp: new Date(),
          progress: 100
        });
      }

      await orderTimelineService.updateTimelineWithEvents(order._id, events);
      await refreshTimeline();
      
      toast.success(`Production ${action === 'start' ? 'started' : 'completed'}!`);
    } catch (error) {
      console.error('❌ Error updating production:', error);
      toast.error(`Failed to ${action} production`);
    } finally {
      setLoading(false);
    }
  }
};

export default OrderTimeline;