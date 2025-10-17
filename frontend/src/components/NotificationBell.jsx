import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import axios from 'axios';
import config from '../config/environment.js';
import toast from 'react-hot-toast';

/**
 * NotificationBell Component
 * Displays in-app notifications with real-time updates
 * Separates action-required from informational notifications
 */
const NotificationBell = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const pollIntervalRef = useRef(null);
  const previousUnreadCountRef = useRef(0);

  // Close dropdown when clicking outside (supports both mouse and touch)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use both mousedown and touchstart for better mobile support
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      
      // Prevent body scroll on mobile when dropdown is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${config.API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const notifs = response.data.data || [];
        const newUnreadCount = notifs.filter(n => !n.isRead).length;
        
        // Check if unread count increased (new notification arrived)
        if (newUnreadCount > previousUnreadCountRef.current) {
          setHasNewNotification(true);
          // Reset animation after 2 seconds
          setTimeout(() => setHasNewNotification(false), 2000);
        }
        
        previousUnreadCountRef.current = newUnreadCount;
        setNotifications(notifs);
        setUnreadCount(newUnreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  // Start real-time polling (every 15 seconds for near real-time updates)
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchNotifications();

    // Poll every 15 seconds for near real-time updates
    pollIntervalRef.current = setInterval(fetchNotifications, 15000);

    // Listen for custom notification events for instant updates
    const handleNewNotification = () => {
      fetchNotifications();
    };

    const handleOrderStatusUpdate = () => {
      // Immediate refresh when order status changes
      fetchNotifications();
    };

    window.addEventListener('newNotificationReceived', handleNewNotification);
    window.addEventListener('notificationRead', handleNewNotification);
    window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      window.removeEventListener('newNotificationReceived', handleNewNotification);
      window.removeEventListener('notificationRead', handleNewNotification);
      window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate);
    };
  }, [user, fetchNotifications]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${config.API_URL}/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('notificationRead', { detail: { notificationId } }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${config.API_URL}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);

      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${config.API_URL}/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n._id === notificationId);
        return notification && !notification.isRead ? Math.max(0, prev - 1) : prev;
      });

      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // Navigate to order if orderId exists
    if (notification.orderId) {
      setIsOpen(false);
      navigate('/orders');
    }
  };

  // Get notification icon and color based on type
  const getNotificationStyle = (notification) => {
    // Action-required notifications (high priority)
    const actionRequired = [
      'new_order_pending',
      'order_cancelled',
      'delivery_cost_increase',
      'order_receipt_confirmed'
    ];

    // Negative notifications
    const negative = ['order_declined', 'order_cancelled'];

    // Positive notifications
    const positive = [
      'order_confirmed',
      'order_ready_for_pickup',
      'order_ready_for_delivery',
      'order_delivered',
      'order_completed',
      'delivery_refund'
    ];

    if (actionRequired.includes(notification.type)) {
      return {
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        iconColor: 'text-amber-600',
        icon: '⚡',
        badge: 'ACTION REQUIRED'
      };
    } else if (negative.includes(notification.type)) {
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
        icon: '❌',
        badge: null
      };
    } else if (positive.includes(notification.type)) {
      return {
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
        icon: '✅',
        badge: null
      };
    } else {
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        icon: 'ℹ️',
        badge: null
      };
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifDate.toLocaleDateString();
  };

  // Sort notifications by date (latest first)
  const sortedNotifications = [...notifications].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  // Count action-required notifications for header display
  const actionRequiredCount = notifications.filter(n =>
    !n.isRead && 
    ['new_order_pending', 'order_cancelled', 'delivery_cost_increase', 'order_receipt_confirmed'].includes(n.type)
  ).length;

  if (!user) return null;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className="relative" ref={dropdownRef}>
        {/* Notification Bell Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${
            hasNewNotification ? 'animate-bounce' : ''
          }`}
          aria-label="Notifications"
        >
          {unreadCount > 0 ? (
            <BellIconSolid className={`w-6 h-6 text-primary ${
              hasNewNotification ? 'animate-pulse' : ''
            }`} />
          ) : (
            <BellIcon className="w-6 h-6 text-gray-600" />
          )}
          
          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className={`absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[20px] ${
              hasNewNotification ? 'animate-ping' : ''
            }`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Dropdown */}
        {isOpen && (
          <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-auto sm:mt-2 w-auto sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[calc(100vh-5rem)] sm:max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-600">
                  {unreadCount} unread
                  {actionRequiredCount > 0 && (
                    <span className="ml-1 sm:ml-2 text-amber-600 font-semibold">
                      • {actionRequiredCount} require action
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:text-primary-dark font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 sm:p-1 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
                aria-label="Close notifications"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {sortedNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No notifications</p>
              </div>
            ) : (
              <div>
                {sortedNotifications.map(notification => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                    onDelete={() => deleteNotification(notification._id)}
                    style={getNotificationStyle(notification)}
                    formatTimeAgo={formatTimeAgo}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/orders');
                }}
                className="w-full text-sm text-primary hover:text-primary-dark font-medium text-center py-2 hover:bg-primary/10 rounded-lg transition-colors touch-manipulation"
              >
                View All Orders →
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </>
  );
};

/**
 * Individual Notification Item Component
 */
const NotificationItem = ({ notification, onClick, onDelete, style, formatTimeAgo }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    setIsDeleting(true);
    await onDelete();
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-3 sm:p-4 border-b border-gray-100 cursor-pointer transition-all active:bg-gray-100 touch-manipulation
        ${!notification.isRead ? `${style.bgColor} ${style.borderColor} border-l-4` : 'hover:bg-gray-50'}
        ${isDeleting ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 text-2xl ${style.iconColor}`}>
          {style.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badge for action required */}
          {style.badge && !notification.isRead && (
            <div className="mb-1">
              <span className="inline-block px-2 py-0.5 bg-amber-200 text-amber-900 text-xs font-bold rounded-full">
                {style.badge}
              </span>
            </div>
          )}

          {/* Title */}
          <h4 className={`text-sm font-semibold mb-1 ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
            {notification.title}
          </h4>

          {/* Message */}
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {notification.message}
          </p>

          {/* Order Number */}
          {notification.orderNumber && (
            <p className="text-xs text-gray-500">
              Order #{notification.orderNumber}
            </p>
          )}

          {/* Time */}
          <p className="text-xs text-gray-400 mt-1">
            {formatTimeAgo(notification.createdAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Unread indicator */}
          {!notification.isRead && (
            <div className="w-2 h-2 bg-primary rounded-full" />
          )}

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="p-1.5 sm:p-1 hover:bg-gray-200 rounded-full transition-colors touch-manipulation"
            aria-label="Delete notification"
          >
            <XMarkIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBell;

