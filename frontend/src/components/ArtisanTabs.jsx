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
      website: profile.contactInfo?.website || ''
    }
  });

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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Artisan Name *</label>
          <input
            type="text"
            value={overview.artisanName}
            onChange={(e) => setOverview({ ...overview, artisanName: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
          />
        </div>
        
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Business Phone</label>
          <input
            type="tel"
            value={overview.contactInfo.phone}
            onChange={(e) => setOverview({ 
              ...overview, 
              contactInfo: { ...overview.contactInfo, phone: e.target.value } 
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="(555) 123-4567"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Business Email</label>
          <input
            type="email"
            value={overview.contactInfo.email}
            onChange={(e) => setOverview({ 
              ...overview, 
              contactInfo: { ...overview.contactInfo, email: e.target.value } 
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Website</label>
        <input
          type="url"
          value={overview.contactInfo.website}
          onChange={(e) => setOverview({ 
            ...overview, 
            contactInfo: { ...overview.contactInfo, website: e.target.value } 
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="https://your-website.com"
        />
      </div>

              <div>
          <label className="block text-sm font-medium text-gray-700">Product Categories</label>
          <div className="mt-1 max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
            <div className="space-y-4">
              {getGroupedSubcategories().map((categoryGroup) => (
                <div key={categoryGroup.categoryKey} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{categoryGroup.categoryIcon}</span>
                    <h4 className="font-semibold text-gray-800 text-sm">{categoryGroup.categoryName}</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-1 ml-6">
                    {categoryGroup.subcategories.map((subcategory) => (
                      <label key={subcategory.key} className="flex items-center space-x-2 cursor-pointer hover:bg-white hover:shadow-sm rounded p-1 transition-colors">
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
                          <span className="font-medium">{subcategory.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Select all categories that apply to your products
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

      <div>
        <label className="block text-sm font-medium text-gray-700">Business Description</label>
        <textarea
          value={overview.description}
          onChange={(e) => setOverview({ ...overview, description: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="Tell customers about your business, your story, and what makes you unique..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Specialties</label>
        <input
          type="text"
          value={overview.specialties.join(', ')}
          onChange={(e) => setOverview({ ...overview, specialties: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="e.g., Organic bread, Sourdough, Gluten-free options"
        />
        <p className="mt-1 text-sm text-gray-500">Separate multiple specialties with commas</p>
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
    sustainabilityPractices: profile.operationDetails?.sustainabilityPractices || '',
    certifications: profile.operationDetails?.certifications || [],
    yearsInBusiness: profile.operationDetails?.yearsInBusiness || '',
    productionCapacity: profile.operationDetails?.productionCapacity || '',
    qualityStandards: profile.operationDetails?.qualityStandards || '',
    equipment: profile.operationDetails?.equipment || '',
    processes: profile.operationDetails?.processes || '',
    ingredients: profile.operationDetails?.ingredients || '',
    facilities: profile.operationDetails?.facilities || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(operations);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Business Practices & Operations</h3>
        <p className="text-gray-600">Share your production methods, certifications, and business practices</p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Production Methods</label>
        <textarea
          value={operations.productionMethods}
          onChange={(e) => setOperations({ ...operations, productionMethods: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="Describe your production methods, techniques, and processes..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Ingredients & Sourcing</label>
        <textarea
          value={operations.ingredients}
          onChange={(e) => setOperations({ ...operations, ingredients: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="Describe your ingredients, where you source them, local suppliers, organic practices..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Quality Standards</label>
        <textarea
          value={operations.qualityStandards}
          onChange={(e) => setOperations({ ...operations, qualityStandards: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="What quality standards do you follow? Food safety, testing, etc..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Certifications</label>
        <input
          type="text"
          value={operations.certifications.join(', ')}
          onChange={(e) => setOperations({ ...operations, certifications: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="e.g., Organic, Fair Trade, HACCP, Kosher, Halal"
        />
        <p className="mt-1 text-sm text-gray-500">Separate multiple certifications with commas</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Sustainability Practices</label>
        <textarea
          value={operations.sustainabilityPractices}
          onChange={(e) => setOperations({ ...operations, sustainabilityPractices: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="Describe your sustainability practices, waste reduction, eco-friendly packaging..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Processes & Methods</label>
        <textarea
          value={operations.processes}
          onChange={(e) => setOperations({ ...operations, processes: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="Describe your production processes, methods, techniques..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Facilities</label>
          <textarea
            value={operations.facilities}
            onChange={(e) => setOperations({ ...operations, facilities: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="Describe your facilities, size, location, setup..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Equipment</label>
          <textarea
            value={operations.equipment}
            onChange={(e) => setOperations({ ...operations, equipment: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="What equipment do you use? Traditional methods, modern technology..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Years in Business</label>
          <input
            type="number"
            value={operations.yearsInBusiness}
            onChange={(e) => setOperations({ ...operations, yearsInBusiness: parseInt(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            min="0"
            placeholder="e.g., 5"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Production Capacity</label>
          <input
            type="text"
            value={operations.productionCapacity}
            onChange={(e) => setOperations({ ...operations, productionCapacity: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            placeholder="e.g., 100 loaves per day, 50kg per week"
          />
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
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Business Hours</h3>
        <p className="text-gray-600">Set your operating hours for each day of the week</p>
      </div>
      
      <div className="space-y-4">
        {days.map((day) => (
          <div key={day.key} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700">{day.name}</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={!hours[day.key].closed}
                onChange={(e) => setHours({
                  ...hours,
                  [day.key]: { ...hours[day.key], closed: !e.target.checked }
                })}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-600">Open</span>
            </div>
            
            {!hours[day.key].closed && (
              <>
                <input
                  type="time"
                  value={hours[day.key].open}
                  onChange={(e) => setHours({
                    ...hours,
                    [day.key]: { ...hours[day.key], open: e.target.value }
                  })}
                  className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="time"
                  value={hours[day.key].close}
                  onChange={(e) => setHours({
                    ...hours,
                    [day.key]: { ...hours[day.key], close: e.target.value }
                  })}
                  className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </>
            )}
          </div>
        ))}
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
