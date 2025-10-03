# Artisan Order Management - Priority Queue Design

**Date:** October 2, 2025  
**Status:** 🎨 DESIGN PROPOSAL

## Overview

Add a prioritized summary section at the top of the artisan order management page showing orders that need immediate attention, while keeping all existing functionality intact.

---

## Visual Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  🚨 PRIORITY QUEUE - Action Needed                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│  ⏰ Pending (3) │ ✅ Confirmed (2) │ 👨‍🍳 Preparing (1) │ 📍 Ready (2) │
│  ────────────────────────────────────────────────────────────────── │
│                                                                        │
│  Horizontal Scrollable Cards (Click to open full modal):              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ 🔴 URGENT        │  │ 🟠 2h ago        │  │ 🟡 4h ago        │ │
│  │ Order #AB34   ⏰ │  │ Order #CD56   ✅ │  │ Order #EF78   👨‍🍳│ │
│  │ $45.00   Pickup  │  │ $32.50 Delivery  │  │ $28.00   Pickup  │ │
│  │                  │  │                  │  │                  │ │
│  │ 📦 Items (2):    │  │ 📦 Items (3):    │  │ 📦 Items (1):    │ │
│  │ • 2x Bread 🍽️   │  │ • 1x Cake 🍽️    │  │ • 1x Painting 🎨│ │
│  │ • 1x Butter 🍽️  │  │ • 3x Cookies 🍽️ │  │                  │ │
│  │                  │  │ • 2x Pie 🍽️     │  │ 💬 "Handle with  │ │
│  │ [Confirm]        │  │                  │  │     care"        │ │
│  │ [Decline]        │  │ [Start Prep]     │  │                  │ │
│  │                  │  │ [Decline]        │  │ [Mark Ready]     │ │
│  │ Click for full → │  │ Click for full → │  │ Click for full → │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                 │
│                                                                        │
│  Auto-hides when no priority orders                                   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  📋 ALL ORDERS                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│  [Filter Tabs: All | Pending | Confirmed | Preparing | Ready...]     │
│                                                                        │
│  Sort: Latest First ▼                                                 │
│                                                                        │
│  [Existing full-size order cards continue as-is]                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Full Order Card #1                                            │   │
│  │ [All existing features preserved]                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Full Order Card #2                                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Priority Logic

### Priority Statuses (Need Action)
```javascript
const PRIORITY_STATUSES = {
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
    actions: ['Start Preparing', 'Decline']
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
  'out_for_delivery': {
    priority: 60,
    color: 'orange',
    icon: '🚚',
    label: 'Out for Delivery',
    actions: ['Mark Delivered']
  }
};
```

### Priority Score Calculation
```javascript
const calculatePriorityScore = (order) => {
  const baseScore = PRIORITY_STATUSES[order.status]?.priority || 0;
  
  // Age bonus: +2 points per hour, max +48 (24 hours)
  const ageInHours = (Date.now() - new Date(order.createdAt)) / (1000 * 60 * 60);
  const ageBonus = Math.min(ageInHours * 2, 48);
  
  // Delivery method bonus: pickup gets +10 (faster turnaround)
  const deliveryBonus = order.deliveryMethod === 'pickup' ? 10 : 0;
  
  // Order value bonus: +1 per $10 (incentivize high-value orders)
  const valueBonus = Math.floor(order.total / 10);
  
  return baseScore + ageBonus + deliveryBonus + valueBonus;
};
```

### Urgency Indicators
```javascript
const getUrgencyLevel = (order) => {
  const ageInHours = (Date.now() - new Date(order.createdAt)) / (1000 * 60 * 60);
  
  if (order.status === 'pending' && ageInHours > 1) return 'critical'; // 🔴
  if (order.status === 'confirmed' && ageInHours > 2) return 'high';   // 🟠
  if (order.status === 'preparing' && ageInHours > 4) return 'medium'; // 🟡
  if (order.status === 'ready_for_pickup' && ageInHours > 6) return 'medium'; // 🟡
  
  return 'normal'; // 🟢
};
```

---

## Component Structure

### New Component: `PriorityOrderQueue.jsx`

```jsx
const PriorityOrderQueue = ({ orders, onOrderClick, onQuickAction }) => {
  // Filter priority orders
  const priorityOrders = orders
    .filter(order => PRIORITY_STATUSES[order.status])
    .map(order => ({
      ...order,
      priorityScore: calculatePriorityScore(order),
      urgency: getUrgencyLevel(order)
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
  
  if (priorityOrders.length === 0) return null; // Hide when empty
  
  // Group by status for tabs
  const groupedOrders = groupBy(priorityOrders, 'status');
  
  return (
    <div className="priority-queue">
      {/* Header with Info */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          🚨 Priority Queue - Action Needed
        </h2>
        <div className="text-sm text-gray-600">
          💡 <span className="font-semibold">Tip:</span> Click any card for full details
        </div>
      </div>
      
      {/* Status Tabs with Counts */}
      <div className="status-tabs">
        {Object.entries(PRIORITY_STATUSES).map(([status, config]) => (
          <StatusTab 
            key={status}
            status={status}
            config={config}
            count={groupedOrders[status]?.length || 0}
          />
        ))}
      </div>
      
      {/* Horizontal Scrollable Cards */}
      <div className="priority-cards-container">
        {priorityOrders.map(order => (
          <PriorityOrderCard
            key={order._id}
            order={order}
            onClick={onOrderClick} // Clicking card opens modal
            onQuickAction={onQuickAction}
          />
        ))}
      </div>
      
      {/* Scroll Hint for Many Orders */}
      {priorityOrders.length > 3 && (
        <div className="text-center text-xs text-gray-500 mt-2">
          ← Scroll to see all {priorityOrders.length} priority orders →
        </div>
      )}
    </div>
  );
};
```

### Compact Card Component: `PriorityOrderCard.jsx`

```jsx
const PriorityOrderCard = ({ order, onClick, onQuickAction }) => {
  const statusConfig = PRIORITY_STATUSES[order.status];
  const urgencyColor = URGENCY_COLORS[order.urgency];
  
  return (
    <div 
      className={`priority-card ${urgencyColor}-border cursor-pointer hover:shadow-2xl transition-all`}
      onClick={() => onClick(order)} // Full card clickable to open modal
    >
      {/* Urgency Badge */}
      <div className={`urgency-badge ${urgencyColor}`}>
        {order.urgency === 'critical' && '🔴 URGENT'}
        {order.urgency === 'high' && '🟠 ' + getTimeAgo(order.createdAt)}
        {order.urgency === 'medium' && '🟡 ' + getTimeAgo(order.createdAt)}
        {order.urgency === 'normal' && '🟢 ' + getTimeAgo(order.createdAt)}
      </div>
      
      {/* Order Header */}
      <div className="card-header">
        <span className="order-number text-sm font-bold">#{order.orderNumber}</span>
        <span className={`status-icon ${statusConfig.color}`}>
          {statusConfig.icon}
        </span>
      </div>
      
      {/* Order Summary */}
      <div className="card-body space-y-2">
        <div className="flex justify-between items-center">
          <div className="order-total text-lg font-bold">${order.total.toFixed(2)}</div>
          <div className="order-method text-xs">
            {order.deliveryMethod === 'pickup' ? '📍 Pickup' : '🚚 Delivery'}
          </div>
        </div>
        
        {/* Items List - For Packaging Planning */}
        <div className="items-list space-y-1 max-h-32 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-600 mb-1">
            📦 Items ({order.items.length}):
          </div>
          {order.items.slice(0, 4).map((item, idx) => (
            <div 
              key={idx} 
              className="flex justify-between items-center text-xs bg-gray-50 rounded px-2 py-1"
            >
              <span className="truncate flex-1 pr-2" title={item.productName || item.name}>
                {item.quantity}x {(item.productName || item.name)?.substring(0, 20)}
                {(item.productName || item.name)?.length > 20 ? '...' : ''}
              </span>
              {/* Show product type icon for packaging hints */}
              <span className="text-gray-500">
                {item.category === 'food_beverages' && '🍽️'}
                {item.category === 'art_collectibles' && '🎨'}
                {item.category === 'home_garden' && '🏡'}
                {item.category === 'fashion_accessories' && '👕'}
              </span>
            </div>
          ))}
          {order.items.length > 4 && (
            <div className="text-xs text-gray-500 italic px-2">
              +{order.items.length - 4} more items...
            </div>
          )}
        </div>
        
        {/* Special Instructions Preview */}
        {(order.deliveryAddress?.instructions || order.pickupInstructions) && (
          <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 flex items-start gap-1">
            <span>💬</span>
            <span className="truncate">
              {order.deliveryAddress?.instructions || order.pickupInstructions}
            </span>
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="card-actions border-t pt-3 mt-3">
        {statusConfig.actions.map(action => (
          <button
            key={action}
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
              onQuickAction(order._id, action);
            }}
            className={`quick-action-btn ${action.includes('Decline') ? 'danger' : 'primary'}`}
          >
            {action}
          </button>
        ))}
      </div>
      
      {/* Click Indicator */}
      <div className="text-center text-xs text-gray-400 mt-2 italic">
        Click for full details →
      </div>
    </div>
  );
};
```

---

## Modified Orders.jsx Structure

```jsx
const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [priorityOrders, setPriorityOrders] = useState([]);
  
  useEffect(() => {
    loadOrders();
  }, []);
  
  useEffect(() => {
    // Calculate priority orders
    const priority = orders
      .filter(order => PRIORITY_STATUSES[order.status])
      .map(order => ({
        ...order,
        priorityScore: calculatePriorityScore(order)
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);
    
    setPriorityOrders(priority);
    
    // Sort main list by latest
    const sorted = [...orders].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    setFilteredOrders(sorted);
  }, [orders, statusFilter]);
  
  const handleQuickAction = async (orderId, action) => {
    // Map action to status
    const statusMap = {
      'Confirm': 'confirmed',
      'Start Preparing': 'preparing',
      'Mark Ready': order.deliveryMethod === 'pickup' ? 'ready_for_pickup' : 'out_for_delivery',
      'Mark Picked Up': 'picked_up',
      'Mark Delivered': 'delivered'
    };
    
    await orderService.updateOrderStatus(orderId, { status: statusMap[action] });
    loadOrders(); // Refresh
  };
  
  return (
    <div className="orders-page">
      {/* Priority Queue Section */}
      {priorityOrders.length > 0 && (
        <PriorityOrderQueue
          orders={priorityOrders}
          onOrderClick={handleViewOrder}
          onQuickAction={handleQuickAction}
        />
      )}
      
      {/* Existing Order List */}
      <div className="all-orders-section">
        <h2>📋 All Orders</h2>
        
        {/* Existing filters */}
        <div className="filters">
          {/* Keep existing filter tabs */}
        </div>
        
        {/* Existing order cards */}
        <div className="orders-grid">
          {filteredOrders.map(order => (
            <OrderCard key={order._id} order={order} {...props} />
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## Styling (Tailwind CSS)

```css
/* Priority Queue Container */
.priority-queue {
  @apply bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-6 mb-8 shadow-lg;
}

/* Status Tabs */
.status-tabs {
  @apply flex gap-4 mb-6 overflow-x-auto pb-2;
}

.status-tab {
  @apply flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap cursor-pointer transition-all;
}

.status-tab.pending {
  @apply bg-red-100 text-red-800 hover:bg-red-200;
}

.status-tab.confirmed {
  @apply bg-blue-100 text-blue-800 hover:bg-blue-200;
}

.status-tab.preparing {
  @apply bg-purple-100 text-purple-800 hover:bg-purple-200;
}

/* Priority Cards */
.priority-cards-container {
  @apply flex gap-4 overflow-x-auto pb-4 -mx-2 px-2;
  scroll-behavior: smooth;
  /* Hide scrollbar but keep functionality */
  -ms-overflow-style: none;
  scrollbar-width: thin;
}

.priority-card {
  @apply min-w-[300px] max-w-[300px] bg-white rounded-lg p-4 shadow-md hover:shadow-xl transition-all cursor-pointer border-l-4;
  /* Compact height with scrollable items */
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.priority-card.critical-border {
  @apply border-red-500 ring-2 ring-red-200;
}

.priority-card.high-border {
  @apply border-orange-500;
}

.priority-card.medium-border {
  @apply border-yellow-500;
}

.priority-card.normal-border {
  @apply border-green-500;
}

/* Items List Styling */
.items-list {
  @apply border border-gray-200 rounded-md p-2 bg-gray-50;
}

.items-list::-webkit-scrollbar {
  width: 4px;
}

.items-list::-webkit-scrollbar-thumb {
  @apply bg-gray-400 rounded;
}

/* Urgency Badge */
.urgency-badge {
  @apply text-xs font-bold px-2 py-1 rounded-full mb-2 inline-block;
}

.urgency-badge.critical {
  @apply bg-red-100 text-red-800 animate-pulse;
}

.urgency-badge.high {
  @apply bg-orange-100 text-orange-800;
}

/* Quick Action Buttons */
.card-actions {
  @apply flex gap-2 mt-4;
}

.quick-action-btn {
  @apply flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all;
}

.quick-action-btn.primary {
  @apply bg-blue-500 text-white hover:bg-blue-600;
}

.quick-action-btn.danger {
  @apply bg-red-500 text-white hover:bg-red-600;
}
```

---

## Features

### ✅ Priority Features
1. **Auto-sorting by urgency** - Oldest pending orders appear first
2. **Visual urgency indicators** - Color-coded borders and badges
3. **Quick actions** - One-click status updates from cards
4. **Status grouping** - Tab badges show count per status
5. **Auto-hide** - Section disappears when no priority orders
6. **Horizontal scroll** - Compact view, many orders visible
7. **Time indicators** - "2h ago", "30m ago" for quick reference
8. **Clickable cards** - Full card opens order modal for complete details
9. **Item preview** - Shows products for packaging planning (max 4, scrollable)
10. **Clean item display** - Shows quantity and product name only (no category emojis)
11. **Special instructions preview** - Alerts for customer notes
12. **Compact design** - Max 300px wide, 400px tall, fits 3-4 on screen

### ✅ Preserved Features
- All existing order cards remain unchanged
- All filters work as before
- All actions and modals preserved
- Sort by latest in main list
- No breaking changes

---

## User Experience Flow

### Artisan Opens Orders Page
1. **Priority Queue visible** if any orders need action
2. **Critical orders** flash red (>1h pending)
3. **Quick glance** shows: 3 pending, 2 confirmed, 1 preparing
4. **Scroll horizontally** through priority orders
5. **Click card** opens full modal for details
6. **Quick action** confirms order in one click
7. **Order disappears** from queue when status changes to completed
8. **Main list below** shows all orders sorted by latest

### Example Scenarios

**Scenario 1: Busy Morning - Packaging Planning**
- 5 pending orders from overnight
- All show as 🔴 URGENT in queue
- Artisan sees items: "3x Bread 🍽️, 2x Cake 🍽️"
- Can plan: Need bakery boxes before confirming
- Quick-confirms orders one by one
- Each confirmation moves to "Ready to Prepare"

**Scenario 2: Afternoon Rush - Mixed Products**
- 3 orders in "preparing" status
- Order 1: All food items 🍽️ (insulated bag)
- Order 2: Mix of art 🎨 and pottery 🏡 (bubble wrap)
- Order 3: Single painting 🎨 (large flat box)
- Artisan clicks each card to see full details
- Prepares based on packaging needs

**Scenario 3: Special Instructions Alert**
- Order shows 💬 "Fragile - wedding cake"
- Artisan clicks card to read full instructions
- Plans extra careful packaging
- Marks ready with confidence

**Scenario 4: Slow Period**
- No pending/preparing orders
- Priority queue auto-hides
- Main list shows all historical orders
- Clean, uncluttered interface

---

## Technical Implementation

### File Structure
```
frontend/src/components/
  ├── Orders.jsx (modified)
  ├── PriorityOrderQueue.jsx (new)
  ├── PriorityOrderCard.jsx (new)
  └── utils/
      └── orderPriority.js (new - helper functions)
```

### New Utility Functions
```javascript
// orderPriority.js
export const PRIORITY_STATUSES = { /* ... */ };
export const calculatePriorityScore = (order) => { /* ... */ };
export const getUrgencyLevel = (order) => { /* ... */ };
export const getTimeAgo = (date) => { /* ... */ };
export const groupBy = (array, key) => { /* ... */ };
```

### State Management
- No new API calls required
- Uses existing `orders` state
- Derived state for `priorityOrders`
- Real-time updates on action completion

### Performance
- Memoize priority calculations
- Virtual scroll for 100+ orders
- Lazy load order images
- Debounce quick actions

---

## Analytics & Metrics

### Track Priority Queue Usage
- Click-through rate on priority cards
- Quick action usage vs full modal
- Average time to confirm orders
- Orders aging in pending status

### Artisan Benefits
- Reduced order confirmation time
- Better visibility of urgent orders
- Fewer missed orders
- Improved customer satisfaction

---

## Mobile Considerations

### Responsive Design
- Vertical stack on mobile
- Swipe gestures for horizontal scroll
- Larger touch targets for actions
- Collapsible sections to save space

---

## Future Enhancements (Optional)

1. **Filters in priority queue** - Filter by delivery method
2. **Custom priority rules** - Artisan can set own priorities
3. **Batch actions** - Confirm multiple orders at once
4. **Sound notifications** - Alert when new priority order arrives
5. **Estimated prep time** - Show time remaining to deadline
6. **Customer proximity** - Show if customer is nearby (pickup orders)

---

## Summary

This design adds a **powerful priority queue** for artisans while **preserving all existing functionality**. Orders that need immediate attention are **front and center**, while the full order list remains below for reference and filtering.

**Key Benefits:**
- ⚡ Faster order processing
- 🎯 Focus on what matters most
- 📊 Visual priority indicators
- 🚀 One-click quick actions
- 🧹 Auto-hiding when not needed
- ✅ Zero breaking changes

**Implementation Effort:**
- **New Components:** 2 (PriorityOrderQueue, PriorityOrderCard)
- **Modified Components:** 1 (Orders.jsx)
- **New Utilities:** 1 (orderPriority.js)
- **Estimated Time:** 4-6 hours
- **Lines of Code:** ~500

Ready to implement? 🚀

