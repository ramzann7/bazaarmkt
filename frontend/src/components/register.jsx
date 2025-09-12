// src/components/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EyeIcon, EyeSlashIcon, BuildingStorefrontIcon, UserIcon } from "@heroicons/react/24/outline";
import { registerUser, getProfile } from "../services/authservice";
import { onboardingService } from "../services/onboardingService";
import toast from "react-hot-toast";
import { PRODUCT_CATEGORIES } from "../data/productReference";
import { validateUserRegistration, formatPhoneInput, validateEmail, validatePhone, validatePassword, validateName } from "../utils/validation";

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
  const [validationErrors, setValidationErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});

  const handleChange = (e) => {
    let value = e.target.value;
    const fieldName = e.target.name;
    
    // Special handling for phone number formatting
    if (fieldName === 'phone') {
      value = formatPhoneInput(value);
    }
    
    // Special handling for artisan name to ensure first letter of each word is capitalized
    if (fieldName === 'artisanName') {
      value = value.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    setFormData({
      ...formData,
      [fieldName]: value,
    });

    // Real-time validation
    validateField(fieldName, value);
  };

  const validateField = (fieldName, value) => {
    let error = '';
    
    switch (fieldName) {
      case 'email':
        const emailValidation = validateEmail(value);
        error = emailValidation.error || '';
        break;
      case 'phone':
        const phoneValidation = validatePhone(value);
        error = phoneValidation.error || '';
        break;
      case 'password':
        const passwordValidation = validatePassword(value);
        error = passwordValidation.error || '';
        break;
      case 'firstName':
        const firstNameValidation = validateName(value, 'First name');
        error = firstNameValidation.error || '';
        break;
      case 'lastName':
        const lastNameValidation = validateName(value, 'Last name');
        error = lastNameValidation.error || '';
        break;
      case 'artisanName':
        if (value) {
          const artisanNameValidation = validateName(value, 'Business name');
          error = artisanNameValidation.error || '';
        }
        break;
      default:
        break;
    }

    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  const handleBlur = (e) => {
    const fieldName = e.target.name;
    setFieldTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched for validation display
    const allFields = ['firstName', 'lastName', 'email', 'phone', 'password', 'artisanName'];
    const touchedFields = {};
    allFields.forEach(field => {
      touchedFields[field] = true;
    });
    setFieldTouched(touchedFields);

    // Validate all fields
    const validation = validateUserRegistration({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      artisanName: formData.artisanName
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.error("Please fix the validation errors");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Validate artisan-specific fields
    if (formData.role === 'artisan') {
      if (!formData.businessType || formData.businessType === '') {
        toast.error("Business type is required for artisan accounts");
        return;
      }
    }

    setIsLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      
      // Prepare artisan data if registering as artisan
      if (formData.role === 'artisan') {
        registerData.artisanData = {
          artisanName: formData.artisanName || `${formData.firstName} ${formData.lastName}`,
          type: formData.businessType,
          description: formData.businessDescription || `Artisan profile for ${formData.firstName} ${formData.lastName}`,
          category: [formData.businessType], // Set the main category based on business type
          specialties: [] // Will be populated during profile setup
        };
      }
      
      const result = await registerUser(registerData);
      
      // The registerUser function already handles authentication and caching
      // We can use the result directly instead of calling getProfile()
      
      // Dispatch auth change event to update the auth context
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: true } 
      }));
      
      // Small delay to ensure AuthContext updates before navigation
      setTimeout(() => {
        if (formData.role === 'artisan') {
          toast.success("Artisan account created successfully! Complete your business profile to start selling.");
          navigate("/profile?tab=setup"); // Redirect artisans to profile setup tab
        } else {
          toast.success("Account created successfully! Complete your profile setup.");
          navigate("/profile?tab=setup"); // Redirect all users to profile setup
        }
      }, 100);
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-[#D77A61] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <BuildingStorefrontIcon className="w-10 h-10 text-white" />
          </div>
                      <h2 className="text-4xl font-bold text-gray-900 mb-2 font-serif">Join bazaarMKT</h2>
          <p className="text-gray-600 text-lg">Create your account and start your journey</p>
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
                  onBlur={handleBlur}
                  className={`form-input focus-luxury ${validationErrors.firstName && fieldTouched.firstName ? 'border-red-500' : ''}`}
                  placeholder="First name"
                />
                {validationErrors.firstName && fieldTouched.firstName && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.firstName}</p>
                )}
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
                  onBlur={handleBlur}
                  className={`form-input focus-luxury ${validationErrors.lastName && fieldTouched.lastName ? 'border-red-500' : ''}`}
                  placeholder="Last name"
                />
                {validationErrors.lastName && fieldTouched.lastName && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.lastName}</p>
                )}
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
                onBlur={handleBlur}
                className={`form-input focus-luxury ${validationErrors.email && fieldTouched.email ? 'border-red-500' : ''}`}
                placeholder="Enter your email address"
              />
              {validationErrors.email && fieldTouched.email && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
              )}
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
                onBlur={handleBlur}
                className={`form-input focus-luxury ${validationErrors.phone && fieldTouched.phone ? 'border-red-500' : ''}`}
                placeholder="Enter your phone number"
              />
              {validationErrors.phone && fieldTouched.phone && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
              )}
            </div>

            {/* Artisan-specific fields */}
            {formData.role === 'artisan' && (
              <>
                {/* Artisan Name Field */}
                <div className="form-group">
                  <label htmlFor="artisanName" className="form-label">
                    Artisan Name *
                  </label>
                  <input
                    id="artisanName"
                    name="artisanName"
                    type="text"
                    autoComplete="organization"
                    value={formData.artisanName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input focus-luxury ${validationErrors.artisanName && fieldTouched.artisanName ? 'border-red-500' : ''}`}
                    placeholder="Enter your artisan name"
                    required
                  />
                  {validationErrors.artisanName && fieldTouched.artisanName && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.artisanName}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    ✨ Each word will be automatically capitalized for consistency
                  </p>
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
                    {Object.entries(PRODUCT_CATEGORIES).map(([key, category]) => (
                      <option key={key} value={key}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Select the main category that best describes your business
                  </p>
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
                  onBlur={handleBlur}
                  className={`form-input pr-12 focus-luxury ${validationErrors.password && fieldTouched.password ? 'border-red-500' : ''}`}
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
              {validationErrors.password && fieldTouched.password && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
              )}
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
              <h4 className="font-semibold text-stone-800 mb-2">Why sell on bazaarMKT?</h4>
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
