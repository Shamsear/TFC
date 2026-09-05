import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// Load .env.local manually to be 100% sure
const envLocalPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let val = match[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  })
}

console.log('AUCTION_ENCRYPTION_KEY:', process.env.AUCTION_ENCRYPTION_KEY)

const ciphertext = 'ZDYwMDhjMjRkOGI4NDY4MGZkZWFjZDI3NTJhODdkMjk6ODVjOGZmYmI4YjU2ZTAzM2U4ZmRmOGZjNGFjNWM1M2Q6NTM0YTdhNzc5MzllMTE0ZmY3ZTkzNjdjMzk1NzYzYjNiNzNmODgyOGZmZDQ1N2ZkMGZjMWY5OWE5NmQ2MjQ0YmZjMjJmNWJiZGE3MDg4ZjY3Yjg0YWJjM2FkOWVjMTBkYmMwZmRlNTAzZDM1MTk0ZjM4MGQ4NzdjMzg0YTBkZWRjNWZjZjg0ODAwYjBhZDcxZmVkOTllOTgzMWE0MjA4NzdlNTA='

// Try with lib/auction/encryption.ts
import { decryptBids } from '../lib/auction/encryption'

try {
  const decrypted = decryptBids(ciphertext)
  console.log('Decrypted successfully:', decrypted)
} catch (e: any) {
  console.error('Decryption failed:', e.message)
}
