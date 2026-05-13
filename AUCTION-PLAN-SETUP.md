# Auction Plan Encryption - Setup Guide

## What Was Created

I've implemented an encrypted auction plan storage system that allows teams to save their strategic auction plans securely. The data is encrypted at rest in the database using AES-256-GCM encryption.

## Files Created

### 1. Database Migration
- **`scripts/add-auction-plans-table.sql`** - Creates the `auction_plans` table

### 2. Encryption Library
- **`lib/encryption.ts`** - Encryption/decryption utilities using AES-256-GCM

### 3. API Routes
- **`app/api/team/auction-plan/route.ts`** - GET/POST/DELETE endpoints for auction plans

### 4. Documentation
- **`AUCTION-PLAN-ENCRYPTION.md`** - Comprehensive encryption documentation
- **`AUCTION-PLAN-SETUP.md`** - This setup guide

### 5. Updated Files
- **`prisma/schema.prisma`** - Added `auction_plans` model with relations
- **`.env.example`** - Added `ENCRYPTION_SECRET` variable
- **`components/team/AuctionPlannerClient.tsx`** - Added save/load functionality

## Setup Steps

### Step 1: Generate Encryption Secret

Run this command to generate a secure encryption secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64-character hex string).

### Step 2: Add to .env File

Add the secret to your `.env` file:

```env
ENCRYPTION_SECRET="paste-your-generated-secret-here"
```

**IMPORTANT**: Never commit this secret to Git!

### Step 3: Run Database Migration

```bash
psql $DATABASE_URL -f scripts/add-auction-plans-table.sql
```

Or if using another PostgreSQL client:
```bash
# Using psql with connection string
psql "your-database-url" -f scripts/add-auction-plans-table.sql

# Or copy the SQL and run it in your database GUI
```

### Step 4: Regenerate Prisma Client

```bash
npx prisma generate
```

This will update the Prisma client to include the new `auction_plans` model.

### Step 5: Restart Development Server

```bash
npm run dev
```

## How It Works

### Encryption Flow

1. **Save Plan**:
   - User clicks "Save Plan" button
   - Client sends plan data to `/api/team/auction-plan`
   - Server encrypts data using AES-256-GCM
   - Encrypted data stored in database

2. **Load Plan**:
   - Page loads, fetches plan from `/api/team/auction-plan`
   - Server decrypts data using encryption secret
   - Decrypted plan sent to client
   - UI populated with saved plan

### Security Features

- **AES-256-GCM**: Industry-standard authenticated encryption
- **Unique Salt & IV**: Each save uses random salt and initialization vector
- **Authentication Tag**: Prevents tampering with encrypted data
- **PBKDF2 Key Derivation**: 100,000 iterations for key strengthening
- **Access Control**: Only team owners can access their own plans

### What's Encrypted

✅ Position plans (min/max players)
✅ Player targets (primary/backup)
✅ Bid ranges (min/max bids)

### What's NOT Encrypted

❌ Timestamps (last_updated, created_at)
❌ Foreign keys (season_team_id, season_id, team_id)
❌ Data in transit (use HTTPS)

## Database Schema

```sql
CREATE TABLE auction_plans (
  id SERIAL PRIMARY KEY,
  season_team_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  encrypted_plan_data TEXT NOT NULL,  -- Encrypted JSON
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_team_id, season_id)
);
```

## API Endpoints

### GET /api/team/auction-plan?seasonId={id}
Returns decrypted auction plan for authenticated team.

### POST /api/team/auction-plan
Saves encrypted auction plan.

**Body:**
```json
{
  "seasonId": "SEASON-ID",
  "plan": {
    "positions": {
      "GK": {
        "minPlayers": 2,
        "maxPlayers": 3,
        "targets": [...]
      }
    }
  }
}
```

### DELETE /api/team/auction-plan?seasonId={id}
Deletes auction plan.

## UI Features

### Save Button
- Located in page header
- Shows "Saving..." state while saving
- Displays last saved time

### Auto-Load
- Plan automatically loads when page opens
- Restores all position settings and targets

### Persistence
- Plans saved per team per season
- Survives page refreshes
- Accessible from any device

## Testing

### Test Encryption/Decryption

```typescript
import { encrypt, decrypt } from '@/lib/encryption'

const data = { test: 'hello world' }
const encrypted = encrypt(data)
console.log('Encrypted:', encrypted)

const decrypted = decrypt(encrypted)
console.log('Decrypted:', decrypted)
// Should output: { test: 'hello world' }
```

### Test API Endpoints

```bash
# Save a plan
curl -X POST http://localhost:3000/api/team/auction-plan \
  -H "Content-Type: application/json" \
  -d '{"seasonId":"SEASON-1","plan":{"positions":{}}}'

# Load a plan
curl http://localhost:3000/api/team/auction-plan?seasonId=SEASON-1

# Delete a plan
curl -X DELETE http://localhost:3000/api/team/auction-plan?seasonId=SEASON-1
```

## Troubleshooting

### Error: "ENCRYPTION_SECRET environment variable is not set"
**Solution**: Add `ENCRYPTION_SECRET` to your `.env` file and restart the server.

### Error: "Property 'auction_plans' does not exist"
**Solution**: Run `npx prisma generate` to regenerate the Prisma client.

### Error: "Invalid encrypted data format"
**Solution**: The encryption secret may have changed. Delete and recreate the plan.

### Plans not saving
**Solution**: 
1. Check browser console for errors
2. Verify API endpoint is accessible
3. Check database connection
4. Verify `auction_plans` table exists

## Security Best Practices

1. **Use HTTPS in production** - Protects data in transit
2. **Rotate secrets periodically** - Change encryption secret every 6-12 months
3. **Backup encryption secret** - Store in secure password manager
4. **Use different secrets per environment** - Dev, staging, production
5. **Monitor access logs** - Track who accesses auction plans

## Production Deployment

### Environment Variables

Set `ENCRYPTION_SECRET` in your production environment:

**Vercel:**
```bash
vercel env add ENCRYPTION_SECRET production
```

**AWS/Heroku:**
Add via dashboard or CLI

**Docker:**
```yaml
environment:
  - ENCRYPTION_SECRET=${ENCRYPTION_SECRET}
```

### Database Migration

Run the migration script on production database:

```bash
psql $PRODUCTION_DATABASE_URL -f scripts/add-auction-plans-table.sql
```

## Future Enhancements

Potential improvements:
- Auto-save on change (debounced)
- Plan versioning/history
- Export plan as PDF
- Share plan with co-managers
- Plan templates
- Budget alerts when over/under

## Support

For issues or questions:
1. Check `AUCTION-PLAN-ENCRYPTION.md` for detailed documentation
2. Review error messages in browser console
3. Check server logs for API errors
4. Verify database schema matches expected structure
