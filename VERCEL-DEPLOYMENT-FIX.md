# Vercel Deployment Error Fix

## Issues Identified

1. **NEXTAUTH_URL is set to localhost** - This causes authentication failures in production
2. **Database connection pooling** - Settings may need adjustment for serverless
3. **Prisma connection handling** - Idle timeout logic incompatible with serverless

## Required Fixes

### 1. Update Environment Variables in Vercel Dashboard

Go to your Vercel project settings → Environment Variables and update:

```bash
# CRITICAL: Update this to your actual Vercel domain
NEXTAUTH_URL=https://your-app-name.vercel.app

# Or if you have a custom domain:
NEXTAUTH_URL=https://yourdomain.com
```

### 2. Optimize Database Connection String

Update `DATABASE_URL` in Vercel to reduce connection limits:

```bash
DATABASE_URL="postgresql://neondb_owner:npg_n9NBQTLhr0Ud@ep-green-cherry-aoii3coj-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1&pool_timeout=0"
```

**Changes:**
- `connection_limit=1` (serverless functions should use 1 connection per instance)
- `pool_timeout=0` (disable timeout for serverless)
- Removed `channel_binding=require` (can cause issues with some poolers)

### 3. Check Vercel Logs

To see the actual error:

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Go to "Functions" tab
4. Click on any failed function to see error logs

### 4. Common Error Patterns

**If you see "ECONNREFUSED" or "Connection timeout":**
- Database URL is incorrect or database is not accessible
- Check Neon database is active and not paused

**If you see "Invalid session" or "CSRF token mismatch":**
- NEXTAUTH_URL is not set correctly
- NEXTAUTH_SECRET is missing or different between builds

**If you see "Prisma Client initialization error":**
- Run `prisma generate` is not running during build
- Check vercel.json buildCommand includes `prisma generate`

**If you see "Module not found" errors:**
- Dependencies not installed correctly
- Check package.json and package-lock.json are committed

### 5. Verify Build Command

Your `vercel.json` already has the correct build command:
```json
"buildCommand": "prisma generate && next build"
```

This is correct ✓

### 6. Additional Checks

- [ ] Verify all environment variables are set in Vercel Dashboard
- [ ] Ensure NEXTAUTH_URL matches your deployment URL
- [ ] Check database is not paused (Neon free tier pauses after inactivity)
- [ ] Verify all required secrets are present
- [ ] Check function timeout limits (default is 10s on free tier)

### 7. Quick Test

After updating environment variables:
1. Redeploy from Vercel Dashboard
2. Check deployment logs for any errors
3. Test the homepage first
4. Then test authenticated routes

## Next Steps

1. Update NEXTAUTH_URL in Vercel Dashboard immediately
2. Redeploy the application
3. Check Vercel function logs for specific errors
4. Share the error logs if issue persists
