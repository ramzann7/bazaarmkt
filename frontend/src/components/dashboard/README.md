# Dashboard Components

This directory contains all dashboard-related components for the food finder application.

## Main Components

### 🎯 **DashboardFixed.jsx**
- **Purpose**: Main artisan dashboard component
- **Features**: 
  - Revenue and earnings display
  - Order statistics
  - Platform costs breakdown
  - Pending orders widget
  - Performance metrics
- **Usage**: Primary dashboard for authenticated artisans

### 📋 **PendingOrdersWidget.jsx**
- **Purpose**: Widget to display pending orders for artisans
- **Features**:
  - Real-time order notifications
  - Order status updates
  - Quick action buttons
- **Usage**: Embedded in the main dashboard

## Debug & Test Components

### 🧪 **DashboardTest.jsx**
- **Purpose**: Comprehensive testing component for dashboard functionality
- **Features**: Tests authentication, profile loading, orders, revenue, and navigation
- **Usage**: Development and debugging only

### 🔍 **DashboardDebug.jsx**
- **Purpose**: Step-by-step debug logging for dashboard data loading
- **Features**: Detailed console logs for troubleshooting
- **Usage**: Development and debugging only

### 📊 **DashboardSimple.jsx**
- **Purpose**: Simplified dashboard for basic testing
- **Features**: Minimal UI with core functionality
- **Usage**: Development and debugging only

### 🎯 **DashboardTestSimple.jsx**
- **Purpose**: Very minimal dashboard test component
- **Features**: Basic user data loading and rendering
- **Usage**: Development and debugging only

### 📱 **DashboardMinimal.jsx**
- **Purpose**: Minimal dashboard with essential features only
- **Features**: Basic statistics display
- **Usage**: Development and debugging only

### 👤 **UserRoleCheck.jsx**
- **Purpose**: Display current user role and onboarding status
- **Features**: Role verification and dashboard access fixes
- **Usage**: Development and debugging only

### 🔐 **LoginDebug.jsx**
- **Purpose**: Debug login issues and pre-fill test data
- **Features**: Pre-filled artisan credentials and detailed logs
- **Usage**: Development and debugging only

## Legacy Components

### 📜 **dashboard.jsx**
- **Purpose**: Original dashboard component (legacy)
- **Status**: Kept for reference only
- **Usage**: Not used in production

## Directory Structure

```
dashboard/
├── README.md                    # This file
├── DashboardFixed.jsx          # Main dashboard component
├── PendingOrdersWidget.jsx     # Pending orders widget
├── DashboardTest.jsx           # Comprehensive test component
├── DashboardDebug.jsx          # Debug logging component
├── DashboardSimple.jsx         # Simplified dashboard
├── DashboardTestSimple.jsx     # Minimal test component
├── DashboardMinimal.jsx        # Minimal dashboard
├── UserRoleCheck.jsx           # User role verification
├── LoginDebug.jsx              # Login debugging
└── dashboard.jsx               # Legacy dashboard (reference)
```

## Usage

### Production
- Use `DashboardFixed.jsx` as the main dashboard component
- Import from `./components/dashboard/DashboardFixed.jsx`

### Development
- Use debug components for troubleshooting
- Access via routes like `/dashboard-test`, `/dashboard-debug`, etc.

## Import Example

```jsx
// Main dashboard
import Dashboard from './components/dashboard/DashboardFixed.jsx';

// Debug components
import DashboardTest from './components/dashboard/DashboardTest.jsx';
import DashboardDebug from './components/dashboard/DashboardDebug.jsx';
```

## Notes

- All debug and test components should be removed before production deployment
- The main dashboard component (`DashboardFixed.jsx`) is optimized for performance
- Pending orders widget is embedded in the main dashboard
- Legacy dashboard is kept for reference but not used in production
