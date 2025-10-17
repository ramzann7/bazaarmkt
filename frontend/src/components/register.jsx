// src/components/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon, BuildingStorefrontIcon, UserIcon } from "@heroicons/react/24/outline";
import Logo from "./Logo";
import { registerUser, getProfile } from "../services/authservice";
import { onboardingService } from "../services/onboardingService";
import toast from "react-hot-toast";
import { PRODUCT_CATEGORIES } from "../data/productReference";
import { validateUserRegistration, formatPhoneInput, validateEmail, validatePhone, validatePassword, validateName } from "../utils/validation";
import geographicSettingsService from "../services/geographicSettingsService";
import { ADDRESS_CONFIG } from "../config/addressConfig";

export default function Register() {
  const { t, i18n } = useTranslation();
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
    businessType: "handmade_crafts",
    businessDescription: "",
    // Address fields
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Canada", // Set to Canada by default and cannot be changed
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});
  const [addressConfig, setAddressConfig] = useState(ADDRESS_CONFIG.canada || ADDRESS_CONFIG.default);

  const handleChange = (e) => {
    let value = e.target.value;
    const fieldName = e.target.name;
    
    // Special handling for phone number formatting
    if (fieldName === 'phone') {
      value = formatPhoneInput(value);
    }
    
    // Special handling for country changes - update address configuration
    if (fieldName === 'country') {
      const countryConfig = Object.values(ADDRESS_CONFIG).find(config => 
        config.countries.includes(value)
      );
      if (countryConfig) {
        setAddressConfig(countryConfig);
        // Reset state when country changes
        setFormData(prev => ({
          ...prev,
          [fieldName]: value,
          state: ''
        }));
        return;
      }
    }
    
    // Special handling for artisan name to ensure first letter of each word is capitalized
    if (fieldName === 'artisanName') {
      value = value.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    // Special handling for postal code formatting based on country
    if (fieldName === 'zipCode') {
      if (formData.country === 'Canada') {
        // Format as H1A 1A1
        value = value.replace(/\s+/g, '').toUpperCase();
        if (value.length > 3) {
          value = value.slice(0, 3) + ' ' + value.slice(3, 6);
        }
      } else if (formData.country === 'United States') {
        // Format as 12345 or 12345-6789
        value = value.replace(/\D/g, '');
        if (value.length > 5) {
          value = value.slice(0, 5) + '-' + value.slice(5, 9);
        }
      } else {
        // For other countries, just clean up spaces
        value = value.replace(/\s+/g, ' ').trim();
      }
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
      case 'street':
        if (!value.trim()) {
          error = 'Street address is required';
        }
        break;
      case 'city':
        if (!value.trim()) {
          error = 'City is required';
        }
        break;
      case 'zipCode':
        if (!value.trim()) {
          error = 'Postal code is required';
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

    // Check if the site is available for the selected country/province
    if (formData.country !== 'Canada') {
      toast.error('Sorry, bazaar is currently only available in Canada. We\'re working on expanding to other regions soon!');
      return;
    }

    // Validate address using flexible system
    try {
      const addressValidation = await geographicSettingsService.validateAddress({
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country
      });

      if (!addressValidation.isValid) {
        // Check if it's a geographic restriction error
        if (addressValidation.errors.some(error => 
          error.toLowerCase().includes('not available') || 
          error.toLowerCase().includes('not supported') ||
          error.toLowerCase().includes('restricted')
        )) {
          toast.error('Sorry, bazaar is not yet available in your province. We\'re working on expanding to all Canadian provinces soon!');
        } else {
          toast.error(addressValidation.errors.join(', '));
        }
        return;
      }
    } catch (error) {
      console.error('Address validation error:', error);
      // Fallback to basic validation
      if (!formData.street.trim() || !formData.city.trim() || !formData.state.trim() || !formData.zipCode.trim() || !formData.country.trim()) {
        toast.error('All address fields are required');
        return;
      }
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
      
      // Capture current language preference at registration
      registerData.languagePreference = i18n.language || 'en';
      
      // Add address to user data
      registerData.addresses = [{
        type: 'home',
        label: 'Home',
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
        isDefault: true
      }];

      // Prepare artisan data if registering as artisan
      if (formData.role === 'artisan') {
        registerData.artisanData = {
          artisanName: formData.artisanName || `${formData.firstName} ${formData.lastName}`,
          type: formData.businessType,
          description: formData.businessDescription || `Artisan profile for ${formData.firstName} ${formData.lastName}`,
          category: [formData.businessType], // Set the main category based on business type
          specialties: [], // Will be populated during profile setup
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            country: formData.country
          }
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
          <div className="mx-auto w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Logo showText={false} className="w-20 h-20" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2 font-serif">{t('auth.joinBazaar')}</h2>
          <p className="text-gray-600 text-lg">{t('auth.createYourAccount')}</p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">{t('auth.selectRole')}</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'patron' })}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    formData.role === 'patron'
                      ? 'border-[#D77A61] bg-[#D77A61] bg-opacity-10 text-[#D77A61]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-[#D77A61] hover:text-[#D77A61]'
                  }`}
                >
                  <UserIcon className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm font-semibold">{t('auth.patron')}</div>
                  <div className="text-xs">{t('auth.patronDescription')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'artisan' })}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    formData.role === 'artisan'
                      ? 'border-[#3C6E47] bg-[#3C6E47] bg-opacity-10 text-[#3C6E47]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-[#3C6E47] hover:text-[#3C6E47]'
                  }`}
                >
                  <Logo showText={false} className="w-12 h-12 mx-auto mb-2" />
                  <div className="text-sm font-semibold">{t('auth.artisan')}</div>
                  <div className="text-xs">{t('auth.artisanDescription')}</div>
                </button>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">
                  {t('auth.firstName')}
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
                  {t('auth.lastName')}
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
                {t('auth.email')}
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
                {t('auth.phoneNumber')}
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

            {/* Address Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-secondary mb-4 flex items-center">
                <span className="mr-2">📍</span>
                Address (Required)
              </h3>
              
              {/* Street Address */}
              <div className="form-group">
                <label htmlFor="street" className="form-label">
                  Street Address *
                </label>
                <input
                  id="street"
                  name="street"
                  type="text"
                  autoComplete="street-address"
                  value={formData.street}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-input focus-luxury ${validationErrors.street && fieldTouched.street ? 'border-red-500' : ''}`}
                  placeholder="123 Main Street"
                />
                {validationErrors.street && fieldTouched.street && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.street}</p>
                )}
              </div>

              {/* City and Postal Code */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="city" className="form-label">
                    City *
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    value={formData.city}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input focus-luxury ${validationErrors.city && fieldTouched.city ? 'border-red-500' : ''}`}
                    placeholder="Montreal"
                  />
                  {validationErrors.city && fieldTouched.city && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.city}</p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="zipCode" className="form-label">
                    Postal Code *
                  </label>
                  <input
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    autoComplete="postal-code"
                    value={formData.zipCode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input focus-luxury ${validationErrors.zipCode && fieldTouched.zipCode ? 'border-red-500' : ''}`}
                    placeholder={addressConfig.postalCodePlaceholder || "Postal Code"}
                    maxLength="7"
                  />
                  {validationErrors.zipCode && fieldTouched.zipCode && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.zipCode}</p>
                  )}
                </div>
              </div>

              {/* Province and Country */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="state" className="form-label">
                    {addressConfig.name === 'Canada' ? 'Province' : 'State/Province'}
                  </label>
                  {addressConfig.states.length > 0 ? (
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="form-input focus-luxury"
                      required
                    >
                      <option value="">Select {addressConfig.name === 'Canada' ? 'Province' : 'State'}</option>
                      {addressConfig.states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="state"
                      name="state"
                      type="text"
                      value={formData.state}
                      onChange={handleChange}
                      className="form-input focus-luxury"
                      placeholder="State/Province"
                      required
                    />
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="country" className="form-label">
                    Country
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="form-input focus-luxury bg-gray-50 cursor-not-allowed"
                    required
                    disabled
                  >
                    <option value="Canada">Canada</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    🇨🇦 {t('auth.canadaOnly')}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-blue-800 text-sm">
                  <strong>{t('common.required')}:</strong> {t('auth.canadaOnly')} {t('auth.provideAddress')}
                </p>
              </div>
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
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-gray-600 transition-colors duration-300"
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
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-gray-600 transition-colors duration-300"
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
              className={`w-full btn-large disabled:opacity-50 disabled:cursor-not-allowed ${
                formData.role === 'artisan' 
                  ? 'bg-[#3C6E47] text-white hover:bg-[#2D5A3A] focus:ring-[#3C6E47]' 
                  : 'bg-[#D77A61] text-white hover:bg-[#C66A51] focus:ring-[#D77A61]'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Business Benefits */}
          {formData.role === 'artisan' && (
            <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Why sell on BazaarMkt?</h4>
              <ul className="text-sm text-gray-600 space-y-1">
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
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#D77A61] hover:text-[#3C6E47] transition-colors duration-300"
            >
              Sign in here
            </Link>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            By creating an account, you agree to our{" "}
            <Link to="/terms" className="text-[#D77A61] hover:text-[#3C6E47] font-medium">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-[#D77A61] hover:text-[#3C6E47] font-medium">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
