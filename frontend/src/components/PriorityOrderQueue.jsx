import React, { useMemo } from 'react';
import PriorityOrderCard from './PriorityOrderCard';
import { getPriorityStatuses, calculatePriorityScore, getUrgencyLevel, groupBy } from '../utils/orderPriority';

const PriorityOrderQueue = ({ orders, salesOrders, purchasesOrders, onOrderClick, onQuickAction, userRole, updatingOrderId }) => {
  // Get priority statuses for both roles (artisans need both seller and buyer statuses)
  const ARTISAN_STATUSES = useMemo(() => getPriorityStatuses('artisan'), []);
  const PATRON_STATUSES = useMemo(() => getPriorityStatuses('patron'), []);
  
  // Calculate priority orders with scores and urgency
  const priorityOrders = useMemo(() => {
    // Define terminated statuses that should never appear in priority queue
    const terminatedStatuses = ['cancelled', 'declined', 'completed'];
    
    // For artisans, combine sales and purchases; for patrons, use orders prop
    const allOrders = userRole === 'artisan' && salesOrders && purchasesOrders
      ? [...salesOrders, ...purchasesOrders]
      : orders;
    
    // Process and tag orders with their type
    const processedOrders = allOrders
      .filter(order => {
        // Immediately filter out terminated statuses
        if (terminatedStatuses.includes(order.status)) {
          return false;
        }
        
        // For artisans, check order type to use correct status list
        if (userRole === 'artisan') {
          // Determine if this is a sales or purchase order
          const isSalesOrder = salesOrders?.some(so => so._id === order._id);
          const isPurchaseOrder = purchasesOrders?.some(po => po._id === order._id);
          
          // Use artisan statuses for SALES (seller role)
          if (isSalesOrder) {
            if (!ARTISAN_STATUSES[order.status]) return false;
          }
          
          // Use patron statuses for PURCHASES (buyer role)
          if (isPurchaseOrder) {
            if (!PATRON_STATUSES[order.status]) return false;
            
            // For purchases, only show delivered/picked_up if not yet confirmed
            if ((order.status === 'delivered' || order.status === 'picked_up')) {
              return !order.walletCredit?.patronConfirmedAt;
            }
          }
        } else {
          // For patrons, use patron statuses
          if (!PATRON_STATUSES[order.status]) return false;
          
          // Only show delivered/picked_up if not yet confirmed
          if ((order.status === 'delivered' || order.status === 'picked_up')) {
            return !order.walletCredit?.patronConfirmedAt;
          }
        }
        
        return true;
      })
      .map(order => {
        // Determine if this is a sales or purchase order for artisans
        let orderType = 'order'; // Default for patrons
        let effectiveUserRole = userRole; // Role to use for priority calculation
        
        if (userRole === 'artisan') {
          const isSalesOrder = salesOrders?.some(so => so._id === order._id);
          orderType = isSalesOrder ? 'sales' : 'purchases';
          
          // For purchases, use patron role for priority calculation (artisan is the buyer)
          effectiveUserRole = isSalesOrder ? 'artisan' : 'patron';
        }
        
        return {
          ...order,
          orderType, // Add order type for styling
          priorityScore: calculatePriorityScore(order, effectiveUserRole),
          urgency: getUrgencyLevel(order, effectiveUserRole),
          // Boost sales orders priority by adding 1000 points
          adjustedPriorityScore: orderType === 'sales' 
            ? calculatePriorityScore(order, effectiveUserRole) + 1000 
            : calculatePriorityScore(order, effectiveUserRole)
        };
      })
      .sort((a, b) => {
        // Sort by adjusted priority score (sales orders will be first)
        return b.adjustedPriorityScore - a.adjustedPriorityScore;
      });
    
    return processedOrders;
  }, [orders, salesOrders, purchasesOrders, ARTISAN_STATUSES, PATRON_STATUSES, userRole]);
  
  // Group by status for tabs
  const groupedOrders = useMemo(() => {
    return groupBy(priorityOrders, 'status');
  }, [priorityOrders]);
  
  // Count sales vs purchases for artisans
  const orderTypeCounts = useMemo(() => {
    if (userRole !== 'artisan') return null;
    
    const sales = priorityOrders.filter(o => o.orderType === 'sales').length;
    const purchases = priorityOrders.filter(o => o.orderType === 'purchases').length;
    
    return { sales, purchases };
  }, [priorityOrders, userRole]);
  
  // Hide component if no priority orders
  if (priorityOrders.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-6 mb-8 shadow-lg">
      {/* Header with Info */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {userRole === 'artisan' ? '🚨 Priority Queue - Action Needed' : '📋 Active Orders - Track Your Orders'}
          </h2>
          {userRole === 'artisan' && orderTypeCounts && (
            <div className="flex gap-3 mt-2 text-sm">
              <span className="font-semibold text-blue-700">
                💼 {orderTypeCounts.sales} Sales
              </span>
              <span className="text-gray-400">|</span>
              <span className="font-semibold text-teal-700">
                🛒 {orderTypeCounts.purchases} Purchases
              </span>
            </div>
          )}
        </div>
        <div className="text-sm text-gray-600">
          💡 <span className="font-semibold">Tip:</span> Click any card for full details
        </div>
      </div>
      
      {/* Status Tabs with Counts */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        {Object.entries(userRole === 'artisan' ? {...ARTISAN_STATUSES, ...PATRON_STATUSES} : PATRON_STATUSES).map(([status, config]) => {
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
              case 'ready_for_delivery':
                return 'bg-green-100 text-green-800 hover:bg-green-200';
              case 'out_for_delivery':
                return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
              case 'delivered':
                return 'bg-teal-100 text-teal-800 hover:bg-teal-200';
              case 'picked_up':
                return 'bg-teal-100 text-teal-800 hover:bg-teal-200';
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

