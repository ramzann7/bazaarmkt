// src/components/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EyeIcon, EyeSlashIcon, BuildingStorefrontIcon, UserIcon } from "@heroicons/react/24/outline";
import { registerUser, getProfile } from "../services/authservice";
import { onboardingService } from "../services/onboardingService";
import toast from "react-hot-toast";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('type') === 'artisan' ? 'artisan' : 'patron';
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: defaultRole,
    artisanName: "",
    businessType: "food_beverages",
    businessDescription: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (!formData.firstName || !formData.lastName) {
      toast.error("First name and last name are required");
      return;
    }

    setIsLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      
      // Prepare artisan data if registering as artisan
      if (formData.role === 'artisan') {
        registerData.artisanName = formData.artisanName || `${formData.firstName} ${formData.lastName}`;
        registerData.type = formData.businessType;
        registerData.description = formData.businessDescription || `Artisan profile for ${formData.firstName} ${formData.lastName}`;
      }
      
      const result = await registerUser(registerData);
      
      // Get user profile to get userId
      const profile = await getProfile();
      const userId = profile._id;
      
      // Mark user as new (they haven't completed onboarding yet)
      // Note: We don't mark onboarding as completed here, so they'll be redirected to profile
      
      if (formData.role === 'artisan') {
        toast.success("Artisan account created successfully! Complete your business profile to start selling.");
      } else {
        toast.success("Account created successfully!");
      }
      
      navigate("/dashboard"); // Use SmartRedirect for better user experience
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-emerald-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <BuildingStorefrontIcon className="w-10 h-10 text-white" />
          </div>
                      <h2 className="text-4xl font-bold text-stone-900 mb-2">Join The Bazaar</h2>
          <p className="text-stone-600 text-lg">Create your account and start your journey</p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">Account Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'patron' })}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    formData.role === 'patron'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <UserIcon className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm font-semibold">Patron</div>
                  <div className="text-xs">Shop local products</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'artisan' })}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    formData.role === 'artisan'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <BuildingStorefrontIcon className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm font-semibold">Artisan</div>
                  <div className="text-xs">Sell your products</div>
                </button>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input focus-luxury"
                  placeholder="First name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName" className="form-label">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-input focus-luxury"
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="form-input focus-luxury"
                placeholder="Enter your email address"
              />
            </div>

            {/* Phone Field */}
            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange}
                className="form-input focus-luxury"
                placeholder="Enter your phone number"
              />
            </div>

            {/* Artisan-specific fields */}
            {formData.role === 'artisan' && (
              <>
                {/* Business Name Field */}
                <div className="form-group">
                  <label htmlFor="artisanName" className="form-label">
                    Business Name
                  </label>
                  <input
                    id="artisanName"
                    name="artisanName"
                    type="text"
                    autoComplete="organization"
                    value={formData.artisanName}
                    onChange={handleChange}
                    className="form-input focus-luxury"
                    placeholder="Enter your business name"
                  />
                </div>

                {/* Business Type Field */}
                <div className="form-group">
                  <label htmlFor="businessType" className="form-label">
                    Business Type
                  </label>
                  <select
                    id="businessType"
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className="form-input focus-luxury"
                  >
                    <option value="food_beverages">Food & Beverages</option>
                    <option value="handmade_crafts">Handmade Crafts</option>
                    <option value="clothing_accessories">Clothing & Accessories</option>
                    <option value="home_garden">Home & Garden</option>
                    <option value="beauty_wellness">Beauty & Wellness</option>
                    <option value="bakery">Bakery</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="cafe">Cafe</option>
                    <option value="farm">Farm</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Business Description Field */}
                <div className="form-group">
                  <label htmlFor="businessDescription" className="form-label">
                    Business Description
                  </label>
                  <textarea
                    id="businessDescription"
                    name="businessDescription"
                    rows="3"
                    value={formData.businessDescription}
                    onChange={handleChange}
                    className="form-input focus-luxury resize-none"
                    placeholder="Briefly describe your business and what you offer"
                  />
                </div>
              </>
            )}

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input pr-12 focus-luxury"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600 transition-colors duration-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input pr-12 focus-luxury"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600 transition-colors duration-300"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary btn-large disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Business Benefits */}
          {formData.role === 'artisan' && (
            <div className="mt-6 p-4 bg-gradient-to-br from-amber-50 to-emerald-50 rounded-xl border border-amber-200">
              <h4 className="font-semibold text-stone-800 mb-2">Why sell on The Bazaar?</h4>
              <ul className="text-sm text-stone-600 space-y-1">
                <li>• Reach new local customers</li>
                <li>• Flexible delivery options</li>
                <li>• Simple onboarding & payments</li>
                <li>• Analytics & insights</li>
                <li>• Connect with your community</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-stone-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-amber-600 hover:text-amber-700 transition-colors duration-300"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
