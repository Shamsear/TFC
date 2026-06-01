# PWA Testing Guide

## Quick Test Checklist

### ✅ Pre-Deployment Tests (Local)

1. **Test Authentication Redirect**
   ```bash
   # Start dev server
   npm run dev
   
   # Test endpoints:
   # 1. Visit http://localhost:3000/api/pwa-test (check auth status)
   # 2. Visit http://localhost:3000/ while logged out (should see landing page)
   # 3. Log in as team manager
   # 4. Visit http://localhost:3000/ (should redirect to /team)
   # 5. Log in as admin
   # 6. Visit http://localhost:3000/ (should redirect to /sub-admin or /super-admin)
   ```

2. **Test Service Worker**
   - Open DevTools → Application → Service Workers
   - Check "Update on reload"
   - Verify service worker registers successfully
   - Check version is `tfc-v1.0.2`

3. **Test Offline Mode**
   - Open DevTools → Network
   - Set throttling to "Offline"
   - Try to navigate
   - Should see offline.html page

### ✅ Post-Deployment Tests (Production)

1. **Fresh Install Test**
   ```
   Device: Android/iOS
   Browser: Chrome/Safari
   
   Steps:
   1. Clear browser data
   2. Visit your site
   3. Log in as team manager
   4. Install PWA (Add to Home Screen)
   5. Close browser completely
   6. Open PWA from home screen
   
   Expected: Opens directly to /team dashboard
   ```

2. **Role-Based Routing Test**
   ```
   Test each user role:
   
   TEAM_MANAGER:
   - Install PWA → Should open to /team
   
   SUB_ADMIN:
   - Install PWA → Should open to /sub-admin
   
   SUPER_ADMIN:
   - Install PWA → Should open to /super-admin
   ```

3. **Logged Out Test**
   ```
   Steps:
   1. Log out from PWA
   2. Close PWA
   3. Reopen PWA
   
   Expected: Shows public landing page
   ```

4. **Cache Refresh Test**
   ```
   For existing users with old service worker:
   
   Steps:
   1. Open PWA
   2. Wait for update banner
   3. Click "Refresh" button
   
   Expected: 
   - New service worker activates
   - App reloads
   - Authentication redirect works
   ```

## Debugging Tools

### 1. Check Authentication Status
Visit: `https://your-domain.com/api/pwa-test`

Response shows:
```json
{
  "authenticated": true,
  "user": {
    "id": "...",
    "email": "...",
    "role": "TEAM_MANAGER",
    "teamId": "..."
  },
  "expectedRedirect": "/team",
  "timestamp": "2026-06-01T..."
}
```

### 2. Check Service Worker Status
```javascript
// Run in browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Active Service Workers:', registrations);
  registrations.forEach(reg => {
    console.log('Scope:', reg.scope);
    console.log('Active:', reg.active);
    console.log('Waiting:', reg.waiting);
  });
});
```

### 3. Check Cache Contents
```javascript
// Run in browser console
caches.keys().then(keys => {
  console.log('Cache Keys:', keys);
  keys.forEach(key => {
    caches.open(key).then(cache => {
      cache.keys().then(requests => {
        console.log(`Cache ${key}:`, requests.map(r => r.url));
      });
    });
  });
});
```

### 4. Force Service Worker Update
```javascript
// Run in browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.update());
  console.log('Service worker update triggered');
});
```

### 5. Clear All Caches
```javascript
// Run in browser console
caches.keys().then(keys => {
  return Promise.all(keys.map(key => caches.delete(key)));
}).then(() => {
  console.log('All caches cleared');
  location.reload();
});
```

## Common Issues & Solutions

### Issue 1: "Response served by service worker has redirected"
**Cause:** Old service worker caching root path
**Solution:** 
- Clear cache and reload
- Wait for automatic update
- Or manually update service worker (see debugging tools)

### Issue 2: PWA opens to landing page instead of dashboard
**Cause:** Session expired or middleware not running
**Solution:**
- Check `/api/pwa-test` to verify authentication
- Log in again
- Check middleware.ts is deployed

### Issue 3: Offline page not showing
**Cause:** offline.html not cached
**Solution:**
- Check service worker installed correctly
- Verify offline.html exists in public folder
- Check browser console for errors

### Issue 4: Update banner not appearing
**Cause:** Service worker not detecting new version
**Solution:**
- Bump CACHE_NAME version in sw.js
- Force refresh (Ctrl+Shift+R)
- Check "Update on reload" in DevTools

### Issue 5: Authentication redirect loops
**Cause:** Middleware and client-side redirect conflicting
**Solution:**
- Check middleware.ts logic
- Verify AuthRedirect component only runs on root path
- Check session is valid

## Browser-Specific Testing

### Chrome/Edge (Android)
```
1. Visit site in Chrome
2. Menu → "Add to Home screen"
3. Confirm installation
4. Open from home screen
5. Check behavior
```

### Safari (iOS)
```
1. Visit site in Safari
2. Share button → "Add to Home Screen"
3. Confirm installation
4. Open from home screen
5. Check behavior
```

### Desktop (Chrome/Edge)
```
1. Visit site
2. Look for install icon in address bar
3. Click "Install"
4. Open installed app
5. Check behavior
```

## Performance Monitoring

### Metrics to Track
- Service worker registration time
- Cache hit rate
- Time to interactive (TTI)
- First contentful paint (FCP)
- Largest contentful paint (LCP)

### Tools
- Chrome DevTools → Lighthouse
- Chrome DevTools → Performance
- Chrome DevTools → Application → Service Workers
- Network tab (check cache hits)

## Rollout Strategy

### Phase 1: Canary (10% of users)
- Deploy to staging
- Test with internal team
- Monitor for 24 hours

### Phase 2: Gradual Rollout (50% of users)
- Deploy to production
- Monitor error rates
- Check user feedback

### Phase 3: Full Rollout (100% of users)
- Complete deployment
- Monitor for 48 hours
- Document any issues

## Success Criteria

✅ No "service worker redirected" errors
✅ Users land on correct dashboard based on role
✅ Offline page shows when network unavailable
✅ Service worker updates automatically
✅ No authentication loops
✅ Cache size remains reasonable (<50MB)
✅ App loads in <2 seconds on 3G

## Monitoring Queries

### Check Error Rates
```sql
-- If you have error logging
SELECT COUNT(*) 
FROM error_logs 
WHERE message LIKE '%service worker%' 
  AND created_at > NOW() - INTERVAL '24 hours';
```

### Check User Sessions
```sql
-- Verify users are staying logged in
SELECT role, COUNT(*) as active_sessions
FROM users
WHERE last_active > NOW() - INTERVAL '1 hour'
GROUP BY role;
```

## Emergency Rollback

If critical issues occur:

1. **Revert Service Worker**
   ```javascript
   // In public/sw.js, change back to:
   const CACHE_NAME = 'tfc-v1.0.1';
   // And restore old fetch handler
   ```

2. **Remove Middleware**
   ```bash
   # Temporarily rename or delete
   mv middleware.ts middleware.ts.backup
   ```

3. **Deploy Immediately**
   ```bash
   git add .
   git commit -m "Rollback PWA changes"
   git push
   ```

4. **Force Cache Clear**
   - Instruct users to clear browser data
   - Or wait for automatic update (may take 24h)

## Support Resources

- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [Next.js: Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [NextAuth.js: Middleware](https://next-auth.js.org/configuration/nextjs#middleware)
