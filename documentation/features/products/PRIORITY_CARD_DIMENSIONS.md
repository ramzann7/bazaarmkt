# Priority Order Card - Compact Dimensions Guide

## Card Specifications

### Size Constraints
```
Width: 300px (fixed)
Max Height: 400px
Min Height: 320px (auto-adjusts to content)

Desktop: 3-4 cards visible at once (1200px screen)
Tablet: 2-3 cards visible
Mobile: 1 card + partial next (swipe)
```

### Content Breakdown (Pixels)

```
┌────────────────────────────────────┐
│ Urgency Badge (24px)               │  24px
├────────────────────────────────────┤
│ Order Header (32px)                │  32px
│ #OrderNum + Status Icon            │
├────────────────────────────────────┤
│ Order Summary (48px)               │  48px
│ $Total + Delivery Method           │
├────────────────────────────────────┤
│ Items List (128px max, scroll)     │  ≤128px
│ • 2x Product Name 🍽️              │
│ • 1x Product Name 🎨              │
│ • +2 more...                       │
├────────────────────────────────────┤
│ Special Instructions (40px)        │  40px (optional)
│ 💬 "Customer note..."              │
├────────────────────────────────────┤
│ Quick Action Buttons (48px)        │  48px
│ [Confirm] [Decline]                │
├────────────────────────────────────┤
│ Click Indicator (24px)             │  24px
│ "Click for full details →"        │
└────────────────────────────────────┘

Total: 320-400px height (dynamic)
```

## Item Display Logic

### Show Maximum 4 Items
```javascript
// Display Strategy
if (items.length <= 4) {
  // Show all items
  items.map(item => <ItemRow />)
} else {
  // Show first 4 + "more" indicator
  items.slice(0, 4).map(item => <ItemRow />)
  <div>+{items.length - 4} more items...</div>
}
```

### Item Truncation
```
Product Name Display:
- Max 20 characters
- Truncate with "..."
- Full name in title attribute (tooltip)

Examples:
  "Sourdough Bread" → "Sourdough Bread"
  "Organic Whole Wheat..." → "Organic Whole Wheat..."
  (hover shows: "Organic Whole Wheat Artisan Bread")
```

### Category Icons
```javascript
const categoryIcons = {
  food_beverages: '🍽️',      // Food packaging
  art_collectibles: '🎨',    // Fragile/wrap
  home_garden: '🏡',         // Box/protect
  fashion_accessories: '👕', // Fold/bag
  handmade_crafts: '✂️',     // Wrap carefully
  health_beauty: '💄',       // Secure bottles
  tech_gadgets: '📱'         // Bubble wrap
};
```

## Responsive Behavior

### Desktop (≥1200px)
```
Container: 100% width
Cards visible: 3-4 simultaneously
Scroll: Smooth horizontal with mouse wheel
Gap: 16px between cards
```

### Tablet (768px - 1199px)
```
Container: 100% width
Cards visible: 2-3 simultaneously
Scroll: Touch swipe + mouse wheel
Gap: 12px between cards
```

### Mobile (< 768px)
```
Container: 100vw - 32px (16px padding each side)
Cards visible: 1 + partial next (peek)
Scroll: Touch swipe
Gap: 8px between cards
Card width: 280px (slightly narrower)
```

## Performance Optimization

### Virtualization (if >20 orders)
```javascript
import { Virtuoso } from 'react-virtuoso';

<Virtuoso
  horizontal
  data={priorityOrders}
  itemContent={(index, order) => (
    <PriorityOrderCard order={order} />
  )}
  style={{ height: '420px' }}
/>
```

### Image Loading
```javascript
// Lazy load product images
<img 
  src={item.image} 
  loading="lazy"
  className="w-6 h-6 rounded"
  alt={item.name}
/>
```

### Memoization
```javascript
const PriorityOrderCard = React.memo(({ order, onClick, onQuickAction }) => {
  // Component code
}, (prevProps, nextProps) => {
  return prevProps.order._id === nextProps.order._id &&
         prevProps.order.status === nextProps.order.status;
});
```

## Accessibility

### Keyboard Navigation
```javascript
<div
  className="priority-card"
  role="button"
  tabIndex={0}
  onClick={() => onClick(order)}
  onKeyPress={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClick(order);
    }
  }}
  aria-label={`Order ${order.orderNumber}, ${order.items.length} items, $${order.total}`}
>
```

### Screen Reader Support
```html
<div aria-live="polite" aria-atomic="true">
  {priorityOrders.length} priority orders requiring attention
</div>
```

## Scrolling UX

### Smooth Scroll
```css
.priority-cards-container {
  scroll-behavior: smooth;
  overflow-x: auto;
  scroll-snap-type: x proximity;
}

.priority-card {
  scroll-snap-align: start;
}
```

### Hide Scrollbar (Optional)
```css
/* Firefox */
.priority-cards-container {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

/* Webkit */
.priority-cards-container::-webkit-scrollbar {
  height: 6px;
}

.priority-cards-container::-webkit-scrollbar-thumb {
  background-color: #cbd5e0;
  border-radius: 3px;
}
```

## Space Efficiency Examples

### 10 Priority Orders
```
Desktop (1400px screen):
  4 cards visible × 300px = 1200px
  Remaining 6 cards accessible via scroll
  Scroll indicator: "← Scroll to see all 10 orders →"

Total space: ~420px height (including header/tabs)
```

### 3 Priority Orders
```
Desktop:
  All 3 visible, no scroll needed
  Total width: 900px + gaps = ~948px
  
Total space: ~420px height
```

### 0 Priority Orders
```
Component hidden (display: none)
Space used: 0px
Main order list moves up
```

## Content Priority (if space limited)

### Essential (Always Show)
1. ✅ Urgency badge
2. ✅ Order number
3. ✅ Total amount
4. ✅ Quick action buttons

### Important (Show if space)
5. ✅ First 2-4 items
6. ✅ Delivery method
7. ✅ Status icon

### Optional (Show if room)
8. Special instructions (if exists)
9. "More items" indicator
10. Click hint text

## Testing Checklist

- [ ] 1 order: Card displays fully
- [ ] 5 orders: Scroll smooth, 3-4 visible
- [ ] 20 orders: Performance acceptable
- [ ] 50 orders: Consider virtualization
- [ ] Order with 1 item: Card height minimal
- [ ] Order with 10 items: Scrollable items list
- [ ] Long product names: Truncated properly
- [ ] Special instructions: Wraps correctly
- [ ] Mobile: Swipe works, cards visible
- [ ] Keyboard: Tab navigation works
- [ ] Screen reader: Announces order info

---

**Summary:** Cards stay compact (300×320-400px) while showing essential info for packaging planning. Items list scrolls internally, keeping overall card height manageable even with many products.

