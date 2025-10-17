import React, { useState, useEffect } from 'react';
import { 
  CubeIcon, 
  PhotoIcon, 
  TruckIcon, 
  WrenchScrewdriverIcon,
  CalendarIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import MultiStepForm from '../common/MultiStepForm';
import { PRODUCT_CATEGORIES, getAllCategories } from '../../data/productReference';

/**
 * MobileProductForm
 * Mobile-optimized multi-step product creation/editing form
 * 
 * Uses MultiStepForm component for step-by-step guidance
 * Updated: October 14, 2025 - Enhanced dropdowns for mobile
 */
const MobileProductForm = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    unit: product?.unit || 'piece',
    productType: product?.productType || 'ready_to_ship',
    category: product?.category || 'handmade_crafts',
    subcategory: product?.subcategory || 'jewelry_accessories',
    stock: product?.stock || 0,
    status: product?.status || 'active',
    image: product?.image || null
  });

  const [imagePreview, setImagePreview] = useState(product?.image || null);

  // Update form data when product changes (for editing)
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        unit: product.unit || 'piece',
        productType: product.productType || 'ready_to_ship',
        category: product.category || 'handmade_crafts',
        subcategory: product.subcategory || 'jewelry_accessories',
        stock: product.stock || 0,
        status: product.status || 'active',
        image: product.image || null
      });
      setImagePreview(product.image || null);
    }
  }, [product]);

  // Format product name with capital first letters
  const formatProductName = (name) => {
    if (!name) return name;
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .substring(0, 30); // Limit to 30 characters
  };

  // Handle field changes
  const handleFieldChange = (fieldName, value) => {
    // Apply special formatting for product name
    if (fieldName === 'name') {
      value = formatProductName(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Handle image upload
  const handleImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Get available subcategories based on category
  const getAvailableSubcategories = () => {
    if (!formData.category || !PRODUCT_CATEGORIES[formData.category]) {
      return [];
    }
    return Object.keys(PRODUCT_CATEGORIES[formData.category].subcategories).map(key => ({
      key,
      name: PRODUCT_CATEGORIES[formData.category].subcategories[key].name,
      icon: PRODUCT_CATEGORIES[formData.category].subcategories[key].icon
    }));
  };

  // Define form steps
  const steps = [
    {
      id: 'basics',
      title: 'Basic Information',
      description: 'Essential product details',
      icon: CubeIcon,
      renderContent: () => (
        <div className="space-y-4">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              inputMode="text"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              required
              maxLength="30"
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium shadow-sm"
              style={{ minHeight: '48px', fontSize: '16px' }}
              placeholder="e.g., Organic Honey"
            />
            <p className="text-xs text-gray-500 mt-1">Max 30 characters • First letter capitalized</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => {
                handleFieldChange('category', e.target.value);
                const firstSubcat = Object.keys(PRODUCT_CATEGORIES[e.target.value]?.subcategories || {})[0] || '';
                handleFieldChange('subcategory', firstSubcat);
              }}
              required
              className="w-full px-4 py-3 text-base sm:text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium shadow-sm hover:border-gray-400 transition-colors"
              style={{ 
                minHeight: '48px', 
                fontSize: '16px',
                WebkitAppearance: 'menulist',
                MozAppearance: 'menulist',
                appearance: 'menulist'
              }}
            >
              {getAllCategories().map(category => (
                <option key={category.key} value={category.key} style={{ fontSize: '16px' }}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Subcategory *
            </label>
            <select
              value={formData.subcategory}
              onChange={(e) => handleFieldChange('subcategory', e.target.value)}
              required
              className="w-full px-4 py-3 text-base sm:text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium shadow-sm hover:border-gray-400 transition-colors"
              style={{ 
                minHeight: '48px', 
                fontSize: '16px',
                WebkitAppearance: 'menulist',
                MozAppearance: 'menulist',
                appearance: 'menulist'
              }}
            >
              {getAvailableSubcategories().map(subcategory => (
                <option key={subcategory.key} value={subcategory.key} style={{ fontSize: '16px' }}>
                  {subcategory.icon} {subcategory.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Description *
            </label>
            <textarea
              inputMode="text"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              required
              rows="4"
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium shadow-sm resize-none"
              style={{ fontSize: '16px', minHeight: '100px' }}
              placeholder="Describe your product..."
            />
            <p className="text-xs text-gray-500 mt-1">Detailed description helps customers understand your product</p>
          </div>
        </div>
      )
    },
    {
      id: 'pricing',
      title: 'Pricing & Inventory',
      description: 'Set price and stock levels',
      icon: TagIcon,
      renderContent: () => (
        <div className="space-y-4">
          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Price *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <span className="text-gray-500 text-base font-medium">$</span>
              </div>
              <input
                type="number"
                inputMode="decimal"
                value={formData.price}
                onChange={(e) => handleFieldChange('price', e.target.value)}
                step="0.01"
                min="0"
                required
                className="w-full pl-8 pr-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium shadow-sm"
                style={{ minHeight: '48px', fontSize: '16px' }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Unit *
            </label>
            <select
              value={formData.unit}
              onChange={(e) => handleFieldChange('unit', e.target.value)}
              required
              className="w-full px-4 py-3 text-base sm:text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium shadow-sm hover:border-gray-400 transition-colors"
              style={{ 
                minHeight: '48px', 
                fontSize: '16px',
                WebkitAppearance: 'menulist',
                MozAppearance: 'menulist',
                appearance: 'menulist'
              }}
            >
              <optgroup label="Count/Quantity">
                <option value="piece">Piece</option>
                <option value="item">Item</option>
                <option value="each">Each</option>
                <option value="dozen">Dozen</option>
                <option value="half_dozen">Half Dozen</option>
              </optgroup>
              <optgroup label="Weight">
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="lb">Pound (lb)</option>
                <option value="oz">Ounce (oz)</option>
              </optgroup>
              <optgroup label="Volume">
                <option value="liter">Liter (L)</option>
                <option value="ml">Milliliter (ml)</option>
                <option value="cup">Cup</option>
              </optgroup>
              <optgroup label="Food Items">
                <option value="bottle">Bottle</option>
                <option value="jar">Jar</option>
                <option value="bag">Bag</option>
                <option value="box">Box</option>
                <option value="loaf">Loaf</option>
              </optgroup>
            </select>
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Stock Quantity *
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={formData.stock}
              onChange={(e) => handleFieldChange('stock', e.target.value)}
              min="0"
              required
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium shadow-sm"
              style={{ minHeight: '48px', fontSize: '16px' }}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Available inventory</p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Product Status *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'active', label: 'Active', color: 'border-green-500 bg-green-50' },
                { value: 'inactive', label: 'Inactive', color: 'border-gray-500 bg-gray-50' },
                { value: 'out_of_stock', label: 'Out of Stock', color: 'border-red-500 bg-red-50' },
                { value: 'draft', label: 'Draft', color: 'border-yellow-500 bg-yellow-50' }
              ].map((status) => (
                <label
                  key={status.value}
                  className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 cursor-pointer transition-all min-h-[44px] ${
                    formData.status === status.value
                      ? `${status.color} border-current`
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status.value}
                    checked={formData.status === status.value}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{status.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'image',
      title: 'Product Image',
      description: 'Add a photo of your product',
      icon: PhotoIcon,
      renderContent: () => (
        <div className="space-y-4">
          {imagePreview ? (
            <div className="space-y-4">
              <div className="relative flex justify-center">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-48 h-48 object-cover rounded-xl shadow-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    handleFieldChange('image', null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg min-h-[44px]"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById('mobile-image-upload').click()}
                className="w-full px-4 py-3 text-orange-600 border-2 border-orange-500 rounded-xl hover:bg-orange-50 transition-all font-medium min-h-[48px]"
              >
                Change Image
              </button>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-orange-500 transition-all active:border-orange-600">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-xl flex items-center justify-center">
                <PhotoIcon className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-base font-semibold text-gray-900 mb-2">Upload Product Image</p>
              <p className="text-sm text-gray-600 mb-4">
                Tap to select an image
              </p>
              <div className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium min-h-[48px]">
                Choose Image
              </div>
              <input
                id="mobile-image-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleImageUpload(file);
                }}
                className="hidden"
              />
            </label>
          )}
          
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-2">Image Tips</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Square images work best (400x400px minimum)</li>
              <li>• Clear, well-lit photos</li>
              <li>• Maximum file size: 5MB</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const handleSave = () => {
    // Format data to match backend expectations (same as desktop ProductForm)
    const filteredData = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      category: formData.category,
      subcategory: formData.subcategory,
      productType: formData.productType,
      unit: formData.unit,
      status: formData.status,
      // Include image if present
      ...(formData.image && { image: formData.image }),
      // Product type specific fields
      ...(formData.productType === 'ready_to_ship' && {
        stock: parseInt(formData.stock) || 0,
        lowStockThreshold: 5
      }),
      ...(formData.productType === 'made_to_order' && {
        stock: parseInt(formData.stock) || 0,
        totalCapacity: Math.max(parseInt(formData.stock) || 0, 1),
        remainingCapacity: Math.max(parseInt(formData.stock) || 0, 1),
        leadTime: 1,
        leadTimeUnit: 'days',
        maxOrderQuantity: 10,
        capacityPeriod: 'daily'
      }),
      ...(formData.productType === 'scheduled_order' && {
        stock: parseInt(formData.stock) || 0,
        availableQuantity: Math.max(parseInt(formData.stock) || 0, 1),
        scheduleType: 'daily',
        scheduleDetails: {
          frequency: 'every_day',
          customSchedule: [],
          orderCutoffHours: 24
        },
        nextAvailableDate: new Date().toISOString().split('T')[0],
        nextAvailableTime: '09:00'
      })
    };
    
    onSave(filteredData);
  };

  return (
    <MultiStepForm
      steps={steps}
      formData={formData}
      onSave={handleSave}
      onCancel={onCancel}
    />
  );
};

export default MobileProductForm;

