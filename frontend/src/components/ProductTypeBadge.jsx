import React from 'react';

const ProductTypeBadge = ({ product, showDetails = true, variant = 'default' }) => {
  if (!product.productType) {
    return null;
  }

  const getBadgeConfig = (productType) => {
    switch (productType) {
      case 'ready_to_ship':
        return {
          icon: '📦',
          label: 'Ready to Ship',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          accentColor: 'text-green-600'
        };
      case 'made_to_order':
        return {
          icon: '⚙️',
          label: 'Made to Order',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          accentColor: 'text-blue-600'
        };
      case 'scheduled_order':
        return {
          icon: '📅',
          label: 'Scheduled Order',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200',
          accentColor: 'text-purple-600'
        };
      default:
        return null;
    }
  };

  const getReadinessInfo = (product) => {
    switch (product.productType) {
      case 'ready_to_ship':
        if (product.stock > 0) {
          return {
            status: 'Available Now',
            description: `In stock: ${product.stock} ${product.unit}`,
            timeFrame: 'Ready for immediate pickup/delivery',
            urgency: product.stock <= (product.lowStockThreshold || 5) ? 'Low stock' : null
          };
        } else {
          return {
            status: 'Out of Stock',
            description: 'Currently unavailable',
            timeFrame: 'Check back later for restock',
            urgency: 'Out of stock'
          };
        }
      
      case 'made_to_order':
        const leadTime = product.leadTime || 1;
        const leadTimeUnit = product.leadTimeUnit || 'days';
        
        return {
          status: 'Production Ready',
          description: `Lead time: ${leadTime} ${leadTimeUnit}`,
          timeFrame: `Ready in ${leadTime} ${leadTimeUnit}`,
          urgency: null,
          maxOrder: product.maxOrderQuantity ? `Max: ${product.maxOrderQuantity} units per order` : null,
          totalCapacity: product.totalCapacity ? `Total capacity: ${product.totalCapacity} units` : null
        };
      
      case 'scheduled_order':
        if (product.nextAvailableDate) {
          const nextDate = new Date(product.nextAvailableDate);
          const today = new Date();
          const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
          const availableQty = product.availableQuantity || 0;
          
          return {
            status: 'Scheduled Production',
            description: `Next available: ${nextDate.toLocaleDateString()}`,
            timeFrame: daysUntil > 0 ? `Ready in ${daysUntil} days` : 'Ready today',
            urgency: daysUntil <= 3 ? 'Coming soon' : null,
            schedule: product.scheduleType === 'daily' ? 'Daily production' : 'Custom schedule',
            availableQuantity: `${availableQty} ${product.unit || 'units'} available`
          };
        } else {
          return {
            status: 'Schedule TBD',
            description: 'Production schedule not set',
            timeFrame: 'Contact artisan for availability',
            urgency: 'Schedule needed'
          };
        }
      
      default:
        return null;
    }
  };

  const config = getBadgeConfig(product.productType);
  const readinessInfo = getReadinessInfo(product);
  
  if (!config || !readinessInfo) return null;

  // Compact variant for small cards
  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-1">
        <span className={`inline-block ${config.bgColor} ${config.textColor} text-xs px-2 py-1 rounded-full font-medium border ${config.borderColor}`}>
          {config.icon} {config.label}
        </span>
        {showDetails && (
          <div className="text-xs text-gray-600">
            {readinessInfo.timeFrame}
          </div>
        )}
      </div>
    );
  }

  // Detailed variant for cart and checkout
  if (variant === 'detailed') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className={`inline-block ${config.bgColor} ${config.textColor} text-sm px-3 py-1 rounded-full font-medium border ${config.borderColor}`}>
            {config.icon} {config.label}
          </span>
          {readinessInfo.urgency && (
            <span className="text-xs px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
              ⚠️ {readinessInfo.urgency}
            </span>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-900">
            {readinessInfo.status}
          </div>
          <div className="text-sm text-gray-600">
            {readinessInfo.description}
          </div>
          <div className="text-sm font-medium text-gray-800">
            {readinessInfo.timeFrame}
          </div>
          {readinessInfo.maxOrder && (
            <div className="text-xs text-gray-500">
              {readinessInfo.maxOrder}
            </div>
          )}
          {readinessInfo.schedule && (
            <div className="text-xs text-gray-500">
              {readinessInfo.schedule}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="flex flex-col gap-2">
      {/* Product Type Badge */}
      <span className={`inline-block ${config.bgColor} ${config.textColor} text-xs px-2 py-1 rounded-full font-medium border ${config.borderColor}`}>
        {config.icon} {config.label}
      </span>
      
      {/* Product Type Specific Details */}
      {showDetails && (
        <div className="text-xs text-gray-600 space-y-1">
          <div className="font-medium text-gray-700">
            {readinessInfo.status}
          </div>
          <div>{readinessInfo.timeFrame}</div>
          {readinessInfo.urgency && (
            <div className="text-primary font-medium">
              ⚠️ {readinessInfo.urgency}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductTypeBadge;
