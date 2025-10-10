import React, { useState } from 'react';
import { PRODUCT_CATEGORIES } from '../data/productReference';

// Function to get all subcategories grouped by main category
const getGroupedSubcategories = () => {
  const groupedCategories = [];
  
  Object.entries(PRODUCT_CATEGORIES).forEach(([categoryKey, category]) => {
    if (category.subcategories) {
      const subcategories = Object.entries(category.subcategories).map(([subcategoryKey, subcategory]) => ({
        key: subcategoryKey,
        name: subcategory.name,
        icon: subcategory.icon,
        category: categoryKey,
        categoryName: category.name
      }));
      
      groupedCategories.push({
        categoryKey,
        categoryName: category.name,
        categoryIcon: category.icon,
        subcategories: subcategories.sort((a, b) => a.name.localeCompare(b.name))
      });
    }
  });
  
  return groupedCategories.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
};

// Artisan-specific tab components
export function OverviewTab({ profile, onSave, isSaving }) {
  
  const [overview, setOverview] = useState({
    artisanName: profile.artisanName || '',
    businessImage: profile.businessImage || null,
    businessImagePreview: profile.businessImage || null,
    description: profile.description || '',
    category: profile.category || [],
    address: {
      street: profile.address?.street || '',
      city: profile.address?.city || '',
      state: profile.address?.state || '',
      zipCode: profile.address?.zipCode || ''
    },
    contactInfo: {
      phone: profile.contactInfo?.phone || profile.phone || '',
      email: profile.contactInfo?.email || profile.email || '',
      website: profile.contactInfo?.website || '',
      socialMedia: {
        instagram: profile.contactInfo?.socialMedia?.instagram || '',
        facebook: profile.contactInfo?.socialMedia?.facebook || '',
        twitter: profile.contactInfo?.socialMedia?.twitter || ''
      }
    }
  });

  // Function to capitalize first letter of each word
  const capitalizeWords = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Artisan name is now read-only and cannot be changed

  // Update state when profile changes (e.g., when artisan profile is loaded)
  React.useEffect(() => {
    if (profile) {
      console.log('🔍 [OverviewTab] Profile updated, businessImage:', profile.businessImage);
      console.log('🔍 [OverviewTab] Profile keys:', Object.keys(profile));
      
      setOverview({
        artisanName: profile.artisanName || '',
        businessImage: profile.businessImage || null,
        businessImagePreview: profile.businessImage || null,
        description: profile.description || '',
        category: profile.category || [],
        address: {
          street: profile.address?.street || '',
          city: profile.address?.city || '',
          state: profile.address?.state || '',
          zipCode: profile.address?.zipCode || ''
        },
        contactInfo: {
          phone: profile.contactInfo?.phone || profile.phone || '',
          email: profile.contactInfo?.email || profile.email || '',
          website: profile.contactInfo?.website || '',
          socialMedia: {
            instagram: profile.contactInfo?.socialMedia?.instagram || '',
            facebook: profile.contactInfo?.socialMedia?.facebook || '',
            twitter: profile.contactInfo?.socialMedia?.twitter || ''
          }
        }
      });
    }
  }, [profile]);

  // Format phone number as user types
  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  // Handle phone number change with formatting
  const handlePhoneChange = (e) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setOverview({ 
      ...overview, 
      contactInfo: { ...overview.contactInfo, phone: formattedPhone } 
    });
  };

  // Validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email change with validation
  const handleEmailChange = (e) => {
    const email = e.target.value;
    setOverview({ 
      ...overview, 
      contactInfo: { ...overview.contactInfo, email: email } 
    });
  };

  // Validate website URL format
  const validateWebsite = (url) => {
    if (!url) return true; // Empty is valid (optional field)
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  // Handle website change with validation
  const handleWebsiteChange = (e) => {
    let website = e.target.value;
    // Auto-add https:// if not present
    if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
      website = `https://${website}`;
    }
    setOverview({ 
      ...overview, 
      contactInfo: { ...overview.contactInfo, website: website } 
    });
  };

  // Format social media handles
  const formatSocialHandle = (handle, platform) => {
    if (!handle) return '';
    
    // Remove any existing @ symbol
    let formatted = handle.replace(/^@/, '');
    
    // Add @ for Instagram and Twitter
    if (platform === 'instagram' || platform === 'twitter') {
      formatted = formatted.startsWith('@') ? formatted : `@${formatted}`;
    }
    
    return formatted;
  };

  // Handle social media changes
  const handleSocialMediaChange = (platform, value) => {
    const formattedValue = formatSocialHandle(value, platform);
    setOverview({ 
      ...overview, 
      contactInfo: { 
        ...overview.contactInfo, 
        socialMedia: { 
          ...overview.contactInfo.socialMedia, 
          [platform]: formattedValue 
        } 
      } 
    });
  };

  // Handle business image upload
  const handleBusinessImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setOverview({
          ...overview,
          businessImage: file,
          businessImagePreview: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag and drop for business image
  const handleBusinessImageDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setOverview({
          ...overview,
          businessImage: file,
          businessImagePreview: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove business image
  const removeBusinessImage = () => {
    setOverview({
      ...overview,
      businessImage: null,
      businessImagePreview: null
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Convert business image to base64 if it's a File object
      let businessImageData = null;
      if (overview.businessImage instanceof File) {
        const reader = new FileReader();
        businessImageData = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(overview.businessImage);
        });
      } else if (overview.businessImage && typeof overview.businessImage === 'string') {
        // If it's already a string (existing image), use it as is
        businessImageData = overview.businessImage;
      }

      // Prepare the data to send
      const overviewData = {
        ...overview,
        businessImage: businessImageData
      };

      // Remove artisanName if it's empty to prevent backend validation errors
      if (!overviewData.artisanName || overviewData.artisanName.trim() === '') {
        delete overviewData.artisanName;
      }

      // Remove businessImage if it's null or empty to avoid validation errors
      if (!businessImageData) {
        delete overviewData.businessImage;
      }

      await onSave(overviewData);
    } catch (error) {
      console.error('Error saving overview:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Business Overview</h3>
        <p className="text-gray-600">Manage your business information and contact details</p>
      </div>
      
      {/* Artisan Name - Critical Element */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-primary-200">
        <div className="max-w-2xl">
          <label className="block text-lg font-bold text-gray-900 mb-2">
            🎨 Your Artisan Name *
          </label>
          <p className="text-sm text-gray-600 mb-4">
            This is your brand identity - how customers will know and remember you
          </p>
          <input
            type="text"
            value={overview.artisanName}
            readOnly
            disabled
            className="block w-full rounded-lg border-2 border-gray-300 shadow-sm bg-gray-50 text-lg font-medium py-3 px-4 cursor-not-allowed"
            placeholder="e.g., Sarah's Sweet Creations, Artisan Bread Co."
            required
          />
          <p className="text-xs text-gray-500 mt-2">
            🔒 Artisan name cannot be changed once created
          </p>
        </div>
      </div>

      {/* Business Type Display */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
        <div className="max-w-2xl">
          <label className="block text-lg font-bold text-gray-900 mb-2">
            🏷️ Business Type
          </label>
          <p className="text-sm text-gray-600 mb-4">
            Your business category helps customers find you and understand what you offer
          </p>
          <div className="bg-white rounded-lg border-2 border-green-300 p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {PRODUCT_CATEGORIES[profile.type]?.icon || '🏪'}
              </span>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {PRODUCT_CATEGORIES[profile.type]?.name || 'Business Type'}
                </p>
                <p className="text-sm text-gray-600">
                  {PRODUCT_CATEGORIES[profile.type]?.description || 'Business category description'}
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ℹ️ Business type is set during registration and cannot be changed here
          </p>
        </div>
      </div>


      {/* Business Image Upload */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="max-w-2xl">
          <label className="block text-lg font-bold text-gray-900 mb-2">
            🖼️ Business Image
          </label>
          <p className="text-sm text-gray-600 mb-4">
            This image will be displayed on your artisan card and shop page. Choose a high-quality image that represents your business.
          </p>
          
          <div className="space-y-4">
            {/* Drag & Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                overview.businessImagePreview 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (!overview.businessImagePreview) {
                  e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                }
              }}
              onDrop={handleBusinessImageDrop}
            >
              {overview.businessImagePreview ? (
                <div className="relative inline-block">
                  <img 
                    src={overview.businessImagePreview} 
                    alt="Business Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300 shadow-md"
                  />
                  <button
                    type="button"
                    onClick={removeBusinessImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-gray-700 mb-2">Upload Business Image</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Drag and drop an image here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBusinessImageChange}
                    className="hidden"
                    id="business-image-upload"
                  />
                  <label
                    htmlFor="business-image-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Choose Image
                  </label>
                </div>
              )}
            </div>
            
            {/* Image Tips */}
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h6 className="font-medium text-gray-900 mb-2">📸 Image Tips</h6>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use a high-quality image (minimum 400x400 pixels)</li>
                <li>• Show your workspace, products, or business logo</li>
                <li>• Ensure good lighting and clear focus</li>
                <li>• Keep file size under 5MB for faster loading</li>
                <li>• Square or landscape images work best</li>
              </ul>
            </div>
            
            {/* Image warning if no image */}
            {!overview.businessImagePreview && (
              <div className="flex items-center p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <svg className="w-5 h-5 text-primary mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm text-primary-800">
                  <strong>Image Recommended:</strong> Adding a business image helps customers recognize your brand and builds trust.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Business Description */}
      <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">📖 About Your Business</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tell customers about your business</label>
          <textarea
            value={overview.description}
            onChange={(e) => setOverview({ ...overview, description: e.target.value })}
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="Describe your business, what makes you unique, and why customers should choose your products..."
          />
          <p className="text-xs text-gray-500 mt-1">This helps customers understand what you offer and why they should choose you</p>
        </div>
      </div>

      {/* Product Categories */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">🏷️ Types of Products You Make</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Select the types of products you create:</label>
          <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="space-y-4">
              {getGroupedSubcategories().map((categoryGroup) => (
                <div key={categoryGroup.categoryKey} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-lg">{categoryGroup.categoryIcon}</span>
                    <h4 className="font-semibold text-gray-800 text-sm">{categoryGroup.categoryName}</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-2 ml-6">
                    {categoryGroup.subcategories.map((subcategory) => (
                      <label key={subcategory.key} className="flex items-center space-x-3 cursor-pointer hover:bg-white hover:shadow-sm rounded-lg p-2 transition-colors">
                        <input
                          type="checkbox"
                          checked={overview.category.includes(subcategory.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOverview({
                                ...overview,
                                category: [...overview.category, subcategory.key]
                              });
                            } else {
                              setOverview({
                                ...overview,
                                category: overview.category.filter(cat => cat !== subcategory.key)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm">
                          <span className="text-base">{subcategory.icon}</span>
                          <span className="font-medium ml-1">{subcategory.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            💡 Select all categories that apply to your products. This helps customers find your offerings.
          </p>
        </div>
      </div>

      {/* Business Address */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">📍 Business Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              value={overview.address.street}
              onChange={(e) => setOverview({ 
                ...overview, 
                address: { ...overview.address, street: e.target.value } 
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="123 Main Street"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={overview.address.city}
              onChange={(e) => setOverview({ 
                ...overview, 
                address: { ...overview.address, city: e.target.value } 
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="Toronto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province/State</label>
            <input
              type="text"
              value={overview.address.state}
              onChange={(e) => setOverview({ 
                ...overview, 
                address: { ...overview.address, state: e.target.value } 
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="Ontario"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
            <input
              type="text"
              value={overview.address.zipCode}
              onChange={(e) => setOverview({ 
                ...overview, 
                address: { ...overview.address, zipCode: e.target.value } 
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="M5V 3A8"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          📍 Your business address helps customers find you and understand your location.
        </p>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">📞 Contact Information</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Phone</label>
            <input
              type="tel"
              value={overview.contactInfo.phone}
              onChange={handlePhoneChange}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                overview.contactInfo.phone && overview.contactInfo.phone.replace(/\D/g, '').length !== 10 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300'
              }`}
              placeholder="(555) 123-4567"
              maxLength="14"
            />
            {overview.contactInfo.phone && overview.contactInfo.phone.replace(/\D/g, '').length !== 10 && (
              <p className="text-xs text-red-500 mt-1">Please enter a complete 10-digit phone number</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Format: (XXX) XXX-XXXX</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Email</label>
            <input
              type="email"
              value={overview.contactInfo.email}
              onChange={handleEmailChange}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                overview.contactInfo.email && !validateEmail(overview.contactInfo.email)
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300'
              }`}
              placeholder="hello@yourartisan.com"
            />
            {overview.contactInfo.email && !validateEmail(overview.contactInfo.email) && (
              <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Format: name@domain.com</p>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">Website</label>
          <input
            type="url"
            value={overview.contactInfo.website}
            onChange={handleWebsiteChange}
            className={`mt-1 block w-full rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
              overview.contactInfo.website && !validateWebsite(overview.contactInfo.website)
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : 'border-gray-300'
            }`}
            placeholder="your-website.com"
          />
          {overview.contactInfo.website && !validateWebsite(overview.contactInfo.website) && (
            <p className="text-xs text-red-500 mt-1">Please enter a valid website URL</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Format: your-website.com (https:// will be added automatically)</p>
        </div>

        {/* Social Media */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Social Media (Optional)</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Instagram</label>
              <input
                type="text"
                value={overview.contactInfo.socialMedia.instagram}
                onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="yourhandle"
              />
              <p className="text-xs text-gray-500 mt-1">@ will be added automatically</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Facebook</label>
              <input
                type="text"
                value={overview.contactInfo.socialMedia.facebook}
                onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="Your Page Name"
              />
              <p className="text-xs text-gray-500 mt-1">Your Facebook page name</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Twitter/X</label>
              <input
                type="text"
                value={overview.contactInfo.socialMedia.twitter}
                onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="yourhandle"
              />
              <p className="text-xs text-gray-500 mt-1">@ will be added automatically</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isSaving ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </div>
          ) : (
            'Save Overview'
          )}
        </button>
      </div>
    </form>
  );
}

export function OperationsTab({ profile, onSave, isSaving }) {
  const [operations, setOperations] = useState({
    productionMethods: profile.operationDetails?.productionMethods || '',
    certifications: profile.operationDetails?.certifications || [],
    yearsInBusiness: profile.operationDetails?.yearsInBusiness || '',
    productionCapacity: profile.operationDetails?.productionCapacity || '',
    qualityStandards: profile.operationDetails?.qualityStandards || '',
    ingredients: profile.operationDetails?.ingredients || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(operations);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">🛠️ Your Creative Process & Operations</h3>
        <p className="text-gray-600">Share your unique approach to creating products and managing your craft</p>
      </div>
      
      {/* Production & Quality */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">🏭 Production & Quality</h4>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Production Methods</label>
            <textarea
              value={operations.productionMethods}
              onChange={(e) => setOperations({ ...operations, productionMethods: e.target.value })}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="How do you make your products? What methods, techniques, or processes do you use?"
            />
            <p className="text-xs text-gray-500 mt-1">This helps customers understand how your products are made</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ingredients & Materials</label>
            <textarea
              value={operations.ingredients}
              onChange={(e) => setOperations({ ...operations, ingredients: e.target.value })}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="What ingredients or materials do you use? Do you source locally, use organic ingredients, or have special suppliers?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quality Standards</label>
            <textarea
              value={operations.qualityStandards}
              onChange={(e) => setOperations({ ...operations, qualityStandards: e.target.value })}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="How do you ensure quality? What standards do you follow?"
            />
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">🏆 Certifications</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Certifications & Training</label>
          <input
            type="text"
            value={operations.certifications.join(', ')}
            onChange={(e) => setOperations({ ...operations, certifications: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="e.g., Food Safety, Organic, Local Workshops"
          />
          <p className="text-sm text-gray-500 mt-2">
            💡 Separate multiple certifications with commas. This builds customer trust.
          </p>
        </div>
      </div>



      {/* Experience */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">📈 Experience</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
            <input
              type="number"
              value={operations.yearsInBusiness || 0}
              onChange={(e) => setOperations({ ...operations, yearsInBusiness: parseInt(e.target.value) || 0 })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              min="0"
              placeholder="e.g., 3"
            />
            <p className="text-xs text-gray-500 mt-1">How long have you been practicing your craft?</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Typical Production</label>
            <input
              type="text"
              value={operations.productionCapacity}
              onChange={(e) => setOperations({ ...operations, productionCapacity: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="e.g., 20 items per week, 5 batches per month"
            />
            <p className="text-xs text-gray-500 mt-1">What's your typical production volume?</p>
          </div>
        </div>
      </div>


      
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isSaving ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </div>
          ) : (
            'Save Operations'
          )}
        </button>
      </div>
    </form>
  );
}

export function HoursTab({ profile, onSave, isSaving }) {
  const [hours, setHours] = useState({
    monday: profile.artisanHours?.monday || { open: '09:00', close: '17:00', closed: false },
    tuesday: profile.artisanHours?.tuesday || { open: '09:00', close: '17:00', closed: false },
    wednesday: profile.artisanHours?.wednesday || { open: '09:00', close: '17:00', closed: false },
    thursday: profile.artisanHours?.thursday || { open: '09:00', close: '17:00', closed: false },
    friday: profile.artisanHours?.friday || { open: '09:00', close: '17:00', closed: false },
    saturday: profile.artisanHours?.saturday || { open: '09:00', close: '17:00', closed: false },
    sunday: profile.artisanHours?.sunday || { open: '09:00', close: '17:00', closed: true }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave({ artisanHours: hours });
  };

  const days = [
    { key: 'monday', name: 'Monday' },
    { key: 'tuesday', name: 'Tuesday' },
    { key: 'wednesday', name: 'Wednesday' },
    { key: 'thursday', name: 'Thursday' },
    { key: 'friday', name: 'Friday' },
    { key: 'saturday', name: 'Saturday' },
    { key: 'sunday', name: 'Sunday' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">🕒 Your Availability & Hours</h3>
        <p className="text-gray-600">Set your availability for orders and customer inquiries</p>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">📅 Weekly Schedule</h4>
        
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.key} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700">{day.name}</label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={!hours[day.key].closed}
                  onChange={(e) => setHours({
                    ...hours,
                    [day.key]: { ...hours[day.key], closed: !e.target.checked }
                  })}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-600 font-medium">Available</span>
              </div>
              
              {!hours[day.key].closed && (
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={hours[day.key].open}
                    onChange={(e) => setHours({
                      ...hours,
                      [day.key]: { ...hours[day.key], open: e.target.value }
                    })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-gray-500 font-medium">to</span>
                  <input
                    type="time"
                    value={hours[day.key].close}
                    onChange={(e) => setHours({
                      ...hours,
                      [day.key]: { ...hours[day.key], close: e.target.value }
                    })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        
        <p className="text-sm text-gray-500 mt-4">
          💡 Set your availability so customers know when they can reach you and when you'll be processing orders.
        </p>
      </div>
      
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isSaving ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </div>
          ) : (
            'Save Hours'
          )}
        </button>
      </div>
    </form>
  );
}

export function DeliveryTab({ profile, onSave, isSaving }) {
  // CSS styles for enhanced UI
  const sliderStyles = `
    .slider::-webkit-slider-thumb {
      appearance: none;
      height: 20px;
      width: 20px;
      border-radius: 50%;
      background: #f97316;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .slider::-moz-range-thumb {
      height: 20px;
      width: 20px;
      border-radius: 50%;
      background: #f97316;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
  `;

  // Function to get nearby cities based on business address
  const getNearbyCities = (businessAddress) => {
    if (!businessAddress?.city || !businessAddress?.state) {
      return [];
    }

    const city = businessAddress.city.toLowerCase();
    const state = businessAddress.state.toLowerCase();

    // Ontario cities database with distances (simplified)
    const ontarioCities = {
      'toronto': [
        'Mississauga', 'Brampton', 'Vaughan', 'Markham', 'Richmond Hill', 
        'Oakville', 'Burlington', 'Ajax', 'Pickering', 'Whitby', 'Oshawa',
        'Scarborough', 'North York', 'Etobicoke', 'York', 'East York'
      ],
      'mississauga': [
        'Toronto', 'Brampton', 'Oakville', 'Burlington', 'Vaughan', 
        'Milton', 'Caledon', 'Georgetown', 'Acton'
      ],
      'brampton': [
        'Mississauga', 'Toronto', 'Vaughan', 'Caledon', 'Milton', 
        'Georgetown', 'Acton', 'Bolton', 'Caledon East'
      ],
      'vaughan': [
        'Toronto', 'Brampton', 'Richmond Hill', 'Markham', 'Thornhill',
        'Maple', 'Woodbridge', 'Kleinburg', 'Concord'
      ],
      'markham': [
        'Toronto', 'Richmond Hill', 'Vaughan', 'Thornhill', 'Unionville',
        'Stouffville', 'Uxbridge', 'Newmarket', 'Aurora'
      ],
      'richmond hill': [
        'Toronto', 'Markham', 'Vaughan', 'Thornhill', 'Aurora', 
        'Newmarket', 'King City', 'Maple', 'Concord'
      ],
      'oakville': [
        'Mississauga', 'Burlington', 'Milton', 'Georgetown', 'Acton',
        'Toronto', 'Hamilton', 'Stoney Creek'
      ],
      'burlington': [
        'Oakville', 'Hamilton', 'Milton', 'Stoney Creek', 'Waterdown',
        'Mississauga', 'Georgetown', 'Acton'
      ],
      'hamilton': [
        'Burlington', 'Stoney Creek', 'Waterdown', 'Ancaster', 'Dundas',
        'Oakville', 'Grimsby', 'St. Catharines'
      ],
      'kitchener': [
        'Waterloo', 'Cambridge', 'Guelph', 'Elmira', 'St. Jacobs',
        'New Hamburg', 'Baden', 'Ayr'
      ],
      'waterloo': [
        'Kitchener', 'Cambridge', 'Guelph', 'Elmira', 'St. Jacobs',
        'New Hamburg', 'Baden', 'Ayr'
      ],
      'cambridge': [
        'Kitchener', 'Waterloo', 'Guelph', 'Brantford', 'Paris',
        'Ayr', 'Preston', 'Hespeler'
      ],
      'guelph': [
        'Kitchener', 'Waterloo', 'Cambridge', 'Milton', 'Georgetown',
        'Acton', 'Rockwood', 'Fergus', 'Elora'
      ],
      'london': [
        'St. Thomas', 'Strathroy', 'Woodstock', 'Ingersoll', 'Tillsonburg',
        'Aylmer', 'St. Marys', 'Lucan'
      ],
      'windsor': [
        'Tecumseh', 'Lakeshore', 'LaSalle', 'Amherstburg', 'Kingsville',
        'Leamington', 'Essex', 'Belle River'
      ],
      'ottawa': [
        'Gatineau', 'Kanata', 'Nepean', 'Orleans', 'Barrhaven',
        'Stittsville', 'Carp', 'Manotick', 'Greely'
      ]
    };

    // Find matching cities based on business city
    const nearbyCities = ontarioCities[city] || [];
    
    // If no exact match, try partial matches
    if (nearbyCities.length === 0) {
      for (const [key, cities] of Object.entries(ontarioCities)) {
        if (key.includes(city) || city.includes(key)) {
          return cities.slice(0, 8); // Return first 8 cities
        }
      }
    }

    return nearbyCities.slice(0, 8); // Return first 8 cities
  };

  // Helper function to format schedule for display
  const formatScheduleForDisplay = (schedule) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    let formatted = [];
    let currentGroup = [];
    let currentTimes = null;
    
    days.forEach((day, index) => {
      const daySchedule = schedule[day];
      if (daySchedule?.enabled) {
        const times = `${daySchedule.open}-${daySchedule.close}`;
        if (times === currentTimes) {
          currentGroup.push(dayNames[index]);
        } else {
          if (currentGroup.length > 0) {
            formatted.push(`${currentGroup[0]}-${currentGroup[currentGroup.length - 1]} ${currentTimes}`);
          }
          currentGroup = [dayNames[index]];
          currentTimes = times;
        }
      } else {
        if (currentGroup.length > 0) {
          formatted.push(`${currentGroup[0]}-${currentGroup[currentGroup.length - 1]} ${currentTimes}`);
          currentGroup = [];
          currentTimes = null;
        }
      }
    });
    
    if (currentGroup.length > 0) {
      formatted.push(`${currentGroup[0]}-${currentGroup[currentGroup.length - 1]} ${currentTimes}`);
    }
    
    return formatted.join(', ') || 'No pickup hours set';
  };

  const [delivery, setDelivery] = useState({
    pickup: {
      enabled: profile.deliveryOptions?.pickup !== false,
      location: profile.pickupLocation || '',
      instructions: profile.pickupInstructions || '',
      hours: profile.pickupHours || '',
      useBusinessAddress: profile.pickupUseBusinessAddress !== false, // Default to true if not set
      address: {
        street: profile.pickupAddress?.street || '',
        city: profile.pickupAddress?.city || '',
        state: profile.pickupAddress?.state || '',
        zipCode: profile.pickupAddress?.zipCode || ''
      },
      schedule: profile.pickupSchedule || {
        monday: { enabled: false, open: '09:00', close: '17:00' },
        tuesday: { enabled: false, open: '09:00', close: '17:00' },
        wednesday: { enabled: false, open: '09:00', close: '17:00' },
        thursday: { enabled: false, open: '09:00', close: '17:00' },
        friday: { enabled: false, open: '09:00', close: '17:00' },
        saturday: { enabled: false, open: '10:00', close: '16:00' },
        sunday: { enabled: false, open: '10:00', close: '16:00' }
      }
    },
    personalDelivery: {
      enabled: profile.deliveryOptions?.delivery || false,
      radius: profile.deliveryOptions?.deliveryRadius || 10,
      fee: profile.deliveryOptions?.deliveryFee || 5,
      freeThreshold: profile.deliveryOptions?.freeDeliveryThreshold || 50,
      timeSlots: profile.deliveryTimeSlots || [],
      instructions: profile.deliveryInstructions || ''
    },
    professionalDelivery: {
      enabled: profile.professionalDelivery?.enabled || false,
      uberDirectEnabled: profile.professionalDelivery?.uberDirectEnabled || false,
      serviceRadius: profile.professionalDelivery?.serviceRadius || 25,
      regions: profile.professionalDelivery?.regions || [],
      packaging: profile.professionalDelivery?.packaging || '',
      restrictions: profile.professionalDelivery?.restrictions || ''
    }
  });

  // Update state when profile changes (e.g., when navigating to this tab)
  React.useEffect(() => {
    if (profile) {
      console.log('🔄 DeliveryTab: Profile updated, refreshing delivery state');
      console.log('🔄 Profile pickupSchedule:', profile.pickupSchedule);
      console.log('🔄 Profile deliveryOptions:', profile.deliveryOptions);
      
      setDelivery({
        pickup: {
          enabled: profile.deliveryOptions?.pickup !== false,
          location: profile.pickupLocation || '',
          instructions: profile.pickupInstructions || '',
          hours: profile.pickupHours || '',
          useBusinessAddress: profile.pickupUseBusinessAddress !== false,
          address: {
            street: profile.pickupAddress?.street || '',
            city: profile.pickupAddress?.city || '',
            state: profile.pickupAddress?.state || '',
            zipCode: profile.pickupAddress?.zipCode || ''
          },
          schedule: profile.pickupSchedule || {
            monday: { enabled: false, open: '09:00', close: '17:00' },
            tuesday: { enabled: false, open: '09:00', close: '17:00' },
            wednesday: { enabled: false, open: '09:00', close: '17:00' },
            thursday: { enabled: false, open: '09:00', close: '17:00' },
            friday: { enabled: false, open: '09:00', close: '17:00' },
            saturday: { enabled: false, open: '10:00', close: '16:00' },
            sunday: { enabled: false, open: '10:00', close: '16:00' }
          }
        },
        personalDelivery: {
          enabled: profile.deliveryOptions?.delivery || false,
          radius: profile.deliveryOptions?.deliveryRadius || 10,
          fee: profile.deliveryOptions?.deliveryFee || 5,
          freeThreshold: profile.deliveryOptions?.freeDeliveryThreshold || 50,
          timeSlots: profile.deliveryTimeSlots || [],
          instructions: profile.deliveryInstructions || ''
        },
        professionalDelivery: {
          enabled: profile.professionalDelivery?.enabled || false,
          uberDirectEnabled: profile.professionalDelivery?.uberDirectEnabled || false,
          serviceRadius: profile.professionalDelivery?.serviceRadius || 25,
          regions: profile.professionalDelivery?.regions || [],
          packaging: profile.professionalDelivery?.packaging || '',
          restrictions: profile.professionalDelivery?.restrictions || ''
        }
      });
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Transform the new delivery structure to match the expected backend format
    const deliveryOptions = {
      // Pickup options
      pickup: delivery.pickup.enabled,
      pickupUseBusinessAddress: delivery.pickup.useBusinessAddress,
      pickupLocation: delivery.pickup.useBusinessAddress 
        ? `${profile.address?.street || ''}, ${profile.address?.city || ''}, ${profile.address?.state || ''} ${profile.address?.zipCode || ''}`
        : `${delivery.pickup.address.street}, ${delivery.pickup.address.city}, ${delivery.pickup.address.state} ${delivery.pickup.address.zipCode}`,
      pickupInstructions: delivery.pickup.instructions,
      pickupHours: formatScheduleForDisplay(delivery.pickup.schedule),
      pickupAddress: delivery.pickup.useBusinessAddress ? profile.address : delivery.pickup.address,
      pickupSchedule: delivery.pickup.schedule,
      
      // Personal delivery options (mapped from old 'delivery' field)
      delivery: delivery.personalDelivery.enabled,
      deliveryRadius: delivery.personalDelivery.radius,
      deliveryFee: delivery.personalDelivery.fee,
      freeDeliveryThreshold: delivery.personalDelivery.freeThreshold,
      deliveryInstructions: delivery.personalDelivery.instructions,
      
      // Professional delivery options
      professionalDelivery: {
        enabled: delivery.professionalDelivery.enabled,
        uberDirectEnabled: delivery.professionalDelivery.uberDirectEnabled,
        serviceRadius: delivery.professionalDelivery.serviceRadius,
        regions: delivery.professionalDelivery.regions,
        packaging: delivery.professionalDelivery.packaging,
        restrictions: delivery.professionalDelivery.restrictions
      }
    };
    
    console.log('🔄 Saving delivery options:', deliveryOptions);
    console.log('🔄 Delivery structure:', {
      pickup: delivery.pickup,
      personalDelivery: delivery.personalDelivery,
      professionalDelivery: delivery.professionalDelivery
    });
    await onSave(deliveryOptions);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <style dangerouslySetInnerHTML={{ __html: sliderStyles }} />
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">🚚 Delivery Options</h3>
        <p className="text-gray-600">Configure how customers can receive your products. You can offer multiple delivery methods to reach more customers.</p>
        
        {/* Quick Guide */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Delivery Options Guide</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <span className="font-medium">🏪 Pickup:</span> Customers collect from your location
            </div>
            <div>
              <span className="font-medium">🚚 Personal Delivery:</span> You deliver within your area
            </div>
            <div>
              <span className="font-medium">🚛 Professional Delivery:</span> Uber Direct for wider reach
            </div>
          </div>
        </div>
      </div>
      
      {/* Pickup Section */}
      <div className="border border-gray-200 rounded-lg p-6 hover:border-orange-300 transition-colors">
        <div className="flex items-start space-x-4 mb-4">
          <input
            type="checkbox"
            checked={delivery.pickup.enabled}
            onChange={(e) => setDelivery({ 
              ...delivery, 
              pickup: { ...delivery.pickup, enabled: e.target.checked } 
            })}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-1"
          />
          <div className="flex-1">
            <label className="block text-lg font-semibold text-gray-900">🏪 Pickup Available</label>
            <p className="text-sm text-gray-600 mb-2">Customers collect orders directly from your location</p>
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              💡 <strong>Recommended:</strong> Most artisans start with pickup as it's simple and cost-effective
            </div>
          </div>
        </div>
        
        {delivery.pickup.enabled && (
          <div className="space-y-6 ml-8 p-4 bg-orange-50 rounded-lg border border-orange-200">
            {/* Address Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                📍 Pickup Address <span className="text-red-500">*</span>
              </label>
              
              {/* Address Type Selection */}
              <div className="mb-4">
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="pickupAddressType"
                      value="business"
                      checked={delivery.pickup.useBusinessAddress}
                      onChange={(e) => setDelivery({
                        ...delivery,
                        pickup: {
                          ...delivery.pickup,
                          useBusinessAddress: true,
                          address: profile.address || { street: '', city: '', state: '', zipCode: '' }
                        }
                      })}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Use Business Address</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="pickupAddressType"
                      value="custom"
                      checked={!delivery.pickup.useBusinessAddress}
                      onChange={(e) => setDelivery({
                        ...delivery,
                        pickup: {
                          ...delivery.pickup,
                          useBusinessAddress: false,
                          address: { street: '', city: '', state: '', zipCode: '' }
                        }
                      })}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Use Different Address</span>
                  </label>
                </div>
              </div>

              {/* Business Address Display */}
              {delivery.pickup.useBusinessAddress && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm font-medium text-green-800 mb-1">🏢 Using Business Address:</div>
                  <div className="text-sm text-green-700">
                    {profile.address?.street && profile.address?.city ? (
                      `${profile.address.street}, ${profile.address.city}, ${profile.address.state} ${profile.address.zipCode}`
                    ) : (
                      <span className="text-orange-600">Please set your business address in the Business Overview tab first</span>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Address Input */}
              {!delivery.pickup.useBusinessAddress && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={delivery.pickup.address?.street || ''}
                    onChange={(e) => setDelivery({ 
                      ...delivery, 
                      pickup: { 
                        ...delivery.pickup, 
                        address: { ...delivery.pickup.address, street: e.target.value }
                      } 
                    })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    placeholder="Street address (e.g., 123 Main Street)"
                    required
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={delivery.pickup.address?.city || ''}
                      onChange={(e) => setDelivery({ 
                        ...delivery, 
                        pickup: { 
                          ...delivery.pickup, 
                          address: { ...delivery.pickup.address, city: e.target.value }
                        } 
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                      placeholder="City"
                      required
                    />
                    <input
                      type="text"
                      value={delivery.pickup.address?.state || ''}
                      onChange={(e) => setDelivery({ 
                        ...delivery, 
                        pickup: { 
                          ...delivery.pickup, 
                          address: { ...delivery.pickup.address, state: e.target.value }
                        } 
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                      placeholder="Province/State"
                      required
                    />
                    <input
                      type="text"
                      value={delivery.pickup.address?.zipCode || ''}
                      onChange={(e) => setDelivery({ 
                        ...delivery, 
                        pickup: { 
                          ...delivery.pickup, 
                          address: { ...delivery.pickup.address, zipCode: e.target.value }
                        } 
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                      placeholder="Postal Code"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">Complete address for geolocation and customer directions</p>
                </div>
              )}
            </div>
            
            {/* Schedule Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                🕒 Pickup Schedule <span className="text-red-500">*</span>
              </label>
              
              {/* Debug info */}
              {console.log('🔄 Rendering pickup schedule with data:', delivery.pickup.schedule)}
              
              <div className="space-y-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <div key={day} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="w-20">
                      <span className="text-sm font-medium text-gray-700">{day}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={delivery.pickup.schedule?.[day.toLowerCase()]?.enabled || false}
                        onChange={(e) => setDelivery({
                          ...delivery,
                          pickup: {
                            ...delivery.pickup,
                            schedule: {
                              ...delivery.pickup.schedule,
                              [day.toLowerCase()]: {
                                ...delivery.pickup.schedule?.[day.toLowerCase()],
                                enabled: e.target.checked
                              }
                            }
                          }
                        })}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-600">Open</span>
                    </div>
                    {delivery.pickup.schedule?.[day.toLowerCase()]?.enabled && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={delivery.pickup.schedule?.[day.toLowerCase()]?.open || '09:00'}
                          onChange={(e) => setDelivery({
                            ...delivery,
                            pickup: {
                              ...delivery.pickup,
                              schedule: {
                                ...delivery.pickup.schedule,
                                [day.toLowerCase()]: {
                                  ...delivery.pickup.schedule?.[day.toLowerCase()],
                                  open: e.target.value
                                }
                              }
                            }
                          })}
                          className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={delivery.pickup.schedule?.[day.toLowerCase()]?.close || '17:00'}
                          onChange={(e) => setDelivery({
                            ...delivery,
                            pickup: {
                              ...delivery.pickup,
                              schedule: {
                                ...delivery.pickup.schedule,
                                [day.toLowerCase()]: {
                                  ...delivery.pickup.schedule?.[day.toLowerCase()],
                                  close: e.target.value
                                }
                              }
                            }
                          })}
                          className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Set your pickup availability for each day of the week</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📋 Pickup Instructions
              </label>
              <textarea
                value={delivery.pickup.instructions}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  pickup: { ...delivery.pickup, instructions: e.target.value } 
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="e.g., Ring doorbell #3, call 15 minutes before arrival, bring ID for pickup..."
              />
              <p className="text-xs text-gray-500 mt-1">Any special instructions for customers (optional)</p>
            </div>
          </div>
        )}
      </div>

      {/* Personal Delivery Section */}
      <div className="border border-gray-200 rounded-lg p-6 hover:border-orange-300 transition-colors">
        <div className="flex items-start space-x-4 mb-4">
          <input
            type="checkbox"
            checked={delivery.personalDelivery.enabled}
            onChange={(e) => setDelivery({ 
              ...delivery, 
              personalDelivery: { ...delivery.personalDelivery, enabled: e.target.checked } 
            })}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-1"
          />
          <div className="flex-1">
            <label className="block text-lg font-semibold text-gray-900">🚚 Personal Delivery</label>
            <p className="text-sm text-gray-600 mb-2">You personally deliver orders to customers within your area</p>
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              💡 <strong>Great for:</strong> Building relationships with customers and ensuring product quality during delivery
            </div>
            {!delivery.personalDelivery.enabled && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ <strong>Currently disabled:</strong> Enable this option to offer personal delivery to your customers
                </p>
              </div>
            )}
          </div>
        </div>
        
        {delivery.personalDelivery.enabled && (
          <div className="space-y-6 ml-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📏 Delivery Radius <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={delivery.personalDelivery.radius || 10}
                    onChange={(e) => setDelivery({ 
                      ...delivery, 
                      personalDelivery: { ...delivery.personalDelivery, radius: parseInt(e.target.value) || 10 } 
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    required
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 km</span>
                    <span className="font-medium text-orange-600">{delivery.personalDelivery.radius} km</span>
                    <span>50 km</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {delivery.personalDelivery.radius <= 5 && "🟢 Short distance - easy to manage"}
                  {delivery.personalDelivery.radius > 5 && delivery.personalDelivery.radius <= 15 && "🟡 Medium distance - consider fuel costs"}
                  {delivery.personalDelivery.radius > 15 && "🔴 Long distance - may impact delivery time"}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  💰 Delivery Fee <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    value={delivery.personalDelivery.fee || 0}
                    onChange={(e) => setDelivery({ 
                      ...delivery, 
                      personalDelivery: { ...delivery.personalDelivery, fee: parseFloat(e.target.value) || 0 } 
                    })}
                    className="mt-1 block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    min="0"
                    step="0.50"
                    required
                  />
                </div>
                <div className="mt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setDelivery({ 
                      ...delivery, 
                      personalDelivery: { ...delivery.personalDelivery, fee: 0 } 
                    })}
                    className={`px-3 py-1 text-xs rounded-full ${
                      delivery.personalDelivery.fee === 0 
                        ? 'bg-green-100 text-green-800 border border-green-300' 
                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelivery({ 
                      ...delivery, 
                      personalDelivery: { ...delivery.personalDelivery, fee: 5 } 
                    })}
                    className={`px-3 py-1 text-xs rounded-full ${
                      delivery.personalDelivery.fee === 5 
                        ? 'bg-orange-100 text-orange-800 border border-orange-300' 
                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    $5
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelivery({ 
                      ...delivery, 
                      personalDelivery: { ...delivery.personalDelivery, fee: 10 } 
                    })}
                    className={`px-3 py-1 text-xs rounded-full ${
                      delivery.personalDelivery.fee === 10 
                        ? 'bg-orange-100 text-orange-800 border border-orange-300' 
                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    $10
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {delivery.personalDelivery.fee === 0 && "🟢 Free delivery - great for customer attraction"}
                  {delivery.personalDelivery.fee > 0 && delivery.personalDelivery.fee <= 5 && "🟡 Low fee - competitive pricing"}
                  {delivery.personalDelivery.fee > 5 && "🔴 Higher fee - ensure value for customers"}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🎯 Free Delivery Threshold
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    value={delivery.personalDelivery.freeThreshold || 0}
                    onChange={(e) => setDelivery({ 
                      ...delivery, 
                      personalDelivery: { ...delivery.personalDelivery, freeThreshold: parseFloat(e.target.value) || 0 } 
                    })}
                    className="mt-1 block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    min="0"
                    step="5"
                  />
                </div>
                <div className="mt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setDelivery({ 
                      ...delivery, 
                      personalDelivery: { ...delivery.personalDelivery, freeThreshold: 0 } 
                    })}
                    className={`px-3 py-1 text-xs rounded-full ${
                      delivery.personalDelivery.freeThreshold === 0 
                        ? 'bg-red-100 text-red-800 border border-red-300' 
                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    No Free
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelivery({ 
                      ...delivery, 
                      personalDelivery: { ...delivery.personalDelivery, freeThreshold: 25 } 
                    })}
                    className={`px-3 py-1 text-xs rounded-full ${
                      delivery.personalDelivery.freeThreshold === 25 
                        ? 'bg-green-100 text-green-800 border border-green-300' 
                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    $25
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelivery({ 
                      ...delivery, 
                      personalDelivery: { ...delivery.personalDelivery, freeThreshold: 50 } 
                    })}
                    className={`px-3 py-1 text-xs rounded-full ${
                      delivery.personalDelivery.freeThreshold === 50 
                        ? 'bg-green-100 text-green-800 border border-green-300' 
                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    $50
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {delivery.personalDelivery.freeThreshold > 0 && `Orders over $${delivery.personalDelivery.freeThreshold} get free delivery`}
                  {delivery.personalDelivery.freeThreshold === 0 && "No free delivery threshold set"}
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📋 Personal Delivery Instructions
              </label>
              <textarea
                value={delivery.personalDelivery.instructions}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  personalDelivery: { ...delivery.personalDelivery, instructions: e.target.value } 
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="e.g., Call 30 minutes before arrival, prefer cash payment, need gate code for access, delivery time windows..."
              />
              <p className="text-xs text-gray-500 mt-1">Special instructions for personal delivery (optional)</p>
            </div>
          </div>
        )}
      </div>

      {/* Professional Delivery Section */}
      <div className="border border-gray-200 rounded-lg p-6 hover:border-orange-300 transition-colors">
        <div className="flex items-start space-x-4 mb-4">
          <input
            type="checkbox"
            checked={delivery.professionalDelivery.enabled}
            onChange={(e) => setDelivery({ 
              ...delivery, 
              professionalDelivery: { ...delivery.professionalDelivery, enabled: e.target.checked } 
            })}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-1"
          />
          <div className="flex-1">
            <label className="block text-lg font-semibold text-gray-900">🚛 Professional Delivery</label>
            <p className="text-sm text-gray-600 mb-2">Professional delivery services for customers outside your personal delivery radius</p>
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              💡 <strong>Perfect for:</strong> Reaching customers in wider areas and offering premium delivery service
            </div>
          </div>
        </div>
        
        {delivery.professionalDelivery.enabled && (
          <div className="space-y-6 ml-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">🚛 Uber Direct Integration</label>
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  checked={delivery.professionalDelivery.uberDirectEnabled}
                  onChange={(e) => setDelivery({ 
                    ...delivery, 
                    professionalDelivery: { 
                      ...delivery.professionalDelivery, 
                      uberDirectEnabled: e.target.checked 
                    } 
                  })}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-1"
                />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Enable Uber Direct</label>
                  <p className="text-sm text-gray-600 mb-2">Allow customers to use Uber Direct for professional delivery</p>
                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                    💡 <strong>Benefits:</strong> Wider reach, professional service, automated delivery tracking
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🌍 Service Regions <span className="text-red-500">*</span>
              </label>
              
              {/* Business Address Display */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-1">📍 Your Business Address:</div>
                <div className="text-sm text-gray-600">
                  {profile.address?.street && profile.address?.city ? (
                    `${profile.address.street}, ${profile.address.city}, ${profile.address.state} ${profile.address.zipCode}`
                  ) : (
                    <span className="text-orange-600">Please set your business address in the Business Overview tab first</span>
                  )}
                </div>
              </div>
              
              {/* Service Radius */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📏 Professional Delivery Radius (km)
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={delivery.professionalDelivery.serviceRadius || 25}
                    onChange={(e) => setDelivery({ 
                      ...delivery, 
                      professionalDelivery: { 
                        ...delivery.professionalDelivery, 
                        serviceRadius: parseInt(e.target.value) || 25 
                      } 
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>5 km</span>
                    <span className="font-medium text-blue-600">{delivery.professionalDelivery.serviceRadius || 25} km</span>
                    <span>100 km</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Professional delivery will be available within this radius from your business address (set in Business Overview)
                </p>
              </div>
              
              {/* Manual Regions Input (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🎯 Specific Cities/Regions (Optional)
                </label>
                <input
                  type="text"
                  value={delivery.professionalDelivery.regions.join(', ')}
                  onChange={(e) => setDelivery({ 
                    ...delivery, 
                    professionalDelivery: { 
                      ...delivery.professionalDelivery, 
                      regions: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                    } 
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  placeholder="e.g., Downtown Toronto, North York, Scarborough (leave empty to use radius-based delivery)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Specify exact cities/regions if you prefer manual control over radius-based delivery
                </p>
                
                {/* Nearby Cities Suggestions */}
                {profile.address?.city && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-600 mb-2">
                      💡 Nearby cities to {profile.address.city}:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getNearbyCities(profile.address).map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            const currentRegions = delivery.professionalDelivery.regions;
                            const newRegions = currentRegions.includes(city) 
                              ? currentRegions.filter(r => r !== city)
                              : [...currentRegions, city];
                            setDelivery({
                              ...delivery,
                              professionalDelivery: {
                                ...delivery.professionalDelivery,
                                regions: newRegions
                              }
                            });
                          }}
                          className={`px-3 py-1 text-xs rounded-full border ${
                            delivery.professionalDelivery.regions.includes(city)
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📦 Packaging Requirements
              </label>
              <textarea
                value={delivery.professionalDelivery.packaging}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  professionalDelivery: { ...delivery.professionalDelivery, packaging: e.target.value } 
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="e.g., Insulated packaging for temperature-sensitive items, secure containers for fragile products, special handling instructions..."
              />
              <p className="text-xs text-gray-500 mt-1">Describe your packaging methods and any special requirements for professional delivery</p>
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⚠️ Delivery Restrictions
              </label>
              <textarea
                value={delivery.professionalDelivery.restrictions}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  professionalDelivery: { ...delivery.professionalDelivery, restrictions: e.target.value } 
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="e.g., No delivery on holidays, requires signature, must be delivered within 2 hours, no delivery to apartments without elevator..."
              />
              <p className="text-xs text-gray-500 mt-1">Any restrictions or special requirements for professional delivery</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isSaving ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </div>
          ) : (
            'Save Delivery Options'
          )}
        </button>
      </div>
    </form>
  );
}

export function SetupTab({ profile, onSave, isSaving, setActiveTab }) {
  const isArtisan = profile?.role === 'artisan' || profile?.role === 'producer' || profile?.role === 'food_maker';
  
  // Check completion status for each step
  const isPersonalComplete = profile?.firstName && profile?.lastName && profile?.phone;
  const isAddressComplete = isArtisan ? 
    (profile?.addresses && profile.addresses.length > 0) : 
    (profile?.addresses && profile.addresses.length > 0);
  const isPaymentComplete = profile?.paymentMethods && profile.paymentMethods.length > 0;
  
  // For patrons, only require personal info and delivery address
  // Payment methods are optional and can be added during checkout
  const completionSteps = isArtisan ? [
    { id: 'personal', name: 'Personal Information', completed: isPersonalComplete },
    { id: 'address', name: 'Business Operations', completed: isAddressComplete },
    { id: 'payment', name: 'Payment Methods', completed: isPaymentComplete }
  ] : [
    { id: 'personal', name: 'Personal Information', completed: isPersonalComplete },
    { id: 'address', name: 'Delivery Address', completed: isAddressComplete }
  ];
  
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile Setup</h3>
        <p className="text-gray-600">
          {isArtisan 
            ? "Welcome! Let's get your business profile set up and ready to go" 
            : "Welcome! Let's get your account set up so you can start shopping"
          }
        </p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-medium text-blue-900 mb-2">Welcome to BazaarMkt!</h4>
        <p className="text-blue-700 mb-4">
          {isArtisan 
            ? "Complete your profile setup to start selling your products. Please fill in the following sections:"
            : "Complete your profile setup to start shopping from local artisans. Please fill in the following sections:"
          }
        </p>
        
        <div className="space-y-3">
          {completionSteps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                step.completed 
                  ? 'bg-green-100' 
                  : 'bg-blue-100'
              }`}>
                {step.completed ? (
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-blue-600 text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <span className={`${step.completed ? 'text-green-900' : 'text-blue-900'}`}>
                {step.name}
                {step.completed && <span className="ml-2 text-green-600 text-sm">✓</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          onClick={() => setActiveTab('personal')}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Start Setup
        </button>
      </div>
      
      {/* Setup Progress Guide */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h5 className="font-medium text-gray-900 mb-3">Setup Progress Guide</h5>
        <div className="space-y-2 text-sm text-gray-600">
          <p className={isPersonalComplete ? 'text-green-700' : ''}>
            <strong>Step 1 - Personal Information:</strong> Complete your basic profile details
            {isPersonalComplete && <span className="ml-2 text-green-600">✓ Completed</span>}
          </p>
          <p className={isAddressComplete ? 'text-green-700' : ''}>
            <strong>Step 2 - {isArtisan ? "Business Operations" : "Delivery Address"}:</strong> 
            {isArtisan 
              ? " Set up your business hours, delivery options, and operational details" 
              : " Add your delivery address so artisans can deliver to you"
            }
            {isAddressComplete && <span className="ml-2 text-green-600">✓ Completed</span>}
          </p>
          <p className={isPaymentComplete ? 'text-green-700' : ''}>
            <strong>Step 3 - Payment Methods:</strong> Add your preferred payment method for secure transactions
            {isPaymentComplete && <span className="ml-2 text-green-600">✓ Completed</span>}
          </p>
        </div>
        
        {/* Overall completion status */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Overall Progress:</span>
            <span className="text-sm font-medium text-gray-900">
              {completionSteps.filter(step => step.completed).length} of {completionSteps.length} completed
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(completionSteps.filter(step => step.completed).length / completionSteps.length) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
