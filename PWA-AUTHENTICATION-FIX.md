# PWA Authentication & Redirect Fix

## Problem
When users close and reopen the PWA, they see an error: "response served by service worker has redirected". This happens because:

1. The service worker was caching the root `/` page
2. When logged-in users reopened the app, they got the cached public landing page
3. The middleware tried to redirect them to their dashboard
4. Service workers cannot serve redirects, causing the error

## Solution Implemented

### 1. **Middleware-Based Smart Routing** (`middleware.ts`)
- Detects user authentication status and role
- Automatically redirects logged-in users from `/` to their dashboard:
  - `SUPER_ADMIN` → `/super-admin`
  - `SUB_ADMIN` → `/sub-admin`
  - `TEAM_MANAGER` → `/team`
- Allows unauthenticated users to see the public landing page

### 2. **Service Worker Updates** (`public/sw.js`)
**Key Changes:**
- **Never cache the root path (`/`)** - Always fetch fresh to allow middleware redirects
- **Network-first strategy** - Prioritize fresh content over cache
- **Don't cache redirects** - Only cache successful 200 responses
- **Exclude auth routes** - Never cache `/auth/*` paths
- **Version bump** - `v1.0.2` to force cache refresh

**Caching Strategy:**
```
Root path (/) → Always network (allows redirects)
Auth routes → Never cached
API routes → Never cached
Other pages → Network-first with cache fallback
Offline → Show offline.html
```

### 3. **Manifest Update** (`public/manifest.json`)
- Changed `start_url` from `/` to `/?source=pwa`
- This helps track PWA launches and ensures fresh navigation

### 4. **Offline Page** (`public/offline.html`)
- Beautiful branded offline experience
- Retry button to reconnect
- Only shown when truly offline (no network)

## How It Works

### First Launch (Fresh Install)
1. User opens PWA
2. Service worker registers
3. Middleware checks authentication
4. Redirects to appropriate dashboard or shows landing page

### Subsequent Launches
1. User opens PWA from home screen
2. Browser requests `/?source=pwa`
3. Service worker **does not** serve cached version
4. Request goes to server
5. Middleware checks authentication
6. User redirected to their dashboard
7. Dashboard page is cached for offline access

### Offline Behavior
1. User opens PWA without internet
2. Service worker detects network failure
3. Shows `offline.html` with retry button
4. User can retry when connection restored

## Testing Instructions

### Test 1: Fresh Install
1. Clear browser cache and data
2. Visit the site and log in
3. Install PWA
4. Close and reopen PWA
5. ✅ Should open directly to your dashboard

### Test 2: Role-Based Routing
1. Log in as different user roles
2. Install PWA for each
3. Close and reopen
4. ✅ Each should open to correct dashboard:
   - Super Admin → `/super-admin`
   - Sub Admin → `/sub-admin`
   - Team Manager → `/team`

### Test 3: Logged Out Users
1. Clear session/log out
2. Open PWA
3. ✅ Should show public landing page

### Test 4: Offline Mode
1. Open PWA while online
2. Turn off internet
3. Try to navigate
4. ✅ Should show offline page with retry button

### Test 5: Cache Refresh
1. Users with old service worker version
2. New version will auto-update
3. Yellow banner appears: "A new version of TFC is available!"
4. Click "Refresh" button
5. ✅ New service worker activates

## Deployment Checklist

- [x] Create middleware for smart routing
- [x] Update service worker to never cache root path
- [x] Implement network-first caching strategy
- [x] Exclude auth routes from caching
- [x] Update manifest start_url
- [x] Create offline page
- [x] Bump service worker version

## User Impact

**Before:**
- ❌ Error on PWA reopen
- ❌ Cached public page for logged-in users
- ❌ Manual navigation required

**After:**
- ✅ Seamless authentication-based routing
- ✅ Direct to dashboard on reopen
- ✅ Works for all user roles
- ✅ Proper offline handling
- ✅ No manual navigation needed

## Technical Details

### Why Network-First for Root Path?
The root path must always hit the server to:
1. Check current authentication status
2. Determine user role
3. Perform server-side redirect
4. Ensure fresh session validation

### Why Not Cache Redirects?
Service workers cannot serve redirect responses (3xx status codes). Attempting to do so causes the "response served by service worker has redirected" error.

### Cache Strategy Rationale
- **Root path**: Network-only (authentication check)
- **Auth pages**: Network-only (session management)
- **API routes**: Network-only (real-time data)
- **Static pages**: Network-first (fresh content, offline fallback)
- **Assets**: Cache-first (images, fonts, etc.)

## Browser Compatibility

✅ Chrome/Edge (Chromium)
✅ Safari (iOS 11.3+)
✅ Firefox
✅ Samsung Internet
✅ Opera

## Monitoring

After deployment, monitor for:
- Service worker registration errors
- Failed redirects
- Cache hit/miss rates
- Offline page views

Check browser console for:
```
[PWA] Service Worker registered: <scope>
[SW] Caching offline assets shell
[SW] Clearing old cache storage: tfc-v1.0.1
```

## Rollback Plan

If issues occur:
1. Revert `public/sw.js` to previous version
2. Bump cache version to force refresh
3. Remove `middleware.ts` temporarily
4. Users will need to manually navigate

## Future Enhancements

- [ ] Add background sync for offline actions
- [ ] Implement push notification preferences
- [ ] Add app shortcuts for quick access
- [ ] Cache user-specific dashboard data
- [ ] Add install prompt for desktop
