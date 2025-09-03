// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import Navbar from "./components/navbar.jsx";
import { performanceService } from "./services/performanceService";
import { LazyRoute, LoadingSpinner } from "./components/LazyLoader.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { preloadProfileFast } from "./services/profileService";
import { preloadService } from "./services/preloadService";
import PerformanceMonitor from "./components/PerformanceMonitor.jsx";
import { orderNotificationService } from "./services/orderNotificationService";
import { initializeNotificationService } from './services/notificationService';

// Artisan-only route component
const ArtisanOnlyRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Check if user is an artisan
  if (user.role !== 'artisan' && user.role !== 'producer' && user.role !== 'food_maker') {
    // Redirect patrons to home page
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Lazy load components for better performance
const Home = lazy(() => import("./components/home.jsx"));
const Login = lazy(() => import("./components/login.jsx"));
const Register = lazy(() => import("./components/register.jsx"));
const Dashboard = lazy(() => import("./components/dashboard/DashboardFixed.jsx"));
const Artisans = lazy(() => import("./components/artisans.jsx"));
const Profile = lazy(() => import("./components/Profile.jsx"));
const Account = lazy(() => import("./components/Account.jsx"));
const SmartRedirect = lazy(() => import("./components/SmartRedirect.jsx"));


const Products = lazy(() => import("./components/Products.jsx"));
const Orders = lazy(() => import("./components/Orders.jsx"));
const SearchResults = lazy(() => import("./components/SearchResults.jsx"));
const Search = lazy(() => import("./components/Search.jsx"));
const TestReferenceData = lazy(() => import("./components/TestReferenceData.jsx"));
const SimpleTest = lazy(() => import("./components/SimpleTest.jsx"));
const SearchTrackingTest = lazy(() => import("./components/SearchTrackingTest.jsx"));
const BrevoTest = lazy(() => import("./components/BrevoTest.jsx"));

const DashboardTest = lazy(() => import("./components/dashboard/DashboardTest.jsx"));
const UserRoleCheck = lazy(() => import("./components/dashboard/UserRoleCheck.jsx"));
const DashboardDebug = lazy(() => import("./components/dashboard/DashboardDebug.jsx"));
const DashboardSimple = lazy(() => import("./components/dashboard/DashboardSimple.jsx"));
const DashboardMinimal = lazy(() => import("./components/dashboard/DashboardMinimal.jsx"));
const DashboardTestSimple = lazy(() => import("./components/dashboard/DashboardTestSimple.jsx"));
const DashboardFixed = lazy(() => import("./components/dashboard/DashboardFixed.jsx"));
const LoginDebug = lazy(() => import("./components/dashboard/LoginDebug.jsx"));
const ArtisanDetails = lazy(() => import("./components/ArtisanDetails.jsx"));
const ArtisanShop = lazy(() => import("./components/ArtisanShop.jsx"));
const FindArtisans = lazy(() => import("./components/FindArtisans.jsx"));
const Community = lazy(() => import("./components/Community.jsx"));
const EventDetails = lazy(() => import("./components/EventDetails.jsx"));
const Cart = lazy(() => import("./components/Cart.jsx"));
const GuestCheckout = lazy(() => import("./components/GuestCheckout.jsx"));
const BuyingLocal = lazy(() => import("./components/BuyingLocal.jsx"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard.jsx"));
const AdminRevenueManagement = lazy(() => import("./components/AdminRevenueManagement.jsx"));
const AdminUserManagement = lazy(() => import("./components/AdminUserManagement.jsx"));
const RevenueTransparency = lazy(() => import("./components/RevenueTransparency.jsx"));
const AdminProductManagement = lazy(() => import("./components/AdminProductManagement.jsx"));
const AdminArtisanManagement = lazy(() => import("./components/AdminArtisanManagement.jsx"));
const AdminAnalytics = lazy(() => import("./components/AdminAnalytics.jsx"));
const OrderConfirmation = lazy(() => import("./components/OrderConfirmation.jsx"));

function AppRoutes() {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();
  

  
  // Performance tracking and profile preloading
  useEffect(() => {
    performanceService.startTimer('app_mount');
    
    // Preload profile for faster access
    if (isAuthenticated) {
      preloadProfileFast();
    }
    
    // Preload critical data for current route
    const currentPath = window.location.pathname;
    preloadService.preloadForRoute(currentPath);
    
    // Initialize order notification service for artisans
    if (isAuthenticated) {
      orderNotificationService.connect();
    }
    
    // Initialize Brevo notification service
    initializeNotificationService('TnLMjUfmtA3F6QY4');
    
    return () => {
      performanceService.endTimer('app_mount');
      orderNotificationService.disconnect();
    };
  }, [isAuthenticated]);

  // Show loading spinner while auth is initializing
  if (!isInitialized || isLoading) {
    return <LoadingSpinner message="Initializing..." />;
  }

  return (
    <>
      <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/register"
          element={isAuthenticated ? <SmartRedirect /> : <Register />}
        />
        <Route
          path="/login"
          element={isAuthenticated ? <SmartRedirect /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <ArtisanOnlyRoute>
                <Dashboard />
              </ArtisanOnlyRoute>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/profile"
          element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
        />
        <Route
          path="/account"
          element={isAuthenticated ? <Account /> : <Navigate to="/login" />}
        />
        <Route
          path="/products"
          element={isAuthenticated ? <Products /> : <Navigate to="/login" />}
        />
        <Route
          path="/orders"
          element={isAuthenticated ? <Orders /> : <Navigate to="/login" />}
        />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/search-page" element={<Search />} />
        <Route path="/test-reference" element={<TestReferenceData />} />
        <Route path="/simple-test" element={<SimpleTest />} />
        <Route path="/search-tracking-test" element={<SearchTrackingTest />} />
        <Route path="/brevo-test" element={<BrevoTest />} />

        <Route path="/dashboard-test" element={<DashboardTest />} />
        <Route path="/user-role-check" element={<UserRoleCheck />} />
        <Route path="/dashboard-debug" element={<DashboardDebug />} />
        <Route path="/dashboard-simple" element={<DashboardSimple />} />
        <Route path="/dashboard-minimal" element={<DashboardMinimal />} />
        <Route path="/dashboard-test-simple" element={<DashboardTestSimple />} />
        <Route path="/dashboard-fixed" element={<DashboardFixed />} />
        <Route path="/login-debug" element={<LoginDebug />} />
        <Route path="/artisan/:id" element={<ArtisanShop />} />
        <Route path="/shop/:id" element={<ArtisanShop />} />
        <Route path="/find-artisans" element={<FindArtisans />} />
        <Route path="/community" element={<Community />} />
        <Route path="/event/:id" element={<EventDetails />} />
        <Route
          path="/cart"
          element={<Cart />}
        />
        <Route path="/guest-checkout" element={<GuestCheckout />} />
        <Route path="/buying-local" element={<BuyingLocal />} />
        <Route path="/artisans" element={<Artisans />} />
        
        {/* Admin Routes */}
        <Route
          path="/admin"
          element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/revenue"
          element={isAuthenticated ? <AdminRevenueManagement /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/users"
          element={isAuthenticated ? <AdminUserManagement /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/products"
          element={isAuthenticated ? <AdminProductManagement /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/artisans"
          element={isAuthenticated ? <AdminArtisanManagement /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/analytics"
          element={isAuthenticated ? <AdminAnalytics /> : <Navigate to="/login" />}
        />
        

        
        {/* Transparency Route */}
        <Route path="/transparency" element={<RevenueTransparency />} />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </Suspense>
      <PerformanceMonitor />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
