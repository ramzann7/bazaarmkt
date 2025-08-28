// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/navbar.jsx";
import Home from "./components/home.jsx";
import Login from "./components/login.jsx";
import Register from "./components/register.jsx";
import Dashboard from "./components/dashboard.jsx";
import Artisans from "./components/artisans.jsx";

import Profile from "./components/Profile.jsx";
import Account from "./components/Account.jsx";
import Products from "./components/Products.jsx";
import Orders from "./components/Orders.jsx";
import SearchResults from "./components/SearchResults.jsx";
import Search from "./components/Search.jsx";
import TestReferenceData from "./components/TestReferenceData.jsx";
import SimpleTest from "./components/SimpleTest.jsx";
import ArtisanDetails from "./components/ArtisanDetails.jsx";
import FindArtisans from "./components/FindArtisans.jsx";
import Community from "./components/Community.jsx";
import EventDetails from "./components/EventDetails.jsx";
import Cart from "./components/Cart.jsx";
import GuestCheckout from "./components/GuestCheckout.jsx";
import BuyingLocal from "./components/BuyingLocal.jsx";
import SmartRedirect from "./components/SmartRedirect.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import AdminUserManagement from "./components/AdminUserManagement.jsx";
import AdminProductManagement from "./components/AdminProductManagement.jsx";
import AdminArtisanManagement from "./components/AdminArtisanManagement.jsx";
import AdminAnalytics from "./components/AdminAnalytics.jsx";
import { authToken } from "./services/authService";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!authToken.getToken());

  useEffect(() => {
    // Check authentication status on mount and when localStorage changes
    const checkAuth = () => {
      setIsAuthenticated(!!authToken.getToken());
    };

    // Check on mount
    checkAuth();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = () => {
      checkAuth();
    };

    // Listen for custom auth events
    const handleAuthChange = (event) => {
      setIsAuthenticated(event.detail.isAuthenticated);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  return (
    <Router>
      <Navbar />
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
        <Route path="/artisans" element={<Artisans />} />
        <Route path="/buying-local" element={<BuyingLocal />} />
        <Route path="/find-artisans" element={<FindArtisans />} />
        <Route path="/community" element={<Community />} />
        <Route path="/event/:id" element={<EventDetails />} />
        <Route path="/search" element={<Search />} />
        <Route path="/guest-checkout" element={<GuestCheckout />} />
        <Route path="/artisan/:id" element={<ArtisanDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/test-reference-data" element={<TestReferenceData />} />
        <Route path="/simple-test" element={<SimpleTest />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/login" />}
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

        <Route path="/map" element={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><h2 className="text-2xl font-bold mb-4">Map View</h2><p className="text-gray-600">Coming soon!</p></div></div>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
