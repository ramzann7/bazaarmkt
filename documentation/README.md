# Food Finder Frontend

A modern, Uber Eats-inspired food delivery application built with React, Vite, and Tailwind CSS.

## Features

### 🎨 Modern UI/UX
- Clean, modern design inspired by Uber Eats
- Responsive layout that works on all devices
- Smooth animations and transitions
- Intuitive navigation and user experience

### 🏠 Home Page
- Hero section with search functionality
- Featured restaurant categories
- Restaurant cards with ratings, delivery times, and specialties
- Call-to-action sections for user engagement

### 🔍 Restaurant Discovery
- Advanced search and filtering
- Category-based browsing
- Multiple sorting options (rating, delivery time, distance, delivery fee)
- Restaurant cards with detailed information

### 👤 User Authentication
- Modern login and registration forms
- Social login options (Google, Facebook)
- Password visibility toggle
- Form validation and error handling

### 📊 Dashboard
- User profile overview
- Order statistics and metrics
- Recent order history
- Quick action buttons
- Responsive stats grid

### 🛒 Shopping Cart
- Local storage-based cart management
- Add/remove items functionality
- Quantity management
- Cart total calculation

### 📱 Responsive Design
- Mobile-first approach
- Tablet and desktop optimized
- Touch-friendly interface
- Adaptive navigation

## Tech Stack

- **React 19** - Latest React with hooks and modern patterns
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Heroicons** - Beautiful SVG icons
- **React Hot Toast** - Toast notifications
- **Axios** - HTTP client for API calls

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Home.jsx        # Home page component
│   ├── Login.jsx       # Login form
│   ├── Register.jsx    # Registration form
│   ├── Dashboard.jsx   # User dashboard
│   ├── Navbar.jsx      # Navigation bar
│   └── Restaurants.jsx # Restaurant listing page
├── services/           # API and utility services
│   ├── authService.js  # Authentication service
│   └── cartService.js  # Cart management service
├── App.jsx             # Main app component
├── main.jsx           # App entry point
└── index.css          # Global styles and Tailwind imports
```

## Key Components

### Home Component
- Hero section with search
- Category filtering
- Featured restaurants
- Call-to-action sections

### Restaurants Component
- Search and filtering
- Category selection
- Sorting options
- Restaurant grid layout

### Dashboard Component
- User profile card
- Statistics overview
- Recent orders
- Quick actions

### Authentication Components
- Modern form design
- Validation and error handling
- Social login integration
- Responsive layout

## Styling

The application uses Tailwind CSS with custom components defined in `index.css`:

- `.btn-primary` - Primary button styling
- `.btn-secondary` - Secondary button styling
- `.card` - Card component styling
- `.input-field` - Form input styling
- `.search-bar` - Search input styling
- `.restaurant-card` - Restaurant card styling
- `.category-chip` - Category filter styling

## API Integration

The frontend is designed to work with the backend API:

- Authentication endpoints (`/api/auth`)
- Restaurant data endpoints
- Order management endpoints
- User profile endpoints

## Future Enhancements

- Restaurant detail pages
- Order tracking
- Payment integration
- Real-time notifications
- User reviews and ratings
- Advanced filtering options
- Map integration
- Push notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
