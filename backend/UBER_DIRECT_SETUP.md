# Uber Direct Integration Setup Guide

This guide explains how to set up Uber Direct integration for professional delivery services in bazaarMKT.

## Prerequisites

1. **Uber Direct Business Account**: You need to create an Uber Direct business account
2. **API Access**: Request API access from Uber Direct team
3. **SSL Certificate**: Required for webhook endpoints
4. **Business Verification**: Complete Uber's business verification process

## Required Environment Variables

Add these variables to your `.env` file:

```bash
# Uber Direct API Configuration
UBER_DIRECT_CLIENT_ID=your-uber-direct-client-id
UBER_DIRECT_CLIENT_SECRET=your-uber-direct-client-secret
UBER_DIRECT_CUSTOMER_ID=your-uber-direct-customer-id
UBER_DIRECT_SERVER_TOKEN=your-uber-direct-server-token
UBER_DIRECT_WEBHOOK_SECRET=your-uber-direct-webhook-secret
UBER_DIRECT_BASE_URL=https://api.uber.com

# For development/testing, use sandbox:
# UBER_DIRECT_BASE_URL=https://sandbox-api.uber.com
```

## How to Get Uber Direct Credentials

### 1. Create Uber Direct Account
1. Visit [Uber Direct Business Portal](https://business.uber.com/direct/)
2. Sign up for a business account
3. Complete business verification process
4. Provide required business documents

### 2. Request API Access
1. Contact Uber Direct support to request API access
2. Provide your business details and use case
3. Complete technical integration review
4. Receive API credentials once approved

### 3. Configure Webhook
1. Set up webhook endpoint: `https://yourdomain.com/api/delivery/uber-direct/webhook`
2. Configure webhook secret in Uber Direct dashboard
3. Test webhook delivery with sample events

## API Integration Flow

### 1. Cost Estimation
```javascript
// Frontend requests quote
const quote = await uberDirectService.getDeliveryQuote(
  pickupLocation,
  dropoffLocation,
  packageDetails
);
```

### 2. Order Placement
- Customer selects professional delivery
- Quote is stored with order
- Order proceeds through normal workflow

### 3. Delivery Creation
- When artisan marks order as "ready for delivery"
- System automatically creates Uber Direct delivery request
- Courier is dispatched to pickup location

### 4. Real-time Tracking
- Webhook updates provide real-time status
- Customer receives tracking URL
- ETA updates sent via notifications

## Testing

### Sandbox Environment
1. Use sandbox API URL: `https://sandbox-api.uber.com`
2. Test with sample addresses and orders
3. Verify webhook integration
4. Test all delivery states

### Production Checklist
- [ ] Business account verified
- [ ] API credentials obtained
- [ ] Webhook endpoint configured
- [ ] SSL certificate installed
- [ ] Test deliveries completed
- [ ] Error handling tested
- [ ] Monitoring configured

## Supported Features

✅ **Cost Estimation**: Real-time delivery quotes
✅ **Delivery Creation**: Automatic dispatch when ready
✅ **Real-time Tracking**: Live location and ETA updates
✅ **Status Updates**: Webhook notifications for all status changes
✅ **Courier Information**: Driver details and contact info
✅ **Delivery Proof**: Photo confirmation of delivery
✅ **Cancellation**: Cancel deliveries with refund handling

## Coverage Areas

Uber Direct is available in major Canadian cities:
- Toronto, ON
- Montreal, QC
- Vancouver, BC
- Calgary, AB
- Ottawa, ON
- Edmonton, AB
- Mississauga, ON
- And more...

Check Uber Direct coverage API for real-time availability.

## Cost Structure

### Uber Direct Pricing (approximate)
- Base fee: $8-12 CAD
- Distance fee: $1.50-2.00 per km
- Peak hour surcharge: 1.5x-2x
- Large package surcharge: $2-5
- Weight surcharge: $3+ for packages >5kg

### Integration Benefits
- No upfront costs
- Pay per delivery
- Professional service
- Real-time tracking
- Insurance coverage
- Customer support

## Support

For technical support:
1. Check Uber Direct API documentation
2. Contact Uber Direct developer support
3. Review webhook logs for debugging
4. Monitor delivery success rates

For business support:
1. Contact your Uber Direct account manager
2. Review delivery performance metrics
3. Adjust service areas as needed
4. Optimize delivery windows
