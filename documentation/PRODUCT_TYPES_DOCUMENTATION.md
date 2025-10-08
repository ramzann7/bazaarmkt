# Product Types System Documentation

## Overview

The Food Finder App now supports three distinct product types to accommodate different artisan business models and customer expectations. Each product type has specific characteristics, inventory management requirements, and order processing workflows.

## Product Types

### 1. Ready to Ship (📦)

**Description**: Products that are already made and available for immediate shipping or pickup.

**Characteristics**:
- **Inventory Management**: Requires stock quantity tracking
- **Availability**: Immediate fulfillment
- **Customer Experience**: Instant gratification
- **Business Model**: Traditional retail model

**Required Fields**:
- `stock`: Number of units available
- `lowStockThreshold`: Alert level for low stock (default: 5)

**Optional Fields**:
- `lowStockThreshold`: Custom threshold for low stock alerts

**Use Cases**:
- Pre-made baked goods
- Handcrafted items in stock
- Farm produce
- Preserved foods

### 2. Made to Order (⚙️)

**Description**: Products that are custom-made after the customer places an order, requiring production time.

**Characteristics**:
- **Inventory Management**: No stock required (made on demand)
- **Availability**: After production lead time
- **Customer Experience**: Customization and anticipation
- **Business Model**: Artisan craftsmanship model

**Required Fields**:
- `leadTime`: Production time required
- `leadTimeUnit`: Unit of time (hours, days, weeks)
- `maxOrderQuantity`: Maximum quantity per order

**Optional Fields**:
- `maxOrderQuantity`: Defaults to 10

**Use Cases**:
- Custom cakes and pastries
- Personalized jewelry
- Tailored clothing
- Custom furniture
- Special dietary requirements

### 3. Scheduled Orders (📅)

**Description**: Products that are made at specific scheduled times, allowing customers to order in advance for future availability.

**Characteristics**:
- **Inventory Management**: Time-based availability
- **Availability**: Scheduled production times
- **Customer Experience**: Planning and scheduling
- **Business Model**: Production scheduling model

**Required Fields**:
- `scheduleType`: Frequency of production (daily, weekly, monthly, custom)
- `nextAvailableDate`: Next available production date
- `scheduleDetails`: Detailed scheduling information

**Schedule Details**:
- `frequency`: Production frequency
- `customSchedule`: Custom day/time combinations
- `orderCutoffHours`: Hours before production to stop taking orders

**Use Cases**:
- Weekly bread baking
- Monthly cheese production
- Seasonal preserves
- Event catering
- Farm harvest schedules

## Database Schema Changes

### Product Model Updates

```javascript
// New fields added to Product schema
productType: {
  type: String,
  enum: ['ready_to_ship', 'made_to_order', 'scheduled_order'],
  required: true,
  default: 'ready_to_ship'
},

// Ready to Ship specific fields
stock: {
  type: Number,
  required: function() { return this.productType === 'ready_to_ship'; },
  min: 0,
  default: 0
},
lowStockThreshold: {
  type: Number,
  min: 0,
  default: 5
},

// Made to Order specific fields
leadTime: {
  type: Number,
  required: function() { return this.productType === 'made_to_order'; },
  min: 1,
  default: 1
},
leadTimeUnit: {
  type: String,
  enum: ['hours', 'days', 'weeks'],
  required: function() { return this.productType === 'made_to_order'; },
  default: 'days'
},

maxOrderQuantity: {
  type: Number,
  min: 1,
  default: 10
},

// Scheduled Order specific fields
scheduleType: {
  type: String,
  enum: ['daily', 'weekly', 'monthly', 'custom'],
  required: function() { return this.productType === 'scheduled_order'; }
},
scheduleDetails: {
  frequency: String,
  customSchedule: Array,
  orderCutoffHours: Number
},
nextAvailableDate: {
  type: Date,
  required: function() { return this.productType === 'scheduled_order'; }
}
```

### Order Model Updates

```javascript
// New fields added to Order schema
items: [{
  // ... existing fields
  productType: {
    type: String,
    enum: ['ready_to_ship', 'made_to_order', 'scheduled_order'],
    required: true
  },
  estimatedCompletionDate: Date, // For made-to-order
  scheduledPickupDate: Date,     // For scheduled orders
  scheduledPickupTime: String    // For scheduled orders
}],

// Product type specific status tracking
readyToShipStatus: String,
madeToOrderStatus: String,
scheduledOrderStatus: String,

// Timing information
orderDate: Date,
estimatedReadyDate: Date,
productionStartDate: Date,    // For made-to-order
productionEndDate: Date,      // For made-to-order
scheduledDate: Date,          // For scheduled orders
pickupDeadline: Date,         // For scheduled orders


```

## Frontend Components

### ProductTypeBadge Component

A reusable component that displays product type information with appropriate styling and details.

```jsx
import ProductTypeBadge from './ProductTypeBadge';

// Usage
<ProductTypeBadge product={product} showDetails={true} />
```

**Props**:
- `product`: Product object with productType field
- `showDetails`: Boolean to show/hide additional details

### Product Management Forms

The Products component now includes:
- Product type selection with visual cards
- Dynamic form fields based on selected product type
- Validation for required fields per product type
- Enhanced inventory overview with product type distribution

### Cart Integration

The Cart component now displays:
- Product type badges for each item
- Product type specific information (stock, lead time, next available date)
- Order creation with product type tracking

## Business Logic

### Inventory Management

1. **Ready to Ship**: Traditional stock management with low stock alerts
2. **Made to Order**: No stock required, production capacity management
3. **Scheduled Orders**: Time-based availability management

### Order Processing

1. **Ready to Ship**: Immediate fulfillment, stock reduction
2. **Made to Order**: Production scheduling immediately upon order
3. **Scheduled Orders**: Time-based production scheduling

### Customer Communication

1. **Ready to Ship**: Immediate availability confirmation
2. **Made to Order**: Lead time expectations and immediate production start
3. **Scheduled Orders**: Production schedule and pickup/delivery timing

## Migration Guide

### Existing Products

Existing products will default to `ready_to_ship` type with:
- `stock` field preserved
- `productType` set to `ready_to_ship`
- All existing functionality maintained

### Database Migration

```javascript
// Update existing products to have productType
db.products.updateMany(
  { productType: { $exists: false } },
  { $set: { productType: 'ready_to_ship' } }
);
```

## Testing

Run the test script to verify the new product types:

```bash
node test-product-types.js
```

This will test:
- Product creation for each type
- Validation rules
- Order creation with mixed product types
- Database operations

## Future Enhancements

### Planned Features

1. **Production Scheduling Dashboard**: For artisans managing made-to-order and scheduled products
2. **Customer Confirmation Workflow**: For made-to-order products requiring confirmation
3. **Advanced Scheduling**: Custom schedules with recurring patterns
4. **Inventory Forecasting**: For scheduled orders based on historical demand
5. **Lead Time Optimization**: Dynamic lead time calculation based on artisan capacity

### API Endpoints

Future API endpoints will include:
- `/api/products/schedule` - Schedule management for scheduled orders
- `/api/orders/confirm` - Customer confirmation for made-to-order products
- `/api/artisans/capacity` - Production capacity management

## Support

For questions or issues with the new product types system, please refer to:
- Product management documentation
- Order processing workflows
- Database schema documentation
- Frontend component library
