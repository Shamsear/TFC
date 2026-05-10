import crypto from 'crypto';

/**
 * Encryption utility for auction bid data
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment variable
 * Falls back to a default key for development (NOT FOR PRODUCTION!)
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.AUCTION_ENCRYPTION_KEY;
  
  if (!keyHex) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUCTION_ENCRYPTION_KEY environment variable is required in production');
    }
    
    // Development fallback - DO NOT USE IN PRODUCTION
    console.warn('⚠️  Using default encryption key for development. Set AUCTION_ENCRYPTION_KEY in production!');
    return Buffer.from('0'.repeat(64), 'hex'); // 32 bytes = 64 hex chars
  }
  
  const key = Buffer.from(keyHex, 'hex');
  
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters)`);
  }
  
  return key;
}

/**
 * Encrypt bid data
 * @param data - Plain text data to encrypt (usually JSON string)
 * @returns Base64-encoded encrypted data with IV and auth tag
 */
export function encryptBids(data: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encryptedData (all hex)
    const combined = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    
    // Return as base64 for database storage
    return Buffer.from(combined).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt bid data');
  }
}

/**
 * Decrypt bid data
 * @param encryptedData - Base64-encoded encrypted data
 * @returns Decrypted plain text (usually JSON string)
 */
export function decryptBids(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64').toString('utf8');
    
    // Split into components
    const parts = combined.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt bid data');
  }
}

/**
 * Generate a new encryption key (for setup)
 * Run this once and store the result in AUCTION_ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt bid data with HMAC signature for tamper detection
 * @param data - Plain text data to encrypt
 * @returns Base64-encoded encrypted data with signature
 */
export function encryptBidsWithSignature(data: string): string {
  const encrypted = encryptBids(data);
  
  const hmacKey = process.env.AUCTION_HMAC_KEY || getEncryptionKey().toString('hex');
  const signature = crypto
    .createHmac('sha256', hmacKey)
    .update(encrypted)
    .digest('hex');
  
  // Format: signature:encryptedData
  const combined = `${signature}:${encrypted}`;
  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt bid data and verify HMAC signature
 * @param signedData - Base64-encoded signed encrypted data
 * @returns Decrypted plain text if signature is valid
 */
export function decryptBidsWithSignature(signedData: string): string {
  const combined = Buffer.from(signedData, 'base64').toString('utf8');
  const parts = combined.split(':');
  
  if (parts.length !== 2) {
    throw new Error('Invalid signed data format');
  }
  
  const [signature, encrypted] = parts;
  
  // Verify signature
  const hmacKey = process.env.AUCTION_HMAC_KEY || getEncryptionKey().toString('hex');
  const expectedSignature = crypto
    .createHmac('sha256', hmacKey)
    .update(encrypted)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    throw new Error('Signature verification failed - data may have been tampered with');
  }
  
  return decryptBids(encrypted);
}
