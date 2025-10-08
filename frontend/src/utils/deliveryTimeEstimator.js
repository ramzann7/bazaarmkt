/**
 * Delivery Time Estimation Utility
 * Calculates realistic delivery times based on distance and driving speeds
 */

/**
 * Average car driving speeds in km/h
 * Based on real-world urban/suburban driving conditions
 */
const DRIVING_SPEEDS = {
  // Personal delivery - artisan driving in city/suburban areas
  personalDelivery: {
    city: 30,       // Heavy traffic, lights, stops
    suburban: 40,   // Moderate traffic
    highway: 60     // If route includes highway
  },
  
  // Professional delivery - courier/Uber Direct
  professionalDelivery: {
    city: 35,       // Professional drivers, slightly faster
    suburban: 45,   // Optimized routes
    highway: 70     // Highway segments
  },
  
  // Default/mixed conditions
  default: 35       // Average of city and suburban
};

/**
 * Base preparation times in minutes
 * Time before delivery starts (order prep, packaging, etc.)
 */
const BASE_PREP_TIMES = {
  personalDelivery: 10,      // Artisan needs to prepare + start delivery
  professionalDelivery: 15,  // Artisan prep + courier arrival
  pickup: 5                  // Just preparation
};

/**
 * Calculate estimated delivery time based on distance
 * 
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} deliveryMethod - 'personalDelivery', 'professionalDelivery', or 'pickup'
 * @param {object} options - Additional options
 * @returns {object} Time estimate with breakdown
 */
export function estimateDeliveryTime(distanceKm, deliveryMethod = 'personalDelivery', options = {}) {
  if (!distanceKm || distanceKm <= 0) {
    return null;
  }
  
  // Determine driving speed based on distance (proxy for route type)
  let drivingSpeedKmh;
  
  if (deliveryMethod === 'pickup') {
    // No travel time for pickup
    return {
      prepTime: BASE_PREP_TIMES.pickup,
      travelTime: 0,
      totalTime: BASE_PREP_TIMES.pickup,
      formattedTime: `${BASE_PREP_TIMES.pickup} minutes`,
      method: 'pickup'
    };
  }
  
  const speeds = DRIVING_SPEEDS[deliveryMethod] || DRIVING_SPEEDS.personalDelivery;
  
  // Choose speed based on distance (heuristic for route type)
  if (distanceKm <= 5) {
    // Short distance - likely all city driving
    drivingSpeedKmh = speeds.city;
  } else if (distanceKm <= 15) {
    // Medium distance - mix of city and suburban
    drivingSpeedKmh = speeds.suburban;
  } else {
    // Long distance - likely includes highway
    drivingSpeedKmh = speeds.highway || speeds.suburban;
  }
  
  // Allow manual speed override
  if (options.averageSpeed) {
    drivingSpeedKmh = options.averageSpeed;
  }
  
  // Calculate travel time
  const travelTimeHours = distanceKm / drivingSpeedKmh;
  const travelTimeMinutes = travelTimeHours * 60;
  
  // Get base preparation time
  const prepTimeMinutes = BASE_PREP_TIMES[deliveryMethod] || BASE_PREP_TIMES.personalDelivery;
  
  // Add buffer for real-world conditions (traffic, parking, etc.)
  const bufferPercentage = options.includeBuffer !== false ? 0.15 : 0; // 15% buffer by default
  const bufferMinutes = travelTimeMinutes * bufferPercentage;
  
  // Calculate total time
  const totalTimeMinutes = prepTimeMinutes + travelTimeMinutes + bufferMinutes;
  
  // Format the time
  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  };
  
  return {
    prepTime: Math.round(prepTimeMinutes),
    travelTime: Math.round(travelTimeMinutes),
    buffer: Math.round(bufferMinutes),
    totalTime: Math.round(totalTimeMinutes),
    formattedTime: formatTime(totalTimeMinutes),
    distance: distanceKm,
    speed: drivingSpeedKmh,
    method: deliveryMethod,
    breakdown: {
      preparation: `${prepTimeMinutes} min`,
      travel: `${Math.round(travelTimeMinutes)} min (${distanceKm.toFixed(1)}km @ ${drivingSpeedKmh}km/h)`,
      buffer: `${Math.round(bufferMinutes)} min`,
      total: formatTime(totalTimeMinutes)
    }
  };
}

/**
 * Get time range for delivery (min-max)
 * 
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} deliveryMethod - Delivery method
 * @returns {object} Time range estimate
 */
export function getDeliveryTimeRange(distanceKm, deliveryMethod = 'personalDelivery') {
  const estimate = estimateDeliveryTime(distanceKm, deliveryMethod);
  
  if (!estimate) {
    return null;
  }
  
  // Create a range: estimate ±20%
  const minTime = Math.round(estimate.totalTime * 0.8);
  const maxTime = Math.round(estimate.totalTime * 1.2);
  
  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  };
  
  return {
    min: minTime,
    max: maxTime,
    formatted: `${formatTime(minTime)} - ${formatTime(maxTime)}`,
    estimate: estimate.totalTime,
    formattedEstimate: estimate.formattedTime
  };
}

/**
 * Calculate delivery speed adjustment based on conditions
 * 
 * @param {object} conditions - Weather, traffic, time of day
 * @returns {number} Speed multiplier (e.g., 0.8 for slow, 1.2 for fast)
 */
export function calculateSpeedAdjustment(conditions = {}) {
  let speedMultiplier = 1.0;
  
  // Time of day adjustment
  if (conditions.timeOfDay) {
    const hour = new Date().getHours();
    if (hour >= 7 && hour <= 9) {
      speedMultiplier *= 0.7; // Morning rush hour
    } else if (hour >= 16 && hour <= 18) {
      speedMultiplier *= 0.7; // Evening rush hour
    } else if (hour >= 22 || hour <= 6) {
      speedMultiplier *= 1.2; // Late night, less traffic
    }
  }
  
  // Weather adjustment
  if (conditions.weather) {
    const weather = conditions.weather.toLowerCase();
    if (weather.includes('rain') || weather.includes('snow')) {
      speedMultiplier *= 0.8; // Slower in bad weather
    } else if (weather.includes('storm')) {
      speedMultiplier *= 0.6; // Much slower in storms
    }
  }
  
  // Traffic level adjustment
  if (conditions.traffic) {
    const traffic = conditions.traffic.toLowerCase();
    if (traffic === 'heavy') {
      speedMultiplier *= 0.6;
    } else if (traffic === 'moderate') {
      speedMultiplier *= 0.8;
    } else if (traffic === 'light') {
      speedMultiplier *= 1.1;
    }
  }
  
  return speedMultiplier;
}

/**
 * Get delivery time with real-world conditions
 * 
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} deliveryMethod - Delivery method
 * @param {object} conditions - Real-world conditions
 * @returns {object} Adjusted time estimate
 */
export function getRealisticDeliveryTime(distanceKm, deliveryMethod, conditions = {}) {
  const baseEstimate = estimateDeliveryTime(distanceKm, deliveryMethod, { includeBuffer: false });
  
  if (!baseEstimate) {
    return null;
  }
  
  // Calculate speed adjustment
  const speedAdjustment = calculateSpeedAdjustment(conditions);
  
  // Adjust travel time (prep time stays the same)
  const adjustedTravelTime = baseEstimate.travelTime / speedAdjustment;
  const adjustedTotalTime = baseEstimate.prepTime + adjustedTravelTime;
  
  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  };
  
  return {
    prepTime: baseEstimate.prepTime,
    travelTime: Math.round(adjustedTravelTime),
    totalTime: Math.round(adjustedTotalTime),
    formattedTime: formatTime(adjustedTotalTime),
    speedAdjustment: speedAdjustment,
    conditions: conditions,
    distance: distanceKm,
    method: deliveryMethod
  };
}

export default {
  estimateDeliveryTime,
  getDeliveryTimeRange,
  calculateSpeedAdjustment,
  getRealisticDeliveryTime,
  DRIVING_SPEEDS,
  BASE_PREP_TIMES
};
