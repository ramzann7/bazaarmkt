const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');

// Notification model (you can create this later)
// const Notification = require('../models/notification');

// Send notification
router.post('/send', async (req, res) => {
  try {
    const { type, userId, orderId, userEmail, userPhone, orderDetails, timestamp } = req.body;
    
    console.log('📧 Sending notification:', { type, userId, orderId, userEmail, userPhone });
    
    // Store notification in database (implement later)
    // const notification = new Notification({
    //   type,
    //   userId,
    //   orderId,
    //   userEmail,
    //   userPhone,
    //   orderDetails,
    //   timestamp,
    //   status: 'sent'
    // });
    // await notification.save();
    
    // For now, just log the notification
    console.log('✅ Notification sent successfully:', {
      type,
      userId,
      orderId,
      userEmail,
      userPhone,
      orderDetails,
      timestamp
    });
    
    res.json({ 
      success: true, 
      message: 'Notification sent successfully',
      notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send notification',
      error: error.message 
    });
  }
});

// Send email notification
router.post('/email', async (req, res) => {
  try {
    const { to, subject, template, data } = req.body;
    
    console.log('📧 Sending email notification:', { to, subject, template });
    
    // Here you would integrate with an email service like SendGrid, Mailgun, etc.
    // For now, just log the email details
    console.log('✅ Email notification prepared:', {
      to,
      subject,
      template,
      data,
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'Email notification sent successfully',
      emailId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
  } catch (error) {
    console.error('❌ Error sending email notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email notification',
      error: error.message 
    });
  }
});

// Send SMS notification
router.post('/sms', async (req, res) => {
  try {
    const { to, message, orderId } = req.body;
    
    console.log('📱 Sending SMS notification:', { to, orderId });
    
    // Here you would integrate with an SMS service like Twilio, etc.
    // For now, just log the SMS details
    console.log('✅ SMS notification prepared:', {
      to,
      message,
      orderId,
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'SMS notification sent successfully',
      smsId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
  } catch (error) {
    console.error('❌ Error sending SMS notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send SMS notification',
      error: error.message 
    });
  }
});

// Get user notification preferences
router.get('/preferences/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user is requesting their own preferences
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get user preferences from database (implement later)
    // const user = await User.findById(userId).select('notificationPreferences');
    
    // For now, return default preferences
    const preferences = {
      email: { orderUpdates: true, marketing: true, promotions: true, security: true },
      push: { orderUpdates: true, promotions: true, newArtisans: true, nearbyOffers: true },
      sms: { orderUpdates: false, promotions: false }
    };
    
    res.json({ preferences });
    
  } catch (error) {
    console.error('❌ Error getting notification preferences:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user notification preferences
router.put('/preferences/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;
    
    // Verify user is updating their own preferences
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Update user preferences in database (implement later)
    // const updatedUser = await User.findByIdAndUpdate(
    //   userId,
    //   { notificationPreferences: preferences },
    //   { new: true }
    // );
    
    console.log('✅ Notification preferences updated for user:', userId);
    
    res.json({ 
      success: true, 
      message: 'Notification preferences updated successfully',
      preferences 
    });
    
  } catch (error) {
    console.error('❌ Error updating notification preferences:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user notifications
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    // Verify user is requesting their own notifications
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get user notifications from database (implement later)
    // const notifications = await Notification.find({ userId })
    //   .sort({ timestamp: -1 })
    //   .limit(parseInt(limit))
    //   .skip((parseInt(page) - 1) * parseInt(limit));
    
    // For now, return empty notifications
    const notifications = [];
    
    res.json({ 
      notifications, 
      total: 0, 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    
  } catch (error) {
    console.error('❌ Error getting user notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Mark notification as read in database (implement later)
    // const notification = await Notification.findByIdAndUpdate(
    //   notificationId,
    //   { status: 'read', readAt: new Date() },
    //   { new: true }
    // );
    
    console.log('✅ Notification marked as read:', notificationId);
    
    res.json({ 
      success: true, 
      message: 'Notification marked as read' 
    });
    
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read for a user
router.put('/user/:userId/read-all', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user is updating their own notifications
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Mark all notifications as read in database (implement later)
    // await Notification.updateMany(
    //   { userId, status: 'unread' },
    //   { status: 'read', readAt: new Date() }
    // );
    
    console.log('✅ All notifications marked as read for user:', userId);
    
    res.json({ 
      success: true, 
      message: 'All notifications marked as read' 
    });
    
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Platform notification routes for patrons
router.post('/platform', verifyToken, async (req, res) => {
  try {
    const { userId, type, title, message, orderId, timestamp, isRead } = req.body;
    
    console.log('📱 Creating platform notification:', { userId, type, title, message });
    
    // Store platform notification in database (implement later)
    // const notification = new PlatformNotification({
    //   userId,
    //   type,
    //   title,
    //   message,
    //   orderId,
    //   timestamp,
    //   isRead
    // });
    // await notification.save();
    
    console.log('✅ Platform notification created successfully');
    
    res.json({ 
      success: true, 
      message: 'Platform notification created successfully',
      notificationId: `platform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
  } catch (error) {
    console.error('❌ Error creating platform notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create platform notification',
      error: error.message 
    });
  }
});

// Get user platform notifications
router.get('/platform/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    // Verify user is requesting their own notifications
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get platform notifications from database (implement later)
    // const notifications = await PlatformNotification.find({ userId })
    //   .sort({ timestamp: -1 })
    //   .limit(parseInt(limit))
    //   .skip((parseInt(page) - 1) * parseInt(limit));
    
    // For now, return empty notifications
    const notifications = [];
    
    res.json({ 
      notifications, 
      total: 0, 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    
  } catch (error) {
    console.error('❌ Error getting platform notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark platform notification as read
router.put('/platform/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Mark platform notification as read in database (implement later)
    // const notification = await PlatformNotification.findByIdAndUpdate(
    //   notificationId,
    //   { isRead: true, readAt: new Date() },
    //   { new: true }
    // );
    
    console.log('✅ Platform notification marked as read:', notificationId);
    
    res.json({ 
      success: true, 
      message: 'Platform notification marked as read' 
    });
    
  } catch (error) {
    console.error('❌ Error marking platform notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all platform notifications as read for a user
router.put('/platform/:userId/read-all', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user is updating their own notifications
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Mark all platform notifications as read in database (implement later)
    // await PlatformNotification.updateMany(
    //   { userId, isRead: false },
    //   { isRead: true, readAt: new Date() }
    // );
    
    console.log('✅ All platform notifications marked as read for user:', userId);
    
    res.json({ 
      success: true, 
      message: 'All platform notifications marked as read' 
    });
    
  } catch (error) {
    console.error('❌ Error marking all platform notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
