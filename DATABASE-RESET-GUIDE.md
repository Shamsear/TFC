# Database Reset with Clean IDs Guide

This guide explains how to reset your database and implement clean, readable IDs throughout your TFC application.

## 🎯 New ID Format

All IDs will follow this pattern: `PREFIX-NUMBER`

### ID Prefixes

| Entity | Prefix | Example |
|--------|--------|---------|
| Players | `TFCP` | `TFCP-1`, `TFCP-2`, `TFCP-3` |
| Seasons | `TFCS` | `TFCS-1`, `TFCS-2` |
| Users | `TFCU` | `TFCU-1`, `TFCU-2` |
| Tournaments | `TFCT` | `TFCT-1`, `TFCT-2` |
| Teams | `TFCM` | `TFCM-1`, `TFCM-2` |
| Fixtures | `TFCF` | `TFCF-1`, `TFCF-2` |
| Matches | `TFCMA` | `TFCMA-1`, `TFCMA-2` |
| Transfers | `TFCTR` | `TFCTR-1`, `TFCTR-2` |
| Auctions | `TFCA` | `TFCA-1`, `TFCA-2` |
| Calendar | `TFCC` | `TFCC-1`, `TFCC-2` |

## 🚀 How to Reset Database

### Step 1: Run the Reset Script

```bash
npm run db:reset
```

This will:
1. ✅ Delete all existing data from all tables
2. ✅ Create a Super Admin with ID `TFCU-1`
3. ✅ Display login credentials

### Step 2: Login Credentials

After reset, use these credentials:

```
Email: admin@tfc.com
Password: admin123
```

⚠️ **IMPORTANT:** Change the password immediately after first login!

## 📝 Using ID Generators in Your Code

### Import the ID Generator

```typescript
import { 
  generatePlayerId, 
  generateSeasonId, 
  generateUserId,
  generateTeamId,
  generateTournamentId
} from '@/lib/id-generator'
```

### Example: Creating a New Player

```typescript
// OLD WAY (Don't use)
const player = await prisma.base_players.create({
  data: {
    id: crypto.randomUUID(), // ❌ Long random string
    name: 'John Doe',
    // ...
  }
})

// NEW WAY (Use this)
const playerId = await generatePlayerId() // Returns 'TFCP-1', 'TFCP-2', etc.
const player = await prisma.base_players.create({
  data: {
    id: playerId, // ✅ Clean ID like 'TFCP-1'
    name: 'John Doe',
    // ...
  }
})
```

### Example: Creating a New Season

```typescript
const seasonId = await generateSeasonId() // Returns 'TFCS-1', 'TFCS-2', etc.
const season = await prisma.seasons.create({
  data: {
    id: seasonId,
    name: 'Season 2024',
    startingPurse: 100000,
    isActive: true
  }
})
```

### Example: Creating a New User

```typescript
import { generateUserId } from '@/lib/id-generator'
import bcrypt from 'bcryptjs'

const userId = await generateUserId() // Returns 'TFCU-1', 'TFCU-2', etc.
const hashedPassword = await bcrypt.hash(password, 10)

const user = await prisma.users.create({
  data: {
    id: userId,
    email: 'user@example.com',
    name: 'User Name',
    password: hashedPassword,
    role: 'SUB_ADMIN'
  }
})
```

## 🔧 Update Your API Routes

### Before (Old Code)

```typescript
// app/api/players/route.ts
export async function POST(request: Request) {
  const data = await request.json()
  
  const player = await prisma.base_players.create({
    data: {
      id: crypto.randomUUID(), // ❌
      ...data
    }
  })
  
  return Response.json(player)
}
```

### After (New Code)

```typescript
// app/api/players/route.ts
import { generatePlayerId } from '@/lib/id-generator'

export async function POST(request: Request) {
  const data = await request.json()
  
  const playerId = await generatePlayerId() // ✅
  const player = await prisma.base_players.create({
    data: {
      id: playerId,
      ...data
    }
  })
  
  return Response.json(player)
}
```

## 📋 Files to Update

You'll need to update ID generation in these files:

### User Creation
- `app/api/auth/register/route.ts`
- `app/(admin)/super-admin/sub-admins/new/page.tsx`

### Season Creation
- `app/api/seasons/route.ts`
- `app/(admin)/super-admin/seasons/new/page.tsx`

### Team Creation
- `app/api/teams/route.ts`
- `app/(admin)/super-admin/teams/new/page.tsx`

### Player Import
- `app/api/import/route.ts`
- `components/import/ImportWizard.tsx`

### Tournament Creation
- `app/api/tournaments/route.ts`
- `app/(admin)/sub-admin/[seasonId]/tournaments/new/page.tsx`

### Fixture Creation
- `app/api/fixtures/route.ts`

### Transfer/Auction
- `app/api/auction/route.ts`
- `app/api/transfers/route.ts`

## 🎨 Benefits of Clean IDs

1. **Readable URLs**: `/players/TFCP-123` instead of `/players/550e8400-e29b-41d4-a716-446655440000`
2. **Easy Debugging**: Quickly identify entity types in logs
3. **Better UX**: Users can reference entities by simple IDs
4. **Database Efficiency**: Shorter strings = less storage
5. **Sequential**: Easy to track creation order

## ⚠️ Important Notes

1. **Run reset only in development**: This deletes ALL data
2. **Backup production data**: Before any migration
3. **Update all creation logic**: Use the ID generators everywhere
4. **Test thoroughly**: Ensure all features work with new IDs
5. **Update image mappings**: Player photos/cards should use `player_id` field

## 🔄 Migration Checklist

- [ ] Run `npm run db:reset`
- [ ] Login with new credentials
- [ ] Change admin password
- [ ] Update all API routes to use ID generators
- [ ] Update all form submissions
- [ ] Test user creation
- [ ] Test season creation
- [ ] Test team creation
- [ ] Test player import
- [ ] Test tournament creation
- [ ] Test auction functionality
- [ ] Verify all images load correctly

## 📞 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify ID format matches the pattern `PREFIX-NUMBER`
3. Ensure you're using the ID generator functions
4. Check that foreign key relationships use the correct IDs
