import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { productService } from '../services/productService';
import InventoryModel from '../models/InventoryModel';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/products` : '/api/products';

const InventoryManagement = ({ 
  product, 
  onInventoryUpdate, 
  className = "" 
}) => {
  const [inventoryModel, setInventoryModel] = useState(null);

  // Initialize inventory model from product
  useEffect(() => {
    if (product) {
      setInventoryModel(new InventoryModel(product));
    }
  }, [product._id, product.stock, product.totalCapacity, product.remainingCapacity, product.availableQuantity, product.capacityPeriod]);

  // Handle stock updates for ready-to-ship products
  const handleStockUpdate = async (newStock) => {
    if (!inventoryModel) return;

    const validation = inventoryModel.validateInventoryUpdate('stock', newStock);
    if (!validation.isValid) {
      toast.error(validation.errors.join(', '));
      return;
    }

    try {
      const response = await axios.put(`${API_URL}/${product._id}/inventory`, { 
        stock: newStock 
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const updatedProduct = response.data.product;
      // Create new inventory model with updated data
      const newInventoryModel = new InventoryModel(updatedProduct);
      setInventoryModel(newInventoryModel);
      onInventoryUpdate?.(updatedProduct);
      toast.success('Stock updated successfully!');
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  // Handle total capacity updates for made-to-order products
  const handleTotalCapacityUpdate = async (newTotalCapacity) => {
    if (!inventoryModel) return;

    const validation = inventoryModel.validateInventoryUpdate('totalCapacity', newTotalCapacity);
    if (!validation.isValid) {
      toast.error(validation.errors.join(', '));
      return;
    }

    try {
      console.log('🔍 Current inventory data:', inventoryModel.inventoryData);
      console.log('🔍 New total capacity:', newTotalCapacity);
      
      const capacityCalculation = inventoryModel.calculateRemainingCapacity(newTotalCapacity);
      console.log('🔍 Capacity calculation result:', capacityCalculation);
      
      const response = await axios.put(`${API_URL}/${product._id}/inventory`, { 
        totalCapacity: capacityCalculation.totalCapacity,
        remainingCapacity: capacityCalculation.remainingCapacity
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const updatedProduct = response.data.product;
      
      console.log('🔍 Updated product from API:', updatedProduct);
      
      // Create new inventory model with updated data
      const newInventoryModel = new InventoryModel(updatedProduct);
      setInventoryModel(newInventoryModel);
      onInventoryUpdate?.(updatedProduct);
      toast.success(`Total capacity updated! New capacity: ${capacityCalculation.totalCapacity}, Remaining: ${capacityCalculation.remainingCapacity}`);
    } catch (error) {
      console.error('Error updating total capacity:', error);
      toast.error('Failed to update total capacity');
    }
  };

  // Handle available quantity updates for scheduled order products
  const handleAvailableQuantityUpdate = async (newAvailableQuantity) => {
    if (!inventoryModel) return;

    const validation = inventoryModel.validateInventoryUpdate('availableQuantity', newAvailableQuantity);
    if (!validation.isValid) {
      toast.error(validation.errors.join(', '));
      return;
    }

    try {
      const response = await axios.put(`${API_URL}/${product._id}/inventory`, { 
        availableQuantity: newAvailableQuantity
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const updatedProduct = response.data.product;
      // Create new inventory model with updated data
      const newInventoryModel = new InventoryModel(updatedProduct);
      setInventoryModel(newInventoryModel);
      onInventoryUpdate?.(updatedProduct);
      toast.success('Available quantity updated successfully!');
    } catch (error) {
      console.error('Error updating available quantity:', error);
      toast.error('Failed to update available quantity');
    }
  };

  // Render inventory input based on product type
  const renderInventoryInput = () => {
    if (!inventoryModel) return null;

    const displayData = inventoryModel.getInventoryDisplayData();
    if (!displayData) return null;

    switch (product.productType) {
      case 'ready_to_ship':
        return (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{displayData.label}:</span>
            <input
              type="number"
              min="0"
              defaultValue={displayData.current}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
              onBlur={(e) => {
                const newValue = parseInt(e.target.value);
                if (newValue !== displayData.current && !isNaN(newValue)) {
                  handleStockUpdate(newValue);
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const newValue = parseInt(e.target.value);
                  if (newValue !== displayData.current && !isNaN(newValue)) {
                    handleStockUpdate(newValue);
                  }
                }
              }}
            />
            <span className="text-xs text-gray-500">{displayData.unit}</span>
          </div>
        );

      case 'made_to_order':
        return (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Total Capacity:</span>
            <input
              type="number"
              min="0"
              defaultValue={inventoryModel.inventoryData.totalCapacity}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
              onBlur={(e) => {
                const newValue = parseInt(e.target.value);
                if (newValue !== inventoryModel.inventoryData.totalCapacity && !isNaN(newValue)) {
                  handleTotalCapacityUpdate(newValue);
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const newValue = parseInt(e.target.value);
                  if (newValue !== inventoryModel.inventoryData.totalCapacity && !isNaN(newValue)) {
                    handleTotalCapacityUpdate(newValue);
                  }
                }
              }}
            />
            <span className="text-xs text-gray-500">
              {displayData.period} • {displayData.unit}
            </span>
          </div>
        );

      case 'scheduled_order':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{displayData.label}:</span>
              <input
                type="number"
                min="0"
                defaultValue={displayData.current}
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                onBlur={(e) => {
                  const newValue = parseInt(e.target.value);
                  if (newValue !== displayData.current && !isNaN(newValue)) {
                    handleAvailableQuantityUpdate(newValue);
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const newValue = parseInt(e.target.value);
                    if (newValue !== displayData.current && !isNaN(newValue)) {
                      handleAvailableQuantityUpdate(newValue);
                    }
                  }
                }}
              />
              <span className="text-xs text-gray-500">{displayData.unit}</span>
            </div>
            {inventoryModel.inventoryData.nextAvailableDate && (
              <div className="text-xs text-gray-500">
                Production: {new Date(inventoryModel.inventoryData.nextAvailableDate).toLocaleDateString()}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Render inventory display for product list
  const renderInventoryDisplay = () => {
    switch (product.productType) {
      case 'ready_to_ship':
        return (
          <>
            <p className={`${inventoryData.stock <= 5 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
              {inventoryData.stock}
            </p>
            {inventoryData.stock <= 5 && (
              <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">Low Stock!</span>
            )}
          </>
        );

      case 'made_to_order':
        return (
          <>
            <p className={`${(inventoryData.remainingCapacity || 0) <= 1 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
              {(inventoryData.remainingCapacity || 0)}/{inventoryData.totalCapacity || 0}
            </p>
            {(inventoryData.remainingCapacity || 0) <= 1 && (
              <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">Low Capacity!</span>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {inventoryData.capacityPeriod || 'per period'}
            </p>
          </>
        );

      case 'scheduled_order':
        return (
          <>
            <p className={`${inventoryData.availableQuantity <= 5 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
              {inventoryData.availableQuantity}
            </p>
            {inventoryData.availableQuantity <= 5 && (
              <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">Low Available!</span>
            )}
          </>
        );

      default:
        return null;
    }
  };

  if (!product) return null;

  return (
    <div className={`bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {renderInventoryInput()}
    </div>
  );
};

// Export both the component and the display function for use in product lists
export const InventoryDisplay = ({ product }) => {
  const inventoryModel = new InventoryModel(product);
  const displayData = inventoryModel.getInventoryDisplayData();
  const status = inventoryModel.getInventoryStatus();

  if (!displayData) return null;

  return (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center space-x-2">
        <p className={`${displayData.isLow ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
          {displayData.total ? `${displayData.current}/${displayData.total}` : displayData.current}
        </p>
        {displayData.isLow && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            status.color === 'red' ? 'text-red-500 bg-red-50' :
            status.color === 'yellow' ? 'text-yellow-500 bg-yellow-50' :
            'text-gray-500 bg-gray-50'
          }`}>
            {displayData.lowMessage}
          </span>
        )}
      </div>
      {displayData.period && (
        <p className="text-xs text-gray-500 font-medium">
          {displayData.period}
        </p>
      )}
    </div>
  );
};

export default InventoryManagement;
