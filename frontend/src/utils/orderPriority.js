// Order Priority Utility Functions

// ARTISAN Priority Statuses - Orders requiring artisan action
export const ARTISAN_PRIORITY_STATUSES = {
  'pending': {
    priority: 100,
    color: 'red',
    icon: '⏰',
    label: 'Needs Confirmation',
    actions: ['Confirm', 'Decline']
  },
  'confirmed': {
    priority: 90,
    color: 'blue',
    icon: '✅',
    label: 'Ready to Prepare',
    actions: ['Start Preparing']
  },
  'preparing': {
    priority: 80,
    color: 'purple',
    icon: '👨‍🍳',
    label: 'In Progress',
    actions: ['Mark Ready']
  },
  'ready_for_pickup': {
    priority: 70,
    color: 'green',
    icon: '📍',
    label: 'Awaiting Pickup',
    actions: ['Mark Picked Up']
  },
  'ready_for_delivery': {
    priority: 70,
    color: 'green',
    icon: '✨',
    label: 'Ready for Delivery',
    actions: ['Mark Out for Delivery']
  },
  'out_for_delivery': {
    priority: 60,
    color: 'orange',
    icon: '🚚',
    label: 'Out for Delivery',
    actions: ['Mark Delivered']
  }
  // Note: Excluded statuses that don't need action:
  // - picked_up (final state for pickup orders)
  // - delivered (final state for delivery orders)
  // - completed (order finished)
  // - cancelled (order terminated)
  // - declined (order rejected)
};

// PATRON Priority Statuses - Orders requiring patron action or attention
export const PATRON_PRIORITY_STATUSES = {
  'pending': {
    priority: 100,
    color: 'yellow',
    icon: '⏰',
    label: 'Awaiting Confirmation',
    actions: ['Cancel Order']
  },
  'confirmed': {
    priority: 90,
    color: 'blue',
    icon: '✅',
    label: 'Confirmed',
    actions: [] // Can view details, no quick actions
  },
  'preparing': {
    priority: 80,
    color: 'purple',
    icon: '👨‍🍳',
    label: 'Being Prepared',
    actions: [] // Just informational
  },
  'ready_for_pickup': {
    priority: 70,
    color: 'green',
    icon: '📍',
    label: 'Ready for Pickup',
    actions: [] // Informational - go pick it up
  },
  'ready_for_delivery': {
    priority: 70,
    color: 'green',
    icon: '✨',
    label: 'Ready for Delivery',
    actions: [] // Informational - ready to be delivered
  },
  'out_for_delivery': {
    priority: 60,
    color: 'orange',
    icon: '🚚',
    label: 'Out for Delivery',
    actions: [] // Informational - on the way
  },
  'delivered': {
    priority: 50,
    color: 'green',
    icon: '📦',
    label: 'Delivered - Confirm Receipt',
    actions: ['Confirm Receipt']
  },
  'picked_up': {
    priority: 50,
    color: 'green',
    icon: '✅',
    label: 'Picked Up - Confirm Receipt',
    actions: ['Confirm Receipt']
  }
  // Note: Excluded statuses that don't need patron action:
  // - completed (already confirmed)
  // - cancelled (terminated)
  // - declined (rejected by artisan)
};

// Get the appropriate priority statuses based on user role
export const getPriorityStatuses = (userRole) => {
  return userRole === 'artisan' ? ARTISAN_PRIORITY_STATUSES : PATRON_PRIORITY_STATUSES;
};

export const URGENCY_COLORS = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  normal: 'normal'
};

/**
 * Calculate priority score for an order
 * Higher score = higher priority
 */
export const calculatePriorityScore = (order, userRole = 'artisan') => {
  const priorityStatuses = getPriorityStatuses(userRole);
  const baseScore = priorityStatuses[order.status]?.priority || 0;
  
  // Age bonus: +2 points per hour, max +48 (24 hours)
  const ageInHours = (Date.now() - new Date(order.createdAt)) / (1000 * 60 * 60);
  const ageBonus = Math.min(ageInHours * 2, 48);
  
  // Delivery method bonus: pickup gets +10 (faster turnaround)
  const deliveryBonus = order.deliveryMethod === 'pickup' ? 10 : 0;
  
  // Order value bonus: +1 per $10 (incentivize high-value orders)
  const valueBonus = Math.floor((order.totalAmount || order.total || 0) / 10);
  
  return baseScore + ageBonus + deliveryBonus + valueBonus;
};

/**
 * Determine urgency level based on order status and age
 */
export const getUrgencyLevel = (order, userRole = 'artisan') => {
  const ageInHours = (Date.now() - new Date(order.createdAt)) / (1000 * 60 * 60);
  
  if (userRole === 'artisan') {
    // Artisan urgency thresholds
    if (order.status === 'pending' && ageInHours > 1) return 'critical'; // 🔴
    if (order.status === 'confirmed' && ageInHours > 2) return 'high';   // 🟠
    if (order.status === 'preparing' && ageInHours > 4) return 'medium'; // 🟡
    if (order.status === 'ready_for_pickup' && ageInHours > 6) return 'medium'; // 🟡
    if (order.status === 'ready_for_delivery' && ageInHours > 6) return 'medium'; // 🟡
  } else {
    // Patron urgency thresholds
    if ((order.status === 'delivered' || order.status === 'picked_up') && !order.walletCredit?.patronConfirmedAt) {
      // Needs confirmation
      if (ageInHours > 24) return 'high'; // 🟠
      return 'medium'; // 🟡
    }
    if (order.status === 'pending' && ageInHours > 12) return 'medium'; // 🟡 - can cancel if needed
    if (order.status === 'ready_for_pickup' && ageInHours > 12) return 'medium'; // 🟡 - ready to pick up
  }
  
  return 'normal'; // 🟢
};

/**
 * Format time ago string
 */
export const getTimeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  
  if (seconds < 60) return 'Just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/**
 * Group array by key
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

