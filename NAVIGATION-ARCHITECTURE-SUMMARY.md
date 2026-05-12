# Navigation Architecture Summary

## Overview
The application has **three distinct navigation systems** for different user roles, each with its own header and footer components.

## Navigation Systems

### 1. Public Navigation
**Used by:** Unauthenticated users and general public  
**Routes:** `/`, `/teams`, `/players`, `/auctions`, `/calendar`, `/seasons`, `/tournaments`, `/matches`

**Components:**
- Header: `components/layout/PublicHeader.tsx`
- Footer: `components/layout/PublicFooter.tsx`
- Layout: `app/(public)/layout.tsx` (simplified - just wraps children)

**Features:**
- Full navigation menu with all public pages
- Sign In button
- Mobile responsive menu
- Consistent branding with logo

**Navigation Links:**
- Seasons
- Teams
- Players
- Auctions
- Calendar
- Tournaments
- Sign In

---

### 2. Admin Navigation
**Used by:** Super Admins and Sub Admins  
**Routes:** `/super-admin/*`, `/sub-admin/*`

**Components:**
- Header: `components/AdminNavigation.tsx` (client) + `components/AdminNavigationWrapper.tsx` (server)
- Footer: `components/AdminFooter.tsx`
- Layout: `app/(admin)/layout.tsx`

**Features:**
- Role-based navigation (different links for Super Admin vs Sub Admin)
- Active season awareness for Sub Admins
- Sign Out button
- Mobile responsive menu

**Super Admin Links:**
- Dashboard
- Teams
- Seasons
- Sub Admins
- Audit Logs

**Sub Admin Links:**
- Dashboard
- Import
- Teams (public page)
- Players (season-specific)
- Calendar (public page)
- Tournaments (public page)

---

### 3. Team Manager Navigation
**Used by:** Team Managers  
**Routes:** `/team/*`

**Components:**
- Header: `components/team/TeamNavigation.tsx` (server) + `components/team/TeamNavigationClient.tsx` (client)
- Footer: `components/team/TeamFooter.tsx`
- Layout: `app/(team)/team/layout.tsx`

**Features:**
- Team-specific branding (shows team logo and name)
- Active season awareness
- Checks if team is in active season
- Sign Out button
- Mobile responsive menu

**Navigation Links:**
- Dashboard
- Squad
- Auction
- Matches
- Tournaments
- Finances
- Profile

---

## Root Layout Behavior

**File:** `app/layout.tsx`

The root layout includes a `Header` component (`components/layout/Header.tsx`) that:
- Shows ONLY on admin pages (sub-admin, super-admin)
- Hides on public pages (/, /teams, /players, etc.)
- Hides on auth pages (/auth/*)
- Hides on team manager pages (/team/*)

This ensures no duplicate headers appear.

---

## Middleware Route Protection

**File:** `middleware.ts`

### Protected Routes:
1. **Team Manager Routes:** `/team` and `/team/*` (NOT `/teams`)
   - Requires authentication
   - Requires TEAM_MANAGER role
   
2. **Sub Admin Routes:** `/sub-admin` and `/sub-admin/*`
   - Requires authentication
   - Requires SUB_ADMIN role

3. **Super Admin Routes:** `/super-admin` and `/super-admin/*`
   - Requires authentication
   - Requires SUPER_ADMIN role

### Public Routes:
- `/` (home)
- `/teams` (public teams list)
- `/players` (public players list)
- `/auctions` (public auctions)
- `/calendar` (public calendar)
- `/seasons` (public seasons)
- `/tournaments` (public tournaments)
- `/matches` (public matches)
- `/auth/*` (authentication pages)

**Important:** The middleware uses exact matching or trailing slash patterns to distinguish between:
- `/team` (protected) vs `/teams` (public)
- This prevents false positives in route protection

---

## Layout Hierarchy

```
app/
├── layout.tsx (Root - Header for admin pages only)
│
├── (public)/
│   ├── layout.tsx (Simplified - just wraps children)
│   └── */page.tsx (Each page renders PublicHeader + PublicFooter)
│
├── (admin)/
│   ├── layout.tsx (AdminNavigation + AdminFooter)
│   ├── sub-admin/
│   └── super-admin/
│
└── (team)/
    └── team/
        ├── layout.tsx (TeamNavigation + TeamFooter)
        └── */page.tsx
```

---

## Recent Fixes

### 1. Duplicate Headers Fix
**Problem:** Multiple headers rendering on public pages  
**Solution:**
- Removed old `Navigation` and `Footer` components
- Simplified `app/(public)/layout.tsx`
- Updated root `Header` to exclude public routes

### 2. Teams Page Redirect Fix
**Problem:** `/teams` redirecting to login  
**Solution:**
- Fixed middleware to use exact match: `pathname === "/team" || pathname.startsWith("/team/")`
- This allows `/teams` (public) while protecting `/team` (manager dashboard)

### 3. Dynamic Rendering
**Added to all public pages:**
```typescript
export const dynamic = 'force-dynamic'
```
This prevents stale cache issues where pages show outdated data.

---

## Best Practices

### When Adding New Routes:

1. **Public Routes:**
   - Add to `app/(public)/`
   - Include `PublicHeader` and `PublicFooter` in the page
   - Add `export const dynamic = 'force-dynamic'`
   - Update `PublicHeader` navigation links if needed

2. **Admin Routes:**
   - Add to `app/(admin)/sub-admin/` or `app/(admin)/super-admin/`
   - Layout automatically includes `AdminNavigation` and `AdminFooter`
   - Update `AdminNavigation` links if needed

3. **Team Manager Routes:**
   - Add to `app/(team)/team/`
   - Layout automatically includes `TeamNavigation` and `TeamFooter`
   - Update `TeamNavigationClient` links if needed

### Middleware Considerations:

- Use exact matching or trailing slash for route protection
- Be careful with similar route names (e.g., `/team` vs `/teams`)
- Test both protected and public routes after changes

---

## Component Files Reference

### Public
- `components/layout/PublicHeader.tsx`
- `components/layout/PublicFooter.tsx`

### Admin
- `components/AdminNavigation.tsx` (client component)
- `components/AdminNavigationWrapper.tsx` (server wrapper)
- `components/AdminFooter.tsx`

### Team Manager
- `components/team/TeamNavigation.tsx` (server component)
- `components/team/TeamNavigationClient.tsx` (client component)
- `components/team/TeamFooter.tsx`

### Root
- `components/layout/Header.tsx` (admin-only header)

---

## Testing Checklist

When making navigation changes, verify:

- ✅ Public pages show only PublicHeader (no duplicates)
- ✅ Admin pages show only AdminNavigation
- ✅ Team pages show only TeamNavigation
- ✅ Auth pages show no header
- ✅ `/teams` is accessible without login
- ✅ `/team` requires authentication
- ✅ All navigation links work correctly
- ✅ Mobile menus work on all navigation systems
- ✅ Sign Out buttons work
- ✅ Role-based redirects work correctly
