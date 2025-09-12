/**
 * Validation utilities for user registration and data formatting
 */

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {object} - { isValid: boolean, formatted: string, error: string }
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, formatted: '', error: 'Email is required' };
  }

  // Trim and convert to lowercase
  const trimmedEmail = email.trim().toLowerCase();
  
  // Email regex pattern - comprehensive validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, formatted: trimmedEmail, error: 'Please enter a valid email address' };
  }

  // Additional checks
  if (trimmedEmail.length > 254) {
    return { isValid: false, formatted: trimmedEmail, error: 'Email address is too long' };
  }

  const localPart = trimmedEmail.split('@')[0];
  if (localPart.length > 64) {
    return { isValid: false, formatted: trimmedEmail, error: 'Email local part is too long' };
  }

  return { isValid: true, formatted: trimmedEmail, error: null };
}

/**
 * Validates and formats phone number
 * @param {string} phone - Phone number to validate
 * @returns {object} - { isValid: boolean, formatted: string, error: string }
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, formatted: '', error: 'Phone number is required' };
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check if we have enough digits
  if (digitsOnly.length < 10) {
    return { isValid: false, formatted: phone, error: 'Phone number must have at least 10 digits' };
  }

  if (digitsOnly.length > 15) {
    return { isValid: false, formatted: phone, error: 'Phone number is too long' };
  }

  // Format based on length and country code
  let formatted;
  
  if (digitsOnly.length === 10) {
    // North American format: (XXX) XXX-XXXX
    formatted = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // North American with country code: +1 (XXX) XXX-XXXX
    const withoutCountryCode = digitsOnly.slice(1);
    formatted = `+1 (${withoutCountryCode.slice(0, 3)}) ${withoutCountryCode.slice(3, 6)}-${withoutCountryCode.slice(6)}`;
  } else if (digitsOnly.length === 11 && !digitsOnly.startsWith('1')) {
    // International format: +XX XXX XXX XXXX
    formatted = `+${digitsOnly.slice(0, 2)} ${digitsOnly.slice(2, 5)} ${digitsOnly.slice(5, 8)} ${digitsOnly.slice(8)}`;
  } else if (digitsOnly.length === 12) {
    // International format: +XXX XXX XXX XXXX
    formatted = `+${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6, 9)} ${digitsOnly.slice(9)}`;
  } else {
    // Generic international format
    formatted = `+${digitsOnly}`;
  }

  // Validate the formatted number
  const phoneRegex = /^(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
  if (!phoneRegex.test(digitsOnly)) {
    return { isValid: false, formatted: phone, error: 'Please enter a valid phone number' };
  }

  return { isValid: true, formatted, error: null };
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} - { isValid: boolean, strength: string, error: string }
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, strength: 'weak', error: 'Password is required' };
  }

  if (password.length < 6) {
    return { isValid: false, strength: 'weak', error: 'Password must be at least 6 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, strength: 'weak', error: 'Password is too long' };
  }

  // Check password strength
  let strength = 'weak';
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return { isValid: true, strength, error: null };
}

/**
 * Validates name format
 * @param {string} name - Name to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {object} - { isValid: boolean, formatted: string, error: string }
 */
function validateName(name, fieldName = 'Name') {
  if (!name || typeof name !== 'string') {
    return { isValid: false, formatted: '', error: `${fieldName} is required` };
  }

  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { isValid: false, formatted: trimmed, error: `${fieldName} must be at least 2 characters long` };
  }

  if (trimmed.length > 50) {
    return { isValid: false, formatted: trimmed, error: `${fieldName} is too long` };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(trimmed)) {
    return { isValid: false, formatted: trimmed, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }

  // Format: capitalize first letter of each word
  const formatted = trimmed.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

  return { isValid: true, formatted, error: null };
}

/**
 * Comprehensive user registration validation
 * @param {object} userData - User registration data
 * @returns {object} - { isValid: boolean, errors: object, formattedData: object }
 */
function validateUserRegistration(userData) {
  const errors = {};
  const formattedData = {};

  // Validate email
  const emailValidation = validateEmail(userData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  } else {
    formattedData.email = emailValidation.formatted;
  }

  // Validate phone
  const phoneValidation = validatePhone(userData.phone);
  if (!phoneValidation.isValid) {
    errors.phone = phoneValidation.error;
  } else {
    formattedData.phone = phoneValidation.formatted;
  }

  // Validate password
  const passwordValidation = validatePassword(userData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
  }

  // Validate names
  const firstNameValidation = validateName(userData.firstName, 'First name');
  if (!firstNameValidation.isValid) {
    errors.firstName = firstNameValidation.error;
  } else {
    formattedData.firstName = firstNameValidation.formatted;
  }

  const lastNameValidation = validateName(userData.lastName, 'Last name');
  if (!lastNameValidation.isValid) {
    errors.lastName = lastNameValidation.error;
  } else {
    formattedData.lastName = lastNameValidation.formatted;
  }

  // Validate artisan name if provided
  if (userData.artisanName) {
    const artisanNameValidation = validateName(userData.artisanName, 'Business name');
    if (!artisanNameValidation.isValid) {
      errors.artisanName = artisanNameValidation.error;
    } else {
      formattedData.artisanName = artisanNameValidation.formatted;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    formattedData
  };
}

module.exports = {
  validateEmail,
  validatePhone,
  validatePassword,
  validateName,
  validateUserRegistration
};
