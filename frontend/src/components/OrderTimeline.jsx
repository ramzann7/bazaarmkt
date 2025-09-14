import React from 'react';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

const OrderTimeline = ({ 
  currentStatus, 
  deliveryMethod = 'pickup', 
  variant = 'default' // 'default', 'compact', 'minimal', 'card'
}) => {
  // Define timeline steps based on delivery method
  const getTimelineSteps = (method) => {
    if (method === 'pickup') {
      return [
        { id: 'pending', label: 'Order Placed', icon: ClockIcon },
        { id: 'confirmed', label: 'Confirmed', icon: CheckCircleIcon },
        { id: 'preparing', label: 'Preparing', icon: ClockIcon },
        { id: 'ready_for_pickup', label: 'Ready', icon: CheckCircleIcon },
        { id: 'picked_up', label: 'Picked Up', icon: CheckCircleIconSolid }
      ];
    } else {
      return [
        { id: 'pending', label: 'Order Placed', icon: ClockIcon },
        { id: 'confirmed', label: 'Confirmed', icon: CheckCircleIcon },
        { id: 'preparing', label: 'Preparing', icon: ClockIcon },
        { id: 'ready_for_delivery', label: 'Ready', icon: CheckCircleIcon },
        { id: 'out_for_delivery', label: 'Out for Delivery', icon: ClockIcon },
        { id: 'delivered', label: 'Delivered', icon: CheckCircleIconSolid }
      ];
    }
  };

  const steps = getTimelineSteps(deliveryMethod);
  
  // Determine current step index
  const getCurrentStepIndex = () => {
    const stepIndex = steps.findIndex(step => step.id === currentStatus);
    if (stepIndex === -1) {
      // Handle legacy statuses
      if (currentStatus === 'ready') return 3; // ready_for_pickup or ready_for_delivery
      if (currentStatus === 'delivering') return 4; // out_for_delivery
      if (currentStatus === 'delivered') return 5; // delivered
      return 0; // Default to first step
    }
    return stepIndex;
  };

  const currentStepIndex = getCurrentStepIndex();
  
  // Check if order is cancelled or declined
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'declined';

  // Get status color
  const getStatusColor = (stepIndex) => {
    if (isCancelled) return 'text-red-500';
    if (stepIndex < currentStepIndex) return 'text-green-500';
    if (stepIndex === currentStepIndex) return 'text-blue-500';
    return 'text-gray-400';
  };

  const getBackgroundColor = (stepIndex) => {
    if (isCancelled) return 'bg-red-50';
    if (stepIndex < currentStepIndex) return 'bg-green-50';
    if (stepIndex === currentStepIndex) return 'bg-blue-50';
    return 'bg-gray-50';
  };

  const getBorderColor = (stepIndex) => {
    if (isCancelled) return 'border-red-200';
    if (stepIndex < currentStepIndex) return 'border-green-200';
    if (stepIndex === currentStepIndex) return 'border-blue-200';
    return 'border-gray-200';
  };

  if (variant === 'minimal') {
    return (
      <div className="flex items-center space-x-1">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isCancelledStep = isCancelled && index === 0;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-2 h-2 rounded-full
                ${isCompleted ? 'bg-green-500' : 
                  isCurrent ? 'bg-blue-500' : 
                  isCancelledStep ? 'bg-red-500' : 'bg-gray-300'}
              `} />
              {index < steps.length - 1 && (
                <div className={`
                  w-3 h-0.5 mx-1
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isCancelledStep = isCancelled && index === 0;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center
                ${getBackgroundColor(index)} ${getBorderColor(index)} border
              `}>
                {isCancelledStep ? (
                  <XMarkIcon className="w-3 h-3 text-red-500" />
                ) : isCompleted ? (
                  <CheckCircleIconSolid className="w-3 h-3 text-green-500" />
                ) : (
                  <Icon className={`w-3 h-3 ${getStatusColor(index)}`} />
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  w-4 h-0.5 mx-1
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="space-y-3">
        {/* Timeline with labels */}
        <div className="relative">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isCancelledStep = isCancelled && index === 0;
              
              return (
                <div key={step.id} className="flex flex-col items-center flex-1 relative">
                  <div className={`
                    w-7 h-7 rounded-full flex items-center justify-center mb-2 z-10
                    ${getBackgroundColor(index)} ${getBorderColor(index)} border-2
                  `}>
                    {isCancelledStep ? (
                      <XMarkIcon className="w-4 h-4 text-red-500" />
                    ) : isCompleted ? (
                      <CheckCircleIconSolid className="w-4 h-4 text-green-500" />
                    ) : (
                      <Icon className={`w-4 h-4 ${getStatusColor(index)}`} />
                    )}
                  </div>
                  <span className={`
                    text-xs text-center font-medium leading-tight px-1
                    ${isCurrent ? 'text-blue-600 font-semibold' : 
                      isCompleted ? 'text-green-600' : 
                      isCancelledStep ? 'text-red-600' : 'text-gray-500'}
                  `}>
                    {step.label}
                  </span>
                  
                  {/* Connecting line */}
                  {index < steps.length - 1 && (
                    <div className={`
                      absolute top-3.5 left-1/2 w-full h-0.5 -z-10
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                    `} style={{ width: 'calc(100% - 0.875rem)', marginLeft: '0.875rem' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isCancelledStep = isCancelled && index === 0;
          
          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center mb-2
                ${getBackgroundColor(index)} ${getBorderColor(index)} border
              `}>
                {isCancelledStep ? (
                  <XMarkIcon className="w-4 h-4 text-red-500" />
                ) : isCompleted ? (
                  <CheckCircleIconSolid className="w-4 h-4 text-green-500" />
                ) : (
                  <Icon className={`w-4 h-4 ${getStatusColor(index)}`} />
                )}
              </div>
              <span className={`
                text-xs text-center font-medium
                ${isCurrent ? 'text-blue-600' : 
                  isCompleted ? 'text-green-600' : 
                  isCancelledStep ? 'text-red-600' : 'text-gray-500'}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div 
          className={`
            h-1 rounded-full transition-all duration-300
            ${isCancelled ? 'bg-red-500' : 'bg-blue-500'}
          `}
          style={{ 
            width: `${isCancelled ? 20 : (currentStepIndex / (steps.length - 1)) * 100}%` 
          }}
        />
      </div>
    </div>
  );
};

export default OrderTimeline;
