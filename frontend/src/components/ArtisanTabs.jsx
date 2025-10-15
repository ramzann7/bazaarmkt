import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PRODUCT_CATEGORIES } from '../data/productReference';
import Accordion, { AccordionSection } from './common/Accordion';
import CompactImageUpload from './common/CompactImageUpload';
import { 
  UserIcon, 
  PhotoIcon, 
  TagIcon, 
  MapPinIcon, 
  PhoneIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

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
  const { t } = useTranslation();
  
  const [overview, setOverview] = useState({
    artisanName: profile.artisanName || '',
    businessImage: profile.images?.business || null,
    businessImagePreview: profile.images?.business || null,
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

  // Track if user has uploaded a new image (to prevent profile refresh from overwriting it)
  const [hasNewImage, setHasNewImage] = React.useState(false);
  
  // Update state when profile changes (e.g., when artisan profile is loaded)
  // But don't overwrite user's uploaded image
  React.useEffect(() => {
    if (profile) {
      setOverview(prev => ({
        artisanName: profile.artisanName || '',
        // Keep user's uploaded image if they have one, otherwise use profile image
        businessImage: hasNewImage ? prev.businessImage : (profile.images?.business || null),
        businessImagePreview: hasNewImage ? prev.businessImagePreview : (profile.images?.business || null),
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
      }));
    }
  }, [profile, hasNewImage]);

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
        const base64String = e.target.result;
        setHasNewImage(true); // Mark that user has uploaded a new image
        setOverview(prev => ({
          ...prev,
          businessImage: base64String,
          businessImagePreview: base64String
        }));
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
        const base64String = e.target.result;
        setHasNewImage(true); // Mark that user has uploaded a new image
        setOverview(prev => ({
          ...prev,
          businessImage: base64String,
          businessImagePreview: base64String
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove business image
  const removeBusinessImage = () => {
    setHasNewImage(false); // Reset flag when image is removed
    setOverview({
      ...overview,
      businessImage: null,
      businessImagePreview: null
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Prepare the data to send (businessImage is already base64 string from upload)
      const overviewData = {
        ...overview
      };

      // Remove artisanName if it's empty to prevent backend validation errors
      if (!overviewData.artisanName || overviewData.artisanName.trim() === '') {
        delete overviewData.artisanName;
      }

      // Remove businessImage if it's null or empty to avoid validation errors
      if (!overviewData.businessImage) {
        delete overviewData.businessImage;
      }
      
      // Remove businessImagePreview (we only send businessImage to backend)
      delete overviewData.businessImagePreview;

      await onSave(overviewData);
      
      // Reset the flag after successful save so profile can update normally
      setHasNewImage(false);
    } catch (error) {
      console.error('Error saving overview:', error);
    }
  };

  // Check completion status for accordion badges
  const hasBasicInfo = overview.artisanName && overview.description;
  const hasImage = overview.businessImage;
  const hasAddress = overview.address?.street && overview.address?.city;
  const hasContact = overview.contactInfo?.phone && overview.contactInfo?.email;
  const hasCategories = overview.category?.length > 0;

  // Create accordion sections
  const accordionSections = [
    {
      id: 'basics',
      title: 'Basic Information',
      description: 'Artisan name and business description',
      icon: UserIcon,
      required: true,
      badge: hasBasicInfo ? '✓' : null,
      content: (
        <div className="space-y-4">
          {/* Artisan Name - Read-only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Artisan Name <span className="text-red-500">*</span>
            </label>
            <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs sm:text-sm text-amber-800 mb-2">
                🎨 This is your brand identity - how customers will know you
              </p>
              <input
                type="text"
                value={overview.artisanName}
                readOnly
                disabled
                className="block w-full rounded-lg border border-gray-300 shadow-sm bg-gray-50 py-2 px-3 text-sm sm:text-base font-medium cursor-not-allowed"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                🔒 Artisan name cannot be changed once created
              </p>
            </div>
          </div>

          {/* Business Type Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Type
            </label>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-xl sm:text-2xl flex-shrink-0">
                {PRODUCT_CATEGORIES[profile.type]?.icon || '🏪'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {PRODUCT_CATEGORIES[profile.type]?.name || 'Business Type'}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                  {PRODUCT_CATEGORIES[profile.type]?.description || 'Business category'}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Business type is set during registration
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              About Your Business <span className="text-red-500">*</span>
            </label>
            <textarea
              value={overview.description}
              onChange={(e) => setOverview({ ...overview, description: e.target.value })}
              rows={4}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm sm:text-base"
              placeholder="Describe your business, what makes you unique..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Help customers understand what you offer
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'image',
      title: 'Business Image',
      description: 'Photo that represents your business',
      icon: PhotoIcon,
      badge: hasImage ? '✓' : null,
      content: (
        <CompactImageUpload
          preview={overview.businessImagePreview}
          onUpload={handleBusinessImageChange}
          onRemove={removeBusinessImage}
          label={t('artisanTabs.businessImage')}
          maxSizeMB={5}
        />
      )
    },
    {
      id: 'categories',
      title: 'Product Categories',
      description: `${overview.category?.length || 0} selected`,
      icon: TagIcon,
      badge: hasCategories ? '✓' : null,
      content: (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Select the types of products you create
          </label>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="space-y-3">
              {getGroupedSubcategories().map((categoryGroup) => (
                <div key={categoryGroup.categoryKey} className="border-b border-gray-200 pb-2 last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{categoryGroup.categoryIcon}</span>
                    <h5 className="font-semibold text-gray-800 text-xs sm:text-sm">
                      {categoryGroup.categoryName}
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 ml-5 sm:ml-6">
                    {categoryGroup.subcategories.map((subcategory) => (
                      <label 
                        key={subcategory.key} 
                        className="flex items-center gap-2 cursor-pointer hover:bg-white hover:shadow-sm rounded-lg p-2 transition-colors min-h-[44px]"
                      >
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
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-4 h-4 flex-shrink-0"
                        />
                        <span className="text-xs sm:text-sm flex items-center gap-1">
                          <span className="text-sm">{subcategory.icon}</span>
                          <span className="font-medium">{subcategory.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 This helps customers find your products
          </p>
        </div>
      )
    },
    {
      id: 'address',
      title: 'Business Address',
      description: 'Where customers can find you',
      icon: MapPinIcon,
      badge: hasAddress ? '✓' : null,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={overview.address.street}
              onChange={(e) => setOverview({ 
                ...overview, 
                address: { ...overview.address, street: e.target.value } 
              })}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm sm:text-base"
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
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm sm:text-base"
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
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm sm:text-base"
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
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm sm:text-base"
              placeholder="M5V 3A8"
            />
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      title: 'Contact Information',
      description: 'Phone, email, website, social media',
      icon: PhoneIcon,
      badge: hasContact ? '✓' : null,
      content: (
        <div className="space-y-4">
          {/* Phone and Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone</label>
              <input
                type="tel"
                value={overview.contactInfo.phone}
                onChange={handlePhoneChange}
                className={`block w-full rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2 px-3 text-sm sm:text-base ${
                  overview.contactInfo.phone && overview.contactInfo.phone.replace(/\D/g, '').length !== 10 
                    ? 'border-red-300' 
                    : 'border-gray-300'
                }`}
                placeholder="(555) 123-4567"
                maxLength="14"
              />
              {overview.contactInfo.phone && overview.contactInfo.phone.replace(/\D/g, '').length !== 10 && (
                <p className="text-xs text-red-500 mt-1">Enter complete 10-digit phone</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
              <input
                type="email"
                value={overview.contactInfo.email}
                onChange={handleEmailChange}
                className={`block w-full rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2 px-3 text-sm sm:text-base ${
                  overview.contactInfo.email && !validateEmail(overview.contactInfo.email)
                    ? 'border-red-300' 
                    : 'border-gray-300'
                }`}
                placeholder="hello@yourartisan.com"
              />
              {overview.contactInfo.email && !validateEmail(overview.contactInfo.email) && (
                <p className="text-xs text-red-500 mt-1">Invalid email format</p>
              )}
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website (Optional)</label>
            <input
              type="url"
              value={overview.contactInfo.website}
              onChange={handleWebsiteChange}
              className={`block w-full rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2 px-3 text-sm sm:text-base ${
                overview.contactInfo.website && !validateWebsite(overview.contactInfo.website)
                  ? 'border-red-300' 
                  : 'border-gray-300'
              }`}
              placeholder="your-website.com"
            />
            {overview.contactInfo.website && !validateWebsite(overview.contactInfo.website) && (
              <p className="text-xs text-red-500 mt-1">Invalid URL</p>
            )}
            <p className="text-xs text-gray-500 mt-1">https:// will be added automatically</p>
          </div>

          {/* Social Media */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Social Media (Optional)</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Instagram</label>
                <input
                  type="text"
                  value={overview.contactInfo.socialMedia.instagram}
                  onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-xs sm:text-sm"
                  placeholder="yourhandle"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Facebook</label>
                <input
                  type="text"
                  value={overview.contactInfo.socialMedia.facebook}
                  onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-xs sm:text-sm"
                  placeholder="Your Page"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Twitter/X</label>
                <input
                  type="text"
                  value={overview.contactInfo.socialMedia.twitter}
                  onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-xs sm:text-sm"
                  placeholder="yourhandle"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              @ will be added automatically for Instagram and Twitter
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Business Overview</h3>
        <p className="text-sm text-gray-600 mt-1">Manage your business information and contact details</p>
      </div>
      
      <Accordion sections={accordionSections} defaultExpanded={['basics']} />
      
      {/* Sticky Save Button */}
      <div className="sticky bottom-0 left-0 right-0 bg-white p-4 border-t shadow-lg z-10 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="max-w-7xl mx-auto flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl min-h-[48px]"
          >
            {isSaving ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              'Save Overview'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

export function OperationsTab({ profile, onSave, isSaving }) {
  const { t } = useTranslation();
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
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      <div className="border-b border-gray-200 pb-4 sm:pb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">🛠️ Your Creative Process & Operations</h3>
        <p className="text-sm text-gray-600">Share your unique approach to creating products and managing your craft</p>
      </div>
      
      {/* Production & Quality */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">🏭 Production & Quality</h4>
        
        <div className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Production Methods</label>
            <textarea
              value={operations.productionMethods}
              onChange={(e) => setOperations({ ...operations, productionMethods: e.target.value })}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm sm:text-base"
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm sm:text-base"
              placeholder="What ingredients or materials do you use? Do you source locally, use organic ingredients, or have special suppliers?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quality Standards</label>
            <textarea
              value={operations.qualityStandards}
              onChange={(e) => setOperations({ ...operations, qualityStandards: e.target.value })}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm sm:text-base"
              placeholder="How do you ensure quality? What standards do you follow?"
            />
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">🏆 Certifications</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Certifications & Training</label>
          <input
            type="text"
            value={operations.certifications.join(', ')}
            onChange={(e) => setOperations({ ...operations, certifications: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm sm:text-base"
            placeholder="e.g., Food Safety, Organic, Local Workshops"
          />
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            💡 Separate multiple certifications with commas. This builds customer trust.
          </p>
        </div>
      </div>

      {/* Experience */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">📈 Experience</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
            <input
              type="number"
              value={operations.yearsInBusiness || 0}
              onChange={(e) => setOperations({ ...operations, yearsInBusiness: parseInt(e.target.value) || 0 })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm sm:text-base"
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm sm:text-base"
              placeholder="e.g., 20 items per week, 5 batches per month"
            />
            <p className="text-xs text-gray-500 mt-1">What's your typical production volume?</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end pt-4 sm:pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[48px]"
        >
          {isSaving ? (
            <div className="flex items-center justify-center space-x-2">
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
  const { t } = useTranslation();
  const [hours, setHours] = useState({
    monday: profile.hours?.schedule?.monday || { open: '09:00', close: '17:00', closed: false },
    tuesday: profile.hours?.schedule?.tuesday || { open: '09:00', close: '17:00', closed: false },
    wednesday: profile.hours?.schedule?.wednesday || { open: '09:00', close: '17:00', closed: false },
    thursday: profile.hours?.schedule?.thursday || { open: '09:00', close: '17:00', closed: false },
    friday: profile.hours?.schedule?.friday || { open: '09:00', close: '17:00', closed: false },
    saturday: profile.hours?.schedule?.saturday || { open: '09:00', close: '17:00', closed: false },
    sunday: profile.hours?.schedule?.sunday || { open: '09:00', close: '17:00', closed: true }
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

  // Preset configurations
  const presets = [
    { label: '9 AM - 5 PM', open: '09:00', close: '17:00' },
    { label: '10 AM - 6 PM', open: '10:00', close: '18:00' },
    { label: '8 AM - 4 PM', open: '08:00', close: '16:00' },
    { label: '11 AM - 7 PM', open: '11:00', close: '19:00' }
  ];

  const applyPresetToAllDays = (preset) => {
    const updatedHours = {};
    days.forEach(day => {
      updatedHours[day.key] = {
        open: preset.open,
        close: preset.close,
        closed: false
      };
    });
    setHours(updatedHours);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">🕒 Your Availability & Hours</h3>
        <p className="text-sm text-gray-600 mt-1">Set your availability for orders and customer inquiries</p>
      </div>
      
      {/* Quick Presets */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm font-medium text-gray-900 mb-3">Quick presets:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPresetToAllDays(preset)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Apply to all days at once</p>
      </div>

      {/* Day Cards - Mobile Optimized */}
      <div className="space-y-3">
        {days.map((day) => (
          <div
            key={day.key}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white"
          >
            {/* Day Header */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
              <label className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={!hours[day.key].closed}
                  onChange={(e) => setHours({
                    ...hours,
                    [day.key]: { ...hours[day.key], closed: !e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm sm:text-base font-medium text-gray-900">
                  {day.name}
                </span>
              </label>
              
              {!hours[day.key].closed && (
                <span className="text-xs text-gray-500">
                  {hours[day.key].open} - {hours[day.key].close}
                </span>
              )}
            </div>

            {/* Time Inputs - Stack on mobile */}
            {!hours[day.key].closed && (
              <div className="p-4 bg-white">
                <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center max-w-md">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Open</label>
                    <input
                      type="time"
                      value={hours[day.key].open}
                      onChange={(e) => setHours({
                        ...hours,
                        [day.key]: { ...hours[day.key], open: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <span className="text-xs text-gray-500 pt-5">to</span>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Close</label>
                    <input
                      type="time"
                      value={hours[day.key].close}
                      onChange={(e) => setHours({
                        ...hours,
                        [day.key]: { ...hours[day.key], close: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Closed Message */}
            {hours[day.key].closed && (
              <div className="px-4 py-3 bg-white">
                <p className="text-sm text-gray-500">Closed</p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <p className="text-xs sm:text-sm text-gray-500 bg-gray-50 p-3 sm:p-4 rounded-lg">
        💡 Set your availability so customers know when they can reach you and when you'll be processing orders.
      </p>
      
      <div className="flex justify-end pt-4 sm:pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[48px]"
        >
          {isSaving ? (
            <div className="flex items-center justify-center space-x-2">
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
  const { t } = useTranslation();
  // Enhanced CSS styles for beautiful, user-friendly sliders
  const sliderStyles = `
    /* Base slider styling */
    .delivery-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(to right, #f97316 0%, #f97316 var(--value), #e5e7eb var(--value), #e5e7eb 100%);
      outline: none;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    
    .delivery-slider:hover {
      background: linear-gradient(to right, #ea580c 0%, #ea580c var(--value), #d1d5db var(--value), #d1d5db 100%);
    }
    
    /* WebKit (Chrome, Safari, Edge) - Thumb */
    .delivery-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: white;
      border: 3px solid #f97316;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      transition: all 0.2s ease;
    }
    
    .delivery-slider::-webkit-slider-thumb:hover {
      transform: scale(1.1);
      border-color: #ea580c;
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
    }
    
    .delivery-slider::-webkit-slider-thumb:active {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
    }
    
    /* Firefox - Thumb */
    .delivery-slider::-moz-range-thumb {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: white;
      border: 3px solid #f97316;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      transition: all 0.2s ease;
    }
    
    .delivery-slider::-moz-range-thumb:hover {
      transform: scale(1.1);
      border-color: #ea580c;
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
    }
    
    .delivery-slider::-moz-range-thumb:active {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
    }
    
    /* Firefox - Track */
    .delivery-slider::-moz-range-track {
      height: 8px;
      border-radius: 4px;
      background: #e5e7eb;
    }
    
    .delivery-slider::-moz-range-progress {
      height: 8px;
      border-radius: 4px;
      background: #f97316;
    }
    
    /* Professional delivery slider (blue variant) */
    .professional-slider {
      background: linear-gradient(to right, #3b82f6 0%, #3b82f6 var(--value), #e5e7eb var(--value), #e5e7eb 100%);
    }
    
    .professional-slider:hover {
      background: linear-gradient(to right, #2563eb 0%, #2563eb var(--value), #d1d5db var(--value), #d1d5db 100%);
    }
    
    .professional-slider::-webkit-slider-thumb {
      border-color: #3b82f6;
    }
    
    .professional-slider::-webkit-slider-thumb:hover {
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .professional-slider::-moz-range-thumb {
      border-color: #3b82f6;
    }
    
    .professional-slider::-moz-range-thumb:hover {
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .professional-slider::-moz-range-progress {
      background: #3b82f6;
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

  // Helper function to ensure pickup schedule has proper structure
  const normalizePickupSchedule = (pickupSchedule) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const normalizedSchedule = {};
    
    days.forEach(day => {
      const pickupDay = pickupSchedule?.[day];
      
      normalizedSchedule[day] = {
        enabled: pickupDay?.enabled || false,
        open: pickupDay?.open || '09:00', // Default pickup hours
        close: pickupDay?.close || '17:00'
      };
    });
    
    return normalizedSchedule;
  };

  // Helper function to format schedule for display
  const formatScheduleForDisplay = (schedule) => {
    if (!schedule) return 'No pickup hours set';
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    let formatted = [];
    let currentGroup = [];
    let currentTimes = null;
    
    days.forEach((day, index) => {
      const daySchedule = schedule[day];
      if (daySchedule?.enabled) {
        const times = `${daySchedule.open || '09:00'}-${daySchedule.close || '17:00'}`;
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

  // Helper to parse pickup location (could be object or string)
  const parsePickupLocation = (location) => {
    if (!location) {
      return { street: '', city: '', state: '', zipCode: '' };
    }
    
    // If already an object, return as-is
    if (typeof location === 'object') {
      return {
        street: location.street || '',
        city: location.city || '',
        state: location.state || '',
        zipCode: location.zipCode || ''
      };
    }
    
    // If string, try to parse it (legacy format: "street, city, state zipCode")
    if (typeof location === 'string') {
      const parts = location.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        const stateZip = parts[2].trim().split(/\s+/);
        return {
          street: parts[0] || '',
          city: parts[1] || '',
          state: stateZip[0] || '',
          zipCode: stateZip.slice(1).join(' ') || ''
        };
      }
    }
    
    return { street: '', city: '', state: '', zipCode: '' };
  };

  const [delivery, setDelivery] = useState({
    pickup: {
      enabled: profile.fulfillment?.methods?.pickup?.enabled !== false,
      location: profile.fulfillment?.methods?.pickup?.location || '',
      instructions: profile.fulfillment?.methods?.pickup?.instructions || '',
      hours: profile.pickupHours || '',
      useBusinessAddress: profile.fulfillment?.methods?.pickup?.useBusinessAddress !== false, // Default to true if not set
      address: parsePickupLocation(profile.fulfillment?.methods?.pickup?.location),
      schedule: normalizePickupSchedule(profile.fulfillment?.methods?.pickup?.schedule)
    },
    personalDelivery: {
      enabled: profile.fulfillment?.methods?.delivery?.enabled || false,
      radius: profile.fulfillment?.methods?.delivery?.radius || 10,
      fee: profile.fulfillment?.methods?.delivery?.fee || 5,
      freeThreshold: profile.deliveryOptions?.freeDeliveryThreshold || 50,
      timeSlots: profile.deliveryTimeSlots || [],
      instructions: profile.fulfillment?.methods?.delivery?.instructions || ''
    },
    professionalDelivery: {
      enabled: profile.fulfillment?.methods?.professionalDelivery?.enabled || false,
      uberDirectEnabled: profile.fulfillment?.methods?.professionalDelivery?.enabled || false, // Auto-enabled with professional delivery
      serviceRadius: profile.fulfillment?.methods?.professionalDelivery?.serviceRadius || 25,
      regions: profile.fulfillment?.methods?.professionalDelivery?.regions || [],
      packaging: profile.professionalDelivery?.packaging || '',
      restrictions: profile.professionalDelivery?.restrictions || ''
    }
  });

  // Update state when profile changes (e.g., when navigating to this tab)
  React.useEffect(() => {
    if (profile) {
      console.log('🔄 DeliveryTab: Profile updated, refreshing delivery state');
      console.log('🔄 Profile fulfillment:', profile.fulfillment);
      
      setDelivery({
        pickup: {
          enabled: profile.fulfillment?.methods?.pickup?.enabled !== false,
          location: profile.fulfillment?.methods?.pickup?.location || '',
          instructions: profile.fulfillment?.methods?.pickup?.instructions || '',
          hours: profile.pickupHours || '',
          useBusinessAddress: profile.fulfillment?.methods?.pickup?.useBusinessAddress !== false,
          address: parsePickupLocation(profile.fulfillment?.methods?.pickup?.location),
          schedule: normalizePickupSchedule(profile.fulfillment?.methods?.pickup?.schedule)
        },
        personalDelivery: {
          enabled: profile.fulfillment?.methods?.delivery?.enabled || false,
          radius: profile.fulfillment?.methods?.delivery?.radius || 10,
          fee: profile.fulfillment?.methods?.delivery?.fee || 5,
          freeThreshold: profile.deliveryOptions?.freeDeliveryThreshold || 50,
          timeSlots: profile.deliveryTimeSlots || [],
          instructions: profile.fulfillment?.methods?.delivery?.instructions || ''
        },
        professionalDelivery: {
          enabled: profile.fulfillment?.methods?.professionalDelivery?.enabled || false,
          uberDirectEnabled: profile.fulfillment?.methods?.professionalDelivery?.enabled || false, // Auto-enabled with professional delivery
          serviceRadius: profile.fulfillment?.methods?.professionalDelivery?.serviceRadius || 25,
          regions: profile.fulfillment?.methods?.professionalDelivery?.regions || [],
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
      
      // Professional delivery options (automatically enables Uber Direct when enabled)
      professionalDelivery: {
        enabled: delivery.professionalDelivery.enabled,
        uberDirectEnabled: delivery.professionalDelivery.enabled, // Auto-enable Uber Direct when professional delivery is enabled
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

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState({
    pickup: true,
    personal: false,
    professional: false
  });

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <style dangerouslySetInnerHTML={{ __html: sliderStyles }} />
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">🚚 Delivery Options</h3>
        <p className="text-sm text-gray-600 mt-1">Configure how customers can receive your products</p>
      </div>
      
      {/* Pickup Section - Collapsible */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="flex items-center justify-between p-4 bg-gray-50">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="checkbox"
              checked={delivery.pickup.enabled}
              onChange={(e) => {
                e.stopPropagation();
                setDelivery({ 
                  ...delivery, 
                  pickup: { ...delivery.pickup, enabled: e.target.checked } 
                });
              }}
              className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900">🏪 Pickup Available</h4>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Customers collect orders from your location</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleSection('pickup')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg 
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.pickup ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Pickup Content */}
        {expandedSections.pickup && delivery.pickup.enabled && (
          <div className="p-4 space-y-4 border-t border-gray-200 animate-fadeIn">
            {/* Address Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                📍 Pickup Address <span className="text-red-500">*</span>
              </label>
              
              <div className="mb-4 flex flex-col sm:flex-row gap-3">
                <label className="flex items-center min-h-[44px]">
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
                    className="text-orange-600 focus:ring-orange-500 w-4 h-4"
                  />
                  <span className="ml-2 text-xs sm:text-sm font-medium text-gray-700">Use Business Address</span>
                </label>
                <label className="flex items-center min-h-[44px]">
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
                    className="text-orange-600 focus:ring-orange-500 w-4 h-4"
                  />
                  <span className="ml-2 text-xs sm:text-sm font-medium text-gray-700">Use Different Address</span>
                </label>
              </div>

              {delivery.pickup.useBusinessAddress ? (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs sm:text-sm font-medium text-green-800 mb-1">🏢 Using Business Address:</div>
                  <div className="text-xs sm:text-sm text-green-700">
                    {profile.address?.street && profile.address?.city ? (
                      `${profile.address.street}, ${profile.address.city}, ${profile.address.state} ${profile.address.zipCode}`
                    ) : (
                      <span className="text-orange-600">Please set your business address in the Business Overview tab first</span>
                    )}
                  </div>
                </div>
              ) : (
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
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm"
                    placeholder={t('artisanTabs.streetAddressPlaceholder')}
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm"
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
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm"
                      placeholder="Province"
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
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm"
                      placeholder={t('artisanTabs.postalCodePlaceholder')}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Pickup Schedule - Match Hours Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                🕒 Pickup Schedule <span className="text-red-500">*</span>
              </label>
              
              <div className="space-y-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const dayKey = day.toLowerCase();
                  const isEnabled = delivery.pickup.schedule?.[dayKey]?.enabled || false;
                  return (
                    <div key={day} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                        <label className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => setDelivery({
                              ...delivery,
                              pickup: {
                                ...delivery.pickup,
                                schedule: {
                                  ...delivery.pickup.schedule,
                                  [dayKey]: {
                                    ...delivery.pickup.schedule?.[dayKey],
                                    enabled: e.target.checked
                                  }
                                }
                              }
                            })}
                            className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-sm sm:text-base font-medium text-gray-900">{day}</span>
                        </label>
                        
                        {isEnabled && (
                          <span className="text-xs text-gray-500">
                            {delivery.pickup.schedule?.[dayKey]?.open || '09:00'} - {delivery.pickup.schedule?.[dayKey]?.close || '17:00'}
                          </span>
                        )}
                      </div>

                      {isEnabled && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center max-w-md">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Open</label>
                              <input
                                type="time"
                                value={delivery.pickup.schedule?.[dayKey]?.open || '09:00'}
                                onChange={(e) => setDelivery({
                                  ...delivery,
                                  pickup: {
                                    ...delivery.pickup,
                                    schedule: {
                                      ...delivery.pickup.schedule,
                                      [dayKey]: {
                                        ...delivery.pickup.schedule?.[dayKey],
                                        open: e.target.value
                                      }
                                    }
                                  }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <span className="text-xs text-gray-500 pt-5">to</span>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Close</label>
                              <input
                                type="time"
                                value={delivery.pickup.schedule?.[dayKey]?.close || '17:00'}
                                onChange={(e) => setDelivery({
                                  ...delivery,
                                  pickup: {
                                    ...delivery.pickup,
                                    schedule: {
                                      ...delivery.pickup.schedule,
                                      [dayKey]: {
                                        ...delivery.pickup.schedule?.[dayKey],
                                        close: e.target.value
                                      }
                                    }
                                  }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {!isEnabled && (
                        <div className="px-4 py-3 bg-white">
                          <p className="text-sm text-gray-500">Closed</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📋 Pickup Instructions (Optional)
              </label>
              <textarea
                value={delivery.pickup.instructions}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  pickup: { ...delivery.pickup, instructions: e.target.value } 
                })}
                rows={3}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm"
                placeholder="e.g., Ring doorbell #3, call before arrival..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Personal Delivery Section - Collapsible */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="flex items-center justify-between p-4 bg-gray-50">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="checkbox"
              checked={delivery.personalDelivery.enabled}
              onChange={(e) => {
                e.stopPropagation();
                setDelivery({ 
                  ...delivery, 
                  personalDelivery: { ...delivery.personalDelivery, enabled: e.target.checked } 
                });
              }}
              className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900">🚚 Personal Delivery</h4>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">You personally deliver orders to customers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleSection('personal')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg 
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.personal ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Personal Delivery Content */}
        {expandedSections.personal && delivery.personalDelivery.enabled && (
          <div className="p-4 space-y-4 border-t border-gray-200 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📏 Delivery Radius <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={delivery.personalDelivery.radius || 10}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 10;
                      setDelivery({ 
                        ...delivery, 
                        personalDelivery: { ...delivery.personalDelivery, radius: newValue } 
                      });
                    }}
                    style={{ '--value': `${((delivery.personalDelivery.radius - 1) / 49) * 100}%` }}
                    className="delivery-slider"
                    required
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span className="text-gray-400">1 km</span>
                    <span className="font-semibold text-lg text-orange-600">{delivery.personalDelivery.radius} km</span>
                    <span className="text-gray-400">50 km</span>
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
                    <span className="text-gray-500 text-xs sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    value={delivery.personalDelivery.fee || 0}
                    onChange={(e) => setDelivery({ 
                      ...delivery, 
                      personalDelivery: { ...delivery.personalDelivery, fee: parseFloat(e.target.value) || 0 } 
                    })}
                    className="block w-full pl-7 rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm"
                    min="0"
                    step="0.50"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🎯 Free Delivery Threshold
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-xs sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    value={delivery.personalDelivery.freeThreshold || 0}
                    onChange={(e) => setDelivery({ 
                      ...delivery, 
                      personalDelivery: { ...delivery.personalDelivery, freeThreshold: parseFloat(e.target.value) || 0 } 
                    })}
                    className="block w-full pl-7 rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm"
                    min="0"
                    step="5"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📋 Delivery Instructions (Optional)
              </label>
              <textarea
                value={delivery.personalDelivery.instructions}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  personalDelivery: { ...delivery.personalDelivery, instructions: e.target.value } 
                })}
                rows={3}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm"
                placeholder="e.g., Call 30 minutes before arrival..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Professional Delivery Section - Collapsible */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="flex items-center justify-between p-4 bg-gray-50">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="checkbox"
              checked={delivery.professionalDelivery.enabled}
              onChange={(e) => {
                e.stopPropagation();
                setDelivery({ 
                  ...delivery, 
                  professionalDelivery: { 
                    ...delivery.professionalDelivery, 
                    enabled: e.target.checked,
                    uberDirectEnabled: e.target.checked 
                  } 
                });
              }}
              className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900">🚛 Professional Delivery (Uber Direct)</h4>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Automated professional delivery service</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleSection('professional')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg 
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.professional ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Professional Delivery Content */}
        {expandedSections.professional && delivery.professionalDelivery.enabled && (
          <div className="p-4 space-y-4 border-t border-gray-200 animate-fadeIn">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📏 Service Radius (km)
              </label>
              <input
                type="range"
                min="5"
                max="100"
                value={delivery.professionalDelivery.serviceRadius || 25}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value) || 25;
                  setDelivery({ 
                    ...delivery, 
                    professionalDelivery: { 
                      ...delivery.professionalDelivery, 
                      serviceRadius: newValue 
                    } 
                  });
                }}
                style={{ '--value': `${((delivery.professionalDelivery.serviceRadius - 5) / 95) * 100}%` }}
                className="delivery-slider professional-slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span className="text-gray-400">5 km</span>
                <span className="font-semibold text-lg text-blue-600">{delivery.professionalDelivery.serviceRadius || 25} km</span>
                <span className="text-gray-400">100 km</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Professional delivery will be available within this radius from your business address
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎯 Service Regions (Optional)
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
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-xs sm:text-sm"
                placeholder="e.g., Downtown, North York, Scarborough"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📦 Packaging Requirements (Optional)
              </label>
              <textarea
                value={delivery.professionalDelivery.packaging}
                onChange={(e) => setDelivery({ 
                  ...delivery, 
                  professionalDelivery: { ...delivery.professionalDelivery, packaging: e.target.value } 
                })}
                rows={3}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2 px-3 text-sm"
                placeholder="e.g., Insulated packaging, secure containers..."
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end pt-4 sm:pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[48px]"
        >
          {isSaving ? (
            <div className="flex items-center justify-center space-x-2">
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
  const { t } = useTranslation();
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
    <div className="space-y-6 sm:space-y-8">
      <div className="border-b border-gray-200 pb-4 sm:pb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Complete Your Profile Setup</h3>
        <p className="text-sm text-gray-600">
          {isArtisan 
            ? "Welcome! Let's get your business profile set up and ready to go" 
            : "Welcome! Let's get your account set up so you can start shopping"
          }
        </p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
        <h4 className="text-sm sm:text-base font-medium text-blue-900 mb-2">Welcome to BazaarMkt!</h4>
        <p className="text-xs sm:text-sm text-blue-700 mb-4">
          {isArtisan 
            ? "Complete your profile setup to start selling your products. Please fill in the following sections:"
            : "Complete your profile setup to start shopping from local artisans. Please fill in the following sections:"
          }
        </p>
        
        <div className="space-y-3">
          {completionSteps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.completed 
                  ? 'bg-green-100' 
                  : 'bg-blue-100'
              }`}>
                {step.completed ? (
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-blue-600 text-xs sm:text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <span className={`text-xs sm:text-sm ${step.completed ? 'text-green-900' : 'text-blue-900'}`}>
                {step.name}
                {step.completed && <span className="ml-2 text-green-600 text-sm">✓</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end pt-4 sm:pt-6 border-t border-gray-200">
        <button
          onClick={() => setActiveTab('personal')}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[48px]"
        >
          Start Setup
        </button>
      </div>
      
      {/* Setup Progress Guide */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
        <h5 className="text-sm sm:text-base font-medium text-gray-900 mb-3">Setup Progress Guide</h5>
        <div className="space-y-2 text-xs sm:text-sm text-gray-600">
          <p className={isPersonalComplete ? 'text-green-700' : ''}>
            <strong>Step 1 - Personal Information:</strong> Complete your basic profile details
            {isPersonalComplete && <span className="ml-2 text-green-600">✓ Completed</span>}
          </p>
          <p className={isAddressComplete ? 'text-green-700' : ''}>
            <strong>{t('artisanTabs.step2')} - {isArtisan ? t('artisanTabs.businessOperations') : t('artisanTabs.deliveryAddress')}:</strong> 
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
            <span className="text-xs sm:text-sm font-medium text-gray-700">Overall Progress:</span>
            <span className="text-xs sm:text-sm font-medium text-gray-900">
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
