const mongoose = require('mongoose');

const producerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['farm', 'bakery', 'individual'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  category: String,
  specialties: [String],
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  phone: String,
  email: String,
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Producer', producerSchema);