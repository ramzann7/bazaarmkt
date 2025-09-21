const mongoose = require('mongoose');

const adminAuditSchema = new mongoose.Schema({
  // Admin who performed the action
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  
  // Action details
  action: {
    type: String,
    required: true,
    enum: [
      'user_status_changed',
      'user_role_changed',
      'product_status_changed',
      'product_featured_changed',
      'product_deleted',
      'artisan_status_changed',
      'artisan_verification_changed',
      'settings_updated',
      'platform_settings_updated',
      'geographic_settings_updated',
      'user_deleted',
      'artisan_deleted',
      'dispute_status_updated',
      'dispute_resolved'
    ]
  },
  
  // Target entity details
  targetType: {
    type: String,
    required: true,
    enum: ['user', 'product', 'artisan', 'settings', 'platform_settings', 'geographic_settings']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  targetName: {
    type: String,
    required: true
  },
  
  // Change details
  changes: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Additional context
  description: {
    type: String,
    required: true
  },
  
  // IP address and user agent for security
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
adminAuditSchema.index({ adminUser: 1, createdAt: -1 });
adminAuditSchema.index({ targetType: 1, targetId: 1 });
adminAuditSchema.index({ action: 1, createdAt: -1 });

// Ensure virtual fields are serialized
adminAuditSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('AdminAudit', adminAuditSchema);
