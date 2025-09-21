# 🍽️ Food Finder App - bazaarMKT Marketplace

A modern marketplace platform connecting local artisans, food makers, and customers. Built with React, Node.js, and MongoDB Atlas.

## 🌟 Features

### For Customers
- **Product Discovery**: Browse products by category, search, and filters
- **Artisan Profiles**: View detailed profiles of local artisans and food makers
- **Product Reviews**: Read and write reviews for products
- **Shopping Cart**: Add products to cart and manage orders
- **User Authentication**: Secure login and registration system

### For Artisans/Food Makers
- **Product Management**: Add, edit, and manage product listings
- **Profile Management**: Create and customize artisan profiles
- **Order Management**: Track and manage incoming orders
- **Analytics**: View sales and performance metrics

### For Administrators
- **Admin Dashboard**: Comprehensive analytics and management tools
- **User Management**: Manage users, roles, and permissions
- **Content Moderation**: Review and approve products/reviews
- **System Monitoring**: Monitor platform health and performance

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Hot Toast** - Toast notifications
- **Heroicons** - Beautiful SVG icons

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Development Tools
- **Nodemon** - Auto-restart server during development
- **Concurrently** - Run multiple commands simultaneously
- **Dotenv** - Environment variable management

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd food-finder-app
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend && npm install
   
   # Install frontend dependencies
   cd ../frontend && npm install
   ```

3. **Environment Setup**
   
   Create `.env` file in the `backend` directory:
   ```env
   PORT=4000
   MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/your-database
   JWT_SECRET=your-jwt-secret-key
   NODE_ENV=development
   ```

4. **Start the application**
   ```bash
   # Development mode (both frontend and backend)
   npm run dev
   
   # Or start individually:
   npm run dev:backend  # Backend only
   npm run dev:frontend # Frontend only
   ```

5. **Access the application**
   - Frontend: http://localhost:5178
   - Backend API: http://localhost:4000/api
   - Health Check: http://localhost:4000/api/health

## 📁 Project Structure

```
food-finder-app/
├── backend/                 # Backend server
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   └── services/       # Business logic
│   ├── public/             # Static files
│   └── server.js           # Main server file
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── data/           # Static data
│   │   └── utils/          # Utility functions
│   └── public/             # Public assets
├── documentation/          # Project documentation
└── scripts/               # Utility scripts
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/featured` - Get featured products
- `POST /api/products` - Create new product (authenticated)
- `PUT /api/products/:id` - Update product (authenticated)
- `DELETE /api/products/:id` - Delete product (authenticated)

### Artisans
- `GET /api/artisans` - Get all artisans
- `GET /api/artisans/:id` - Get artisan by ID
- `POST /api/artisans` - Create artisan profile (authenticated)

### Orders
- `GET /api/orders` - Get user orders (authenticated)
- `POST /api/orders` - Create new order (authenticated)
- `PUT /api/orders/:id` - Update order status (authenticated)

### Reviews
- `GET /api/reviews/product/:id` - Get product reviews
- `POST /api/reviews` - Create review (authenticated)

## 🗄️ Database Schema

### Users
- Basic user information
- Role-based access (customer, artisan, admin)
- Authentication data

### Products
- Product details (name, description, price)
- Category and subcategory classification
- Image URLs and metadata
- Seller reference

### Artisans
- Artisan profile information
- Business details and contact info
- Product catalog reference

### Orders
- Order details and status
- Customer and product references
- Payment and shipping information

### Reviews
- Product and artisan reviews
- Rating and comment system
- User reference

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt password encryption
- **CORS Protection** - Cross-origin request handling
- **Input Validation** - Request data validation
- **File Upload Security** - Secure file handling
- **Environment Variables** - Sensitive data protection

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas cluster
2. Configure environment variables
3. Deploy to your preferred platform (Heroku, Vercel, AWS, etc.)

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy the `dist` folder to your hosting platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in the `/documentation` folder

## 🔄 Version History

- **v1.0.0** - Initial release with core marketplace features
- **v1.1.0** - Added admin dashboard and analytics
- **v1.2.0** - Enhanced search and filtering capabilities
- **v1.3.0** - Improved user experience and performance

---

**Built with ❤️ for local artisans and food makers**
# Deployment trigger - Sun Sep 21 00:16:04 EDT 2025
