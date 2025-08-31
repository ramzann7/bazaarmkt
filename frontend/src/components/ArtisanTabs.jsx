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
    type: profile.type || '',
    description: profile.description || '',
    category: profile.category || [],
    specialties: profile.specialties || [],
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

  // Handle artisan name change with auto-capitalization
  const handleArtisanNameChange = (e) => {
    const capitalizedName = capitalizeWords(e.target.value);
    setOverview({ ...overview, artisanName: capitalizedName });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(overview);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Business Overview</h3>
        <p className="text-gray-600">Manage your business information and contact details</p>
      </div>
      
      {/* Artisan Name - Critical Element */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
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
            onChange={handleArtisanNameChange}
            className="block w-full rounded-lg border-2 border-amber-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-lg font-medium py-3 px-4"
            placeholder="e.g., Sarah's Sweet Creations, Artisan Bread Co."
            required
          />
          <p className="text-xs text-gray-500 mt-2">
            ✨ Auto-capitalized for consistency
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Business Type</label>
          <select
            value={overview.type}
            onChange={(e) => setOverview({ ...overview, type: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          >
            <option value="">Select type</option>
            {Object.entries(PRODUCT_CATEGORIES).map(([key, category]) => (
              <option key={key} value={key}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>
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

      {/* Product Categories */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">🏷️ Product Categories</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">What Do You Create?</label>
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

      <div>
        <label className="block text-sm font-medium text-gray-700">Business Address</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={overview.address.street}
            onChange={(e) => setOverview({ 
              ...overview, 
              address: { ...overview.address, street: e.target.value } 
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="Street Address"
          />
          <input
            type="text"
            value={overview.address.city}
            onChange={(e) => setOverview({ 
              ...overview, 
              address: { ...overview.address, city: e.target.value } 
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="City"
          />
          <input
            type="text"
            value={overview.address.state}
            onChange={(e) => setOverview({ 
              ...overview, 
              address: { ...overview.address, state: e.target.value } 
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="Province/State"
          />
          <input
            type="text"
            value={overview.address.zipCode}
            onChange={(e) => setOverview({ 
              ...overview, 
              address: { ...overview.address, zipCode: e.target.value } 
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="Postal Code"
          />
        </div>
      </div>

      {/* Business Description */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">📖 About Your Business</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
          <textarea
            value={overview.description}
            onChange={(e) => setOverview({ ...overview, description: e.target.value })}
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="Tell customers about your business, what makes you unique, and why they should choose your products..."
          />
          <p className="text-xs text-gray-500 mt-1">This helps customers understand what you offer and why they should choose you</p>
        </div>
      </div>

      {/* Specialties */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">⭐ Your Specialties</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">What You're Known For</label>
          <input
            type="text"
            value={overview.specialties.join(', ')}
            onChange={(e) => setOverview({ ...overview, specialties: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="e.g., Organic sourdough bread, Gluten-free pastries, Seasonal fruit preserves"
          />
          <p className="text-sm text-gray-500 mt-2">
            💡 Separate multiple specialties with commas. These help customers find your unique offerings.
          </p>
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
              value={operations.yearsInBusiness}
              onChange={(e) => setOperations({ ...operations, yearsInBusiness: parseInt(e.target.value) })}
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
  const [delivery, setDelivery] = useState({
    pickup: {
      enabled: profile.deliveryOptions?.pickup !== false,
      location: profile.pickupLocation || '',
      instructions: profile.pickupInstructions || '',
      hours: profile.pickupHours || ''
    },
    localDelivery: {
      enabled: profile.deliveryOptions?.delivery || false,
      radius: profile.deliveryOptions?.deliveryRadius || 10,
      fee: profile.deliveryOptions?.deliveryFee || 5,
      freeThreshold: profile.deliveryOptions?.freeDeliveryThreshold || 50,
      timeSlots: profile.deliveryTimeSlots || [],
      instructions: profile.deliveryInstructions || ''
    },
    shipping: {
      enabled: profile.shipping?.enabled || false,
      regions: profile.shipping?.regions || [],
      methods: profile.shipping?.methods || [],
      packaging: profile.shipping?.packaging || '',
      restrictions: profile.shipping?.restrictions || ''
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave({ deliveryOptions: delivery });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Delivery & Shipping Options</h3>
        <p className="text-gray-600">Configure your pickup, local delivery, and shipping services</p>
      </div>
      
      {/* Pickup Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <input
            type="checkbox"
            checked={delivery.pickup.enabled}
            onChange={(e) => setDelivery({ 
              ...delivery, 
              pickup: { ...delivery.pickup, enabled: e.target.checked } 
            })}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">Pickup Available</label>
            <p className="text-sm text-gray-600">Customers can pick up orders from your location</p>
          </div>
        </div>
        
        {delivery.pickup.enabled && (
          <div className="space-y-4 ml-8">
            <div>
              <label className="block text-sm font-medium text-gray-700">Pickup Location</label>
              <input
                type="text"
                value={delivery.pickup.location}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  pickup: { ...delivery.pickup, location: e.target.value } 
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="Enter pickup address or location details"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Pickup Hours</label>
              <input
                type="text"
                value={delivery.pickup.hours}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  pickup: { ...delivery.pickup, hours: e.target.value } 
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="e.g., Mon-Fri 9AM-6PM, Sat 10AM-4PM"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Pickup Instructions</label>
              <textarea
                value={delivery.pickup.instructions}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  pickup: { ...delivery.pickup, instructions: e.target.value } 
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="Any special instructions for customers picking up orders..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Local Delivery Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <input
            type="checkbox"
            checked={delivery.localDelivery.enabled}
            onChange={(e) => setDelivery({ 
              ...delivery, 
              localDelivery: { ...delivery.localDelivery, enabled: e.target.checked } 
            })}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">Local Delivery</label>
            <p className="text-sm text-gray-600">Deliver orders to customers in your area</p>
          </div>
        </div>
        
        {delivery.localDelivery.enabled && (
          <div className="space-y-4 ml-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Delivery Radius (km)</label>
                <input
                  type="number"
                  value={delivery.localDelivery.radius}
                  onChange={(e) => setDelivery({ 
                    ...delivery, 
                    localDelivery: { ...delivery.localDelivery, radius: parseInt(e.target.value) } 
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  min="1"
                  max="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Delivery Fee ($)</label>
                <input
                  type="number"
                  value={delivery.localDelivery.fee}
                  onChange={(e) => setDelivery({ 
                    ...delivery, 
                    localDelivery: { ...delivery.localDelivery, fee: parseFloat(e.target.value) } 
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  min="0"
                  step="0.50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Free Delivery Threshold ($)</label>
                <input
                  type="number"
                  value={delivery.localDelivery.freeThreshold}
                  onChange={(e) => setDelivery({ 
                    ...delivery, 
                    localDelivery: { ...delivery.localDelivery, freeThreshold: parseFloat(e.target.value) } 
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  min="0"
                  step="5"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Delivery Instructions</label>
              <textarea
                value={delivery.localDelivery.instructions}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  localDelivery: { ...delivery.localDelivery, instructions: e.target.value } 
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="Any special delivery instructions or requirements..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Shipping Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <input
            type="checkbox"
            checked={delivery.shipping.enabled}
            onChange={(e) => setDelivery({ 
              ...delivery, 
              shipping: { ...delivery.shipping, enabled: e.target.checked } 
            })}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">Shipping Available</label>
            <p className="text-sm text-gray-600">Ship orders to customers outside your local area</p>
          </div>
        </div>
        
        {delivery.shipping.enabled && (
          <div className="space-y-4 ml-8">
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipping Regions</label>
              <input
                type="text"
                value={delivery.shipping.regions.join(', ')}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  shipping: { 
                    ...delivery.shipping, 
                    regions: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                  } 
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="e.g., Ontario, Quebec, British Columbia"
              />
              <p className="mt-1 text-sm text-gray-500">Separate multiple regions with commas</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipping Methods</label>
              <div className="mt-2 space-y-2">
                {['Standard', 'Express', 'Overnight', 'Ground'].map((method) => (
                  <label key={method} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={delivery.shipping.methods.includes(method)}
                      onChange={(e) => {
                        const methods = e.target.checked 
                          ? [...delivery.shipping.methods, method]
                          : delivery.shipping.methods.filter(m => m !== method);
                        setDelivery({ 
                          ...delivery, 
                          shipping: { ...delivery.shipping, methods } 
                        });
                      }}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2"
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Packaging Options</label>
              <textarea
                value={delivery.shipping.packaging}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  shipping: { ...delivery.shipping, packaging: e.target.value } 
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="Describe your packaging methods, materials used, etc..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipping Restrictions</label>
              <textarea
                value={delivery.shipping.restrictions}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  shipping: { ...delivery.shipping, restrictions: e.target.value } 
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="Any restrictions on what can be shipped, temperature requirements, etc..."
              />
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
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile Setup</h3>
        <p className="text-gray-600">Welcome! Let's get your business profile set up and ready to go</p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-medium text-blue-900 mb-2">Welcome to The Bazaar!</h4>
        <p className="text-blue-700 mb-4">
          Complete your profile setup to start selling your products. Please fill in the following sections:
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm font-medium">1</span>
            </div>
            <span className="text-blue-900">Personal Information</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm font-medium">2</span>
            </div>
            <span className="text-blue-900">Business Operations</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm font-medium">3</span>
            </div>
            <span className="text-blue-900">Payment Methods</span>
          </div>
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
    </div>
  );
}
