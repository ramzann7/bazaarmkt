import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

/**
 * MobileDashboardStat - Mobile-optimized stat card for dashboards
 * 
 * Features:
 * - Compact, scannable design
 * - Color-coded by stat type
 * - Change indicators with arrows
 * - Touch-friendly (can be made clickable)
 * - Loading state support
 */
const MobileDashboardStat = ({ 
  icon: Icon,
  label,
  value,
  change,
  changeLabel,
  color = 'text-[#D77A61]',
  bgColor = 'bg-orange-50',
  onClick,
  isLoading = false,
  className = ''
}) => {
  const hasChange = change !== undefined && change !== null;
  const isPositive = hasChange && change > 0;
  const isNegative = hasChange && change < 0;

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all ${
        onClick ? 'hover:shadow-md active:scale-98 cursor-pointer' : ''
      } ${className}`}
    >
      {isLoading ? (
        // Loading State
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg ${bgColor}`}></div>
            <div className="w-16 h-5 bg-gray-200 rounded"></div>
          </div>
          <div className="w-20 h-4 bg-gray-200 rounded mb-2"></div>
          <div className="w-24 h-8 bg-gray-200 rounded"></div>
        </div>
      ) : (
        <>
          {/* Header: Icon and Change */}
          <div className="flex items-center justify-between mb-3">
            {Icon && (
              <div className={`p-2.5 rounded-lg ${bgColor}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            )}
            
            {hasChange && (
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                isPositive 
                  ? 'text-green-600 bg-green-50' 
                  : isNegative 
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-600 bg-gray-50'
              }`}>
                {isPositive ? (
                  <ArrowUpIcon className="w-3 h-3" />
                ) : isNegative ? (
                  <ArrowDownIcon className="w-3 h-3" />
                ) : null}
                <span>{Math.abs(change)}%</span>
              </div>
            )}
          </div>

          {/* Label */}
          <p className="text-sm text-gray-600 mb-1 font-medium">{label}</p>

          {/* Value */}
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>

          {/* Change Label */}
          {changeLabel && (
            <p className="text-xs text-gray-500">{changeLabel}</p>
          )}
        </>
      )}
    </Component>
  );
};

/**
 * MobileDashboardStatGroup - Container for stat cards with responsive grid
 */
export const MobileDashboardStatGroup = ({ children, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {children}
    </div>
  );
};

export default MobileDashboardStat;

