# Auction Plan Encryption

## Overview

Auction plans contain sensitive strategic information that teams use to plan their auction strategy. This data is encrypted at rest in the database to prevent unauthorized access, even by database administrators.

## Security Features

### Encryption Algorithm
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Authentication**: Built-in authentication tag for integrity verification
- **IV**: Random 16-byte initialization vector per encryption
- **Salt**: Random 64-byte salt per encryption

### Why AES-256-GCM?
- Industry-standard encryption
- Authenticated encryption (prevents tampering)
- Fast and secure
- Built-in integrity checking

## Setup Instructions

### 1. Generate Encryption Secret

Run this command to generate a secure encryption secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Add to Environment Variables

Add the generated secret to your `.env` file:

```env
ENCRYPTION_SECRET="your-generated-64-character-hex-string"
```

**IMPORTANT**: 
- Never commit this secret to version control
- Use different secrets for development, staging, and production
- Store production secrets in a secure secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)

### 3. Run Database Migration

```bash
# Run the SQL migration
psql $DATABASE_URL -f scripts/add-auction-plans-table.sql

# Or if using a migration tool
npm run migrate
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

## Database Schema

```sql
CREATE TABLE auction_plans (
  id SERIAL PRIMARY KEY,
  season_team_id TEXT NOT NULL REFERENCES season_teams(id) ON DELETE CASCADE,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  encrypted_plan_data TEXT NOT NULL,  -- AES-256-GCM encrypted JSON
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_team_id, season_id)
);
```

## Data Structure

### Encrypted Data Format
The `encrypted_plan_data` column stores data in this format:
```
salt:iv:tag:encryptedData
```

Where:
- `salt`: 64-byte random salt (hex encoded)
- `iv`: 16-byte initialization vector (hex encoded)
- `tag`: 16-byte authentication tag (hex encoded)
- `encryptedData`: AES-256-GCM encrypted JSON (hex encoded)

### Decrypted Plan Structure
```typescript
{
  positions: {
    [position: string]: {
      minPlayers: number,
      maxPlayers: number,
      targets: [
        {
          id: string,
          playerId: string,
          playerName: string,
          position: string,
          minBid: number,
          maxBid: number,
          priority: 'primary' | 'backup'
        }
      ]
    }
  }
}
```

## API Endpoints

### GET /api/team/auction-plan
Retrieve the decrypted auction plan for the authenticated team.

**Query Parameters:**
- `seasonId` (required): The season ID

**Response:**
```json
{
  "plan": { /* decrypted plan data */ },
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/team/auction-plan
Save an encrypted auction plan.

**Body:**
```json
{
  "seasonId": "SEASON-ID",
  "plan": { /* plan data to encrypt */ }
}
```

**Response:**
```json
{
  "success": true,
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

### DELETE /api/team/auction-plan
Delete the auction plan.

**Query Parameters:**
- `seasonId` (required): The season ID

## Security Considerations

### What is Protected
✅ Plan data is encrypted at rest in the database
✅ Each encryption uses unique salt and IV
✅ Authentication tag prevents tampering
✅ Automatic CASCADE deletion when team/season is deleted

### What is NOT Protected
❌ Data in transit (use HTTPS)
❌ Data in application memory
❌ Data in browser (client-side)
❌ Metadata (timestamps, IDs)

### Best Practices

1. **Use HTTPS**: Always use HTTPS in production to protect data in transit
2. **Rotate Secrets**: Periodically rotate encryption secrets (requires re-encryption)
3. **Access Control**: API endpoints check authentication before decrypting
4. **Audit Logs**: Consider adding audit logs for plan access
5. **Backup Strategy**: Encrypted backups are useless without the secret

## Key Rotation

If you need to rotate the encryption secret:

1. Generate a new secret
2. Create a migration script that:
   - Decrypts all plans with old secret
   - Re-encrypts with new secret
   - Updates all records
3. Update environment variable
4. Deploy changes

**Example rotation script:**
```typescript
// scripts/rotate-encryption-key.ts
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/encryption'

const OLD_SECRET = process.env.OLD_ENCRYPTION_SECRET
const NEW_SECRET = process.env.ENCRYPTION_SECRET

async function rotateKeys() {
  const plans = await prisma.auction_plans.findMany()
  
  for (const plan of plans) {
    // Decrypt with old secret
    const decrypted = decrypt(plan.encrypted_plan_data, OLD_SECRET)
    
    // Re-encrypt with new secret
    const reencrypted = encrypt(decrypted, NEW_SECRET)
    
    // Update record
    await prisma.auction_plans.update({
      where: { id: plan.id },
      data: { encrypted_plan_data: reencrypted }
    })
  }
  
  console.log(`Rotated ${plans.length} encryption keys`)
}

rotateKeys()
```

## Troubleshooting

### "ENCRYPTION_SECRET environment variable is not set"
- Add `ENCRYPTION_SECRET` to your `.env` file
- Restart your development server

### "Invalid encrypted data format"
- Data may be corrupted
- Wrong encryption secret
- Data was not encrypted properly

### "Authentication tag verification failed"
- Data has been tampered with
- Wrong encryption secret
- Corrupted data

## Performance

- Encryption/decryption is fast (~1ms per operation)
- No significant impact on API response times
- Consider caching decrypted plans in memory for high-traffic scenarios

## Compliance

This encryption approach helps with:
- GDPR (data protection)
- SOC 2 (data security)
- PCI DSS (if storing payment-related data)
- General data privacy regulations

Always consult with legal/compliance teams for specific requirements.
