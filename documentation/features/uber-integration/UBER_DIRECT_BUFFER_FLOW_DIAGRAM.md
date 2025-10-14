# Uber Direct Buffer System - Visual Flow Diagrams

## Complete Order Flow with Buffer System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: ORDER PLACEMENT                         │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  Buyer   │
    │ Adds to  │
    │   Cart   │
    └────┬─────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Frontend: Cart.jsx                   │
    │  getUberDirectFee()                   │
    │                                       │
    │  Calls:                               │
    │  uberDirectService                    │
    │    .getDeliveryQuoteWithBuffer()      │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Backend API                          │
    │  POST /delivery/uber-direct/          │
    │       quote-with-buffer               │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Uber Direct API                      │
    │  Get Quote                            │
    │  Returns: $15.00                      │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Backend: Calculate Buffer            │
    │                                       │
    │  Estimated Fee:  $15.00               │
    │  Buffer (20%):   + $3.00              │
    │  ─────────────────────────            │
    │  Charged Amount: $18.00               │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Return to Frontend                   │
    │  {                                    │
    │    estimatedFee: 15.00,               │
    │    buffer: 3.00,                      │
    │    chargedAmount: 18.00,              │
    │    quoteId: "quote_123",              │
    │    explanation: "Includes 20% buffer" │
    │  }                                    │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Display in Cart                      │
    │                                       │
    │  Delivery: $18.00                     │
    │  (includes surge protection)          │
    │                                       │
    │  [Proceed to Checkout]                │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Process Payment                      │
    │  Stripe charges: $18.00               │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Create Order in Database             │
    │                                       │
    │  status: 'pending'                    │
    │  deliveryPricing: {                   │
    │    estimatedFee: 15.00,               │
    │    buffer: 3.00,                      │
    │    chargedAmount: 18.00,              │
    │    uberQuoteId: "quote_123"           │
    │  }                                    │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────┐
    │  Order   │
    │ Created! │
    └──────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│              PHASE 2: READY FOR DELIVERY (HOURS LATER)                  │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │ Artisan  │
    │  Marks   │
    │  Ready   │
    └────┬─────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Frontend: Orders.jsx                 │
    │  Update status to:                    │
    │  'ready_for_delivery'                 │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Backend API                          │
    │  PUT /orders/:id/status               │
    │  { status: 'ready_for_delivery' }     │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Backend: Detect Professional Delivery│
    │                                       │
    │  if (deliveryMethod === 'professional'│
    │      && status === 'ready_for_delivery│
    │                                       │
    │  → Trigger Uber Direct Flow           │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  uberDirectService                    │
    │    .processReadyForDelivery(order)    │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Get Fresh Uber Quote                 │
    │  (Current pricing)                    │
    │                                       │
    │  Uber API Returns: ???                │
    └────┬──────────────────────────────────┘
         │
         ├────────────────┬────────────────┬────────────────┐
         │                │                │                │
         ▼                ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐    ┌──────────┐     ┌──────────┐
   │ $14.50  │      │ $15.00  │    │  $17.00  │     │  $19.00  │
   │ LOWER   │      │ EQUAL   │    │ WITHIN   │     │  HIGHER  │
   └────┬────┘      └────┬────┘    └────┬─────┘     └────┬─────┘
        │                │              │                 │
        │                │              │                 │
        ▼                ▼              ▼                 ▼
   [SCENARIO A]     [SCENARIO B]   [SCENARIO B]     [SCENARIO C]
   See below        See below      See below        See below
```

---

## Scenario A: Price Decreased ($14.50)

```
    ┌──────────────────────────────────────┐
    │  Actual Cost: $14.50                  │
    │  Charged Amount: $18.00               │
    │  Difference: $3.50                    │
    │                                       │
    │  → REFUND TO BUYER                    │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  WalletService.addFunds()             │
    │                                       │
    │  User: [buyer]                        │
    │  Amount: $3.50                        │
    │  Type: 'delivery_refund'              │
    │  Reason: 'Delivery cost was lower'    │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Create Uber Delivery Request         │
    │                                       │
    │  uberDirectService.createDelivery()   │
    │  quoteId: [fresh_quote_id]            │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Update Order                         │
    │                                       │
    │  deliveryPricing: {                   │
    │    actualFee: 14.50,                  │
    │    refundAmount: 3.50                 │
    │  }                                    │
    │  uberDelivery: {                      │
    │    deliveryId: "uber_123",            │
    │    trackingUrl: "https://..."         │
    │  }                                    │
    │  status: 'out_for_delivery'           │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Send Notifications                   │
    │                                       │
    │  To Buyer:                            │
    │  "Delivery cost was $14.50,           │
    │   you've been refunded $3.50!"        │
    │                                       │
    │  "Track your order: [link]"           │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────┐
    │ SUCCESS! │
    │ Delivery │
    │ Created  │
    └──────────┘
```

---

## Scenario B: Price Within Buffer ($17.00 or $15.00)

```
    ┌──────────────────────────────────────┐
    │  Actual Cost: $17.00                  │
    │  Charged Amount: $18.00               │
    │  Difference: $1.00                    │
    │                                       │
    │  → NO REFUND NEEDED                   │
    │  → PROCEED WITH DELIVERY              │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Create Uber Delivery Request         │
    │                                       │
    │  uberDirectService.createDelivery()   │
    │  quoteId: [fresh_quote_id]            │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Update Order                         │
    │                                       │
    │  deliveryPricing: {                   │
    │    actualFee: 17.00                   │
    │  }                                    │
    │  uberDelivery: {                      │
    │    deliveryId: "uber_123",            │
    │    trackingUrl: "https://..."         │
    │  }                                    │
    │  status: 'out_for_delivery'           │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Send Notifications                   │
    │                                       │
    │  To Buyer:                            │
    │  "Your order is out for delivery!"    │
    │  "Track your order: [link]"           │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────┐
    │ SUCCESS! │
    │ Delivery │
    │ Created  │
    └──────────┘
```

---

## Scenario C: Price Increased Beyond Buffer ($19.00)

```
    ┌──────────────────────────────────────┐
    │  Actual Cost: $19.00                  │
    │  Charged Amount: $18.00               │
    │  Excess: $1.00                        │
    │                                       │
    │  → ARTISAN DECISION REQUIRED          │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Update Order (No Delivery Yet)       │
    │                                       │
    │  deliveryPricing: {                   │
    │    actualFee: 19.00                   │
    │  }                                    │
    │  costAbsorption: {                    │
    │    required: true,                    │
    │    amount: 1.00,                      │
    │    artisanResponse: 'pending',        │
    │    quoteId: [fresh_quote_id]          │
    │  }                                    │
    │  status: 'ready_for_delivery'         │
    │  (STAYS IN THIS STATUS)               │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Send Notification to Artisan         │
    │                                       │
    │  "Delivery cost increased by $1.00"   │
    │  "Accept to continue? This will be    │
    │   deducted from your earnings."       │
    │                                       │
    │  [Accept $1.00] [Decline & Cancel]    │
    └────┬──────────────────────────────────┘
         │
         ├─────────────────────┬─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
    ┌─────────┐          ┌─────────┐          ┌──────────┐
    │ ACCEPT  │          │ DECLINE │          │ TIMEOUT  │
    └────┬────┘          └────┬────┘          └────┬─────┘
         │                    │                     │
         │                    │                     │
         ▼                    ▼                     ▼
   [ACCEPT PATH]        [DECLINE PATH]        [TIMEOUT PATH]
   See below            See below             (Same as decline)
```

### Scenario C - Accept Path

```
    ┌──────────────────────────────────────┐
    │  Artisan Clicks "Accept $1.00"        │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Frontend                             │
    │  orderService                         │
    │    .respondToCostAbsorption(          │
    │      orderId, 'accepted')             │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Backend API                          │
    │  POST /orders/:id/artisan-cost-response│
    │  { response: 'accepted' }             │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Deduct from Artisan Wallet           │
    │                                       │
    │  WalletService.deductFunds()          │
    │  User: [artisan_user_id]              │
    │  Amount: $1.00                        │
    │  Reason: 'Absorbed delivery cost'     │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Create Uber Delivery Request         │
    │                                       │
    │  uberDirectService.createDelivery()   │
    │  quoteId: [stored_quote_id]           │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Update Order                         │
    │                                       │
    │  deliveryPricing: {                   │
    │    actualFee: 19.00,                  │
    │    artisanAbsorbed: 1.00              │
    │  }                                    │
    │  costAbsorption: {                    │
    │    artisanResponse: 'accepted',       │
    │    respondedAt: [timestamp]           │
    │  }                                    │
    │  uberDelivery: {                      │
    │    deliveryId: "uber_123",            │
    │    trackingUrl: "https://..."         │
    │  }                                    │
    │  status: 'out_for_delivery'           │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Send Notifications                   │
    │                                       │
    │  To Artisan:                          │
    │  "Delivery created. $1.00 deducted"   │
    │                                       │
    │  To Buyer:                            │
    │  "Your order is out for delivery!"    │
    │  "Track: [link]"                      │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────┐
    │ SUCCESS! │
    │ Delivery │
    │ Created  │
    └──────────┘
```

### Scenario C - Decline Path

```
    ┌──────────────────────────────────────┐
    │  Artisan Clicks "Decline & Cancel"    │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Frontend                             │
    │  orderService                         │
    │    .respondToCostAbsorption(          │
    │      orderId, 'declined')             │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Backend API                          │
    │  POST /orders/:id/artisan-cost-response│
    │  { response: 'declined' }             │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Refund Full Amount to Buyer          │
    │                                       │
    │  WalletService.addFunds()             │
    │  User: [buyer_id]                     │
    │  Amount: $18.00 (full order)          │
    │  Type: 'order_cancellation_refund'    │
    │  Reason: 'Artisan declined cost'      │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Restore Inventory                    │
    │                                       │
    │  InventoryService                     │
    │    .restoreInventoryForOrder(order)   │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Update Order                         │
    │                                       │
    │  costAbsorption: {                    │
    │    artisanResponse: 'declined',       │
    │    respondedAt: [timestamp]           │
    │  }                                    │
    │  status: 'cancelled'                  │
    │  cancellationReason:                  │
    │    'Artisan declined delivery cost'   │
    │  paymentStatus: 'refunded'            │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Send Notifications                   │
    │                                       │
    │  To Artisan:                          │
    │  "Order cancelled successfully"       │
    │                                       │
    │  To Buyer:                            │
    │  "Order cancelled due to delivery     │
    │   cost increase. Full refund of       │
    │   $18.00 processed to your wallet."   │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────┐
    │  ORDER   │
    │CANCELLED │
    │  REFUND  │
    │PROCESSED │
    └──────────┘
```

---

## Database State Transitions

```
ORDER STATUS FLOW WITH BUFFER SYSTEM:

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  pending                                                         │
│    ↓                                                             │
│  confirmed (artisan accepts)                                     │
│    ↓                                                             │
│  preparing (artisan working)                                     │
│    ↓                                                             │
│  ready_for_delivery ←──────────────────┐                        │
│    ↓                                    │                        │
│    → Get Fresh Uber Quote               │                        │
│    → Compare with charged amount        │                        │
│         ↓                               │                        │
│    ┌────┴────┬──────────────┐           │                        │
│    ↓         ↓              ↓           │                        │
│  Lower    Within       Higher           │                        │
│    ↓         ↓              ↓           │                        │
│  Refund   Proceed     Wait for          │                        │
│    ↓         ↓         Artisan          │                        │
│    ↓         ↓           ↓              │                        │
│    ↓         ↓      ┌────┴────┐         │                        │
│    ↓         ↓      ↓         ↓         │                        │
│    ↓         ↓   Accept   Decline       │                        │
│    ↓         ↓      ↓         ↓         │                        │
│    ↓         ↓   Deduct   Cancel        │                        │
│    ↓         ↓      ↓      (Exit)       │                        │
│    └────┬────┴──────┘                   │                        │
│         ↓                               │                        │
│  out_for_delivery                       │                        │
│    ↓                                    │                        │
│  delivered                              │                        │
│    ↓                                    │                        │
│  completed                              │                        │
│                                         │                        │
│  (If cost absorption pending,           │                        │
│   status stays at ready_for_delivery) ──┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Summary

```
┌───────────────────────────────────────────────────────────────────┐
│                       PHASE 1: ORDER PLACEMENT                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  User    →  Cart     →  API      →  Uber    →  API               │
│              (FE)        (Quote)     (Quote)     (Response)        │
│                                                                    │
│  Calculate Buffer  →  Charge User  →  Store in Order              │
│  ($15 + $3 = $18)     ($18)           (deliveryPricing)           │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│              PHASE 2: READY FOR DELIVERY (HOURS LATER)            │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Artisan  →  Orders   →  API       →  Uber     →  Compare         │
│              (FE)         (Status)     (Fresh      (Prices)        │
│                                         Quote)                     │
│                                                                    │
│  Lower?    →  Refund    →  Create Delivery  →  Update Order       │
│  Within?   →  Proceed   →  Create Delivery  →  Update Order       │
│  Higher?   →  Notify    →  Wait Decision    →  Update Order       │
│                Artisan                                             │
│                   │                                               │
│              ┌────┴────┐                                          │
│              ↓         ↓                                          │
│          Accept    Decline                                        │
│              ↓         ↓                                          │
│          Deduct    Cancel                                         │
│          Wallet    Order                                          │
│              ↓         ↓                                          │
│          Create    Refund                                         │
│         Delivery   Full                                           │
│                   Amount                                          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Key Decision Points

```
                    ┌──────────────────┐
                    │  Order Placed    │
                    │  with Buffer     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Time Passes...   │
                    │ (Hours/Days)     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Artisan Marks    │
                    │ Ready            │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Get Fresh Quote  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
              ┌─────┤  DECISION POINT  ├─────┐
              │     │  Compare Prices  │     │
              │     └──────────────────┘     │
              │                              │
     ┌────────▼────────┐          ┌─────────▼─────────┐
     │ Actual < Charged│          │ Actual > Charged  │
     │                 │          │                   │
     │ AUTO-REFUND     │          │ ARTISAN DECISION  │
     │ ✅ No approval  │          │ ⚠️ Needs approval │
     │                 │          │                   │
     └─────────────────┘          └───────┬───────────┘
                                          │
                                  ┌───────▼───────┐
                                  │ TIMEOUT?      │
                                  │ (e.g. 2 hrs)  │
                                  └───────┬───────┘
                                          │
                                     ┌────┴────┐
                                     ↓         ↓
                                  Accept   Decline
                                     ↓         ↓
                                  Proceed   Cancel
```

---

## Error Handling Flows

```
┌─────────────────────────────────────────────────────────┐
│              ERROR SCENARIO: Uber API Failure           │
└─────────────────────────────────────────────────────────┘

    When marking ready_for_delivery:
    
    ┌──────────────────────────────────────┐
    │  Call Uber API for fresh quote        │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Uber API Error / Timeout             │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Fallback Strategy:                   │
    │                                       │
    │  1. Retry 3 times with backoff        │
    │  2. If still fails:                   │
    │     - Use fallback pricing formula    │
    │     - Create order in queue           │
    │     - Manual review needed            │
    │  3. Notify artisan of delay           │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Keep order in 'ready_for_delivery'   │
    │  Add flag: uberApiFailure: true       │
    │  Retry every 15 minutes               │
    └───────────────────────────────────────┘


┌─────────────────────────────────────────────────────────┐
│         ERROR SCENARIO: Refund Processing Failure       │
└─────────────────────────────────────────────────────────┘

    When attempting to refund buyer:
    
    ┌──────────────────────────────────────┐
    │  Calculate refund amount: $3.50       │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Call WalletService.addFunds()        │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Database Error / Connection Lost     │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Rollback Strategy:                   │
    │                                       │
    │  1. Log failure details               │
    │  2. Add to refund queue               │
    │  3. Don't create Uber delivery yet    │
    │  4. Retry refund processing           │
    │  5. Alert admin if retries fail       │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Update order with:                   │
    │  refundStatus: 'pending'              │
    │  refundRetryCount: 1                  │
    │  nextRetryAt: [timestamp]             │
    └───────────────────────────────────────┘
```

---

**For full implementation details, see:**
- `UBER_DIRECT_BUFFER_IMPLEMENTATION_ANALYSIS.md`
- `UBER_DIRECT_BUFFER_QUICK_SUMMARY.md`

**Date:** October 11, 2025

