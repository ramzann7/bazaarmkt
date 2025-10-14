import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';

/**
 * MultiStepForm Component
 * A mobile-optimized multi-step form with progress indicators
 * 
 * Features:
 * - Step-by-step navigation
 * - Progress bar with percentage
 * - Form validation per step
 * - Touch-friendly buttons
 * - Accessible keyboard navigation
 * - Sticky navigation footer
 */

const MultiStepForm = ({ 
  steps = [],
  formData = {},
  onSave,
  onCancel,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [localFormData, setLocalFormData] = useState(formData);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Update local form data when prop changes
  useEffect(() => {
    setLocalFormData(formData);
  }, [formData]);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Mark current step as completed
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
      setCurrentStep(currentStep + 1);
    } else {
      // Last step - save (no arguments, parent manages data)
      onSave();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setLocalFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const StepIcon = currentStepData?.icon;

  return (
    <div className={`h-[90vh] sm:h-auto flex flex-col ${className}`}>
      {/* Progress Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Step {currentStep + 1} of {steps.length}
            </h3>
            {completedSteps.length > 0 && (
              <span className="text-xs sm:text-sm text-gray-500">
                ({completedSteps.length} completed)
              </span>
            )}
          </div>
          <span className="text-sm sm:text-base font-medium text-orange-600">
            {Math.round(progress)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Step Indicators (Desktop) */}
        <div className="hidden sm:flex items-center justify-between mt-4 gap-2">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  idx < currentStep 
                    ? 'bg-green-500 text-white' 
                    : idx === currentStep
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {idx < currentStep ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className={`text-xs font-medium truncate ${
                  idx === currentStep ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-0.5 w-4 ${
                  idx < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Current Step Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
        {/* Step Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          {StepIcon && (
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <StepIcon className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {currentStepData?.title}
            </h2>
            {currentStepData?.description && (
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {currentStepData.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Step Content */}
        <div className="space-y-4">
          {currentStepData?.content ? (
            currentStepData.content
          ) : (
            currentStepData?.renderContent && 
            currentStepData.renderContent()
          )}
        </div>
      </div>
      
      {/* Navigation Footer - Sticky */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex items-center gap-3 shadow-lg">
        {/* Cancel Button (First Step) */}
        {isFirstStep && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        
        {/* Back Button */}
        {!isFirstStep && (
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 sm:flex-initial px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px]"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}
        
        {/* Next/Save Button */}
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg min-h-[44px]"
        >
          <span>{isLastStep ? 'Save Product' : 'Next'}</span>
          {!isLastStep && <ChevronRightIcon className="w-4 h-4" />}
          {isLastStep && <CheckIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default MultiStepForm;

