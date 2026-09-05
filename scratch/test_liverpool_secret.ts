import { decryptBids, decryptDataWithKey } from '../lib/auction/encryption'
import crypto from 'crypto'

const ciphertext = 'ZDYwMDhjMjRkOGI4NDY4MGZkZWFjZDI3NTJhODdkMjk6ODVjOGZmYmI4YjU2ZTAzM2U4ZmRmOGZjNGFjNWM1M2Q6NTM0YTdhNzc5MzllMTE0ZmY3ZTkzNjdjMzk1NzYzYjNiNzNmODgyOGZmZDQ1N2ZkMGZjMWY5OWE5NmQ2MjQ0YmZjMjJmNWJiZGE3MDg4ZjY3Yjg0YWJjM2FkOWVjMTBkYmMwZmRlNTAzZDM1MTk0ZjM4MGQ0NGQ3YzM4YTBkZWRjNWZjZjg0ODAwYjBhZDcxZmVkOTllOTgzMWE0MjA4NzdlNTA='

// Try master key, old keys, etc.
const masterHex = '56af2f811317764faa8f75a6759dc67f651c89a59a69640a1a1f221e8771b573'

console.log('Testing master hex key:')
try {
  const decryptedStr = decryptDataWithKey(ciphertext, Buffer.from(masterHex, 'hex'))
  console.log('Decrypted with master hex:', decryptedStr)
} catch (e: any) {
  console.log('Failed master hex:', e.message)
}

// Try sha256 of masterHex
const shaKey = crypto.createHash('sha256').update(masterHex).digest()
try {
  const decryptedStr = decryptDataWithKey(ciphertext, shaKey)
  console.log('Decrypted with SHA256(masterHex):', decryptedStr)
} catch (e: any) {
  console.log('Failed SHA256(masterHex):', e.message)
}

// Check base64 decode of ciphertext
const rawStr = Buffer.from(ciphertext, 'base64').toString('utf8')
console.log('Raw str (iv:salt:encrypted):', rawStr)

const parts = rawStr.split(':')
console.log(`Parts count: ${parts.length}`)
if (parts.length === 3) {
  const [ivHex, saltHex, encryptedHex] = parts
  console.log(`ivHex len: ${ivHex.length}, saltHex len: ${saltHex.length}, encryptedHex len: ${encryptedHex.length}`)
}
