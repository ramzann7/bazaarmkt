// Brevo API configuration
export const BREVO_CONFIG = {
  API_URL: 'https://api.brevo.com/v3',
  EMAIL_SETTINGS: {
    sender: {
      name: 'Bazaar Market',
      email: 'noreply@bazaarmkt.com'
    },
    replyTo: 'support@bazaarmkt.com',
    defaultSubject: 'Bazaar Market Notification'
  },
  CONTACT_ATTRIBUTES: {
    firstName: 'FIRSTNAME',
    lastName: 'LASTNAME',
    email: 'EMAIL',
    phone: 'PHONE',
    address: 'ADDRESS',
    city: 'CITY',
    state: 'STATE',
    zipCode: 'ZIPCODE',
    country: 'COUNTRY'
  },
  TEMPLATES: {
    orderCompletion: 'order_completion_template',
    orderUpdate: 'order_update_template',
    welcome: 'welcome_template'
  },
  LISTS: {
    customers: 'customers_list',
    guests: 'guests_list',
    artisans: 'artisans_list'
  }
};

// Get Brevo configuration with environment-specific settings
export const getBrevoConfig = () => {
  const config = { ...BREVO_CONFIG };
  
  // Override with environment variables if available
  if (import.meta.env.VITE_BREVO_API_KEY) {
    config.API_KEY = import.meta.env.VITE_BREVO_API_KEY;
  }
  
  // Development overrides
  if (import.meta.env.DEV) {
    config.EMAIL_SETTINGS.sender.email = 'test@bazaarmkt.com';
  }
  
  return config;
};

// Validate Brevo configuration
export const validateBrevoConfig = () => {
  const config = getBrevoConfig();
  const requiredKeys = ['API_URL'];
  
  for (const key of requiredKeys) {
    if (!config[key]) {
      console.error(`❌ Missing required Brevo config: ${key}`);
      return false;
    }
  }
  
  return true;
};

// Get API key from environment or return null
export const getBrevoApiKey = () => {
  return import.meta.env.VITE_BREVO_API_KEY || null;
};
