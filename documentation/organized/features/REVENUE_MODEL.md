# Revenue Model Documentation

## Overview

The application implements a transparent revenue model where the platform takes a 10% commission from each sale, with 90% going directly to artisans. This document outlines the complete revenue system implementation.

## Revenue Structure

### Commission Model
- **Platform Commission**: 10% of each sale
- **Artisan Earnings**: 90% of each sale
- **Transparency**: Full breakdown available to all parties

### Revenue Sources
1. **Transaction Commissions**: 10% from each order
2. **Promotional Features**: Additional revenue from artisan marketing services
3. **Future Revenue Streams**: Premium features, subscriptions, etc.

## Database Models

### Revenue Model (`backend/src/models/revenue.js`)
Tracks all financial transactions and commission calculations:

```javascript
{
  orderId: ObjectId,           // Reference to the order
  artisanId: ObjectId,         // Artisan who made the sale
  patronId: ObjectId,          // Customer who made the purchase
  grossAmount: Number,         // Total order amount
  platformCommission: Number,  // 10% platform fee
  artisanEarnings: Number,     // 90% artisan earnings
  commissionRate: Number,      // Current commission rate (0.10)
  status: String,              // Transaction status
  paymentProcessor: String,    // Payment method used
  settlementStatus: String,    // Payout status
  // ... additional fields
}
```

### Promotional Feature Model (`backend/src/models/promotionalFeature.js`)
Manages promotional services that artisans can purchase:

```javascript
{
  artisanId: ObjectId,         // Artisan purchasing the feature
  productId: ObjectId,         // Optional product to promote
  featureType: String,         // Type of promotional feature
  startDate: Date,             // Feature start date
  endDate: Date,               // Feature end date
  price: Number,               // Feature cost
  status: String,              // Approval/active status
  performance: {               // Performance metrics
    impressions: Number,
    clicks: Number,
    conversions: Number,
    revenue: Number
  }
  // ... additional fields
}
```

## API Endpoints

### Revenue Management (`/api/revenue`)

#### Artisan Endpoints
- `GET /artisan/summary` - Get revenue summary for artisan
- `GET /breakdown/:orderId` - Get detailed revenue breakdown for order
- `GET /promotional/features` - Get available promotional features
- `POST /promotional/purchase` - Purchase promotional feature
- `GET /promotional/artisan-features` - Get artisan's purchased features

#### Admin Endpoints
- `GET /admin/platform-summary` - Get platform revenue summary
- `PATCH /admin/promotional/:featureId` - Approve/reject promotional features
- `GET /admin/promotional/all` - Get all promotional features

#### Public Endpoints
- `GET /transparency` - Get revenue transparency information

## Promotional Features

### Available Features
1. **Featured Product** ($25/7 days)
   - Highlight product at top of search results
   - Featured badge display
   - Increased visibility

2. **Sponsored Product** ($50/14 days)
   - Premium placement in search results
   - Sponsored label
   - Analytics dashboard access

3. **Artisan Spotlight** ($100/30 days)
   - Featured artisan profile on homepage
   - Profile enhancement
   - Customer trust boost

4. **Search Boost** ($35/21 days)
   - Improved search ranking
   - Organic traffic increase
   - Competitive advantage

### Feature Management
- Features require admin approval
- Performance tracking included
- Automatic expiration handling
- Revenue impact analysis

## Frontend Components

### Artisan Revenue Dashboard (`ArtisanRevenueDashboard.jsx`)
Comprehensive dashboard for artisans showing:
- Revenue summary by period (week/month/quarter/year)
- Commission breakdown with transparency
- Promotional features marketplace
- Active promotional features status

### Revenue Transparency (`RevenueTransparency.jsx`)
Public component showing:
- How the revenue model works
- Commission structure explanation
- How purchases support artisans
- Platform development funding

### Admin Revenue Management (`AdminRevenueManagement.jsx`)
Admin interface for:
- Platform revenue overview
- Commission tracking
- Promotional feature management
- Financial analytics

## Revenue Service

### Backend Service (`backend/src/services/revenueService.js`)
Handles all revenue-related operations:
- Automatic revenue calculation on order creation
- Commission and earnings calculations
- Revenue summaries and analytics
- Promotional feature management

### Frontend Service (`frontend/src/services/revenueService.js`)
Client-side revenue operations:
- API communication for revenue data
- Currency formatting and calculations
- Promotional feature purchases
- Transparency information display

## Integration Points

### Order Creation
Revenue is automatically calculated when orders are created:
```javascript
// In order creation endpoint
const savedOrder = await order.save();

// Calculate revenue for this order
try {
  await RevenueService.calculateOrderRevenue(savedOrder._id);
} catch (revenueError) {
  console.error('Error calculating revenue:', revenueError);
  // Don't fail order creation if revenue calculation fails
}
```

### Order Model Updates
The Order model includes revenue tracking:
```javascript
revenue: {
  grossAmount: Number,
  platformCommission: Number,
  artisanEarnings: Number,
  commissionRate: { type: Number, default: 0.10 }
}
```

## Transparency Features

### For Artisans
- Real-time revenue dashboard
- Detailed breakdown for each order
- Commission rate visibility
- Promotional feature performance

### For Patrons
- Transparency page explaining revenue model
- Understanding of how their purchase supports artisans
- Platform development funding explanation

### For Admins
- Complete platform revenue overview
- Commission tracking and analytics
- Promotional feature management
- Financial reporting capabilities

## Future Enhancements

### Planned Revenue Streams
1. **Premium Subscriptions**
   - Enhanced artisan profiles
   - Advanced analytics
   - Priority support

2. **Transaction Fees**
   - Payment processing fees
   - Currency conversion fees
   - International transaction fees

3. **Marketplace Services**
   - Shipping insurance
   - Quality assurance programs
   - Dispute resolution services

### Advanced Features
1. **Dynamic Commission Rates**
   - Volume-based discounts
   - Seasonal adjustments
   - Performance-based rates

2. **Revenue Analytics**
   - Predictive analytics
   - Market trend analysis
   - Performance optimization

3. **Automated Payouts**
   - Scheduled payments
   - Multiple payment methods
   - Tax reporting integration

## Security Considerations

### Data Protection
- All financial data encrypted
- Secure payment processing
- Audit trail for all transactions
- Role-based access control

### Compliance
- PCI DSS compliance for payment data
- Tax reporting requirements
- Financial record keeping
- Regulatory compliance

## Testing

### Revenue Calculation Tests
- Commission calculation accuracy
- Edge case handling
- Rounding and precision
- Multi-currency support

### Promotional Feature Tests
- Feature activation/deactivation
- Performance tracking
- Payment processing
- Admin approval workflow

### Integration Tests
- Order creation with revenue
- API endpoint functionality
- Frontend-backend communication
- Error handling scenarios

## Monitoring and Analytics

### Key Metrics
- Platform revenue growth
- Commission collection rates
- Promotional feature adoption
- Artisan earnings distribution

### Performance Monitoring
- Revenue calculation performance
- API response times
- Error rates and handling
- System uptime and reliability

## Deployment Considerations

### Environment Variables
```bash
# Revenue Configuration
COMMISSION_RATE=0.10
MINIMUM_PAYOUT=25
PAYOUT_SCHEDULE=weekly

# Payment Processing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Promotional Features
FEATURE_APPROVAL_REQUIRED=true
AUTO_EXPIRATION_ENABLED=true
```

### Database Indexes
```javascript
// Revenue collection indexes
db.revenue.createIndex({ "artisanId": 1, "createdAt": -1 })
db.revenue.createIndex({ "orderId": 1 })
db.revenue.createIndex({ "status": 1, "settlementStatus": 1 })

// Promotional features indexes
db.promotionalfeatures.createIndex({ "artisanId": 1, "status": 1 })
db.promotionalfeatures.createIndex({ "startDate": 1, "endDate": 1 })
db.promotionalfeatures.createIndex({ "featureType": 1, "status": 1 })
```

This revenue model provides a sustainable, transparent, and scalable foundation for the platform's financial operations while ensuring fair compensation for artisans and clear value for patrons.
