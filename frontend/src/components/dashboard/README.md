# Dashboard Components

This directory contains all dashboard-related components for the BazaarMkt application.

## Main Components

### 🎯 **DashboardFixed.jsx**
- **Purpose**: Main artisan dashboard component
- **Features**: 
  - Revenue and earnings display with accurate fee calculations
  - Order statistics and recent orders
  - Platform costs breakdown
  - Pending orders widget
  - Wallet integration
  - Spotlight subscription management
  - Performance metrics
- **Usage**: Primary dashboard for authenticated artisans
- **Mobile Responsive**: ✅ Optimized for all screen sizes

### 📋 **PendingOrdersWidget.jsx**
- **Purpose**: Widget to display pending orders for artisans
- **Features**:
  - Real-time order notifications
  - Order status updates
  - Quick action buttons
- **Usage**: Embedded in the main dashboard

### 💰 **WalletCard.jsx**
- **Purpose**: Display wallet balance and quick actions
- **Features**:
  - Current balance display
  - Quick top-up actions
  - Transaction history preview
- **Usage**: Embedded in the main dashboard

### 📦 **DeliveryRevenueDashboard.jsx**
- **Purpose**: Detailed revenue breakdown for delivery services
- **Features**:
  - Product vs delivery revenue tracking
  - Fee calculations
  - Revenue trends
- **Usage**: Specialized revenue analytics

## Debug & Test Components

### 👤 **UserRoleCheck.jsx**
- **Purpose**: Display current user role and onboarding status
- **Features**: Role verification and dashboard access fixes
- **Usage**: Development and debugging only

### 🔐 **LoginDebug.jsx**
- **Purpose**: Debug login issues and pre-fill test data
- **Features**: Pre-filled artisan credentials and detailed logs
- **Usage**: Development and debugging only

## Directory Structure

```
dashboard/
├── README.md                      # This file
├── DashboardFixed.jsx             # ✅ Main dashboard component (PRODUCTION)
├── PendingOrdersWidget.jsx        # Pending orders widget
├── WalletCard.jsx                 # Wallet balance display
├── DeliveryRevenueDashboard.jsx   # Revenue analytics
├── UserRoleCheck.jsx              # User role verification (dev only)
└── LoginDebug.jsx                 # Login debugging (dev only)
```

## Usage

### Production
- Use `DashboardFixed.jsx` as the main dashboard component
- Import from `./components/dashboard/DashboardFixed.jsx`
- All features are integrated and mobile-responsive

### Development
- Use debug components for troubleshooting
- Access via routes like `/user-role-check`, `/login-debug`

## Import Example

```jsx
// Main dashboard (lazy loaded in app.jsx)
const Dashboard = lazy(() => import("./components/dashboard/DashboardFixed.jsx"));

// Debug components (development only)
const UserRoleCheck = import.meta.env.MODE === 'development' 
  ? lazy(() => import("./components/dashboard/UserRoleCheck.jsx"))
  : null;
```

## Recent Changes

### ✅ Cleanup (Current)
- Removed unused debug dashboard components:
  - ❌ dashboard.jsx (legacy)
  - ❌ DashboardTest.jsx
  - ❌ DashboardDebug.jsx
  - ❌ DashboardSimple.jsx
  - ❌ DashboardMinimal.jsx
  - ❌ DashboardTestSimple.jsx
- Kept only DashboardFixed.jsx as the main production component
- Streamlined app.jsx routes
- Updated mobile responsiveness for all pages

## Mobile Responsiveness

All dashboard components have been optimized for mobile devices:
- Responsive headers with flexible layouts
- Touch-friendly buttons and controls
- Adaptive font sizes (text-sm sm:text-base lg:text-lg)
- Flexible spacing (px-4 sm:px-6 lg:px-8)
- Stack layout on mobile, side-by-side on desktop

## Notes

- Debug components are only loaded in development mode
- The main dashboard component (`DashboardFixed.jsx`) is optimized for performance
- Pending orders widget is embedded in the main dashboard
- All components follow mobile-first responsive design principles
- Wallet integration allows artisans to manage their balance directly from the dashboard
