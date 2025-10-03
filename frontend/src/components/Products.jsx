import React, { useState, useEffect, useRef } from 'react';
import config from '../config/environment.js';
import { getImageUrl, handleImageError } from '../utils/imageUtils.js';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CameraIcon, 
  XMarkIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  SparklesIcon,
  EyeSlashIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { getMyProducts, createProduct, updateProduct, deleteProduct, uploadImage, updateInventory, getAllProducts } from '../services/productService';
import { getProfile } from '../services/authservice';
import { promotionalService } from '../services/promotionalService';
import ProductPromotions from './ProductPromotions';
import ProductTypeBadge from './ProductTypeBadge';
import DistanceBadge from './DistanceBadge';
import { getAllCategories, getAllSubcategories } from '../data/productReference';
import toast from 'react-hot-toast';

export default function Products() {
  const navigate = useNavigate();
  
  // State variables
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showPromotions, setShowPromotions] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductForPromotions, setSelectedProductForPromotions] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    subcategory: '',
    image: null,
    imagePreview: null,
    
    // Product Type
    productType: 'ready_to_ship',
    
    // Ready to Ship Fields
    stock: '',
    lowStockThreshold: 5,
    
    // Made to Order Fields
    leadTime: '',
    leadTimeUnit: 'days',
    maxOrderQuantity: 10,
    totalCapacity: '',
    remainingCapacity: '',
    capacityPeriod: 'daily',
    
    // Scheduled Order Fields
    scheduleType: 'daily',
    scheduleDetails: {
      frequency: 'every_day',
      customSchedule: [],
      orderCutoffHours: 24
    },
    nextAvailableDate: '',
    availableQuantity: 1,
    
    // Common Fields
    tags: [],
    unit: 'piece',
    weight: '',
    expiryDate: '',
    
    // Enhanced dietary preferences
    isOrganic: false,
    isGlutenFree: false,
    isVegan: false,
    isHalal: false,
    isKosher: false,
    isDairyFree: false,
    isNutFree: false,
    isSoyFree: false,
    isSugarFree: false,
    isLowCarb: false,
    isKetoFriendly: false,
    isPaleo: false,
    isRaw: false
  });
  const [newTag, setNewTag] = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [productPromotions, setProductPromotions] = useState({});
  
  // Refs
  const nameInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Comprehensive product categories from reference data
  const categories = (() => {
    try {
      const categoryData = {};
      const allCategories = getAllCategories();
      
      if (allCategories && Array.isArray(allCategories)) {
        allCategories.forEach(category => {
          const subcategories = getAllSubcategories().filter(sub => sub.categoryKey === category.key);
          categoryData[category.key] = {
            name: category.name,
            subcategories: subcategories.map(sub => ({ key: sub.subcategoryKey, name: sub.subcategoryName }))
          };
        });
      }
      
      return categoryData;
    } catch (error) {
      console.error('Error initializing categories:', error);
      // Return a fallback structure with keys
      return {
        "food_beverages": {
          name: "Food & Beverages",
          subcategories: [
            { key: "baked_goods", name: "Baked Goods" },
            { key: "dairy_products", name: "Dairy Products" },
            { key: "preserves_jams", name: "Preserves & Jams" },
            { key: "beverages", name: "Beverages" }
          ]
        },
        "handmade_crafts": {
          name: "Handmade Crafts",
          subcategories: [
            { key: "jewelry", name: "Jewelry" },
            { key: "pottery_ceramics", name: "Pottery & Ceramics" },
            { key: "textiles_fiber_arts", name: "Textiles & Fiber Arts" },
            { key: "woodworking", name: "Woodworking" }
          ]
        },
        "clothing_accessories": {
          name: "Clothing & Accessories",
          subcategories: [
            { key: "clothing", name: "Clothing" },
            { key: "accessories", name: "Accessories" },
            { key: "shoes_footwear", name: "Shoes & Footwear" },
            { key: "baby_kids", name: "Baby & Kids" }
          ]
        }
      };
    }
  })();

  // Comprehensive unit options organized by category
  const unitCategories = {
    'Count/Quantity': [
      { value: 'piece', label: 'Piece' },
      { value: 'item', label: 'Item' },
      { value: 'unit', label: 'Unit' },
      { value: 'each', label: 'Each' },
      { value: 'dozen', label: 'Dozen' },
      { value: 'half_dozen', label: 'Half Dozen' },
      { value: 'gross', label: 'Gross (144)' }
    ],
    'Weight (Metric)': [
      { value: 'kg', label: 'Kilogram (kg)' },
      { value: 'g', label: 'Gram (g)' },
      { value: 'mg', label: 'Milligram (mg)' },
      { value: 'tonne', label: 'Tonne' }
    ],
    'Weight (Imperial)': [
      { value: 'lb', label: 'Pound (lb)' },
      { value: 'oz', label: 'Ounce (oz)' },
      { value: 'ton', label: 'Ton' },
      { value: 'stone', label: 'Stone' },
      { value: 'grain', label: 'Grain' }
    ],
    'Volume (Metric)': [
      { value: 'liter', label: 'Liter (L)' },
      { value: 'ml', label: 'Milliliter (ml)' },
      { value: 'cl', label: 'Centiliter (cl)' },
      { value: 'dl', label: 'Deciliter (dl)' }
    ],
    'Volume (Imperial)': [
      { value: 'gallon', label: 'Gallon' },
      { value: 'quart', label: 'Quart' },
      { value: 'pint', label: 'Pint' },
      { value: 'cup', label: 'Cup' },
      { value: 'fl_oz', label: 'Fluid Ounce (fl oz)' },
      { value: 'tbsp', label: 'Tablespoon (tbsp)' },
      { value: 'tsp', label: 'Teaspoon (tsp)' },
      { value: 'dash', label: 'Dash' },
      { value: 'drop', label: 'Drop' },
      { value: 'shot', label: 'Shot' }
    ],
    'Length': [
      { value: 'meter', label: 'Meter (m)' },
      { value: 'cm', label: 'Centimeter (cm)' },
      { value: 'mm', label: 'Millimeter (mm)' },
      { value: 'inch', label: 'Inch' },
      { value: 'foot', label: 'Foot' },
      { value: 'yard', label: 'Yard' }
    ],
    'Area': [
      { value: 'sq_meter', label: 'Square Meter (m²)' },
      { value: 'sq_cm', label: 'Square Centimeter (cm²)' },
      { value: 'sq_inch', label: 'Square Inch' },
      { value: 'sq_foot', label: 'Square Foot' }
    ],
    'Food & Beverage': [
      { value: 'bottle', label: 'Bottle' },
      { value: 'can', label: 'Can' },
      { value: 'jar', label: 'Jar' },
      { value: 'bag', label: 'Bag' },
      { value: 'box', label: 'Box' },
      { value: 'pack', label: 'Pack' },
      { value: 'case', label: 'Case' },
      { value: 'carton', label: 'Carton' },
      { value: 'bunch', label: 'Bunch' },
      { value: 'head', label: 'Head' },
      { value: 'clove', label: 'Clove' },
      { value: 'slice', label: 'Slice' },
      { value: 'serving', label: 'Serving' },
      { value: 'portion', label: 'Portion' },
      { value: 'loaf', label: 'Loaf' },
      { value: 'roll', label: 'Roll' },
      { value: 'bun', label: 'Bun' },
      { value: 'muffin', label: 'Muffin' },
      { value: 'cookie', label: 'Cookie' },
      { value: 'cake', label: 'Cake' },
      { value: 'bar', label: 'Bar' },
      { value: 'square', label: 'Square' },
      { value: 'wedge', label: 'Wedge' },
      { value: 'strip', label: 'Strip' },
      { value: 'chunk', label: 'Chunk' },
      { value: 'dash', label: 'Dash' },
      { value: 'pinch', label: 'Pinch' },
      { value: 'sprig', label: 'Sprig' },
      { value: 'stalk', label: 'Stalk' },
      { value: 'ear', label: 'Ear' },
      { value: 'pod', label: 'Pod' },
      { value: 'bulb', label: 'Bulb' },
      { value: 'root', label: 'Root' },
      { value: 'tuber', label: 'Tuber' }
    ],
    'Liquid Containers': [
      { value: 'bottle_ml', label: 'Bottle (ml)' },
      { value: 'bottle_l', label: 'Bottle (L)' },
      { value: 'can_ml', label: 'Can (ml)' },
      { value: 'can_l', label: 'Can (L)' }
    ],
    'Bulk/Wholesale': [
      { value: 'pallet', label: 'Pallet' },
      { value: 'crate', label: 'Crate' },
      { value: 'barrel', label: 'Barrel' },
      { value: 'drum', label: 'Drum' }
    ],
    'Time-based': [
      { value: 'hour', label: 'Hour' },
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
      { value: 'session', label: 'Session' }
    ],
    'Custom/Artisan': [
      { value: 'set', label: 'Set' },
      { value: 'pair', label: 'Pair' },
      { value: 'collection', label: 'Collection' },
      { value: 'batch', label: 'Batch' },
      { value: 'lot', label: 'Lot' }
    ]
  };

  // Flatten all units for backward compatibility
  const units = Object.values(unitCategories).flat().map(unit => unit.value);

  // Helper function to get unit label
  const getUnitLabel = (unitValue) => {
    for (const category of Object.values(unitCategories)) {
      const unit = category.find(u => u.value === unitValue);
      if (unit) return unit.label;
    }
    return unitValue; // Fallback to the value itself
  };


  useEffect(() => {
    console.log('Products component mounted - loading data...');
    loadUserAndProducts();
    loadAllProducts();
  }, []);

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showAddForm) setShowAddForm(false);
        if (editingProduct) setEditingProduct(null);
        if (showPromotions) setShowPromotions(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddForm, editingProduct, showPromotions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          nameInputRef.current && !nameInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load all products for autocomplete suggestions
  const loadAllProducts = async () => {
    try {
      const products = await getAllProducts();
      setAllProducts(products);
    } catch (error) {
      console.error('Error loading all products:', error);
    }
  };

  const loadUserAndProducts = async () => {
    try {
      console.log('Loading user and products...');
      setIsLoading(true);
      const [userData, productsData] = await Promise.all([
        getProfile(),
        getMyProducts()
      ]);
      console.log('User data:', userData);
      console.log('Products data:', productsData);
      setUser(userData.user);
      setProducts(productsData);
      
      // Load promotional data for all products
      const promotionalData = {};
      for (const product of productsData) {
        try {
          const promotions = await promotionalService.getProductPromotions(product._id);
          promotionalData[product._id] = promotions;
        } catch (error) {
          console.error(`Error loading promotions for product ${product._id}:`, error);
          promotionalData[product._id] = [];
        }
      }
      setProductPromotions(promotionalData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('📸 Selected image file for new product:', file);
      console.log('📸 File name:', file.name);
      console.log('📸 File size:', file.size);
      console.log('📸 File type:', file.type);
      setNewProduct({
        ...newProduct,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !newProduct.tags.includes(newTag.trim())) {
      setNewProduct({
        ...newProduct,
        tags: [...newProduct.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setNewProduct({
      ...newProduct,
      tags: newProduct.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Edit form helper functions
  const handleEditAddTag = () => {
    if (editingProduct.newTag && editingProduct.newTag.trim() && !editingProduct.tags.includes(editingProduct.newTag.trim())) {
      setEditingProduct({
        ...editingProduct,
        tags: [...editingProduct.tags, editingProduct.newTag.trim()],
        newTag: ''
      });
    }
  };

  const handleEditRemoveTag = (tagToRemove) => {
    setEditingProduct({
      ...editingProduct,
      tags: editingProduct.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Auto-formatting functions
  const formatProductName = (name) => {
    if (!name) return name;
    // Capitalize first letter of each word, strip all caps, and limit to 15 characters
    const formatted = name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Limit to 15 characters
    return formatted.length > 15 ? formatted.substring(0, 15) : formatted;
  };

  const formatDescription = (description) => {
    if (!description) return description;
    // Limit to 250 characters
    return description.length > 250 ? description.substring(0, 250) + '...' : description;
  };

  // Autocomplete functionality
  const handleNameChange = (e) => {
    const value = e.target.value;
    const formattedValue = formatProductName(value);
    
    setNewProduct({...newProduct, name: formattedValue});
    
    if (value.length >= 2) {
      const suggestions = allProducts
        .filter(product => 
          product.name.toLowerCase().includes(value.toLowerCase()) &&
          product.name.toLowerCase() !== value.toLowerCase()
        )
        .slice(0, 5);
      
      setProductSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
      setProductSuggestions([]);
    }
  };

  // Edit form name change handler
  const handleEditNameChange = (e) => {
    const value = e.target.value;
    const formattedValue = formatProductName(value);
    setEditingProduct({...editingProduct, name: formattedValue});
  };

  const handleSuggestionClick = (suggestion) => {
    setNewProduct({...newProduct, name: suggestion.name});
    setShowSuggestions(false);
    setProductSuggestions([]);
  };

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    const formattedValue = formatDescription(value);
    setNewProduct({...newProduct, description: formattedValue});
  };

  const handlePriceChange = (e) => {
    setNewProduct({...newProduct, price: e.target.value});
  };

  const handleCategoryChange = (e) => {
    setNewProduct({...newProduct, category: e.target.value, subcategory: ''});
  };

  const handleSubcategoryChange = (e) => {
    setNewProduct({...newProduct, subcategory: e.target.value});
  };

  const handleTagChange = (e) => {
    setNewTag(e.target.value);
  };

  // Photo checker
  const checkPhotoWarning = () => {
    return !newProduct.image && newProduct.name && newProduct.description;
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      console.log('Adding product with data:', newProduct);
      const productData = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        weight: parseFloat(newProduct.weight) || null,
        tags: newProduct.tags,
        // Handle product type specific fields
        ...(newProduct.productType === 'ready_to_ship' && {
          stock: parseInt(newProduct.stock) || 0,
          lowStockThreshold: parseInt(newProduct.lowStockThreshold) || 5
        }),
        ...(newProduct.productType === 'made_to_order' && {
          leadTime: parseInt(newProduct.leadTime),
          leadTimeUnit: newProduct.leadTimeUnit,
          maxOrderQuantity: parseInt(newProduct.maxOrderQuantity),
          totalCapacity: parseInt(newProduct.totalCapacity),
          remainingCapacity: parseInt(newProduct.remainingCapacity) || parseInt(newProduct.totalCapacity),
          capacityPeriod: newProduct.capacityPeriod || 'daily'
        }),
        ...(newProduct.productType === 'scheduled_order' && {
          scheduleType: newProduct.scheduleType,
          scheduleDetails: newProduct.scheduleDetails,
          nextAvailableDate: newProduct.nextAvailableDate,
          availableQuantity: parseInt(newProduct.availableQuantity)
        })
        // Keep image as File object if it exists, let createProduct handle the upload
      };
      
      console.log('Sending product data:', productData);
      const savedProduct = await createProduct(productData);
      console.log('✅ Product created successfully:', savedProduct);
      console.log('🖼️ Product image URL:', savedProduct.image);
      setProducts([savedProduct, ...products]);
      
      setNewProduct({
        name: '',
        description: '',
        price: '',
        category: '',
        subcategory: '',
        image: null,
        imagePreview: null,
        
        // Product Type
        productType: 'ready_to_ship',
        
        // Ready to Ship Fields
        stock: '',
        lowStockThreshold: 5,
        
        // Made to Order Fields
        leadTime: '',
        leadTimeUnit: 'days',
        maxOrderQuantity: 10,
        capacityPeriod: 'daily',
        
        // Scheduled Order Fields
        scheduleType: 'daily',
        scheduleDetails: {
          frequency: 'every_day',
          customSchedule: [],
          orderCutoffHours: 24
        },
        nextAvailableDate: '',
        availableQuantity: 1,
        
        // Common Fields
        tags: [],
        unit: 'piece',
        weight: '',
        expiryDate: '',
        
        // Enhanced dietary preferences
        isOrganic: false,
        isGlutenFree: false,
        isVegan: false,
        isHalal: false,
        isKosher: false,
        isDairyFree: false,
        isNutFree: false,
        isSoyFree: false,
        isSugarFree: false,
        isLowCarb: false,
        isKetoFriendly: false,
        isPaleo: false,
        isRaw: false
      });
      setShowAddForm(false);
      toast.success('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(`Failed to add product: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await deleteProduct(productId);
      setProducts(products.filter(p => p._id !== productId));
      toast.success('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handlePromotionalFeatures = (product) => {
    setSelectedProductForPromotions(product);
    setShowPromotions(true);
  };

  const handlePromotionUpdate = () => {
    // Refresh products and promotional data to show updated promotional status
    loadUserAndProducts();
  };

  const handleUpdateStock = async (productId, newStock, fieldType = 'stock') => {
    try {
      const updateData = {};
      updateData[fieldType] = parseInt(newStock);
      
      const updatedProduct = await updateInventory(productId, updateData);
      setProducts(products.map(p => 
        p._id === productId ? updatedProduct : p
      ));
      toast.success('Stock updated successfully!');
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  const handleToggleStatus = async (productId) => {
    try {
      const product = products.find(p => p._id === productId);
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      const updatedProduct = await updateProduct(productId, { status: newStatus });
      setProducts(products.map(p => 
        p._id === productId ? updatedProduct : p
      ));
      toast.success(`Product ${newStatus} successfully!`);
    } catch (error) {
      console.error('Error updating product status:', error);
      toast.error('Failed to update product status');
    }
  };

  const handleOpenAddModal = () => {
    setShowAddForm(true);
    setIsModalOpen(true);
    // Scroll to top of modal
    setTimeout(() => {
      const modal = document.querySelector('.modal-content');
      if (modal) modal.scrollTop = 0;
    }, 100);
  };

  const handleCloseAddModal = () => {
    setShowAddForm(false);
    setIsModalOpen(false);
  };

  const handleEditProduct = (product) => {
    console.log('Editing product:', product);
    console.log('nextAvailableDate:', product.nextAvailableDate);
    console.log('scheduleDetails:', product.scheduleDetails);
    
    setEditingProduct({
      ...product,
      image: null,
      imagePreview: product.image || null,
      newTag: '', // For the tag input field
      
      // Initialize product type fields
      productType: product.productType || 'ready_to_ship',
      stock: product.stock || '',
      lowStockThreshold: product.lowStockThreshold || 5,
      leadTime: product.leadTime || '',
      leadTimeUnit: product.leadTimeUnit || 'days',
      maxOrderQuantity: product.maxOrderQuantity || 10,
      totalCapacity: product.totalCapacity || '',
      remainingCapacity: product.remainingCapacity || product.totalCapacity || '',
      capacityPeriod: product.capacityPeriod || 'daily',
      scheduleType: product.scheduleType || 'daily',
      scheduleDetails: {
        frequency: product.scheduleDetails?.frequency || 'every_day',
        customSchedule: product.scheduleDetails?.customSchedule || [],
        orderCutoffHours: product.scheduleDetails?.orderCutoffHours || 24
      },
      nextAvailableDate: product.nextAvailableDate ? new Date(product.nextAvailableDate).toISOString().split('T')[0] : '',
      availableQuantity: product.availableQuantity || 1,
      
      // Ensure all dietary preferences are initialized
      isOrganic: product.isOrganic || false,
      isGlutenFree: product.isGlutenFree || false,
      isVegan: product.isVegan || false,
      isHalal: product.isHalal || false,
      isKosher: product.isKosher || false,
      isDairyFree: product.isDairyFree || false,
      isNutFree: product.isNutFree || false,
      isSoyFree: product.isSoyFree || false,
      isSugarFree: product.isSugarFree || false,
      isLowCarb: product.isLowCarb || false,
      isKetoFriendly: product.isKetoFriendly || false,
      isPaleo: product.isPaleo || false,
      isRaw: product.isRaw || false,
      
      // Ensure other fields are initialized
      unit: product.unit || 'piece',
      weight: product.weight || '',
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
      tags: product.tags || []
    });
  };

  const handleQuickStockUpdate = async (product) => {
    const newStock = prompt(`Update stock for "${product.name}":`, product.stock || 0);
    if (newStock === null) return; // User cancelled
    
    const stockNumber = parseInt(newStock);
    if (isNaN(stockNumber) || stockNumber < 0) {
      toast.error('Please enter a valid stock number (0 or greater)');
      return;
    }

    try {
      const updatedProduct = await updateInventory(product._id, { 
        stock: stockNumber,
        status: stockNumber === 0 ? 'out_of_stock' : 'active'
      });
      
      // Update the product in the local state
      setProducts(products.map(p => 
        p._id === product._id 
          ? { ...p, stock: stockNumber, status: stockNumber === 0 ? 'out_of_stock' : 'active' }
          : p
      ));
      
      toast.success(`Stock updated to ${stockNumber} for "${product.name}"`);
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  const handleQuickCapacityUpdate = async (product) => {
    const currentCapacity = product.remainingCapacity || 0;
    const totalCapacity = product.totalCapacity || 0;
    const newCapacity = prompt(
      `Add capacity for "${product.name}":\nCurrent: ${currentCapacity}/${totalCapacity}\nEnter amount to add:`, 
      '1'
    );
    if (newCapacity === null) return; // User cancelled
    
    const capacityToAdd = parseInt(newCapacity);
    if (isNaN(capacityToAdd) || capacityToAdd <= 0) {
      toast.error('Please enter a valid capacity amount (greater than 0)');
      return;
    }

    const newRemainingCapacity = currentCapacity + capacityToAdd;
    const newTotalCapacity = totalCapacity + capacityToAdd;

    try {
      const updatedProduct = await updateInventory(product._id, { 
        remainingCapacity: newRemainingCapacity,
        totalCapacity: newTotalCapacity,
        status: newRemainingCapacity > 0 ? 'active' : 'out_of_stock'
      });
      
      // Update the product in the local state
      setProducts(products.map(p => 
        p._id === product._id 
          ? { 
              ...p, 
              remainingCapacity: newRemainingCapacity,
              totalCapacity: newTotalCapacity,
              status: newRemainingCapacity > 0 ? 'active' : 'out_of_stock'
            }
          : p
      ));
      
      toast.success(`Added ${capacityToAdd} capacity for "${product.name}". New capacity: ${newRemainingCapacity}/${newTotalCapacity}`);
    } catch (error) {
      console.error('Error updating capacity:', error);
      toast.error('Failed to update capacity');
    }
  };

  const handleQuickAvailableQuantityUpdate = async (product) => {
    const currentAvailable = product.availableQuantity || 0;
    const newAvailable = prompt(
      `Update available quantity for "${product.name}":\nCurrent: ${currentAvailable}\nEnter new available quantity:`, 
      currentAvailable.toString()
    );
    if (newAvailable === null) return; // User cancelled
    
    const availableNumber = parseInt(newAvailable);
    if (isNaN(availableNumber) || availableNumber < 0) {
      toast.error('Please enter a valid available quantity (0 or greater)');
      return;
    }

    try {
      const updatedProduct = await updateInventory(product._id, { 
        availableQuantity: availableNumber,
        status: availableNumber > 0 ? 'active' : 'out_of_stock'
      });
      
      // Update the product in the local state
      setProducts(products.map(p => 
        p._id === product._id 
          ? { 
              ...p, 
              availableQuantity: availableNumber,
              status: availableNumber > 0 ? 'active' : 'out_of_stock'
            }
          : p
      ));
      
      toast.success(`Available quantity updated to ${availableNumber} for "${product.name}"`);
    } catch (error) {
      console.error('Error updating available quantity:', error);
      toast.error('Failed to update available quantity');
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...editingProduct,
        price: parseFloat(editingProduct.price),
        weight: parseFloat(editingProduct.weight) || null,
        tags: editingProduct.tags,
        
        // Handle product type specific fields
        ...(editingProduct.productType === 'ready_to_ship' && {
          stock: parseInt(editingProduct.stock) || 0,
          lowStockThreshold: parseInt(editingProduct.lowStockThreshold) || 5
        }),
        ...(editingProduct.productType === 'made_to_order' && {
          leadTime: parseInt(editingProduct.leadTime),
          leadTimeUnit: editingProduct.leadTimeUnit,
          maxOrderQuantity: parseInt(editingProduct.maxOrderQuantity),
          totalCapacity: parseInt(editingProduct.totalCapacity),
          remainingCapacity: parseInt(editingProduct.remainingCapacity) || parseInt(editingProduct.totalCapacity),
          capacityPeriod: editingProduct.capacityPeriod || 'daily'
        }),
        ...(editingProduct.productType === 'scheduled_order' && {
          scheduleType: editingProduct.scheduleType,
          scheduleDetails: editingProduct.scheduleDetails,
          nextAvailableDate: editingProduct.nextAvailableDate,
          availableQuantity: parseInt(editingProduct.availableQuantity)
        }),
        
        // Include all dietary preferences
        isOrganic: editingProduct.isOrganic || false,
        isGlutenFree: editingProduct.isGlutenFree || false,
        isVegan: editingProduct.isVegan || false,
        isHalal: editingProduct.isHalal || false,
        isKosher: editingProduct.isKosher || false,
        isDairyFree: editingProduct.isDairyFree || false,
        isNutFree: editingProduct.isNutFree || false,
        isSoyFree: editingProduct.isSoyFree || false,
        isSugarFree: editingProduct.isSugarFree || false,
        isLowCarb: editingProduct.isLowCarb || false,
        isKetoFriendly: editingProduct.isKetoFriendly || false,
        isPaleo: editingProduct.isPaleo || false,
        isRaw: editingProduct.isRaw || false,
        
        // Include other fields
        unit: editingProduct.unit || 'piece',
        expiryDate: editingProduct.expiryDate || null
      };
      
      const updatedProduct = await updateProduct(editingProduct._id, productData);
      console.log('✅ Product updated successfully:', updatedProduct);
      console.log('🖼️ Updated product image URL:', updatedProduct.image);
      setProducts(products.map(p => 
        p._id === editingProduct._id ? updatedProduct : p
      ));
      
      setEditingProduct(null);
      toast.success('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(`Failed to update product: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('📸 Selected image file for edit product:', file);
      console.log('📸 File name:', file.name);
      console.log('📸 File size:', file.size);
      console.log('📸 File type:', file.type);
      setEditingProduct({
        ...editingProduct,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  const handleProductTypeChange = (value) => {
    setEditingProduct(prev => {
      const updated = { ...prev, productType: value };
      
      // Clear fields that are not relevant to the new product type
      if (value === 'ready_to_ship') {
        updated.leadTime = '';
        updated.leadTimeUnit = 'days';
        updated.maxOrderQuantity = 10;
        updated.scheduleType = 'daily';
        updated.scheduleDetails = { frequency: 'every_day', customSchedule: [], orderCutoffHours: 24 };
        updated.nextAvailableDate = '';
        updated.availableQuantity = 1;
        updated.capacityPeriod = 'daily';
      } else if (value === 'made_to_order') {
        updated.stock = '';
        updated.lowStockThreshold = 5;
        updated.scheduleType = 'daily';
        updated.scheduleDetails = { frequency: 'every_day', customSchedule: [], orderCutoffHours: 24 };
        updated.nextAvailableDate = '';
        updated.availableQuantity = 1;
        updated.capacityPeriod = 'daily';
      } else if (value === 'scheduled_order') {
        updated.stock = '';
        updated.lowStockThreshold = 5;
        updated.leadTime = '';
        updated.leadTimeUnit = 'days';
        updated.maxOrderQuantity = 10;
        updated.scheduleType = updated.scheduleType || 'daily';
        updated.scheduleDetails = updated.scheduleDetails || { frequency: 'every_day', customSchedule: [], orderCutoffHours: 24 };
        updated.nextAvailableDate = updated.nextAvailableDate || '';
      }
      
      return updated;
    });
  };

  const handleAddProductTypeChange = (value) => {
    setNewProduct(prev => {
      const updated = { ...prev, productType: value };
      
      // Clear fields that are not relevant to the new product type
      if (value === 'ready_to_ship') {
        updated.leadTime = '';
        updated.leadTimeUnit = 'days';
        updated.maxOrderQuantity = 10;
        updated.scheduleType = 'daily';
        updated.scheduleDetails = { frequency: 'every_day', customSchedule: [], orderCutoffHours: 24 };
        updated.nextAvailableDate = '';
        updated.availableQuantity = 1;
        updated.capacityPeriod = 'daily';
      } else if (value === 'made_to_order') {
        updated.stock = '';
        updated.lowStockThreshold = 5;
        updated.scheduleType = 'daily';
        updated.scheduleDetails = { frequency: 'every_day', customSchedule: [], orderCutoffHours: 24 };
        updated.nextAvailableDate = '';
        updated.availableQuantity = 1;
        updated.capacityPeriod = 'daily';
      } else if (value === 'scheduled_order') {
        updated.stock = '';
        updated.lowStockThreshold = 5;
        updated.leadTime = '';
        updated.leadTimeUnit = 'days';
        updated.maxOrderQuantity = 10;
        updated.scheduleType = updated.scheduleType || 'daily';
        updated.scheduleDetails = updated.scheduleDetails || { frequency: 'every_day', customSchedule: [], orderCutoffHours: 24 };
        updated.nextAvailableDate = updated.nextAvailableDate || '';
      }
      
      return updated;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D77A61]"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#F5F1EA] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#D77A61] rounded-full mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3 font-serif">Product Management</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
              Manage your product inventory, track sales, and keep your customers updated
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Profile</span>
              </button>
              <button 
                onClick={showAddForm ? handleCloseAddModal : handleOpenAddModal}
                className="bg-[#D77A61] text-white px-6 py-3 rounded-xl hover:bg-[#3C6E47] transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                <span>{showAddForm ? 'Cancel' : 'Add New Product'}</span>
              </button>
            </div>
          </div>
        </div>




              

              

              

              

              

        {/* Products List */}
        {products.length > 0 ? (
          <div className="space-y-6">
            {/* Simplified Inventory Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-0">Inventory Overview</h4>
                
                {/* Simple Filter Toggle */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Filter:</span>
                  <select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E6B655] focus:border-transparent transition-all duration-200"
                  >
                    <option value="all">All Products</option>
                    <option value="active">Active Only</option>
                    <option value="ready_to_ship">Ready to Ship</option>
                    <option value="made_to_order">Made to Order</option>
                    <option value="scheduled_order">Scheduled</option>
                  </select>
                </div>
              </div>
              
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-[#F5F1EA] to-[#E6B655] p-4 rounded-lg text-center">
                  <div className="w-10 h-10 bg-[#D77A61] rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white text-sm font-bold">{products.length}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Total</div>
                  <div className="text-xs text-gray-600">Products</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg text-center">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white text-sm font-bold">
                      {products.filter(p => p.productType === 'ready_to_ship' && (p.stock || 0) > 0).length}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">In Stock</div>
                  <div className="text-xs text-gray-600">Ready to Ship</div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg text-center">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white text-sm font-bold">
                      {products.filter(p => p.productType === 'ready_to_ship' && (p.stock || 0) > 0 && (p.stock || 0) <= 5).length}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Low Stock</div>
                  <div className="text-xs text-gray-600">Need Restocking</div>
                </div>
                
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg text-center">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white text-sm font-bold">
                      {products.filter(p => p.productType === 'ready_to_ship' && (p.stock || 0) <= 0).length}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Out of Stock</div>
                  <div className="text-xs text-gray-600">Need Attention</div>
                </div>
              </div>

              {/* Additional Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg text-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white text-sm font-bold">
                      {products.filter(p => p.productType === 'made_to_order').length}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Made to Order</div>
                  <div className="text-xs text-gray-600">Custom Products</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg text-center">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white text-sm font-bold">
                      {products.filter(p => p.productType === 'scheduled_order').length}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Scheduled</div>
                  <div className="text-xs text-gray-600">Time-based Orders</div>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg text-center">
                  <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white text-sm font-bold">{products.reduce((sum, p) => sum + (p.soldCount || 0), 0)}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Total Sold</div>
                  <div className="text-xs text-gray-600">All Time</div>
                </div>
              </div>
              
              {/* Active Filter Indicator */}
              {activeFilter !== 'all' && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-orange-700 font-medium text-sm">
                        {activeFilter === 'ready_to_ship' && '📦 Ready to Ship Products'}
                        {activeFilter === 'made_to_order' && '⚙️ Made to Order Products'}
                        {activeFilter === 'scheduled_order' && '📅 Scheduled Order Products'}
                        {activeFilter === 'active' && '✅ Active Products'}
                      </span>
                      <span className="text-sm text-orange-600">
                        ({products.filter(p => {
                          if (activeFilter === 'active') return p.status === 'active';
                          return p.productType === activeFilter;
                        }).length} products)
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveFilter('all')}
                      className="text-orange-600 hover:text-orange-800 text-sm font-medium underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products
                .filter(product => {
                  if (activeFilter === 'all') return true;
                  if (activeFilter === 'active') return product.status === 'active';
                  return product.productType === activeFilter;
                })
                .map((product) => (
                <div key={product._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Product Image */}
                  <div className="relative h-48 bg-gray-100">
                    {product.image ? (
                      <>
                        <img 
                          src={getImageUrl(product.image)} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onLoad={() => {
                            console.log('✅ Image loaded successfully for product:', product.name, 'URL:', getImageUrl(product.image));
                          }}
                          onError={(e) => handleImageError(e, 'product')}
                        />
                        <div className="w-full h-full flex items-center justify-center text-gray-400 hidden">
                          <CameraIcon className="w-12 h-12" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <CameraIcon className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col space-y-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        product.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status}
                      </span>
                      
                      {/* Promotional Badges */}
                      {productPromotions[product._id] && productPromotions[product._id].length > 0 && (
                        <div className="flex flex-col space-y-1">
                          {promotionalService.getPromotionBadges(productPromotions[product._id]).map((badge, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 text-xs font-bold rounded-full border ${badge.color} shadow-sm`}
                              title={badge.description}
                            >
                              {badge.icon} {badge.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="absolute top-2 left-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all"
                        title="Edit Product"
                      >
                        <PencilIcon className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                                          <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePromotionalFeatures(product)}
                        className="bg-gradient-to-r from-amber-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold hover:from-primary hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                        title="Boost Product Visibility"
                      >
                        <SparklesIcon className="w-3 h-3 mr-1" />
                        Boost
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{product.description}</p>
                    
                    {/* Product Type Badge */}
                    <div className="mb-3">
                      <ProductTypeBadge product={product} showDetails={false} />
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-orange-600">${product.price}</span>
                        <div className="text-right">
                          {product.productType === 'ready_to_ship' && (
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm ${(product.stock || 0) <= 0 ? 'text-red-500' : (product.stock || 0) <= 5 ? 'text-orange-500' : 'text-gray-500'}`}>
                                Stock: {product.stock} {getUnitLabel(product.unit)}
                              </span>
                              <button
                                onClick={() => handleQuickStockUpdate(product)}
                                className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                title="Quick Stock Update"
                              >
                                Update
                              </button>
                            </div>
                          )}
                          {product.productType === 'made_to_order' && (
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm ${(product.remainingCapacity || 0) <= 0 ? 'text-red-500' : (product.remainingCapacity || 0) <= 1 ? 'text-orange-500' : 'text-gray-500'}`}>
                                Available: {product.remainingCapacity || 0}/{product.totalCapacity || 0} {getUnitLabel(product.unit)} • Max: {product.maxOrderQuantity}/order
                              </span>
                              <button
                                onClick={() => handleQuickCapacityUpdate(product)}
                                className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                                title="Add Capacity"
                              >
                                +Add
                              </button>
                            </div>
                          )}
                          {product.productType === 'scheduled_order' && (
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm ${(product.availableQuantity || 0) <= 0 ? 'text-red-500' : (product.availableQuantity || 0) <= 1 ? 'text-orange-500' : 'text-gray-500'}`}>
                                Available: {product.availableQuantity || 0} {getUnitLabel(product.unit)}
                              </span>
                              <button
                                onClick={() => handleQuickAvailableQuantityUpdate(product)}
                                className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                title="Update Available Quantity"
                              >
                                Update
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {product.soldCount > 0 && (
                        <div className="text-sm text-gray-500">
                          Sold: {product.soldCount} {getUnitLabel(product.unit)}
                        </div>
                      )}
                    </div>

                    {/* Categories and Tags */}
                    <div className="space-y-2 mb-3">
                      <div className="flex flex-wrap gap-1">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {product.category}
                        </span>
                        {product.subcategory && (
                          <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                            {product.subcategory}
                          </span>
                        )}
                      </div>
                      {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {product.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                          {product.tags.length > 3 && (
                            <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                              +{product.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dietary Badges */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.isOrganic && (
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Organic
                        </span>
                      )}
                      {product.isGlutenFree && (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          Gluten-Free
                        </span>
                      )}
                      {product.isVegan && (
                        <span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded">
                          Vegan
                        </span>
                      )}
                      {product.isHalal && (
                        <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                          Halal
                        </span>
                      )}
                    </div>

                    {/* Distance Information */}
                    {(product.distance || product.formattedDistance) && (
                      <div className="mb-3">
                        <DistanceBadge 
                          distance={product.distance} 
                          formattedDistance={product.formattedDistance}
                        />
                      </div>
                    )}

                    {/* Product Management */}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between">
                        {product.productType === 'ready_to_ship' && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={product.stock}
                              onChange={(e) => handleUpdateStock(product._id, e.target.value)}
                              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600">{getUnitLabel(product.unit)}</span>
                          </div>
                        )}
                        {product.productType === 'made_to_order' && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={product.totalCapacity}
                              onChange={(e) => handleUpdateStock(product._id, e.target.value, 'totalCapacity')}
                              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600">{getUnitLabel(product.unit)}</span>
                          </div>
                        )}
                        {product.productType === 'scheduled_order' && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={product.availableQuantity}
                              onChange={(e) => handleUpdateStock(product._id, e.target.value, 'availableQuantity')}
                              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600">{getUnitLabel(product.unit)}</span>
                          </div>
                        )}
                        <button
                          onClick={() => handleToggleStatus(product._id)}
                          className={`px-3 py-1 text-xs font-medium rounded ${
                            product.status === 'active'
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {product.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <PlusIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
            <p className="text-sm text-gray-600 mb-4">Start selling by adding your first product</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Add Your First Product
            </button>
          </div>
        )}

        {/* Edit Product Modal */}
        {editingProduct && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
            onClick={() => setEditingProduct(null)}
          >
            <div 
              className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-gray-200 modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">✏️ Edit Product</h2>
                    <p className="text-gray-600">Update your product information to keep it current and appealing</p>
                  </div>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-8 h-8" />
                  </button>
                </div>

                <form onSubmit={handleUpdateProduct} className="space-y-8">
                  {/* Basic Information Section */}
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-200">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <SparklesIcon className="w-5 h-5 mr-2 text-orange-600" />
                      Basic Information
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={editingProduct.name}
                          onChange={handleEditNameChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                          placeholder="e.g., Organic Honeycrisp Apples – 2 lb bag"
                          maxLength="15"
                        />
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <LightBulbIcon className="w-3 h-3 mr-1 text-orange-500" />
                          <span>Use descriptive names that highlight key features</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Price <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-3 text-gray-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={editingProduct.price}
                            onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={editingProduct.category}
                          onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value, subcategory: ''})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="">Select a category</option>
                          {Object.entries(categories).map(([key, category]) => (
                            <option key={key} value={key}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Subcategory</label>
                        <select
                          value={editingProduct.subcategory}
                          onChange={(e) => setEditingProduct({...editingProduct, subcategory: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="">Select a subcategory</option>
                          {editingProduct.category && categories[editingProduct.category]?.subcategories?.map(subcategory => (
                            <option key={subcategory.key} value={subcategory.key}>{subcategory.name}</option>
                          ))}
                        </select>
                      </div>
                      

                    </div>
                  </div>

                  {/* Product Type Selection */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <LightBulbIcon className="w-5 h-5 mr-2 text-indigo-600" />
                      Product Type & Management
                    </h5>
                    
                    <div className="space-y-6">
                      {/* Product Type Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Product Type <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Ready to Ship */}
                          <label className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            editingProduct.productType === 'ready_to_ship' 
                              ? 'border-indigo-500 bg-indigo-50' 
                              : 'border-gray-200 hover:border-indigo-300'
                          }`}>
                            <input
                              type="radio"
                              name="editProductType"
                              value="ready_to_ship"
                              checked={editingProduct.productType === 'ready_to_ship'}
                              onChange={(e) => handleProductTypeChange(e.target.value)}
                              className="sr-only"
                            />
                            <div className="text-center">
                              <div className="text-2xl mb-2">📦</div>
                              <div className="font-semibold text-gray-900">Ready to Ship</div>
                              <div className="text-xs text-gray-600 mt-1">Products in stock, ready for immediate shipping</div>
                            </div>
                          </label>
                          
                          {/* Made to Order */}
                          <label className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            editingProduct.productType === 'made_to_order' 
                              ? 'border-indigo-500 bg-indigo-50' 
                              : 'border-gray-200 hover:border-indigo-300'
                          }`}>
                            <input
                              type="radio"
                              name="editProductType"
                              value="made_to_order"
                              checked={editingProduct.productType === 'made_to_order'}
                              onChange={(e) => handleProductTypeChange(e.target.value)}
                              className="sr-only"
                            />
                            <div className="text-center">
                              <div className="text-2xl mb-2">⚙️</div>
                              <div className="font-semibold text-gray-900">Made to Order</div>
                              <div className="text-xs text-gray-600 mt-1">Custom products made to order specifications</div>
                            </div>
                          </label>
                          
                          {/* Scheduled Orders */}
                          <label className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            editingProduct.productType === 'scheduled_order' 
                              ? 'border-indigo-500 bg-indigo-50' 
                              : 'border-gray-200 hover:border-indigo-300'
                          }`}>
                            <input
                              type="radio"
                              name="editProductType"
                              value="scheduled_order"
                              checked={editingProduct.productType === 'scheduled_order'}
                              onChange={(e) => handleProductTypeChange(e.target.value)}
                              className="sr-only"
                            />
                            <div className="text-center">
                              <div className="text-2xl mb-2">📅</div>
                              <div className="font-semibold text-gray-900">Scheduled Order</div>
                              <div className="text-xs text-gray-600 mt-1">Products made at specific times/dates</div>
                            </div>
                          </label>
                        </div>
                      </div>
                      
                      {/* Product Type Specific Fields */}
                      
                      {/* Common Fields for All Product Types */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                          <select
                            value={editingProduct.unit}
                            onChange={(e) => setEditingProduct({...editingProduct, unit: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          >
                            {Object.entries(unitCategories).map(([category, units]) => (
                              <optgroup key={category} label={category}>
                                {units.map(unit => (
                                  <option key={unit.value} value={unit.value}>
                                    {unit.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (optional)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={editingProduct.weight}
                            onChange={(e) => setEditingProduct({...editingProduct, weight: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                      
                      {editingProduct.productType === 'ready_to_ship' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Stock Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={editingProduct.stock || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value})}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Low Stock Threshold
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editingProduct.lowStockThreshold || 5}
                              onChange={(e) => setEditingProduct({...editingProduct, lowStockThreshold: parseInt(e.target.value)})}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                              placeholder="5"
                            />
                            <p className="text-xs text-gray-500 mt-1">Get notified when stock is low</p>
                          </div>
                        </div>
                      )}
                      
                      {editingProduct.productType === 'made_to_order' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Lead Time <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                required
                                value={editingProduct.leadTime || ''}
                                onChange={(e) => setEditingProduct({...editingProduct, leadTime: e.target.value})}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                placeholder="e.g., 3"
                              />
                              <select
                                value={editingProduct.leadTimeUnit || 'days'}
                                onChange={(e) => setEditingProduct({...editingProduct, leadTimeUnit: e.target.value})}
                                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                              >
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                              </select>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">How long it takes to make this product</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Max Order Quantity
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={editingProduct.maxOrderQuantity || 10}
                              onChange={(e) => setEditingProduct({...editingProduct, maxOrderQuantity: parseInt(e.target.value)})}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                              placeholder="10"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Total Capacity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={editingProduct.totalCapacity || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, totalCapacity: parseInt(e.target.value)})}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                              placeholder="e.g., 10"
                            />
                            <p className="text-xs text-gray-500 mt-1">Maximum capacity for this product</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Remaining Capacity
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editingProduct.remainingCapacity || editingProduct.totalCapacity || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, remainingCapacity: parseInt(e.target.value)})}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                              placeholder="e.g., 8"
                            />
                            <p className="text-xs text-gray-500 mt-1">Available capacity (starts equal to total capacity)</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Capacity Period <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={editingProduct.capacityPeriod || 'daily'}
                              onChange={(e) => setEditingProduct({...editingProduct, capacityPeriod: e.target.value})}
                              required
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">How often does your production capacity reset?</p>
                          </div>

                        </div>
                      )}
                      
                      {editingProduct.productType === 'scheduled_order' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Schedule Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              required
                              value={editingProduct.scheduleType || 'daily'}
                              onChange={(e) => setEditingProduct({...editingProduct, scheduleType: e.target.value})}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="custom">Custom Schedule</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Next Available Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              required
                              value={editingProduct.nextAvailableDate || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, nextAvailableDate: e.target.value})}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Order Cut-off (Hours)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={editingProduct.scheduleDetails?.orderCutoffHours || 24}
                              onChange={(e) => setEditingProduct({
                                ...editingProduct, 
                                scheduleDetails: {
                                  ...editingProduct.scheduleDetails,
                                  orderCutoffHours: parseInt(e.target.value)
                                }
                              })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                              placeholder="24"
                            />
                            <p className="text-xs text-gray-500 mt-1">How many hours before production to stop taking orders</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Available Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={editingProduct.availableQuantity || 1}
                              onChange={(e) => setEditingProduct({...editingProduct, availableQuantity: e.target.value})}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                              placeholder="1"
                            />
                            <p className="text-xs text-gray-500 mt-1">How many items you will make for this scheduled production</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>



                  {/* Description Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <PencilIcon className="w-5 h-5 mr-2 text-blue-600" />
                      Product Description
                    </h5>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        value={editingProduct.description}
                        onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                        placeholder="Describe your product's features, benefits, and what makes it special. Include details about ingredients, origin, or craftsmanship."
                      />
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <LightBulbIcon className="w-3 h-3 mr-1 text-blue-500" />
                          <span>Highlight what makes your product unique</span>
                        </div>
                        <span className={`text-xs font-medium ${editingProduct.description.length > 250 ? 'text-red-500' : 'text-gray-500'}`}>
                          {editingProduct.description.length}/250
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Image Upload Section */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CameraIcon className="w-5 h-5 mr-2 text-green-600" />
                      Product Images
                    </h5>
                    
                    <div className="space-y-4">
                      {/* Drag & Drop Zone */}
                      <div
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                          editingProduct.imagePreview || editingProduct.image
                            ? 'border-green-300 bg-green-50' 
                            : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-green-400', 'bg-green-50');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          if (!editingProduct.imagePreview && !editingProduct.image) {
                            e.currentTarget.classList.remove('border-green-400', 'bg-green-50');
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const files = e.dataTransfer.files;
                          if (files.length > 0) {
                            handleEditImageChange({ target: { files } });
                          }
                        }}
                      >
                        {(editingProduct.imagePreview || editingProduct.image) ? (
                          <div className="relative inline-block">
                            <img 
                              src={editingProduct.imagePreview || getImageUrl(editingProduct.image)} 
                              alt="Preview"
                              className="w-32 h-32 object-cover rounded-lg border border-gray-300 shadow-md"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingProduct({...editingProduct, image: null, imagePreview: null})}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div>
                            <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-lg font-medium text-gray-700 mb-2">Upload Product Image</p>
                            <p className="text-sm text-gray-500 mb-4">
                              Drag and drop an image here, or click to browse
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditImageChange}
                              className="hidden"
                              id="edit-image-upload"
                            />
                            <label
                              htmlFor="edit-image-upload"
                              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                            >
                              <CameraIcon className="w-4 h-4 mr-2" />
                              Choose Image
                            </label>
                          </div>
                        )}
                      </div>
                      
                      {/* Image Tips */}
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <h6 className="font-medium text-gray-900 mb-2">📸 Image Tips</h6>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Use high-quality, well-lit photos</li>
                          <li>• Show your product from multiple angles</li>
                          <li>• Include size reference when helpful</li>
                          <li>• Ensure the background is clean and uncluttered</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Dietary Preferences Section */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CheckIcon className="w-5 h-5 mr-2 text-purple-600" />
                      Dietary & Lifestyle Preferences
                    </h5>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {/* Organic */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isOrganic || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isOrganic: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🌱 Organic</span>
                      </label>
                      
                      {/* Gluten-Free */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isGlutenFree || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isGlutenFree: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🌾 Gluten-Free</span>
                      </label>
                      
                      {/* Vegan */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isVegan || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isVegan: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🥬 Vegan</span>
                      </label>
                      
                      {/* Halal */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isHalal || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isHalal: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🕌 Halal</span>
                      </label>
                      
                      {/* Kosher */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isKosher || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isKosher: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">✡️ Kosher</span>
                      </label>
                      
                      {/* Dairy-Free */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isDairyFree || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isDairyFree: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🥛 Dairy-Free</span>
                      </label>
                      
                      {/* Nut-Free */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isNutFree || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isNutFree: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🥜 Nut-Free</span>
                      </label>
                      
                      {/* Soy-Free */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isSoyFree || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isSoyFree: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🫘 Soy-Free</span>
                      </label>
                      
                      {/* Sugar-Free */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isSugarFree || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isSugarFree: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🍯 Sugar-Free</span>
                      </label>
                      
                      {/* Low-Carb */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isLowCarb || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isLowCarb: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🥗 Low-Carb</span>
                      </label>
                      
                      {/* Keto-Friendly */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isKetoFriendly || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isKetoFriendly: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🥑 Keto-Friendly</span>
                      </label>
                      
                      {/* Paleo */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isPaleo || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isPaleo: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🦴 Paleo</span>
                      </label>
                      
                      {/* Raw */}
                      <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.isRaw || false}
                          onChange={(e) => setEditingProduct({...editingProduct, isRaw: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🥕 Raw</span>
                      </label>
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <SparklesIcon className="w-5 h-5 mr-2 text-indigo-600" />
                      Tags & Keywords
                    </h5>
                    
                    <div className="space-y-4">
                      <div className="flex space-x-3">
                        <input
                          type="text"
                          value={editingProduct.newTag || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, newTag: e.target.value})}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleEditAddTag())}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          placeholder="Add tags like 'local', 'fresh', 'handmade'..."
                        />
                        <button
                          type="button"
                          onClick={handleEditAddTag}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                        >
                          Add Tag
                        </button>
                      </div>
                      
                      {editingProduct.tags && editingProduct.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {editingProduct.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleEditRemoveTag(tag)}
                                className="ml-2 text-indigo-600 hover:text-indigo-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500">
                        💡 Tags help customers find your products. Use descriptive keywords like "local", "fresh", "handmade", "artisan", etc.
                      </div>
                    </div>
                  </div>

                  {/* Additional Details Section */}
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl border border-gray-200">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <PencilIcon className="w-5 h-5 mr-2 text-gray-600" />
                      Additional Details
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date (optional)</label>
                        <input
                          type="date"
                          value={editingProduct.expiryDate || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, expiryDate: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                      

                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
                    >
                      <CheckIcon className="w-5 h-5 mr-2" />
                      Update Product
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-8 py-4 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Promotional Features Modal */}
        {showPromotions && selectedProductForPromotions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Promotional Features - {selectedProductForPromotions.name}
                </h2>
                <button
                  onClick={() => setShowPromotions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <ProductPromotions 
                product={selectedProductForPromotions}
                onPromotionUpdate={handlePromotionUpdate}
              />
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Modals - Outside Main Container */}
    {/* Add Product Modal */}
    {showAddForm && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        onClick={handleCloseAddModal}
      >
        <div 
          className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-gray-200 modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-3xl font-bold text-gray-900 mb-2">✨ Add New Product</h4>
                <p className="text-gray-600">Create a compelling product listing that will attract customers</p>
              </div>
              <button
                onClick={handleCloseAddModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-8 h-8" />
              </button>
            </div>
            
            <form onSubmit={handleAddProduct} className="space-y-8">
              {/* Basic Information Section */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-200">
                <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <SparklesIcon className="w-5 h-5 mr-2 text-orange-600" />
                  Basic Information
                </h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      required
                      value={newProduct.name}
                      onChange={handleNameChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., Organic Honeycrisp Apples – 2 lb bag"
                      maxLength="15"
                    />
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <LightBulbIcon className="w-3 h-3 mr-1 text-orange-500" />
                      <span>Use descriptive names that highlight key features</span>
                    </div>
                    
                    {/* Autocomplete suggestions */}
                    {showSuggestions && (
                      <div 
                        ref={suggestionsRef}
                        className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-xl max-h-48 overflow-y-auto"
                      >
                        {productSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{suggestion.name}</div>
                            <div className="text-xs text-gray-500">Existing product</div>
                          </div>
                        ))}
                        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 rounded-b-xl">
                          Click to use existing name or continue typing for a new product
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value, subcategory: ''})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select a category</option>
                      {Object.entries(categories).map(([key, category]) => (
                        <option key={key} value={key}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subcategory</label>
                    <select
                      value={newProduct.subcategory}
                      onChange={(e) => setNewProduct({...newProduct, subcategory: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select a subcategory</option>
                      {newProduct.category && categories[newProduct.category]?.subcategories?.map(subcategory => (
                        <option key={subcategory.key} value={subcategory.key}>{subcategory.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Type & Management Section */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <LightBulbIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  Product Type & Management
                </h5>
                
                <div className="space-y-6">
                  {/* Product Type Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Product Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Ready to Ship */}
                      <label className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        newProduct.productType === 'ready_to_ship' 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}>
                        <input
                          type="radio"
                          name="productType"
                          value="ready_to_ship"
                          checked={newProduct.productType === 'ready_to_ship'}
                          onChange={(e) => handleAddProductTypeChange(e.target.value)}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className="text-2xl mb-2">📦</div>
                          <div className="font-semibold text-gray-900">Ready to Ship</div>
                          <div className="text-xs text-gray-600 mt-1">Products in stock, ready for immediate shipping</div>
                        </div>
                      </label>
                      
                      {/* Made to Order */}
                      <label className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        newProduct.productType === 'made_to_order' 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}>
                        <input
                          type="radio"
                          name="productType"
                          value="made_to_order"
                          checked={newProduct.productType === 'made_to_order'}
                          onChange={(e) => handleAddProductTypeChange(e.target.value)}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className="text-2xl mb-2">⚙️</div>
                          <div className="font-semibold text-gray-900">Made to Order</div>
                          <div className="text-xs text-gray-600 mt-1">Custom products made to order specifications</div>
                        </div>
                      </label>
                      
                      {/* Scheduled Orders */}
                      <label className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        newProduct.productType === 'scheduled_order' 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}>
                        <input
                          type="radio"
                          name="productType"
                          value="scheduled_order"
                          checked={newProduct.productType === 'scheduled_order'}
                          onChange={(e) => handleAddProductTypeChange(e.target.value)}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className="text-2xl mb-2">📅</div>
                          <div className="font-semibold text-gray-900">Scheduled Orders</div>
                          <div className="text-xs text-gray-600 mt-1">Products made at specific times/dates</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Common Fields for All Product Types */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                      <select
                        value={newProduct.unit}
                        onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      >
                        {Object.entries(unitCategories).map(([category, units]) => (
                          <optgroup key={category} label={category}>
                            {units.map(unit => (
                              <option key={unit.value} value={unit.value}>
                                {unit.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (optional)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={newProduct.weight}
                        onChange={(e) => setNewProduct({...newProduct, weight: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  {/* Product Type Specific Fields */}
                  {newProduct.productType === 'ready_to_ship' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Stock Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={newProduct.stock}
                          onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Low Stock Threshold
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newProduct.lowStockThreshold}
                          onChange={(e) => setNewProduct({...newProduct, lowStockThreshold: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          placeholder="5"
                        />
                        <p className="text-xs text-gray-500 mt-1">Get notified when stock is low</p>
                      </div>
                    </div>
                  )}
                  
                  {newProduct.productType === 'made_to_order' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Lead Time <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            required
                            value={newProduct.leadTime}
                            onChange={(e) => setNewProduct({...newProduct, leadTime: e.target.value})}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            placeholder="e.g., 3"
                          />
                          <select
                            value={newProduct.leadTimeUnit}
                            onChange={(e) => setNewProduct({...newProduct, leadTimeUnit: e.target.value})}
                            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          >
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                          </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">How long it takes to make this product</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Max Order Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newProduct.maxOrderQuantity}
                          onChange={(e) => setNewProduct({...newProduct, maxOrderQuantity: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          placeholder="10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Total Capacity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={newProduct.totalCapacity}
                          onChange={(e) => setNewProduct({...newProduct, totalCapacity: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          placeholder="e.g., 10"
                        />
                        <p className="text-xs text-gray-500 mt-1">Maximum capacity for this product</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Remaining Capacity
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newProduct.remainingCapacity || newProduct.totalCapacity}
                          onChange={(e) => setNewProduct({...newProduct, remainingCapacity: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          placeholder="e.g., 8"
                        />
                        <p className="text-xs text-gray-500 mt-1">Available capacity (starts equal to total capacity)</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Capacity Period <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newProduct.capacityPeriod}
                          onChange={(e) => setNewProduct({...newProduct, capacityPeriod: e.target.value})}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">How often does your production capacity reset?</p>
                      </div>

                    </div>
                  )}
                  
                  {newProduct.productType === 'scheduled_order' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Schedule Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={newProduct.scheduleType}
                          onChange={(e) => setNewProduct({...newProduct, scheduleType: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="custom">Custom Schedule</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Next Available Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={newProduct.nextAvailableDate}
                          onChange={(e) => setNewProduct({...newProduct, nextAvailableDate: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Order Cut-off (Hours)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newProduct.scheduleDetails.orderCutoffHours}
                          onChange={(e) => setNewProduct({
                            ...newProduct, 
                            scheduleDetails: {
                              ...newProduct.scheduleDetails,
                              orderCutoffHours: parseInt(e.target.value)
                            }
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          placeholder="24"
                        />
                        <p className="text-xs text-gray-500 mt-1">How many hours before production to stop taking orders</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Available Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={newProduct.availableQuantity}
                          onChange={(e) => setNewProduct({...newProduct, availableQuantity: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          placeholder="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">How many items you will make for this scheduled production</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <PencilIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Product Description
                </h5>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Describe your product's features, benefits, and what makes it special. Include details about ingredients, origin, or craftsmanship."
                  />
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <LightBulbIcon className="w-3 h-3 mr-1 text-blue-500" />
                      <span>Highlight what makes your product unique</span>
                    </div>
                    <span className={`text-xs font-medium ${newProduct.description.length > 250 ? 'text-red-500' : 'text-gray-500'}`}>
                      {newProduct.description.length}/250
                    </span>
                  </div>
                </div>
              </div>

              {/* Enhanced Image Upload Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CameraIcon className="w-5 h-5 mr-2 text-green-600" />
                  Product Images
                </h5>
                
                <div className="space-y-4">
                  {/* Drag & Drop Zone */}
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                      newProduct.imagePreview 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-green-400', 'bg-green-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (!newProduct.imagePreview) {
                        e.currentTarget.classList.remove('border-green-400', 'bg-green-50');
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        handleImageChange({ target: { files } });
                      }
                    }}
                  >
                    {newProduct.imagePreview ? (
                      <div className="relative inline-block">
                        <img 
                          src={newProduct.imagePreview} 
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-300 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => setNewProduct({...newProduct, image: null, imagePreview: null})}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div>
                        <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-700 mb-2">Upload Product Image</p>
                        <p className="text-sm text-gray-500 mb-4">
                          Drag and drop an image here, or click to browse
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                        >
                          <CameraIcon className="w-4 h-4 mr-2" />
                          Choose Image
                        </label>
                      </div>
                    )}
                  </div>
                  
                  {/* Image Tips */}
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h6 className="font-medium text-gray-900 mb-2">📸 Image Tips</h6>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Use high-quality, well-lit photos</li>
                      <li>• Show your product from multiple angles</li>
                      <li>• Include size reference when helpful</li>
                      <li>• Ensure the background is clean and uncluttered</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Enhanced Dietary Preferences Section */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckIcon className="w-5 h-5 mr-2 text-purple-600" />
                  Dietary & Lifestyle Preferences
                </h5>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Organic */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isOrganic}
                      onChange={(e) => setNewProduct({...newProduct, isOrganic: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🌱 Organic</span>
                  </label>
                  
                  {/* Gluten-Free */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isGlutenFree}
                      onChange={(e) => setNewProduct({...newProduct, isGlutenFree: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🌾 Gluten-Free</span>
                  </label>
                  
                  {/* Vegan */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isVegan}
                      onChange={(e) => setNewProduct({...newProduct, isVegan: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🥬 Vegan</span>
                  </label>
                  
                  {/* Halal */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isHalal}
                      onChange={(e) => setNewProduct({...newProduct, isHalal: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🕌 Halal</span>
                  </label>
                  
                  {/* Kosher */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isKosher || false}
                      onChange={(e) => setNewProduct({...newProduct, isKosher: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">✡️ Kosher</span>
                  </label>
                  
                  {/* Dairy-Free */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isDairyFree || false}
                      onChange={(e) => setNewProduct({...newProduct, isDairyFree: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🥛 Dairy-Free</span>
                  </label>
                  
                  {/* Nut-Free */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isNutFree || false}
                      onChange={(e) => setNewProduct({...newProduct, isNutFree: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🥜 Nut-Free</span>
                  </label>
                  
                  {/* Soy-Free */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isSoyFree || false}
                      onChange={(e) => setNewProduct({...newProduct, isSoyFree: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🫘 Soy-Free</span>
                  </label>
                  
                  {/* Sugar-Free */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isSugarFree || false}
                      onChange={(e) => setNewProduct({...newProduct, isSugarFree: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🍯 Sugar-Free</span>
                  </label>
                  
                  {/* Low-Carb */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isLowCarb || false}
                      onChange={(e) => setNewProduct({...newProduct, isLowCarb: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🥗 Low-Carb</span>
                  </label>
                  
                  {/* Keto-Friendly */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isKetoFriendly || false}
                      onChange={(e) => setNewProduct({...newProduct, isKetoFriendly: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🥑 Keto-Friendly</span>
                  </label>
                  
                  {/* Paleo */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isPaleo || false}
                      onChange={(e) => setNewProduct({...newProduct, isPaleo: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🦴 Paleo</span>
                  </label>
                  
                  {/* Raw */}
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isRaw || false}
                      onChange={(e) => setNewProduct({...newProduct, isRaw: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">🥕 Raw</span>
                  </label>
                </div>
              </div>

              {/* Tags Section */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
                <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <SparklesIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  Tags & Keywords
                </h5>
                
                <div className="space-y-4">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      placeholder="Add tags like 'local', 'fresh', 'handmade'..."
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Add Tag
                    </button>
                  </div>
                  
                  {newProduct.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newProduct.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-indigo-600 hover:text-indigo-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    💡 Tags help customers find your products. Use descriptive keywords like "local", "fresh", "handmade", "artisan", etc.
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Product
                </button>
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-8 py-4 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

