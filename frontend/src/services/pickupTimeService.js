// src/services/pickupTimeService.js

export const pickupTimeService = {
  // Generate available pickup time slots based on artisan schedule and product availability
  generateAvailableTimeSlots: (artisanSchedule, products = [], daysAhead = 7) => {
    const timeSlots = [];
    const today = new Date();
    
    // Validate inputs
    if (!artisanSchedule || typeof artisanSchedule !== 'object') {
      console.warn('⚠️ Invalid artisan schedule provided to generateAvailableTimeSlots');
      return timeSlots;
    }
    
    // Calculate earliest available date based on product types
    const earliestAvailableDate = pickupTimeService.calculateEarliestAvailableDate(products);
    console.log('📅 Earliest available date based on products:', earliestAvailableDate);
    
    // Default time slots if no schedule is provided
    const defaultTimeSlots = [
      { label: '9:00 AM - 12:00 PM', value: 'morning', start: '09:00', end: '12:00' },
      { label: '12:00 PM - 3:00 PM', value: 'afternoon', start: '12:00', end: '15:00' },
      { label: '3:00 PM - 6:00 PM', value: 'evening', start: '15:00', end: '18:00' }
    ];
    
    // Start from the earliest available date or today, whichever is later
    const startDate = earliestAvailableDate > today ? earliestAvailableDate : today;
    const daysFromStart = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
    
    for (let i = daysFromStart; i < daysFromStart + daysAhead; i++) {
      try {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Validate the date
        if (isNaN(date.getTime())) {
          console.warn(`⚠️ Invalid date generated for day ${i}`);
          continue;
        }
        
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = artisanSchedule?.[dayName];
      
      // Skip if artisan is not available on this day
      if (!daySchedule?.enabled) {
        continue;
      }
      
      // Generate time slots for this day
      const dayTimeSlots = [];
      
      if (daySchedule.enabled) {
        // Use artisan's specific time slots or default ones
        const availableSlots = daySchedule.timeSlots || defaultTimeSlots;
        
        availableSlots.forEach(slot => {
          // Check if the time slot is within artisan's operating hours
          if (isTimeSlotWithinHours(slot, daySchedule.open, daySchedule.close)) {
            dayTimeSlots.push({
              date: new Date(date),
              dateLabel: formatDateLabel(date),
              timeSlot: slot,
              fullLabel: `${formatDateLabel(date)} - ${slot.label}`
            });
          }
        });
      }
      
        timeSlots.push(...dayTimeSlots);
      } catch (error) {
        console.error(`❌ Error processing day ${i} for pickup time slots:`, error);
        // Continue with next day instead of failing completely
      }
    }
    
    return timeSlots;
  },

  // Calculate the earliest available date based on product types
  calculateEarliestAvailableDate: (products) => {
    const today = new Date();
    let earliestDate = today;
    
    if (!products || products.length === 0) {
      return today;
    }
    
    products.forEach(product => {
      // Skip if product is null/undefined
      if (!product || typeof product !== 'object') {
        console.warn('⚠️ Invalid product data in calculateEarliestAvailableDate:', product);
        return;
      }
      
      // Default to ready_to_ship if productType is missing (common in guest cart)
      const productType = product.productType || 'ready_to_ship';
      
      let productAvailableDate = today;
      
      switch (productType) {
        case 'ready_to_ship':
          // Available immediately
          productAvailableDate = today;
          break;
          
        case 'made_to_order':
          // Available after lead time
          if (product.leadTime && product.leadTimeUnit) {
            productAvailableDate = pickupTimeService.addLeadTime(today, product.leadTime, product.leadTimeUnit);
          }
          break;
          
        case 'scheduled_order':
          // Available from next available date
          if (product.nextAvailableDate) {
            productAvailableDate = new Date(product.nextAvailableDate);
          }
          break;
          
        default:
          // Default to today for unknown types
          productAvailableDate = today;
      }
      
      // Update earliest date if this product is available later
      if (productAvailableDate > earliestDate) {
        earliestDate = productAvailableDate;
      }
    });
    
    return earliestDate;
  },

  // Add lead time to a date
  addLeadTime: (date, leadTime, unit) => {
    const result = new Date(date);
    
    switch (unit) {
      case 'hours':
        result.setHours(result.getHours() + leadTime);
        break;
      case 'days':
        result.setDate(result.getDate() + leadTime);
        break;
      case 'weeks':
        result.setDate(result.getDate() + (leadTime * 7));
        break;
      default:
        // Default to days
        result.setDate(result.getDate() + leadTime);
    }
    
    return result;
  },

  // Get availability information for products
  getAvailabilityInfo: (products) => {
    if (!products || products.length === 0) {
      return { message: 'Available immediately', type: 'ready' };
    }
    
    const availabilityTypes = {
      ready_to_ship: 0,
      made_to_order: 0,
      scheduled_order: 0
    };
    
    let latestAvailableDate = new Date();
    let hasScheduledOrders = false;
    let hasMadeToOrder = false;
    
    products.forEach(product => {
      // Skip if product is null/undefined
      if (!product || typeof product !== 'object') {
        console.warn('⚠️ Invalid product data in getAvailabilityInfo:', product);
        return;
      }
      
      // Default to ready_to_ship if productType is missing (common in guest cart)
      const productType = product.productType || 'ready_to_ship';
      
      availabilityTypes[productType]++;
      
      switch (productType) {
        case 'ready_to_ship':
          // Available immediately
          break;
          
        case 'made_to_order':
          hasMadeToOrder = true;
          if (product.leadTime && product.leadTimeUnit) {
            const availableDate = pickupTimeService.addLeadTime(new Date(), product.leadTime, product.leadTimeUnit);
            if (availableDate > latestAvailableDate) {
              latestAvailableDate = availableDate;
            }
          }
          break;
          
        case 'scheduled_order':
          hasScheduledOrders = true;
          if (product.nextAvailableDate) {
            const availableDate = new Date(product.nextAvailableDate);
            if (availableDate > latestAvailableDate) {
              latestAvailableDate = availableDate;
            }
          }
          break;
      }
    });
    
    // Determine availability message
    if (availabilityTypes.ready_to_ship === products.length) {
      return { message: 'Available immediately', type: 'ready' };
    } else if (hasScheduledOrders && hasMadeToOrder) {
      return { 
        message: `Available from ${latestAvailableDate.toLocaleDateString()}`, 
        type: 'scheduled',
        date: latestAvailableDate
      };
    } else if (hasScheduledOrders) {
      return { 
        message: `Available from ${latestAvailableDate.toLocaleDateString()}`, 
        type: 'scheduled',
        date: latestAvailableDate
      };
    } else if (hasMadeToOrder) {
      const daysDiff = Math.ceil((latestAvailableDate - new Date()) / (1000 * 60 * 60 * 24));
      return { 
        message: `Available in ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`, 
        type: 'made_to_order',
        date: latestAvailableDate
      };
    }
    
    return { message: 'Available immediately', type: 'ready' };
  },

  // Check if a time slot is within artisan's operating hours
  isTimeSlotWithinHours: (timeSlot, openTime, closeTime) => {
    if (!openTime || !closeTime) return true; // If no hours set, allow all slots
    
    const slotStart = timeSlot.start;
    const slotEnd = timeSlot.end;
    
    return slotStart >= openTime && slotEnd <= closeTime;
  },

  // Format date for display
  formatDateLabel: (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  },

  // Get pickup time window display text
  getPickupTimeDisplay: (pickupTimeWindow) => {
    if (!pickupTimeWindow) return 'No pickup time selected';
    
    const { selectedDate, timeSlotLabel } = pickupTimeWindow;
    const dateLabel = pickupTimeService.formatDateLabel(new Date(selectedDate));
    
    return `${dateLabel} - ${timeSlotLabel}`;
  },

  // Validate pickup time selection
  validatePickupTime: (selectedDate, selectedTimeSlot, artisanSchedule) => {
    if (!selectedDate || !selectedTimeSlot) {
      return { valid: false, message: 'Please select a pickup date and time' };
    }
    
    try {
      const selectedDateObj = new Date(selectedDate);
      
      // Validate the date
      if (isNaN(selectedDateObj.getTime())) {
        return { valid: false, message: 'Invalid date selected' };
      }
      
      const dayName = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const daySchedule = artisanSchedule?.[dayName];
    
    if (!daySchedule?.enabled) {
      return { valid: false, message: 'Artisan is not available on the selected date' };
    }
    
    // Check if selected time slot is available
    const availableSlots = daySchedule.timeSlots || [];
    const isSlotAvailable = availableSlots.some(slot => slot.value === selectedTimeSlot);
    
    if (!isSlotAvailable) {
      return { valid: false, message: 'Selected time slot is not available' };
    }
    
      return { valid: true };
    } catch (error) {
      console.error('❌ Error validating pickup time:', error);
      return { valid: false, message: 'Error validating pickup time selection' };
    }
  }
};

// Helper function to check if time slot is within hours
function isTimeSlotWithinHours(timeSlot, openTime, closeTime) {
  if (!openTime || !closeTime) return true;
  
  const slotStart = timeSlot.start;
  const slotEnd = timeSlot.end;
  
  return slotStart >= openTime && slotEnd <= closeTime;
}

// Helper function to format date label
function formatDateLabel(date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}
