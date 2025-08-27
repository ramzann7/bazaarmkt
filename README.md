# Bazarmkt - Artisan Marketplace

A full-stack web application connecting local artisans with customers, built with React, Node.js, and MongoDB.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

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
   ```bash
   # Copy environment file
   cp backend/.env.example backend/.env
   
   # Update with your MongoDB connection string
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   ```

4. **Start the application**
   ```bash
   # Start both backend and frontend
   npm start
   
   # Or start individually:
   # Backend: cd backend && npm start
   # Frontend: cd frontend && npm run dev
   ```

## 📁 Project Structure

```
food-finder-app/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   └── services/       # Business logic
│   ├── public/             # Static files
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── pages/          # Page components
│   └── vite.config.js      # Vite configuration
├── scripts/                # Utility scripts
│   ├── migration/          # Database migration scripts
│   ├── testing/            # Testing and debugging scripts
│   ├── debug/              # Database debugging scripts
│   ├── backup/             # Backup data and scripts
│   └── cleanup/            # Database cleanup scripts
├── documentation/          # Project documentation
└── package.json            # Root package configuration
```

## 🔧 Scripts Directory

The `scripts/` directory contains organized utility scripts:

### Migration Scripts (`scripts/migration/`)
- Database migration to MongoDB Atlas
- Data backup and restore
- Data structure fixes

### Testing Scripts (`scripts/testing/`)
- API endpoint testing
- Frontend functionality testing
- Search functionality validation

### Debug Scripts (`scripts/debug/`)
- Database connectivity testing
- Mongoose population debugging
- Data verification tools

### Backup Scripts (`scripts/backup/`)
- Database backup data
- Backup management tools

### Cleanup Scripts (`scripts/cleanup/`)
- Database cleanup operations
- Development environment reset

## 🌟 Features

### User Management
- User registration and authentication
- Role-based access (buyer, seller, producer)
- Profile management

### Product Management
- Product creation and editing
- Image upload and management
- Inventory tracking
- Category and tag system

### Search and Discovery
- Advanced search algorithm
- Category filtering
- Price and distance sorting
- Geolocation-based results

### Order Management
- Shopping cart functionality
- Order tracking
- Payment integration (future)

## 🔍 Search Functionality

The application features a robust search system:

### Search Algorithm
- **Exact Match**: Products with exact name matches
- **Partial Match**: Products containing search terms
- **Synonym Matching**: Related terms and variations
- **Typo Tolerance**: Handles common misspellings
- **Relevance Scoring**: Intelligent result ranking

### Search Features
- Real-time search suggestions
- Category-based filtering
- Price range filtering
- Distance-based sorting
- Seller information display

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  role: String, // 'buyer', 'seller', 'producer'
  addresses: Array,
  paymentMethods: Array,
  notificationPreferences: Object,
  accountSettings: Object
}
```

### Products Collection
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  price: Number,
  category: String,
  subcategory: String,
  stock: Number,
  unit: String,
  image: String,
  tags: Array,
  seller: ObjectId, // Reference to Users collection
  status: String, // 'active', 'inactive'
  leadTimeHours: Number,
  isOrganic: Boolean,
  isGlutenFree: Boolean,
  isVegan: Boolean,
  isHalal: Boolean
}
```

## 🚀 Deployment

### Backend Deployment
1. Set environment variables
2. Configure MongoDB Atlas connection
3. Deploy to your preferred platform (Heroku, AWS, etc.)

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy the `dist/` folder to your hosting service

## 🧪 Testing

### API Testing
```bash
cd scripts/testing
node test-search-api.js
```

### Frontend Testing
```bash
# Open test files in browser
open scripts/testing/test-search.html
```

### Database Testing
```bash
cd scripts/debug
node test-population.js
```

## 📚 Documentation

- [Migration Guide](documentation/MIGRATION_GUIDE.md)
- [Atlas Migration Summary](documentation/ATLAS_MIGRATION_SUMMARY.md)
- [Scripts Documentation](scripts/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the scripts directory for debugging tools
- Open an issue on GitHub
