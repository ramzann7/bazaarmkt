// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import Navbar from "./components/navbar.jsx";
import Footer from "./components/Footer.jsx";
import "./styles/mobile-improvements.css";
import { performanceService } from "./services/performanceService";
import { LazyRoute, LoadingSpinner } from "./components/LazyLoader.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
// Remove debug utilities in production
if (import.meta.env.MODE === 'development') {
  import('./utils/authDebug');
}
import { preloadProfileFast } from "./services/profileService";
import { preloadService } from "./services/preloadService";
import PerformanceMonitor from "./components/PerformanceMonitor.jsx";
import { orderNotificationService } from "./services/orderNotificationService";
import { initializeNotificationService } from './services/notificationService';
import './i18n'; // Import i18n configuration

// Artisan-only route component
const ArtisanOnlyRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Check if user is an artisan (check both role and userType for compatibility)
  const isArtisan = user.role === 'artisan' || user.userType === 'artisan';
  
  if (!isArtisan) {
    // Redirect patrons to home page
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Lazy load components for better performance
const Home = lazy(() => import("./components/home.jsx"));
const Login = lazy(() => import("./components/login.jsx"));
const Register = lazy(() => import("./components/register.jsx"));
const Signup = lazy(() => import("./components/register.jsx")); // Alias for signup route
const Dashboard = lazy(() => import("./components/dashboard/DashboardFixed.jsx"));
const Artisans = lazy(() => import("./components/artisans.jsx"));
const Profile = lazy(() => import("./components/Profile.jsx"));
const Account = lazy(() => import("./components/Account.jsx"));
const SmartRedirect = lazy(() => import("./components/SmartRedirect.jsx"));

const Orders = lazy(() => import("./components/Orders.jsx"));
const SearchResults = lazy(() => import("./components/SearchResults.jsx"));
const MyWallet = lazy(() => import("./components/MyWallet.jsx"));
const TestReferenceData = lazy(() => import("./components/TestReferenceData.jsx"));

// Debug routes - only loaded in development
const DashboardTest = import.meta.env.MODE === 'development' 
  ? lazy(() => import("./components/dashboard/DashboardTest.jsx"))
  : null;
const UserRoleCheck = import.meta.env.MODE === 'development' 
  ? lazy(() => import("./components/dashboard/UserRoleCheck.jsx"))
  : null;
const DashboardDebug = import.meta.env.MODE === 'development' 
  ? lazy(() => import("./components/dashboard/DashboardDebug.jsx"))
  : null;
const DashboardSimple = import.meta.env.MODE === 'development' 
  ? lazy(() => import("./components/dashboard/DashboardSimple.jsx"))
  : null;
const DashboardMinimal = import.meta.env.MODE === 'development' 
  ? lazy(() => import("./components/dashboard/DashboardMinimal.jsx"))
  : null;
const DashboardTestSimple = import.meta.env.MODE === 'development' 
  ? lazy(() => import("./components/dashboard/DashboardTestSimple.jsx"))
  : null;
const DashboardFixed = lazy(() => import("./components/dashboard/DashboardFixed.jsx"));
const LoginDebug = import.meta.env.MODE === 'development' 
  ? lazy(() => import("./components/dashboard/LoginDebug.jsx"))
  : null;
const ArtisanDetails = lazy(() => import("./components/ArtisanDetails.jsx"));
const ArtisanShop = lazy(() => import("./components/ArtisanShop.jsx"));
const FindArtisans = lazy(() => import("./components/FindArtisans.jsx"));
const Community = lazy(() => import("./components/Community.jsx"));
const EventDetails = lazy(() => import("./components/EventDetails.jsx"));
const Cart = lazy(() => import("./components/Cart.jsx"));
const BuyingLocal = lazy(() => import("./components/BuyingLocal.jsx"));
const HowItWorks = lazy(() => import("./components/HowItWorks.jsx"));
const TermsOfService = lazy(() => import("./components/TermsOfService.jsx"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard.jsx"));
const AdminRevenueManagement = lazy(() => import("./components/AdminRevenueManagement.jsx"));
const AdminUserManagement = lazy(() => import("./components/AdminUserManagement.jsx"));
const RevenueTransparency = lazy(() => import("./components/RevenueTransparency.jsx"));
const DashboardHighlights = lazy(() => import("./components/DashboardHighlights.jsx"));
const AdminProductManagement = lazy(() => import("./components/AdminProductManagement.jsx"));
const AdminArtisanManagement = lazy(() => import("./components/AdminArtisanManagement.jsx"));
const AdminAnalytics = lazy(() => import("./components/AdminAnalytics.jsx"));
const AdminSettings = lazy(() => import("./components/AdminSettings.jsx"));
const AdminPromotionalDashboard = lazy(() => import("./components/AdminPromotionalDashboard.jsx"));
const AdminPlatformSettings = lazy(() => import("./components/AdminPlatformSettings.jsx"));
const AdminGeographicSettings = lazy(() => import("./components/AdminGeographicSettings.jsx"));
const OrderConfirmation = lazy(() => import("./components/OrderConfirmation.jsx"));
const ArtisanProductManagement = lazy(() => import("./components/ArtisanProductManagement.jsx"));
const ArtisanRevenueDashboard = lazy(() => import("./components/ArtisanRevenueDashboard.jsx"));

function AppRoutes() {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();
  

  
  // Performance tracking and profile preloading
  useEffect(() => {
    performanceService.startTimer('app_mount');
    
    // Preload profile for faster access
    if (isAuthenticated) {
      preloadProfileFast();
    }
    
    // Initialize services in non-blocking way
    setTimeout(() => {
      try {
        // Preload critical data for current route
        const currentPath = window.location.pathname;
        preloadService.preloadForRoute(currentPath);
        
        // Initialize order notification service for artisans
        if (isAuthenticated) {
          orderNotificationService.connect();
        }
        
        // Initialize Brevo notification service
        // API key will be loaded from environment variable or use fallback
        initializeNotificationService();
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    }, 50); // Small delay to ensure UI is responsive
    
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
        <Route path="/products" element={<Navigate to="/my-products" replace />} />
        <Route
          path="/orders"
          element={isAuthenticated ? <Orders /> : <Navigate to="/login" />}
        />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/test-reference" element={<TestReferenceData />} />

        {/* Debug routes - only available in development */}
        {import.meta.env.MODE === 'development' && (
          <>
            <Route path="/dashboard-test" element={<DashboardTest />} />
            <Route path="/user-role-check" element={<UserRoleCheck />} />
            <Route path="/dashboard-debug" element={<DashboardDebug />} />
            <Route path="/dashboard-simple" element={<DashboardSimple />} />
            <Route path="/dashboard-minimal" element={<DashboardMinimal />} />
            <Route path="/dashboard-test-simple" element={<DashboardTestSimple />} />
            <Route path="/login-debug" element={<LoginDebug />} />
          </>
        )}
        
        <Route path="/dashboard-fixed" element={<DashboardFixed />} />
        <Route path="/artisan/:id" element={<ArtisanShop />} />
        <Route path="/shop/:id" element={<ArtisanShop />} />
        <Route path="/find-artisans" element={<Artisans />} />
        <Route
          path="/my-products"
          element={
            <ArtisanOnlyRoute>
              <ArtisanProductManagement />
            </ArtisanOnlyRoute>
          }
        />
        <Route
          path="/my-wallet"
          element={
            <ArtisanOnlyRoute>
              <MyWallet />
            </ArtisanOnlyRoute>
          }
        />
        <Route
          path="/revenue-dashboard"
          element={
            <ArtisanOnlyRoute>
              <ArtisanRevenueDashboard />
            </ArtisanOnlyRoute>
          }
        />
        <Route path="/community" element={<Community />} />
        <Route path="/event/:id" element={<EventDetails />} />
        <Route
          path="/cart"
          element={<Cart />}
        />
        <Route path="/buying-local" element={<BuyingLocal />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/artisans" element={<Artisans />} />
        <Route path="/transparency" element={<RevenueTransparency />} />
        <Route path="/dashboard-highlights" element={<DashboardHighlights />} />
        
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
        <Route
          path="/admin/promotional"
          element={isAuthenticated ? <AdminPromotionalDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/platform-settings"
          element={isAuthenticated ? <AdminPlatformSettings /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/geographic-settings"
          element={isAuthenticated ? <AdminGeographicSettings /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/settings"
          element={isAuthenticated ? <AdminSettings /> : <Navigate to="/login" />}
        />
        
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
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <Navbar />
          <AppRoutes />
          <Footer />
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;
