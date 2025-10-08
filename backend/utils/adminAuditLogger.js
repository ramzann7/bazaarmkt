/**
 * Admin Audit Logger
 * Tracks all admin actions for accountability and transparency
 */

const { ObjectId } = require('mongodb');

/**
 * Log admin action to audit log collection
 * @param {Object} db - Database connection
 * @param {Object} params - Audit log parameters
 */
const logAdminAction = async (db, params) => {
  try {
    const {
      adminId,
      action,        // 'create', 'update', 'delete', 'view'
      resource,      // 'user', 'product', 'artisan', 'settings', etc.
      resourceId,    // ID of the resource being acted upon
      description,   // Human-readable description
      details,       // Additional context
      changes        // What changed (before/after)
    } = params;

    const auditLog = {
      adminId: adminId ? new ObjectId(adminId) : null,
      action,
      resource,
      resourceId: resourceId ? (typeof resourceId === 'string' ? new ObjectId(resourceId) : resourceId) : null,
      description,
      details: details || null,
      changes: changes || null,
      timestamp: new Date(),
      ipAddress: null, // Could be added from req.ip
      userAgent: null  // Could be added from req.headers['user-agent']
    };

    await db.collection('adminauditlogs').insertOne(auditLog);
    console.log(`📝 Admin audit log created: ${action} ${resource}`);
  } catch (error) {
    console.error('❌ Error logging admin action:', error);
    // Don't throw error - audit logging shouldn't break the main operation
  }
};

/**
 * Get recent admin activity
 * @param {Object} db - Database connection
 * @param {number} limit - Number of recent activities to fetch
 * @returns {Array} Recent activity logs
 */
const getRecentActivity = async (db, limit = 20) => {
  try {
    const auditLogs = await db.collection('adminauditlogs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    // Get admin names
    const adminIds = [...new Set(auditLogs.map(log => log.adminId?.toString()).filter(Boolean))];
    const admins = await db.collection('users').find({
      _id: { $in: adminIds.map(id => new ObjectId(id)) }
    }).toArray();
    
    const adminMap = {};
    admins.forEach(admin => {
      adminMap[admin._id.toString()] = `${admin.firstName} ${admin.lastName}`;
    });
    
    return auditLogs.map(log => ({
      action: log.action,
      resource: log.resource,
      description: log.description,
      details: log.details,
      adminName: adminMap[log.adminId?.toString()] || 'Admin',
      timestamp: log.timestamp
    }));
  } catch (error) {
    console.error('❌ Error getting recent activity:', error);
    return [];
  }
};

module.exports = {
  logAdminAction,
  getRecentActivity
};

