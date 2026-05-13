import crypto from 'crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derives a key from the encryption secret using PBKDF2
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256')
}

/**
 * Encrypts data using AES-256-GCM
 * @param data - The data to encrypt (will be JSON stringified)
 * @param secret - The encryption secret (from environment variable)
 * @returns Encrypted string in format: salt:iv:tag:encryptedData
 */
export function encrypt(data: any, secret?: string): string {
  const encryptionSecret = secret || process.env.ENCRYPTION_SECRET
  
  if (!encryptionSecret) {
    throw new Error('ENCRYPTION_SECRET environment variable is not set')
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  
  // Derive key from secret
  const key = deriveKey(encryptionSecret, salt)
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  // Encrypt data
  const jsonData = JSON.stringify(data)
  let encrypted = cipher.update(jsonData, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  // Get authentication tag
  const tag = cipher.getAuthTag()
  
  // Return format: salt:iv:tag:encryptedData
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted
  ].join(':')
}

/**
 * Decrypts data encrypted with the encrypt function
 * @param encryptedData - The encrypted string in format: salt:iv:tag:encryptedData
 * @param secret - The encryption secret (from environment variable)
 * @returns Decrypted and parsed data
 */
export function decrypt<T = any>(encryptedData: string, secret?: string): T {
  const encryptionSecret = secret || process.env.ENCRYPTION_SECRET
  
  if (!encryptionSecret) {
    throw new Error('ENCRYPTION_SECRET environment variable is not set')
  }

  // Parse encrypted data
  const parts = encryptedData.split(':')
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format')
  }

  const [saltHex, ivHex, tagHex, encrypted] = parts
  
  const salt = Buffer.from(saltHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  
  // Derive key from secret
  const key = deriveKey(encryptionSecret, salt)
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  
  // Decrypt data
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  // Parse and return JSON
  return JSON.parse(decrypted)
}

/**
 * Generates a secure random encryption secret
 * Use this to generate a new ENCRYPTION_SECRET for your .env file
 */
export function generateEncryptionSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}
