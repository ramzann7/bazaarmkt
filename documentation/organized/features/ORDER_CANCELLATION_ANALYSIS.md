# Order Cancellation System - Analysis & Implementation

**Date:** October 2, 2025  
**Status:** ✅ IMPLEMENTED - See ORDER_CANCELLATION_IMPLEMENTATION.md

## Existing Functionality Found

### ✅ Frontend Implementation EXISTS

**File:** `frontend/src/services/orderService.js` (lines 169-179)
```javascript
cancelOrder: async (orderId) => {
  try {
    const response = await axios.put(`${API_URL}/orders/${orderId}/cancel`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
}
```

**File:** `frontend/src/components/Orders.jsx` (lines 1193-1210)
```javascript
const handleCancelOrder = async () => {
  if (!confirm('Are you sure you want to cancel this order?')) {
    return;
  }

  setIsLoading(true);
  try {
    await orderService.cancelOrder(order._id);
    toast.success('Order cancelled successfully');
    onRefresh();
    onClose();
  } catch (error) {
    console.error('Error cancelling order:', error);
    toast.error('Failed to cancel order');
  } finally {
    setIsLoading(false);
  }
};
```

### ❌ Backend Endpoint MISSING

**Expected Endpoint:** `PUT /api/orders/:id/cancel`  
**Status:** ⚠️ **DOES NOT EXIST**

**Current Workaround:**
- Frontend calls `/orders/:id/cancel`
- Backend has NO dedicated cancel endpoint
- Would result in 404 error

**Backend Has:**
- `PUT /api/orders/:id/status` - General status update endpoint
- Valid statuses include: 'cancelled' (line 3499)
- Can technically cancel via status update, but no dedicated endpoint

## Required Implementation

### Cancellation Rules (As Specified)

1. **✅ Patron can cancel order BEFORE artisan confirms**
   - Order status: 'pending'
   - Action: Change status to 'cancelled'
   
2. **❌ Patron CANNOT cancel order AFTER artisan confirms**
   - Order status: 'confirmed', 'preparing', 'ready_for_pickup', etc.
   - Action: Block cancellation attempt
   
3. **✅ If patron cancels, artisan CANNOT confirm**
   - Order status becomes 'cancelled'
   - All status transitions from 'cancelled' should be blocked
   
4. **✅ Inventory restoration on cancellation**
   - Restore stock/capacity/availableQuantity
   - Based on product type

### Order Status Workflow

```
Patron Creates Order
  ↓
Status: 'pending'
  ├─ Patron CAN cancel ✅
  ├─ Artisan can confirm → Status: 'confirmed'
  └─ Patron can cancel → Status: 'cancelled'
      ├─ Inventory restored ✅
      ├─ Artisan CANNOT confirm anymore ✅
      └─ Order flow ends

Artisan Confirms Order
  ↓
Status: 'confirmed'
  ├─ Patron CANNOT cancel ❌
  ├─ Artisan prepares order
  └─ Continue normal flow
```

### Implementation Needed

#### Backend: `PUT /api/orders/:id/cancel`

**Endpoint Logic:**
```javascript
// Verify user is the order owner (patron)
// Check order status is 'pending' only
// If confirmed or later: return error "Cannot cancel confirmed order"
// Update status to 'cancelled'
// Add cancellation timestamp
// Add cancellation reason (optional)
// Restore inventory based on product type
// Send cancellation notification to artisan
// Send confirmation to patron
// Return success
```

**Security Checks:**
1. JWT authentication required
2. User must be the order owner
3. Order status must be 'pending'
4. Cannot cancel guest orders (or different logic)

**Inventory Restoration:**
```javascript
for each item in order:
  if productType === 'ready_to_ship':
    increment stock by quantity
  else if productType === 'made_to_order':
    increment remainingCapacity by quantity
  else if productType === 'scheduled_order':
    increment availableQuantity by quantity
```

#### Frontend: Update Cancel Button Logic

**File:** `frontend/src/components/Orders.jsx`

**Add Conditional Display:**
```javascript
// Only show cancel button if:
// 1. User is the patron (order owner)
// 2. Order status is 'pending'
// 3. Order is not already cancelled

{order.status === 'pending' && !isArtisan && (
  <button onClick={handleCancelOrder}>
    Cancel Order
  </button>
)}
```

## Alternative Approach: Use Existing Status Endpoint

Instead of creating a new `/cancel` endpoint, we could:

1. Update frontend to call `/orders/:id/status` with `status: 'cancelled'`
2. Enhance backend status endpoint with cancellation rules
3. Add permission check: Only patron can cancel their own order
4. Add status check: Can only cancel from 'pending' status

**Pros:**
- Use existing endpoint (less code)
- Consistent with decline order pattern
- Already validated

**Cons:**
- Less explicit naming
- Need to add patron permission logic to status endpoint

## Recommendation

**Option 1 (Recommended): Create Dedicated Cancel Endpoint**
- Clearer intent and purpose
- Patron-specific logic isolated
- Easier to add cancellation reason
- Better audit trail
- Consistent with existing cancelOrder frontend function

**Option 2 (Alternative): Enhance Status Endpoint**
- Modify frontend to use status endpoint
- Add patron permission to status endpoint
- Add cancellation rules to status endpoint
- Update frontend cancelOrder to use status endpoint

## Files to Modify

### If Creating New Endpoint:
1. `backend/server-vercel.js` or `backend/routes/orders/index.js`
   - Create `PUT /api/orders/:id/cancel`
2. `frontend/src/services/orderService.js`
   - Already exists, just needs working backend
3. `frontend/src/components/Orders.jsx`
   - Add conditional display logic

### If Using Status Endpoint:
1. `backend/server-vercel.js` (status update endpoint)
   - Add patron cancel permission
2. `frontend/src/services/orderService.js`
   - Change cancelOrder to use status endpoint
3. `frontend/src/components/Orders.jsx`
   - Add conditional display logic

## Next Steps

1. **Choose approach** (dedicated endpoint vs status endpoint)
2. **Implement backend logic** with rules
3. **Add inventory restoration** for cancelled orders
4. **Add notifications** (email to artisan, confirmation to patron)
5. **Update frontend UI** with conditional cancel button
6. **Test workflow** with various order statuses
7. **Document** cancellation policy

## Questions to Resolve

1. Can patrons cancel orders after 'confirmed' but before 'preparing'?
2. What happens to payment/wallet if order is cancelled?
3. Should there be a cancellation fee for late cancellations?
4. Should artisans be able to cancel confirmed orders?
5. Time limit for patron cancellations (e.g., within 5 minutes of placing order)?

---

**Ready to implement once approach is chosen!**

