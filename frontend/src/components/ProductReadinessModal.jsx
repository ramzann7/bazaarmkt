import React from 'react';
import { XMarkIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ProductReadinessModal = ({ product, isOpen, onClose, onAddToCart }) => {
  if (!isOpen || !product) return null;

  const getReadinessDetails = (product) => {
    switch (product.productType) {
      case 'ready_to_ship':
        if (product.stock > 0) {
          return {
            icon: '📦',
            title: 'Ready to Ship',
            status: 'Available Now',
            description: 'This product is in stock and ready for immediate pickup or delivery.',
            details: [
              `Stock Available: ${product.stock} ${product.unit}`,
              'Ready for immediate pickup/delivery',
              product.stock <= (product.lowStockThreshold || 5) ? '⚠️ Low stock - order soon!' : null
            ].filter(Boolean),
            color: 'green',
            actionText: 'Add to Cart - Ready Now',
            urgency: product.stock <= (product.lowStockThreshold || 5) ? 'low-stock' : null
          };
        } else {
          return {
            icon: '❌',
            title: 'Out of Stock',
            status: 'Currently Unavailable',
            description: 'This product is currently out of stock.',
            details: [
              'Check back later for restock',
              'Contact artisan for availability updates'
            ],
            color: 'red',
            actionText: 'Out of Stock',
            urgency: 'out-of-stock'
          };
        }
      
      case 'made_to_order':
        const leadTime = product.leadTime || 1;
        const leadTimeUnit = product.leadTimeUnit || 'days';
        const requiresConfirmation = product.requiresConfirmation !== false;
        
        return {
          icon: '⚙️',
          title: 'Made to Order',
          status: requiresConfirmation ? 'Requires Confirmation' : 'Production Ready',
          description: `This product will be custom-made for you with a ${leadTime} ${leadTimeUnit} lead time.`,
          details: [
            `Production Time: ${leadTime} ${leadTimeUnit}`,
            requiresConfirmation ? 'Order confirmation required before production starts' : 'Production can begin immediately',
            product.maxOrderQuantity ? `Maximum Order: ${product.maxOrderQuantity} units` : null,
            'Custom-made to your specifications'
          ].filter(Boolean),
          color: 'blue',
          actionText: requiresConfirmation ? 'Add to Cart - Confirm Later' : 'Add to Cart - Start Production',
          urgency: requiresConfirmation ? 'confirmation-needed' : null
        };
      
      case 'scheduled_order':
        if (product.nextAvailableDate) {
          const nextDate = new Date(product.nextAvailableDate);
          const today = new Date();
          const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
          
          return {
            icon: '📅',
            title: 'Scheduled Order',
            status: 'Scheduled Production',
            description: `This product will be produced according to a set schedule.`,
            details: [
              `Next Available: ${nextDate.toLocaleDateString()}`,
              daysUntil > 0 ? `Ready in ${daysUntil} days` : 'Ready today',
              product.scheduleType === 'daily' ? 'Daily production schedule' : 'Custom production schedule',
              daysUntil <= 3 ? '🚀 Coming soon!' : null
            ].filter(Boolean),
            color: 'purple',
            actionText: 'Add to Cart - Schedule Order',
            urgency: daysUntil <= 3 ? 'coming-soon' : null
          };
        } else {
          return {
            icon: '❓',
            title: 'Schedule TBD',
            status: 'Production Schedule Not Set',
            description: 'The production schedule for this product has not been determined yet.',
            details: [
              'Contact artisan for availability',
              'Schedule will be set based on demand',
              'Flexible ordering available'
            ],
            color: 'gray',
            actionText: 'Contact Artisan',
            urgency: 'schedule-needed'
          };
        }
      
      default:
        return {
          icon: '📦',
          title: 'Standard Product',
          status: 'Available',
          description: 'This is a standard product with basic availability.',
          details: [
            'Standard processing time',
            'Contact artisan for specific details'
          ],
          color: 'gray',
          actionText: 'Add to Cart',
          urgency: null
        };
    }
  };

  const readinessInfo = getReadinessDetails(product);
  const isOutOfStock = product.productType === 'ready_to_ship' && product.stock <= 0;
  const needsConfirmation = product.productType === 'made_to_order' && product.requiresConfirmation;

  const getColorClasses = (color) => {
    const colorMap = {
      green: 'bg-green-50 border-green-200 text-green-800',
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800'
    };
    return colorMap[color] || colorMap.gray;
  };

  const getButtonClasses = (color, urgency) => {
    if (urgency === 'out-of-stock') {
      return 'bg-gray-300 text-gray-600 cursor-not-allowed';
    }
    
    const colorMap = {
      green: 'bg-green-600 hover:bg-green-700 text-white',
      blue: 'bg-blue-600 hover:bg-blue-700 text-white',
      purple: 'bg-purple-600 hover:bg-purple-700 text-white',
      red: 'bg-red-600 hover:bg-red-700 text-white',
      gray: 'bg-gray-600 hover:bg-gray-700 text-white'
    };
    return colorMap[color] || colorMap.gray;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{readinessInfo.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{readinessInfo.title}</h2>
              <p className="text-sm text-gray-600">{product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium border ${getColorClasses(readinessInfo.color)}`}>
            {readinessInfo.status === 'Available Now' && <CheckCircleIcon className="w-4 h-4 mr-2" />}
            {readinessInfo.status === 'Requires Confirmation' && <ExclamationTriangleIcon className="w-4 h-4 mr-2" />}
            {readinessInfo.status === 'Scheduled Production' && <ClockIcon className="w-4 h-4 mr-2" />}
            {readinessInfo.status}
          </div>

          {/* Description */}
          <p className="text-gray-700">{readinessInfo.description}</p>

          {/* Details List */}
          <div className="space-y-2">
            {readinessInfo.details.map((detail, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-sm text-gray-600">{detail}</span>
              </div>
            ))}
          </div>

          {/* Urgency Warning */}
          {readinessInfo.urgency && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {readinessInfo.urgency === 'low-stock' && 'Low stock - order soon!'}
                  {readinessInfo.urgency === 'confirmation-needed' && 'Order confirmation required'}
                  {readinessInfo.urgency === 'coming-soon' && 'Coming soon - limited availability'}
                  {readinessInfo.urgency === 'schedule-needed' && 'Schedule needs to be determined'}
                </span>
              </div>
            </div>
          )}

          {/* Price Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">Price</span>
              <span className="text-2xl font-bold text-green-600">
                ${product.price}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">per {product.unit}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            
            {!isOutOfStock && (
              <button
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${getButtonClasses(readinessInfo.color, readinessInfo.urgency)}`}
                disabled={isOutOfStock}
              >
                {readinessInfo.actionText}
              </button>
            )}
          </div>
          
          {needsConfirmation && (
            <p className="text-xs text-gray-500 mt-3 text-center">
              ⚠️ This order requires confirmation before production begins
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductReadinessModal;
