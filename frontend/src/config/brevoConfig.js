// Brevo API Configuration
export const BREVO_CONFIG = {
  // API endpoints
  API_URL: 'https://api.brevo.com/v3',
  
  // Email templates and settings
  EMAIL_SETTINGS: {
    sender: {
      name: 'Bazaar Market',
      email: 'noreply@bazaarmkt.com'
    },
    replyTo: 'support@bazaarmkt.com',
    defaultSubject: 'Bazaar Market - Order Update'
  },
  
  // Contact attributes mapping
  CONTACT_ATTRIBUTES: {
    FIRSTNAME: 'firstName',
    LASTNAME: 'lastName',
    PHONE: 'phone',
    ORDER_COUNT: 'orderCount',
    LAST_ORDER_DATE: 'lastOrderDate',
    TOTAL_SPENT: 'totalSpent',
    LAST_ORDER_UPDATE: 'lastOrderUpdate',
    UPDATE_TYPE: 'updateType',
    PREFERRED_DELIVERY: 'preferredDelivery',
    LOCATION: 'location'
  },
  
  // Email templates
  TEMPLATES: {
    ORDER_COMPLETION: 'order_completion',
    ORDER_UPDATE: 'order_update',
    WELCOME: 'welcome',
    PROMOTIONAL: 'promotional'
  },
  
  // List IDs for different user segments
  LISTS: {
    ALL_CUSTOMERS: 'all_customers',
    ACTIVE_CUSTOMERS: 'active_customers',
    GUEST_USERS: 'guest_users',
    PATRON_USERS: 'patron_users'
  }
};

// Environment-specific settings
export const getBrevoConfig = () => {
  const isDevelopment = import.meta.env.DEV;
  
  return {
    ...BREVO_CONFIG,
    // Override settings for development
    EMAIL_SETTINGS: {
      ...BREVO_CONFIG.EMAIL_SETTINGS,
      // Use test email for development
      email: isDevelopment ? 'test@bazaarmkt.com' : 'noreply@bazaarmkt.com'
    }
  };
};

// Validation functions
export const validateBrevoConfig = (config) => {
  const required = ['API_URL', 'EMAIL_SETTINGS'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Brevo configuration: ${missing.join(', ')}`);
  }
  
  return true;
};
