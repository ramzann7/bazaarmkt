# Uber Direct Buffer System - End-to-End Test Script

**Date:** October 11, 2025  
**Tester:** Manual Testing Required  
**Artisan Account:** ramzan.7@hotmail.com  
**Patron Account:** ramzan0104@gmail.com

---

## Pre-Test Setup

### 1. Verify Environment Variables
```bash
# Check backend .env has these set:
DELIVERY_BUFFER_PERCENTAGE=20
UBER_DIRECT_CLIENT_ID=[your_id]
UBER_DIRECT_CLIENT_SECRET=[your_secret]
UBER_DIRECT_CUSTOMER_ID=[your_customer_id]

# Optional test mode (to simulate different prices):
TEST_MODE=true
```

### 2. Start Services
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev

# Verify both are running:
# Backend: http://localhost:4000
# Frontend: http://localhost:5173
```

### 3. Database State Check
```javascript
// In MongoDB, verify artisan profile has:
db.artisans.findOne({ email: "ramzan.7@hotmail.com" })

// Should have:
{
  fulfillment: {
    methods: {
      professionalDelivery: {
        enabled: true
      }
    }
  },
  address: {
    street: "...",
    city: "...",
    latitude: [number],
    longitude: [number]
  }
}
```

---

## Test Scenario 1: Price Decrease (Most Common)

### **Expected Outcome:** Buyer gets automatic refund

### **Steps:**

#### A. Place Order (as Patron)

1. **Login as Patron**
   - Email: ramzan0104@gmail.com
   - Navigate to artisan's shop (ramzan.7@hotmail.com)

2. **Add Products to Cart**
   - Add 2-3 items
   - Click "View Cart"

3. **Select Professional Delivery**
   ```
   ✅ Verify: Delivery options show
   ✅ Verify: "Professional Delivery" option available
   ✅ Verify: Saved address pre-loaded (2020 RUE FLORIAN)
   ```

4. **Check Uber Quote Display**
   ```
   Console should show:
   🚛 Professional delivery selected - fetching Uber quotes
   🚛 Using address for Uber quote: {street: '2020 RUE FLORIAN', ...}
   ✅ Received buffered quote: {estimatedFee: 'XX.XX', buffer: 'X.XX', chargedAmount: 'XX.XX'}
   
   ✅ Verify in UI: Fee shows (e.g., $27.60)
   ✅ Verify: Fee = estimatedFee + buffer
   ```

5. **Complete Checkout**
   - Click "Continue to Payment"
   - Enter card details (test card: 4242 4242 4242 4242)
   - Complete payment
   
   ```
   ✅ Verify: Order created successfully
   ✅ Verify: Charged amount includes buffer
   
   Console should show:
   💰 Added delivery pricing to order: {
     estimatedFee: XX.XX,
     buffer: X.XX,
     chargedAmount: XX.XX,
     uberQuoteId: "..."
   }
   ```

6. **Check Email #1 - Order Confirmation (Patron)**
   ```
   To: ramzan0104@gmail.com
   Subject: "Order Confirmed #XXXXXXXX"
   
   ✅ Verify: Order details present
   ✅ Verify: Total amount = subtotal + buffered delivery fee
   ```

7. **Check Email #2 - New Order (Artisan)**
   ```
   To: ramzan.7@hotmail.com
   Subject: "New Order #XXXXXXXX"
   
   ✅ Verify: Order notification received
   ✅ Verify: Patron details visible
   ```

#### B. Process Order (as Artisan)

8. **Login as Artisan**
   - Email: ramzan.7@hotmail.com
   - Navigate to "Orders" page

9. **Confirm Order**
   - Click on the pending order
   - Click "Confirm Order"
   
   ```
   ✅ Verify: Status changes to "Confirmed"
   ```

10. **Check Email #3 - Order Confirmed (Patron)**
    ```
    To: ramzan0104@gmail.com
    Subject: "Your Order is Confirmed"
    
    ✅ Verify: Confirmation email sent
    ```

11. **Mark Preparing**
    - Click "Start Preparing"
    
    ```
    ✅ Verify: Status changes to "Preparing"
    ```

12. **Mark Ready for Delivery** ⚡ **CRITICAL TRIGGER**
    - Click "Mark Ready"
    
    ```
    🔍 Backend Console Should Show:
    🚛 Order ready for delivery - processing Uber Direct request
    🚛 Processing ready for delivery for order: [orderId]
    📍 Extracted locations: { pickup: "...", dropoff: "..." }
    💰 Delivery pricing comparison: {
      estimatedFee: XX.XX,
      actualFee: YY.YY,  ← Should be LOWER for this test
      chargedAmount: XX.XX,
      difference: Z.ZZ
    }
    ✅ Delivery cost lower. Refunding $Z.ZZ to buyer
    
    ✅ Verify: Status changes to "Out for Delivery"
    ✅ Verify: No artisan decision required
    ```

13. **Check Email #4 - Refund Notification (Patron)**
    ```
    To: ramzan0104@gmail.com
    Subject: "Delivery Refund for Order #XXXXXXXX"
    
    Content should include:
    - "You've been refunded $X.XX"
    - "Delivery cost was lower than estimated"
    - Breakdown of costs
    ```

14. **Check Email #5 - Out for Delivery with Tracking (Patron)**
    ```
    To: ramzan0104@gmail.com
    Subject: "Your Order is Out for Delivery"
    
    ✅ Verify: Includes Uber tracking URL
    ✅ Verify: "Track Your Order" button present
    ✅ Verify: Courier info (if available)
    ✅ Verify: ETA information
    
    Should contain:
    <a href="https://track.uber.com/...">Track Your Order</a>
    ```

#### C. Verify UI Components (as Patron)

15. **Check Order Details Page**
    - Navigate to Orders
    - Click on the order
    
    ```
    ✅ Verify: Green refund notification box visible
    ✅ Verify: Shows "💰 Delivery Refund Processed"
    ✅ Verify: Cost breakdown:
       - Estimated: $XX.XX
       - Buffer (20%): +$X.XX
       - You paid: $XX.XX
       - Actual: $YY.YY
       - Refunded: $Z.ZZ
    ```

16. **Check Wallet Balance**
    - Navigate to Wallet
    
    ```
    ✅ Verify: Refund transaction visible
    ✅ Verify: Type: "delivery_refund"
    ✅ Verify: Amount matches refund
    ```

---

## Test Scenario 2: Price Within Buffer

### **Expected Outcome:** Delivery created, no refund, no artisan decision

### **Steps:**

1. **Repeat Steps 1-11 from Scenario 1**

2. **Mark Ready for Delivery**
   ```
   🔍 Backend Console Should Show:
   💰 Delivery pricing comparison: {
     actualFee: XX.XX,  ← Within buffer range
     chargedAmount: XX.XX,
     difference: Small or zero
   }
   ✅ Delivery cost within budget. Creating delivery.
   
   ✅ Verify: Status changes to "Out for Delivery"
   ✅ Verify: No refund notification
   ✅ Verify: No artisan decision required
   ```

3. **Check Patron Order**
   ```
   ✅ Verify: NO refund notification
   ✅ Verify: Order shows "Out for Delivery"
   ✅ Verify: Tracking URL available
   ```

---

## Test Scenario 3: Price Increase - Artisan Accepts

### **Expected Outcome:** Artisan sees decision UI, accepts, pays difference

### **Steps to Simulate Higher Price:**

```javascript
// OPTION 1: Modify backend temporarily to simulate surge
// In backend/services/uberDirectService.js, processReadyForDelivery():
// Add before getting fresh quote:
const SIMULATE_SURGE = true;
if (SIMULATE_SURGE) {
  // Override actualFee to be higher
  freshQuote.fee = (parseFloat(freshQuote.fee || 15) + 5).toFixed(2);
}
```

### **Test Steps:**

1. **Repeat Steps 1-11 from Scenario 1**

2. **Mark Ready for Delivery**
   ```
   🔍 Backend Console Should Show:
   💰 Delivery pricing comparison: {
     actualFee: 32.00,  ← HIGHER than charged
     chargedAmount: 27.60,
     excess: 4.40
   }
   ⚠️ Delivery cost increased by $4.40. Awaiting artisan response.
   
   ✅ Verify: Status STAYS "Ready for Delivery"
   ✅ Verify: Order NOT marked out for delivery yet
   ```

3. **Check Artisan's Orders Page**
   - Refresh orders
   - Click on the order
   
   ```
   ✅ Verify: Yellow pulsing alert box appears
   ✅ Verify: Title: "⚠️ Delivery Cost Increased"
   ✅ Verify: Shows:
      - Current cost: $32.00
      - Customer charged: $27.60
      - Additional cost: $4.40
   ✅ Verify: Two buttons visible:
      - "Accept $4.40" (green)
      - "Decline & Cancel Order" (red)
   ✅ Verify: Animation: Pulse effect active
   ```

4. **Check Email #3 - Cost Increase (Artisan)**
   ```
   To: ramzan.7@hotmail.com
   Subject: "Delivery Cost Increased - Order #XXXXXXXX"
   
   Content:
   - "Delivery cost increased by $4.40"
   - "Please review and respond"
   - Link to order management
   
   ✅ Verify: Email received
   ✅ Verify: Amount matches
   ```

5. **Artisan Accepts Cost**
   - Click "Accept $4.40" button
   
   ```
   🔍 Console Should Show:
   💰 Artisan responding to cost absorption: accepted
   ✅ Cost absorption response processed
   
   ✅ Verify: Toast appears: "Delivery created! Cost of $4.40 will be deducted..."
   ✅ Verify: Modal closes
   ✅ Verify: Order status: "Out for Delivery"
   ```

6. **Check Backend Console**
   ```
   Should show:
   ✅ Artisan accepted to absorb $4.40
   💰 Crediting wallet for artisan user: [artisanUserId]
   (Deduction transaction)
   ✅ Uber delivery created
   ```

7. **Check Artisan Wallet**
   - Navigate to Wallet
   
   ```
   ✅ Verify: Transaction shows deduction
   ✅ Verify: Type: "wallet_deduction"
   ✅ Verify: Description: "Absorbed delivery cost increase..."
   ✅ Verify: Amount: -$4.40
   ```

8. **Check Email #4 - Out for Delivery (Patron)**
   ```
   To: ramzan0104@gmail.com
   Subject: "Your Order is Out for Delivery"
   
   ✅ Verify: Includes Uber tracking URL
   ✅ Verify: Track button works
   ```

9. **Verify Order Data in Database**
   ```javascript
   db.orders.findOne({ _id: ObjectId("[orderId]") })
   
   Should have:
   {
     deliveryPricing: {
       estimatedFee: 23.00,
       actualFee: 32.00,
       buffer: 4.60,
       chargedAmount: 27.60,
       artisanAbsorbed: 4.40
     },
     costAbsorption: {
       required: true,
       amount: 4.40,
       artisanResponse: "accepted",
       respondedAt: [timestamp]
     },
     uberDelivery: {
       deliveryId: "uber_123",
       trackingUrl: "https://...",
       status: "requested"
     },
     status: "out_for_delivery"
   }
   ```

---

## Test Scenario 4: Price Increase - Artisan Declines

### **Expected Outcome:** Order cancelled, buyer fully refunded

### **Steps:**

1. **Create new order (repeat Scenario 3 steps 1-2)**

2. **Artisan Sees Cost Increase Alert**
   - Open order in Orders page
   - See yellow pulsing alert

3. **Artisan Declines**
   - Click "Decline & Cancel Order" button
   
   ```
   ✅ Verify: Confirmation prompt (if any)
   ✅ Verify: Toast: "Order cancelled. Customer fully refunded."
   ✅ Verify: Modal closes
   ✅ Verify: Order removed from active orders
   ```

4. **Check Backend Console**
   ```
   Should show:
   ❌ Artisan declined to absorb cost. Cancelling order.
   💰 Refunding full amount to buyer: $27.60
   ✅ Inventory restored for order
   ```

5. **Check Patron's Order**
   - Login as ramzan0104@gmail.com
   - Navigate to Orders
   
   ```
   ✅ Verify: Order status: "Cancelled"
   ✅ Verify: Cancellation reason shows:
      "Artisan declined to absorb delivery cost increase"
   ```

6. **Check Email #6 - Order Cancelled (Patron)**
   ```
   To: ramzan0104@gmail.com
   Subject: "Order Cancelled #XXXXXXXX"
   
   Content:
   - "Order cancelled due to delivery cost increase"
   - "Fully refunded: $27.60"
   - "Funds added to your wallet"
   
   ✅ Verify: Email received
   ✅ Verify: Amount correct
   ```

7. **Check Patron Wallet**
   ```
   ✅ Verify: Full refund received: +$27.60
   ✅ Verify: Transaction type: "order_cancellation_refund"
   ```

8. **Check Product Inventory**
   ```
   ✅ Verify: Stock/quantity restored
   ✅ Verify: Product available again
   ```

---

## Component-by-Component Testing

### **Cart Component Tests**

#### Test 1.1: Buffered Quote Display
```
Steps:
1. Add item to cart
2. Select professional delivery
3. Enter address or use saved address

Verify:
✅ Quote fetches automatically
✅ Console shows buffered quote with all fields
✅ Fee displayed = chargedAmount (not estimatedFee)
✅ No NaN values
✅ Loading indicator during fetch
```

#### Test 1.2: Address Switching
```
Steps:
1. Use saved address → Note quote amount
2. Switch to manual entry → Enter different address
3. Quote should re-fetch

Verify:
✅ Quote clears when address changes
✅ New quote fetches for new address
✅ Different quote amount (if different distance)
✅ Saved address not modified in database
```

#### Test 1.3: Delivery Method Switching
```
Steps:
1. Select professional delivery → Quote fetches
2. Switch to pickup → Quote clears
3. Switch back to professional → Quote re-fetches

Verify:
✅ Quote only shows for professional delivery
✅ Quote cleared when switching away
✅ Quote re-fetched when switching back
```

---

### **Orders Component Tests (Artisan)**

#### Test 2.1: Cost Absorption UI
```
Setup: Create order with simulated price increase

Verify Yellow Alert Box:
✅ Appears immediately when order opened
✅ Pulse animation active
✅ Shows correct amounts:
   - Actual cost
   - Charged amount  
   - Excess amount
✅ Explanation text clear
✅ Two buttons visible and enabled
✅ Buttons properly styled (green/red)
```

#### Test 2.2: Accept Button
```
Steps:
1. Click "Accept $X.XX"

Verify:
✅ Button shows "⏳ Processing..."
✅ Both buttons disable during processing
✅ Success toast appears
✅ Modal closes automatically
✅ Order status updates to "Out for Delivery"
✅ Order removed from ready_for_delivery filter
```

#### Test 2.3: Decline Button
```
Steps:
1. Click "Decline & Cancel Order"

Verify:
✅ Button shows "⏳ Processing..."
✅ Info toast appears
✅ Modal closes
✅ Order moves to cancelled
✅ No longer in active orders
```

---

### **Orders Component Tests (Patron)**

#### Test 3.1: Refund Notification Display
```
Setup: Complete order with price decrease

Verify Green Box:
✅ Appears in order details
✅ Shows "💰 Delivery Refund Processed"
✅ Amount displayed correctly
✅ Cost breakdown table shows:
   - Estimated fee
   - Buffer charged
   - Total paid
   - Actual cost
   - Refunded amount (highlighted)
✅ All numbers add up correctly
```

#### Test 3.2: Tracking URL
```
Verify:
✅ Tracking URL visible when status = out_for_delivery
✅ URL is clickable
✅ Opens Uber tracking page
✅ Shows delivery progress
```

---

### **Email Tests**

#### Email 1: Order Placed
```
Recipient: Both patron and artisan
Timing: Immediately after order creation
Content:
✅ Order number
✅ Items list
✅ Total amount (with buffered delivery fee)
✅ Delivery method: Professional Delivery
```

#### Email 2: Order Confirmed
```
Recipient: Patron
Timing: When artisan confirms
Content:
✅ Confirmation message
✅ Estimated preparation time
```

#### Email 3: Delivery Refund (If Applicable)
```
Recipient: Patron  
Timing: When status → out_for_delivery (price lower)
Content:
✅ Refund amount
✅ Reason: "Delivery cost was lower"
✅ Cost breakdown
```

#### Email 4: Out for Delivery with Tracking
```
Recipient: Patron
Timing: When status → out_for_delivery
Content:
✅ Tracking URL button (large, prominent)
✅ Delivery ID
✅ Courier name (if available)
✅ Courier vehicle (if available)
✅ ETA information

HTML Should Include:
<a href="{{deliveryInfo.trackingUrl}}" style="...">
  🔍 Track Your Order
</a>
```

#### Email 5: Delivery Cost Increase (If Applicable)
```
Recipient: Artisan
Timing: When actualFee > chargedAmount
Content:
✅ Clear subject: "Delivery Cost Increased"
✅ Excess amount
✅ Link to order management
✅ Urgency indicator
```

#### Email 6: Order Cancelled (If Declined)
```
Recipient: Patron
Timing: When artisan declines cost absorption
Content:
✅ Cancellation reason
✅ Full refund amount
✅ "Funds added to wallet"
```

---

## Database Verification Tests

### Test 4.1: Order Document Structure
```javascript
// After order placement
db.orders.findOne({ _id: ObjectId("[orderId]") })

Should have:
{
  deliveryPricing: {
    estimatedFee: [number],
    buffer: [number],
    bufferPercentage: 20,
    chargedAmount: [number],
    uberQuoteId: [string],
    uberQuoteExpiry: [date]
  },
  // These added after ready_for_delivery:
  deliveryPricing.actualFee: [number],
  deliveryPricing.refundAmount: [number], // If lower
  deliveryPricing.artisanAbsorbed: [number], // If higher & accepted
  
  uberDelivery: {
    deliveryId: [string],
    trackingUrl: [string],
    status: "requested",
    courier: {...},
    createdAt: [date]
  },
  
  costAbsorption: { // If price higher
    required: [boolean],
    amount: [number],
    artisanResponse: "pending|accepted|declined",
    respondedAt: [date]
  }
}
```

### Test 4.2: Wallet Transactions
```javascript
// Check patron wallet
db.transactions.find({ userId: ObjectId("[patronUserId]"), type: "delivery_refund" })

// Check artisan wallet
db.transactions.find({ userId: ObjectId("[artisanUserId]"), type: "wallet_deduction" })

Verify:
✅ Correct amounts
✅ Correct metadata (orderId, reason)
✅ Status: "completed"
```

---

## API Endpoint Tests

### Test 5.1: Quote with Buffer
```bash
curl -X POST http://localhost:4000/api/delivery/uber-direct/quote-with-buffer \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": {
      "address": "...",
      "latitude": 45.5,
      "longitude": -73.5
    },
    "dropoffLocation": {
      "address": "2020 RUE FLORIAN, MONTREAL",
      "latitude": 45.537,
      "longitude": -73.550
    },
    "packageDetails": {
      "weight": 2,
      "price": 50
    },
    "bufferPercentage": 20
  }'

Expected Response:
{
  "success": true,
  "estimatedFee": "XX.XX",
  "buffer": "X.XX",
  "chargedAmount": "XX.XX",
  "bufferPercentage": 20,
  "quoteId": "...",
  "explanation": "Delivery fee includes 20% buffer..."
}

✅ Verify: All fields present
✅ Verify: chargedAmount = estimatedFee * 1.20
✅ Verify: No NaN values
```

### Test 5.2: Artisan Cost Response
```bash
# Get auth token first
TOKEN="[artisan_jwt_token]"

curl -X POST http://localhost:4000/api/orders/[orderId]/artisan-cost-response \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"response": "accepted"}'

Expected Response:
{
  "success": true,
  "data": {
    "action": "cost_absorbed",
    "delivery": {
      "deliveryId": "...",
      "trackingUrl": "..."
    },
    "excessAmount": X.XX
  },
  "message": "Delivery created. Cost absorbed by artisan."
}

✅ Verify: 200 status
✅ Verify: Delivery created
✅ Verify: Response structure correct
```

---

## Performance Tests

### Test 6.1: Quote Fetch Speed
```
Measure:
- Time from address entry to quote display
- Should be < 3 seconds

✅ Verify: Reasonable performance
✅ Verify: Loading indicator shows
✅ Verify: No UI freeze
```

### Test 6.2: Order Status Update Speed
```
Measure:
- Time from "Mark Ready" to status update
- Should be < 5 seconds (includes Uber API call)

✅ Verify: Reasonable performance
✅ Verify: Loading states work
```

---

## Error Handling Tests

### Test 7.1: Uber API Failure
```
Steps:
1. Set invalid Uber credentials temporarily
2. Place order with professional delivery

Verify:
✅ Falls back to estimated pricing
✅ Shows "estimated" indicator
✅ Order still completes
✅ No system crash
```

### Test 7.2: Network Error During Cost Response
```
Steps:
1. Disconnect network
2. Try to accept/decline cost

Verify:
✅ Error toast appears
✅ Buttons re-enable
✅ Can retry when network restored
✅ Order state preserved
```

### Test 7.3: Wallet Insufficient Balance (Artisan)
```
Setup: Artisan wallet balance < excess amount

Verify:
✅ Clear error message
✅ Explains insufficient funds
✅ Suggests alternatives
```

---

## Mobile Responsive Tests

### Test 8.1: Cost Absorption on Mobile
```
Device: iPhone/Android simulator or real device

Verify:
✅ Alert box fits screen
✅ Text readable
✅ Buttons accessible
✅ Can scroll if needed
✅ Buttons stack vertically on small screens
```

### Test 8.2: Refund Notification on Mobile
```
Verify:
✅ Breakdown table fits
✅ All text visible
✅ Numbers aligned
✅ Colors contrast well
```

---

## Browser Compatibility Tests

### Test 9: Cross-Browser
```
Test in:
✅ Chrome - All features
✅ Safari - All features
✅ Firefox - All features
✅ Edge - All features

Verify:
✅ Animations work
✅ Toasts appear
✅ Modals function
✅ Buttons clickable
```

---

## Security Tests

### Test 10.1: Authorization
```
Try to respond to cost absorption with wrong artisan:
✅ Verify: 403 Forbidden
✅ Verify: Clear error message

Try with no token:
✅ Verify: 401 Unauthorized
```

### Test 10.2: Invalid Inputs
```
Send invalid response value:
POST /artisan-cost-response { "response": "maybe" }

✅ Verify: 400 Bad Request
✅ Verify: Error: "Must be accepted or declined"
```

---

## Integration Tests Summary

### **Checklist:**

**Order Flow:**
- [ ] Order placed with buffered quote
- [ ] Payment charged includes buffer
- [ ] Order stored with pricing data
- [ ] Emails sent correctly

**Ready for Delivery Trigger:**
- [ ] Backend auto-fetches fresh quote
- [ ] Compares prices correctly
- [ ] Takes correct action based on result

**Price Lower Scenario:**
- [ ] Auto-refund processed
- [ ] Wallet transaction created
- [ ] Delivery created immediately
- [ ] Refund UI shows for patron
- [ ] Email includes tracking URL

**Price Higher - Accept:**
- [ ] Artisan sees decision UI
- [ ] Accept button works
- [ ] Wallet deducted
- [ ] Delivery created
- [ ] Emails sent

**Price Higher - Decline:**
- [ ] Decline button works
- [ ] Order cancelled
- [ ] Full refund processed
- [ ] Inventory restored
- [ ] Emails sent

**All Components:**
- [ ] No JavaScript errors
- [ ] No console warnings
- [ ] All animations smooth
- [ ] All data displays correctly

---

## Expected Console Output (Success Path)

### **Cart Page:**
```
🔄 Loading delivery options for new cart state
📍 Building artisan data - coordinates: {...}
🏠 Loading saved address: {street: '2020 RUE FLORIAN', ...}
🚛 Professional delivery selected - fetching Uber quotes
🚛 Using address for Uber quote: {street: '2020 RUE FLORIAN', source: 'selectedAddress'}
🚛 Requesting Uber Direct quote with buffer: {bufferPercentage: 20}
✅ Received buffered quote: {estimatedFee: '23.00', buffer: '4.60', chargedAmount: '27.60'}
💰 Added delivery pricing to order: {estimatedFee: 23, buffer: 4.6, chargedAmount: 27.6}
```

### **Backend (Ready for Delivery):**
```
🚛 Order ready for delivery - processing Uber Direct request
🚛 Processing ready for delivery for order: [orderId]
📍 Extracted locations: {pickup: "...", dropoff: "..."}
💰 Delivery pricing comparison: {estimatedFee: 23, actualFee: 20, chargedAmount: 27.6}
✅ Delivery cost lower. Refunding $7.60 to buyer
✅ Uber delivery created
```

---

## **Quick Test Script (10 Minutes)**

```bash
# 1. Place order (2 min)
- Login patron
- Add item, select professional delivery
- Checkout

# 2. Process order (3 min)
- Login artisan
- Confirm → Preparing → Ready for Delivery

# 3. Verify outcomes (5 min)
- Check patron order for refund notification
- Check emails (both accounts)
- Check wallets (both accounts)
- Verify tracking URL
```

---

## **Test Results Template**

```markdown
## Test Run: [Date/Time]

### Scenario 1: Price Decrease
- [ ] Order placed: PASS/FAIL
- [ ] Quote with buffer: PASS/FAIL  
- [ ] Ready for delivery: PASS/FAIL
- [ ] Refund processed: PASS/FAIL
- [ ] UI displays correctly: PASS/FAIL
- [ ] Emails sent: PASS/FAIL

### Scenario 2: Price Increase - Accept
- [ ] Cost absorption UI: PASS/FAIL
- [ ] Accept button: PASS/FAIL
- [ ] Wallet deduction: PASS/FAIL
- [ ] Delivery created: PASS/FAIL
- [ ] Emails sent: PASS/FAIL

### Scenario 3: Price Increase - Decline
- [ ] Decline button: PASS/FAIL
- [ ] Order cancelled: PASS/FAIL
- [ ] Full refund: PASS/FAIL
- [ ] Inventory restored: PASS/FAIL
- [ ] Emails sent: PASS/FAIL

### Overall Status: PASS/FAIL
### Issues Found: [List any issues]
### Notes: [Any observations]
```

---

**Status:** Ready for Manual Testing  
**Test Duration:** ~30-45 minutes for complete suite  
**Priority Tests:** Scenarios 1 & 2 (most common use cases)

