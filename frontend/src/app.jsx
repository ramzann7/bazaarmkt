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

// Lazy load components for better performance
const Home = lazy(() => import("./components/home.jsx"));
const Login = lazy(() => import("./components/login.jsx"));
const Register = lazy(() => import("./components/register.jsx"));
const Dashboard = lazy(() => import("./components/dashboard.jsx"));
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
const ArtisanDetails = lazy(() => import("./components/ArtisanDetails.jsx"));
const FindArtisans = lazy(() => import("./components/FindArtisans.jsx"));
const Community = lazy(() => import("./components/Community.jsx"));
const EventDetails = lazy(() => import("./components/EventDetails.jsx"));
const Cart = lazy(() => import("./components/Cart.jsx"));
const GuestCheckout = lazy(() => import("./components/GuestCheckout.jsx"));
const BuyingLocal = lazy(() => import("./components/BuyingLocal.jsx"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard.jsx"));
const AdminRevenueManagement = lazy(() => import("./components/AdminRevenueManagement.jsx"));
const AdminUserManagement = lazy(() => import("./components/AdminUserManagement.jsx"));
const ArtisanRevenueDashboard = lazy(() => import("./components/ArtisanRevenueDashboard.jsx"));
const RevenueTransparency = lazy(() => import("./components/RevenueTransparency.jsx"));
const AdminProductManagement = lazy(() => import("./components/AdminProductManagement.jsx"));
const AdminArtisanManagement = lazy(() => import("./components/AdminArtisanManagement.jsx"));
const AdminAnalytics = lazy(() => import("./components/AdminAnalytics.jsx"));

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
          element={isAuthenticated ? <SmartRedirect /> : <Navigate to="/login" />}
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
        <Route path="/search" element={<SearchResults />} />
        <Route path="/search-page" element={<Search />} />
        <Route path="/test-reference" element={<TestReferenceData />} />
        <Route path="/simple-test" element={<SimpleTest />} />
        <Route path="/artisan/:id" element={<ArtisanDetails />} />
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
        
        {/* Artisan Revenue Routes */}
        <Route
          path="/artisan/revenue"
          element={isAuthenticated ? <ArtisanRevenueDashboard /> : <Navigate to="/login" />}
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
