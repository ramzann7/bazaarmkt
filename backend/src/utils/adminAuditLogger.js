const AdminAudit = require('../models/adminAudit');

/**
 * Log admin actions to the database for audit trail
 * @param {Object} params - Audit log parameters
 * @param {Object} params.adminUser - The admin user performing the action
 * @param {string} params.action - The action being performed
 * @param {string} params.targetType - Type of entity being modified (user, product, artisan, settings)
 * @param {string} params.targetId - ID of the target entity
 * @param {string} params.targetName - Name/identifier of the target entity
 * @param {Object} params.changes - Object containing the changes made
 * @param {string} params.description - Human-readable description of the action
 * @param {Object} params.req - Express request object (for IP and user agent)
 */
const logAdminAction = async ({
  adminUser,
  action,
  targetType,
  targetId,
  targetName,
  changes,
  description,
  req
}) => {
  try {
    const auditLog = new AdminAudit({
      adminUser: adminUser._id,
      adminEmail: adminUser.email,
      action,
      targetType,
      targetId,
      targetName,
      changes,
      description,
      ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
      userAgent: req?.get('User-Agent') || 'unknown'
    });

    await auditLog.save();
    
    // Also log to console for immediate visibility
    console.log(`[ADMIN AUDIT] ${adminUser.email} (${adminUser._id}) performed ${action} on ${targetType} ${targetName} (${targetId}) at ${new Date().toISOString()}`);
    console.log(`[ADMIN AUDIT] Changes:`, JSON.stringify(changes, null, 2));
    
    return auditLog;
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

/**
 * Get admin audit logs with filtering and pagination
 * @param {Object} filters - Filter options
 * @param {Object} pagination - Pagination options
 */
const getAdminAuditLogs = async (filters = {}, pagination = {}) => {
  try {
    const {
      adminUser,
      action,
      targetType,
      targetId,
      startDate,
      endDate,
      limit = 50,
      skip = 0
    } = { ...filters, ...pagination };

    const query = {};
    
    if (adminUser) query.adminUser = adminUser;
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AdminAudit.find(query)
      .populate('adminUser', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AdminAudit.countDocuments(query);

    return {
      logs,
      total,
      hasMore: skip + logs.length < total
    };
  } catch (error) {
    console.error('Error fetching admin audit logs:', error);
    throw error;
  }
};

module.exports = {
  logAdminAction,
  getAdminAuditLogs
};
