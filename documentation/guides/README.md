# 🛍️ BazaarMKT - Artisan Marketplace Platform

**A modern, full-featured marketplace connecting local artisans with customers**

[![Deploy Status](https://img.shields.io/badge/deploy-ready-green)]()
[![Node](https://img.shields.io/badge/node-18.x-green)]()
[![React](https://img.shields.io/badge/react-18.x-blue)]()
[![MongoDB](https://img.shields.io/badge/mongodb-atlas-green)]()
[![Vercel](https://img.shields.io/badge/deploy-vercel-black)]()

> **Status:** Production-ready | **Target Domain:** www.bazaarmkt.ca | **Last Updated:** October 8, 2025

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [API Reference](#-api-endpoints)
- [Database](#-database-schema)
- [Security](#-security-features)
- [Contributing](#-contributing)

---

## 🎯 Overview

BazaarMKT is a comprehensive marketplace platform designed for local artisans, craftspeople, and small businesses to sell their products directly to customers. Built with modern serverless architecture for optimal performance, scalability, and cost-effectiveness.

### Key Highlights

- ✅ **Full-Stack E-commerce** - Complete marketplace functionality
- ✅ **Serverless Architecture** - Deployed on Vercel for auto-scaling
- ✅ **Stripe Integration** - Secure payment processing with Stripe Connect
- ✅ **Real-time Notifications** - Email notifications via Brevo
- ✅ **Admin Dashboard** - Comprehensive management tools
- ✅ **Wallet System** - Built-in wallet for artisans
- ✅ **Mobile Responsive** - Apple-inspired fluid UI/UX
- ✅ **Production Ready** - Security hardened and optimized

---

## ✨ Features

### 🛒 For Customers

| Feature | Description |
|---------|-------------|
| **Product Discovery** | Browse, search, and filter products by category, location, and price |
| **Artisan Profiles** | View detailed profiles of local artisans with their stories |
| **Shopping Cart** | Add products to cart and checkout securely |
| **Payment Processing** | Pay with credit/debit cards via Stripe |
| **Order Tracking** | Track order status from purchase to delivery |
| **Reviews & Ratings** | Read and write product reviews |
| **Favorites** | Save products to wishlist for later |
| **Location-Based Search** | Find artisans and products near you |
| **Notifications** | Receive order updates via email |

### 🎨 For Artisans

| Feature | Description |
|---------|-------------|
| **Product Management** | Create, edit, and manage product listings with images |
| **Profile Management** | Customize artisan profile with bio, photos, and business info |
| **Order Management** | View, confirm, and track customer orders |
| **Wallet System** | Manage earnings with built-in wallet |
| **Stripe Connect** | Direct bank payouts via Stripe Connect |
| **Revenue Dashboard** | View sales analytics and performance metrics |
| **Inventory Management** | Track product stock and availability |
| **Customer Communication** | Communicate with customers about orders |
| **Spotlight Listings** | Feature products prominently (premium) |
| **Promotional Tools** | Run promotions and discounts |

### 👑 For Administrators

| Feature | Description |
|---------|-------------|
| **Admin Dashboard** | Comprehensive analytics and system health monitoring |
| **User Management** | Manage users, roles, and permissions |
| **Revenue Management** | Track platform fees, revenue, and payouts |
| **Artisan Verification** | Review and approve new artisan applications |
| **Content Moderation** | Moderate products, reviews, and content |
| **Cash Flow Tracking** | Monitor all platform financial transactions |
| **Audit Logging** | Complete audit trail of admin actions |
| **Platform Settings** | Configure fees, features, and system settings |
| **Order Oversight** | View and manage all platform orders |
| **Dispute Resolution** | Handle customer/artisan disputes |

---

## 🛠️ Tech Stack

### Frontend
```
React 18.x          - Modern UI framework with hooks
Vite 5.x           - Lightning-fast build tool
Tailwind CSS 3.x   - Utility-first CSS framework
React Router 6.x   - Client-side routing
Stripe Elements    - Secure payment forms
React Hot Toast    - Toast notifications
Heroicons          - Beautiful SVG icons
Sharp              - Image optimization
```

### Backend
```
Node.js 18.x       - JavaScript runtime
Express.js 4.x     - Web application framework
MongoDB Atlas      - Cloud-hosted database
Native MongoDB     - Direct MongoDB client (no Mongoose)
JWT                - Secure authentication
Stripe API         - Payment processing & Connect
Brevo API          - Transactional email service
Winston            - Production logging
Helmet             - Security headers
CORS               - Cross-origin security
Bcrypt             - Password hashing
Sharp              - Server-side image processing
```

### Infrastructure & DevOps
```
Vercel             - Serverless deployment platform
Vercel Blob        - File/image storage
GitHub Actions     - CI/CD pipelines
MongoDB Atlas      - Managed database with indexes
Vercel Cron        - Scheduled jobs (payouts, inventory)
```

### Development Tools
```
Jest               - Testing framework
MongoDB Memory     - In-memory database for testing
ESLint             - Code linting
Prettier           - Code formatting
Dotenv             - Environment management
Nodemon            - Development auto-reload
```

---

## 🏗️ Architecture

### Serverless Architecture

BazaarMKT uses a **modern serverless architecture** deployed on Vercel:

```
┌─────────────────────────────────────────────────┐
│                 VERCEL PLATFORM                 │
├─────────────────────────────────────────────────┤
│  Frontend (React SPA)                           │
│  ├─ Static Assets (CDN)                         │
│  ├─ Client-side Routing                         │
│  └─ Optimized Build (Vite)                      │
├─────────────────────────────────────────────────┤
│  Backend (Serverless Functions)                 │
│  ├─ API Routes (server-working.js)              │
│  ├─ Cron Jobs                                    │
│  │   ├─ Payouts (Weekly)                        │
│  │   ├─ Inventory Restoration (Daily)           │
│  │   └─ Auto-capture Payments (Hourly)          │
│  └─ File Uploads (Vercel Blob)                  │
├─────────────────────────────────────────────────┤
│  External Services                               │
│  ├─ MongoDB Atlas (Database)                    │
│  ├─ Stripe (Payments & Connect)                 │
│  ├─ Brevo (Email Notifications)                 │
│  └─ Google Maps (Geocoding)                     │
└─────────────────────────────────────────────────┘
```

### Key Architectural Benefits

- ✅ **Auto-scaling** - Handles traffic spikes automatically
- ✅ **Cost-effective** - Pay only for actual usage
- ✅ **Zero maintenance** - No server management required
- ✅ **Fast deployment** - Deploy in seconds with Vercel CLI
- ✅ **Global CDN** - Fast content delivery worldwide
- ✅ **Built-in HTTPS** - Automatic SSL certificates

### Project Structure

```
bazaarMKT/
├── backend/                          # Serverless backend
│   ├── server-working.js            # Main serverless app
│   ├── api/cron/                    # Scheduled cron jobs
│   │   ├── payouts.js              # Weekly payout processing
│   │   ├── inventory-restoration.js # Daily stock restoration
│   │   └── auto-capture-payments.js # Hourly payment capture
│   ├── middleware/                  # Express middleware
│   │   ├── auth.js                 # JWT authentication
│   │   ├── errorHandler.js         # Error handling with Winston
│   │   ├── rateLimiter.js          # Rate limiting
│   │   └── validation.js           # Request validation
│   ├── routes/                      # API routes
│   │   ├── admin/                  # Admin endpoints
│   │   ├── auth/                   # Authentication
│   │   ├── orders/                 # Order management
│   │   ├── products/               # Product CRUD
│   │   ├── artisans/               # Artisan profiles
│   │   ├── wallet/                 # Wallet operations
│   │   ├── profile/                # User profiles & Stripe Connect
│   │   ├── revenue/                # Revenue tracking
│   │   ├── notifications/          # Notifications
│   │   ├── reviews/                # Reviews & ratings
│   │   ├── favorites/              # Wishlist
│   │   ├── community/              # Community posts
│   │   ├── spotlight/              # Featured listings
│   │   └── promotional/            # Promotional campaigns
│   ├── services/                    # Business logic
│   │   ├── WalletService.js        # Wallet operations
│   │   ├── NotificationService.js  # Email notifications
│   │   ├── StripeService.js        # Stripe integration
│   │   ├── imageUploadService.js   # Image handling
│   │   └── platformSettingsService.js
│   ├── scripts/                     # Utility scripts
│   │   ├── complete-database-setup.js
│   │   ├── interactive-database-setup.sh
│   │   └── initialize-platform-settings.js
│   ├── config/                      # Configuration
│   │   ├── database.js             # MongoDB connection
│   │   ├── database-indexes.js     # Index definitions
│   │   └── environment.js          # Environment config
│   └── tests/                       # Test suites
│       ├── unit/                   # Unit tests
│       ├── integration/            # Integration tests
│       └── e2e/                    # End-to-end tests
│
├── frontend/                        # React application
│   ├── src/
│   │   ├── components/             # Reusable components
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminRevenueManagement.jsx
│   │   │   ├── AdminUserManagement.jsx
│   │   │   ├── ArtisanDashboard.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   └── ...
│   │   ├── pages/                  # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Shop.jsx
│   │   │   ├── ArtisanPage.jsx
│   │   │   ├── AdminPage.jsx
│   │   │   └── ...
│   │   ├── services/               # API integration
│   │   │   ├── api.js             # Axios instance
│   │   │   ├── authService.js     # Authentication
│   │   │   ├── orderService.js    # Orders
│   │   │   └── ...
│   │   ├── styles/                 # Styling
│   │   │   ├── globals.css
│   │   │   └── apple-fluidity.css # Fluid animations
│   │   └── utils/                  # Utilities
│   ├── public/                      # Static assets
│   └── dist/                        # Production build
│
├── docs/                            # Documentation
│   ├── deployment/                  # Deployment guides
│   ├── features/                    # Feature documentation
│   ├── admin/                       # Admin docs
│   ├── payment/                     # Payment system docs
│   └── testing/                     # Testing guides
│
├── scripts/                         # Deployment scripts
│   ├── deploy-preview.sh
│   ├── deploy-production.sh
│   ├── verify-deployment.sh
│   └── generate-secrets.sh
│
├── .github/workflows/               # CI/CD pipelines
│   ├── pr-checks.yml               # Pull request validation
│   ├── ci-cd-fixed.yml             # Full CI/CD (when enabled)
│   ├── ci-cd.yml.disabled          # Disabled workflows
│   └── dev-deployment.yml.disabled
│
├── vercel.json                      # Vercel configuration
├── package.json                     # Root package config
└── README.md                        # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **MongoDB Atlas** account (free tier works)
- **Stripe** account (for payments)
- **Brevo** account (for emails, free tier)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ramzann7/bazaarmkt.git
   cd bazaarmkt
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure environment variables**

   Create `backend/.env`:
   ```env
   # Database
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bazarmkt

   # Authentication
   JWT_SECRET=your-super-secret-jwt-key-at-least-64-characters-long

   # Server
   NODE_ENV=development
   PORT=4000

   # Stripe (use test keys for development)
   STRIPE_SECRET_KEY=sk_test_your_test_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

   # Email
   BREVO_API_KEY=xkeysib-your-brevo-api-key

   # Optional: File storage
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

   # Optional: Maps
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   GEOCODING_API_KEY=your_geocoding_key
   ```

   Create `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:4000/api
   VITE_BASE_URL=http://localhost:5173
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key
   VITE_NODE_ENV=development
   ```

5. **Initialize the database**
   ```bash
   cd backend
   node scripts/initialize-platform-settings.js
   node scripts/setup-database.js
   ```

6. **Start development servers**

   Backend (Terminal 1):
   ```bash
   cd backend
   npm start
   # Server runs on http://localhost:4000
   ```

   Frontend (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   # App runs on http://localhost:5173
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000/api
   - Health Check: http://localhost:4000/api/health

8. **Create admin user** (in MongoDB or via script)
   ```javascript
   {
     email: "admin@bazaarmkt.ca",
     password: "hashed_password",
     name: "Admin User",
     role: "admin"
   }
   ```

---

## 🚀 Deployment

### Deploy to Production (Vercel)

**📖 Full deployment guide:** See [`docs/deployment/DEPLOYMENT_COMPLETION_GUIDE.md`](./docs/deployment/DEPLOYMENT_COMPLETION_GUIDE.md)

**Quick deployment steps:**

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   # or use: npx vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Link project**
   ```bash
   vercel link
   ```

4. **Set environment variables** (in Vercel Dashboard)
   - Go to: Project → Settings → Environment Variables
   - Add all production environment variables
   - See: [`docs/deployment/VERCEL_ENV_VARIABLES.md`](./docs/deployment/VERCEL_ENV_VARIABLES.md)

5. **Set up production database**
   ```bash
   cd backend
   NODE_ENV=production node scripts/complete-database-setup.js
   ```

6. **Deploy to preview** (test first)
   ```bash
   ./scripts/deploy-preview.sh
   # or: npx vercel
   ```

7. **Deploy to production**
   ```bash
   ./scripts/deploy-production.sh
   # or: npx vercel --prod
   ```

8. **Verify deployment**
   ```bash
   ./scripts/verify-deployment.sh https://www.bazaarmkt.ca
   ```

### Deployment Checklist

Use the comprehensive checklist: [`docs/deployment/FINAL_DEPLOYMENT_CHECKLIST.md`](./docs/deployment/FINAL_DEPLOYMENT_CHECKLIST.md)

---

## 📚 Documentation

### Essential Guides

| Document | Description |
|----------|-------------|
| **[Deployment Roadmap](./docs/deployment/DEPLOYMENT_ROADMAP.md)** | Complete deployment strategy and timeline |
| **[Deployment Completion Guide](./docs/deployment/DEPLOYMENT_COMPLETION_GUIDE.md)** | Step-by-step deployment instructions |
| **[Final Deployment Checklist](./docs/deployment/FINAL_DEPLOYMENT_CHECKLIST.md)** | Checklist with sign-offs |
| **[Environment Variables](./docs/deployment/VERCEL_ENV_VARIABLES.md)** | All environment variable configuration |
| **[MongoDB Collections Reference](./MONGODB_COLLECTIONS_REFERENCE.md)** | Database schema and collections |

### Feature Documentation

- **Payment System:** `docs/payment/STRIPE_CONNECT_INTEGRATION_COMPLETE.md`
- **Wallet System:** `docs/features/WALLET_IMPLEMENTATION_COMPLETE.md`
- **Email Notifications:** `docs/features/FINAL_EMAIL_NOTIFICATION_FLOW.md`
- **Admin Dashboard:** `docs/admin/ADMIN_FUNCTIONALITY_REPORT.md`
- **Platform Settings:** `docs/features/PLATFORM_SETTINGS_FINAL.md`

### Development Guides

- **GitHub Actions:** `FIX_GITHUB_ACTIONS.md`
- **Database Setup:** `backend/scripts/README.md`
- **API Testing:** `backend/tests/README.md`

### Full Documentation Index

See [`docs/README.md`](./docs/README.md) for complete documentation structure.

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register          - Create new user account
POST   /api/auth/login             - Login with email/password
GET    /api/auth/profile           - Get current user profile
PUT    /api/auth/profile           - Update user profile
POST   /api/auth/logout            - Logout user
```

### Products
```
GET    /api/products               - List all products (with filters)
GET    /api/products/:id           - Get single product details
POST   /api/products               - Create new product (artisan)
PUT    /api/products/:id           - Update product (artisan)
DELETE /api/products/:id           - Delete product (artisan)
GET    /api/products/featured      - Get featured products
GET    /api/products/search        - Search products
```

### Artisans
```
GET    /api/artisans               - List all artisans
GET    /api/artisans/:id           - Get artisan profile
POST   /api/artisans               - Create artisan profile (authenticated)
PUT    /api/artisans/:id           - Update artisan profile
GET    /api/artisans/near-me       - Find artisans by location
```

### Orders
```
GET    /api/orders                 - Get user orders
GET    /api/orders/:id             - Get order details
POST   /api/orders                 - Create new order
PUT    /api/orders/:id             - Update order status
PUT    /api/orders/:id/confirm     - Artisan confirms order
PUT    /api/orders/:id/complete    - Mark order complete
```

### Payments
```
POST   /api/orders/create-payment-intent    - Create Stripe payment intent
POST   /api/orders/confirm-payment          - Confirm payment
POST   /api/webhooks/stripe                 - Stripe webhook handler
```

### Wallet
```
GET    /api/wallet                 - Get artisan wallet
GET    /api/wallet/transactions    - Get wallet transactions
POST   /api/wallet/payout          - Request payout
GET    /api/wallet/balance         - Get current balance
```

### Admin
```
GET    /api/admin/users            - List all users
PUT    /api/admin/users/:id        - Update user
DELETE /api/admin/users/:id        - Delete user
GET    /api/admin/revenue          - Get revenue dashboard
GET    /api/admin/cash-flow        - Get cash flow data
GET    /api/admin/platform-settings - Get platform settings
PUT    /api/admin/platform-settings - Update platform settings
GET    /api/admin/audit-logs       - Get audit logs
```

### Reviews & Favorites
```
GET    /api/reviews/product/:id    - Get product reviews
POST   /api/reviews                - Create review
GET    /api/favorites              - Get user favorites
POST   /api/favorites              - Add to favorites
DELETE /api/favorites/:id          - Remove from favorites
```

### Notifications
```
GET    /api/notifications          - Get user notifications
PUT    /api/notifications/:id/read - Mark notification as read
PUT    /api/notifications/read-all - Mark all as read
```

### Stripe Connect
```
GET    /api/profile/stripe/onboarding-link  - Get Stripe Connect onboarding link
GET    /api/profile/stripe/dashboard-link   - Get Stripe dashboard link
GET    /api/profile/stripe/account-status   - Get Stripe account status
```

**Full API documentation:** Coming soon (Postman collection in `tools/postman-collections/`)

---

## 🗄️ Database Schema

### Collections Overview

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| **users** | User accounts | email, password, role, name |
| **artisans** | Artisan profiles | businessName, bio, location, user |
| **products** | Product listings | name, price, category, artisan |
| **orders** | Customer orders | items, totalAmount, status, userId |
| **wallets** | Artisan wallets | artisanId, balance, stripeAccountId |
| **wallettransactions** | Wallet activity | walletId, amount, type, orderId |
| **notifications** | User notifications | userId, type, message, isRead |
| **reviews** | Product reviews | productId, userId, rating, comment |
| **favorites** | User wishlists | userId, productId |
| **communityposts** | Artisan posts | artisan, content, images |
| **spotlightlistings** | Featured listings | artisan, productId, startDate, endDate |
| **platformsettings** | Platform config | fees, features, limits |
| **adminauditlogs** | Admin actions | adminId, action, details, timestamp |

### Key Indexes

All collections have optimized indexes for performance. Database setup script creates:

- **users:** email (unique), role, stripeCustomerId
- **artisans:** user (unique), location (2dsphere), isActive + isVerified
- **products:** artisan + status, category + status, text search
- **orders:** userId + createdAt, artisan + status + createdAt
- **wallets:** artisanId (unique), stripeAccountId (unique)
- And more...

**Full schema documentation:** See `MONGODB_COLLECTIONS_REFERENCE.md`

---

## 🔐 Security Features

### Authentication & Authorization
- ✅ **JWT tokens** - Secure, stateless authentication
- ✅ **Password hashing** - Bcrypt with 12 rounds
- ✅ **Role-based access** - customer, artisan, admin roles
- ✅ **Protected routes** - Middleware authentication checks

### Security Headers (Helmet)
- ✅ **Content Security Policy** - Prevents XSS attacks
- ✅ **HTTPS enforcement** - Auto-redirect to HTTPS
- ✅ **HSTS** - Strict Transport Security headers
- ✅ **X-Frame-Options** - Prevents clickjacking
- ✅ **XSS Protection** - Browser XSS filter enabled

### API Security
- ✅ **CORS configuration** - Restricted origins
- ✅ **Rate limiting** - Prevents brute force attacks
- ✅ **Input validation** - Validates all user inputs
- ✅ **SQL injection prevention** - Parameterized queries
- ✅ **Error sanitization** - No sensitive data in production errors

### Payment Security
- ✅ **PCI compliance** - Stripe handles card data
- ✅ **Webhook verification** - Validates Stripe webhooks
- ✅ **Payment intent flow** - Secure 3D Secure support
- ✅ **Stripe Connect** - Secure artisan payouts

### Data Security
- ✅ **Environment variables** - Secrets never in code
- ✅ **Encrypted connections** - MongoDB Atlas encryption
- ✅ **Audit logging** - Admin actions tracked
- ✅ **File upload validation** - Type and size checks

---

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Test coverage
npm run test:coverage
```

### Test Structure
- **Unit tests** - Individual functions and services
- **Integration tests** - API endpoint testing
- **E2E tests** - Full user flow testing

**Test documentation:** See `backend/tests/README.md`

---

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm test
   ```
5. **Commit with descriptive message**
   ```bash
   git commit -m "✨ Add amazing feature"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create Pull Request**

### Commit Message Convention

```
✨ feat: New feature
🐛 fix: Bug fix
📚 docs: Documentation
🎨 style: Formatting
♻️ refactor: Code refactoring
🧪 test: Tests
🔧 chore: Maintenance
⚡ perf: Performance
```

### Code Style

- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

---

## 📊 Revenue Model

### Platform Fees

- **Order Commission:** 10% of order value
- **Spotlight Listings:** Currently free (configurable)
- **Promotional Campaigns:** Currently free (configurable)

### Payout Schedule

- **Frequency:** Weekly (every Friday at 9 AM EST)
- **Auto-capture:** 72 hours after order confirmation
- **Hold period:** 7 days for dispute resolution

### Stripe Fees

- **Per transaction:** 2.9% + $0.30 CAD
- **Stripe Connect:** Additional fees apply for payouts

**Full details:** See `docs/features/PLATFORM_FEE_COLLECTION.md`

---

## 🎯 Roadmap

### Completed ✅
- [x] Core marketplace functionality
- [x] Stripe Connect integration
- [x] Wallet system
- [x] Email notifications
- [x] Admin dashboard
- [x] Revenue tracking
- [x] Serverless deployment
- [x] Production security hardening

### In Progress 🚧
- [ ] Production deployment to www.bazaarmkt.ca
- [ ] Custom domain setup
- [ ] Final testing and verification

### Future Enhancements 🔮
- [ ] Mobile apps (iOS/Android)
- [ ] SMS notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] AI-powered product recommendations
- [ ] Social media integration
- [ ] Advanced search with filters
- [ ] Subscription plans for artisans
- [ ] Delivery tracking integration
- [ ] Customer loyalty program

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🆘 Support

### Getting Help

- **Documentation:** Check the `docs/` directory
- **Issues:** Create an issue on GitHub
- **Email:** support@bazaarmkt.ca

### Useful Links

- **Production:** https://www.bazaarmkt.ca (coming soon)
- **Repository:** https://github.com/ramzann7/bazaarmkt
- **Deployment Guide:** [docs/deployment/DEPLOYMENT_COMPLETION_GUIDE.md](./docs/deployment/DEPLOYMENT_COMPLETION_GUIDE.md)

---

## 🙏 Acknowledgments

- Built with modern best practices and serverless architecture
- Optimized for Vercel deployment
- Secure payment processing via Stripe
- Email notifications via Brevo
- Database hosted on MongoDB Atlas

---

## 📈 Stats

- **Lines of Code:** ~50,000+
- **API Endpoints:** 80+
- **Database Collections:** 15
- **Documentation Files:** 50+
- **Deployment Scripts:** 10+
- **Features Implemented:** 40+

---

**Built with ❤️ by the BazaarMKT Team**

*Empowering local artisans and connecting communities*

---

**Last Updated:** October 8, 2025  
**Version:** 2.0.0 (Serverless Production)  
**Status:** ✅ Production Ready
