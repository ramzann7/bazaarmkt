const mongoose = require('mongoose');

const artisanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['food_beverages', 'handmade_crafts', 'clothing_accessories', 'home_garden', 'beauty_wellness', 'toys_games', 'pet_supplies', 'seasonal_holiday', 'art_collectibles', 'farm', 'bakery', 'restaurant', 'cafe', 'market', 'butcher', 'dairy', 'winery', 'brewery', 'distillery', 'food_truck', 'catering', 'grocery', 'specialty_shop', 'fish_market', 'organic_store', 'coffee_roaster', 'tea_house', 'chocolate_maker', 'cheese_maker', 'honey_producer', 'maple_syrup', 'mushroom_farm', 'herb_garden', 'greenhouse', 'orchard', 'vineyard', 'microgreens', 'aquaponics', 'hydroponics', 'other'],
    required: true
  },
  artisanName: {
    type: String,
    required: true
  },
  businessImage: {
    type: String // URL or file path for business image
  },
  description: String,
  category: [String],
  specialties: [String],
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    lat: Number,
    lng: Number
  },
  phone: String,
  email: String,
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  // Artisan-specific fields
  operationDetails: {
    productionMethods: String,
    sustainabilityPractices: String,
    certifications: [String],
    yearsInBusiness: Number,
    productionCapacity: String,
    qualityStandards: String,
    equipment: String,
    processes: String,
    ingredients: String,
    facilities: String
  },
  // Contact information
  contactInfo: {
    phone: String,
    email: String,
    website: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String
    }
  },
  artisanHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  },
  deliveryOptions: {
    pickup: { type: Boolean, default: true },
    delivery: { type: Boolean, default: false },
    deliveryRadius: Number, // in km
    deliveryFee: { type: Number, default: 0 },
    freeDeliveryThreshold: { type: Number, default: 0 }
  },
  // Pickup details
  pickupLocation: String,
  pickupInstructions: String,
  pickupHours: String,
  pickupUseBusinessAddress: { type: Boolean, default: true },
  pickupAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  pickupSchedule: {
    monday: { enabled: { type: Boolean, default: false }, open: String, close: String },
    tuesday: { enabled: { type: Boolean, default: false }, open: String, close: String },
    wednesday: { enabled: { type: Boolean, default: false }, open: String, close: String },
    thursday: { enabled: { type: Boolean, default: false }, open: String, close: String },
    friday: { enabled: { type: Boolean, default: false }, open: String, close: String },
    saturday: { enabled: { type: Boolean, default: false }, open: String, close: String },
    sunday: { enabled: { type: Boolean, default: false }, open: String, close: String }
  },
  // Delivery details
  deliveryInstructions: String,
  // Professional delivery options
  professionalDelivery: {
    enabled: { type: Boolean, default: false },
    uberDirectEnabled: { type: Boolean, default: false },
    serviceRadius: { type: Number, default: 25 }, // in km
    regions: [String],
    packaging: String,
    restrictions: String
  },
  photos: [String], // Array of base64 image strings
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Artisan', artisanSchema);