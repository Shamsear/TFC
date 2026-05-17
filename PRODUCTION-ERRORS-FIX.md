# Production Errors - Diagnosis & Fix

## Critical Error: Missing Database Connection

### Error Message
```
VercelPostgresError - 'missing_connection_string': 
You did not supply a 'connectionString' and no 'POSTGRES_URL' env var was found.
```

### Root Cause
The production environment (Vercel) is missing the `POSTGRES_URL` environment variable, causing all database operations to fail.

### Impact
- ❌ Auto-finalization fails with 500 error
- ❌ All database queries fail
- ❌ Application cannot function

### Fix Required

**1. Add Environment Variable to Vercel:**

Go to your Vercel project settings:
1. Navigate to: **Settings → Environment Variables**
2. Add the following variable:
   - **Name:** `POSTGRES_URL`
   - **Value:** Your PostgreSQL connection string
   - **Environments:** Production, Preview, Development (check all)

**Connection String Format:**
```
postgresql://username:password@host:port/database?sslmode=require
```

**Example:**
```
postgresql://user:pass@ep-cool-name-123456.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require
```

**2. Redeploy After Adding Variable:**
```bash
# Trigger a new deployment
vercel --prod
# or push to main branch to trigger auto-deploy
```

**3. Verify Environment Variables:**

Check that all required variables are set in Vercel:
- ✅ `POSTGRES_URL` - Database connection
- ✅ `DATABASE_URL` - Alternative database connection (if used)
- ✅ `NEXTAUTH_SECRET` - Authentication secret
- ✅ `NEXTAUTH_URL` - Your production URL
- ✅ `ENCRYPTION_KEY` - For bid encryption
- ✅ `IMAGEKIT_*` - Image upload credentials (if used)

---

## Secondary Issue: React Hydration Error #418

### Error Message
```
Minified React error #418
```

### Status
✅ **Already Fixed** in code, but needs redeployment

### What Was Fixed
- Added `isMounted` state to `RoundDetailClient.tsx`
- Prevents server/client time mismatch
- Shows placeholder during initial render

### Verification
After redeploying with the database fix, the hydration error should also be resolved.

---

## How to Fix (Step by Step)

### Step 1: Get Your Database Connection String

**If using Vercel Postgres:**
1. Go to Vercel Dashboard → Storage
2. Select your Postgres database
3. Click "Connect" → Copy the connection string
4. It should look like: `postgresql://...vercel-storage.com:5432/...`

**If using external database (Neon, Supabase, etc.):**
1. Go to your database provider dashboard
2. Find connection string in settings
3. Ensure it includes `?sslmode=require` at the end

### Step 2: Add to Vercel Environment Variables

```bash
# Option 1: Using Vercel CLI
vercel env add POSTGRES_URL production

# Option 2: Using Vercel Dashboard
# 1. Go to project settings
# 2. Environment Variables
# 3. Add new variable
# 4. Name: POSTGRES_URL
# 5. Value: <your-connection-string>
# 6. Select: Production, Preview, Development
# 7. Save
```

### Step 3: Redeploy

```bash
# Trigger new deployment
vercel --prod

# Or commit and push to trigger auto-deploy
git commit --allow-empty -m "Trigger redeploy with env vars"
git push origin main
```

### Step 4: Verify

1. Check deployment logs for errors
2. Visit your production site
3. Try the auto-finalization feature
4. Check browser console - should see detailed error logs now

---

## Expected Behavior After Fix

### Before Fix ❌
```
POST /api/admin/rounds/TFCR-2/finalize 500 (Internal Server Error)
Error: missing_connection_string
```

### After Fix ✅
```
POST /api/admin/rounds/TFCR-2/finalize 200 (OK)
Auto-finalization successful
```

---

## Additional Debugging

### Check Current Environment Variables

**In Vercel Dashboard:**
1. Go to Settings → Environment Variables
2. Verify `POSTGRES_URL` is listed
3. Check it's enabled for Production

**In Code (for debugging):**
```typescript
// Add to your API route temporarily
console.log('Has POSTGRES_URL:', !!process.env.POSTGRES_URL)
console.log('Has DATABASE_URL:', !!process.env.DATABASE_URL)
```

### Check Database Connection

**Test connection:**
```typescript
// Add to your API route
import { sql } from '@vercel/postgres'

try {
  const result = await sql`SELECT NOW()`
  console.log('Database connected:', result.rows[0])
} catch (error) {
  console.error('Database connection failed:', error)
}
```

---

## Common Issues

### Issue 1: Variable Not Taking Effect
**Solution:** Redeploy after adding environment variables

### Issue 2: Wrong Connection String Format
**Solution:** Ensure format is: `postgresql://user:pass@host:port/db?sslmode=require`

### Issue 3: SSL Mode Required
**Solution:** Add `?sslmode=require` to the end of connection string

### Issue 4: IP Whitelist
**Solution:** If using external database, whitelist Vercel's IP ranges

---

## Monitoring

After deploying the fix, monitor:

1. **Server Logs:**
   ```bash
   vercel logs --follow
   ```

2. **Error Tracking:**
   - Check Vercel dashboard for errors
   - Monitor auto-finalization success rate

3. **Database Performance:**
   - Check query times
   - Monitor connection pool usage

---

## Summary

**Primary Issue:** Missing `POSTGRES_URL` environment variable in production  
**Fix:** Add environment variable in Vercel settings and redeploy  
**Status:** ⏳ Waiting for environment variable configuration  
**ETA:** 5 minutes (add variable + redeploy)

Once the environment variable is added and the app is redeployed, both the database connection error and the hydration error should be resolved.
