/**
 * Simple encryption utilities for sensitive data
 * Uses AES-256-CBC for encryption with a secret key
 */

const crypto = require('crypto');

// Use environment variable for encryption key, fallback to a default (not recommended for production)
const ENCRYPTION_KEY_STRING = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!!'; // 32 characters
const ENCRYPTION_KEY = crypto.scryptSync(ENCRYPTION_KEY_STRING, 'salt', 32); // Generate 32-byte key
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt sensitive data
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text in format: iv:encryptedData
 */
function encrypt(text) {
  if (!text) return text;
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text in format: iv:encryptedData
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt bank information object
 * @param {object} bankInfo - Bank information object
 * @returns {object} - Bank information with encrypted sensitive fields
 */
function encryptBankInfo(bankInfo) {
  if (!bankInfo) return bankInfo;
  
  const encrypted = { ...bankInfo };
  
  // Encrypt sensitive fields
  if (bankInfo.accountNumber) {
    encrypted.accountNumber = encrypt(bankInfo.accountNumber);
  }
  
  // Keep other fields as-is for display purposes
  return encrypted;
}

/**
 * Decrypt bank information object
 * @param {object} bankInfo - Bank information object with encrypted fields
 * @returns {object} - Bank information with decrypted sensitive fields
 */
function decryptBankInfo(bankInfo) {
  if (!bankInfo) return bankInfo;
  
  const decrypted = { ...bankInfo };
  
  // Decrypt sensitive fields
  if (bankInfo.accountNumber && typeof bankInfo.accountNumber === 'string' && bankInfo.accountNumber.includes(':')) {
    try {
      decrypted.accountNumber = decrypt(bankInfo.accountNumber);
    } catch (error) {
      console.error('Failed to decrypt account number:', error);
      // Keep encrypted version if decryption fails
    }
  }
  
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt,
  encryptBankInfo,
  decryptBankInfo
};
