import React, { useMemo } from 'react';
import PriorityOrderCard from './PriorityOrderCard';
import { getPriorityStatuses, calculatePriorityScore, getUrgencyLevel, groupBy } from '../utils/orderPriority';

const PriorityOrderQueue = ({ orders, onOrderClick, onQuickAction, userRole, updatingOrderId }) => {
  // Get appropriate priority statuses based on user role
  const PRIORITY_STATUSES = useMemo(() => getPriorityStatuses(userRole), [userRole]);
  // Calculate priority orders with scores and urgency
  const priorityOrders = useMemo(() => {
    // Define terminated statuses that should never appear in priority queue
    const terminatedStatuses = ['cancelled', 'declined', 'completed'];
    
    return orders
      .filter(order => {
        // Immediately filter out terminated statuses
        if (terminatedStatuses.includes(order.status)) {
          return false;
        }
        
        // Filter based on priority statuses
        if (!PRIORITY_STATUSES[order.status]) return false;
        
        // For patrons, only show delivered/picked_up if not yet confirmed
        if (userRole === 'patron' && (order.status === 'delivered' || order.status === 'picked_up')) {
          return !order.walletCredit?.patronConfirmedAt;
        }
        
        return true;
      })
      .map(order => ({
        ...order,
        priorityScore: calculatePriorityScore(order, userRole),
        urgency: getUrgencyLevel(order, userRole)
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [orders, PRIORITY_STATUSES, userRole]);
  
  // Group by status for tabs
  const groupedOrders = useMemo(() => {
    return groupBy(priorityOrders, 'status');
  }, [priorityOrders]);
  
  // Hide component if no priority orders
  if (priorityOrders.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-6 mb-8 shadow-lg">
      {/* Header with Info */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {userRole === 'artisan' ? '🚨 Priority Queue - Action Needed' : '📋 Active Orders - Track Your Orders'}
        </h2>
        <div className="text-sm text-gray-600">
          💡 <span className="font-semibold">Tip:</span> Click any card for full details
        </div>
      </div>
      
      {/* Status Tabs with Counts */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        {Object.entries(PRIORITY_STATUSES).map(([status, config]) => {
          const count = groupedOrders[status]?.length || 0;
          if (count === 0) return null;
          
          const getTabClass = () => {
            switch (status) {
              case 'pending':
                return 'bg-red-100 text-red-800 hover:bg-red-200';
              case 'confirmed':
                return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
              case 'preparing':
                return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
              case 'ready_for_pickup':
                return 'bg-green-100 text-green-800 hover:bg-green-200';
              case 'out_for_delivery':
                return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
              default:
                return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
            }
          };
          
          return (
            <div
              key={status}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap cursor-default transition-all ${getTabClass()}`}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
              <span className="bg-white bg-opacity-50 px-2 py-0.5 rounded-full text-xs font-bold">
                {count}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Horizontal Scrollable Cards */}
      <div 
        className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2"
        style={{ 
          scrollBehavior: 'smooth',
          msOverflowStyle: 'none',
          scrollbarWidth: 'thin'
        }}
      >
        {priorityOrders.map(order => (
          <PriorityOrderCard
            key={order._id}
            order={order}
            onClick={onOrderClick}
            onQuickAction={onQuickAction}
            userRole={userRole}
            isUpdating={updatingOrderId === order._id}
          />
        ))}
      </div>
      
      {/* Scroll Hint for Many Orders */}
      {priorityOrders.length > 3 && (
        <div className="text-center text-xs text-gray-500 mt-2">
          ← Scroll to see all {priorityOrders.length} priority order{priorityOrders.length > 1 ? 's' : ''} →
        </div>
      )}
    </div>
  );
};

export default PriorityOrderQueue;

