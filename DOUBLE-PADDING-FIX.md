# Double Padding Fix - Complete

## Issue
Many pages had `pt-20` on the outer `<div>` AND `pt-24` on the `<main>` or first `<section>`, causing double padding (44px total instead of 20px). This made content appear too far below the header.

## Root Cause
The PublicHeader component is `fixed` with `h-20` (80px height). Pages only need ONE padding-top of `pt-20` (80px) to prevent content from hiding under the header. Having both `pt-20` on outer div and `pt-24` on inner main/section caused excessive spacing.

## Pages Fixed

### Home Page
- **File**: `app/page.tsx`
- **Before**: `<div className="...pt-20">` + `<section className="...pt-24">`
- **After**: `<div className="...">` + `<section className="...pt-24">`
- **Result**: Single padding of 96px (pt-24) from the section

### Public Pages
All public pages had the same pattern and were fixed:

1. **app/(public)/auctions/page.tsx**
   - Removed `pt-20` from outer div
   - Kept `pt-20` on main tag

2. **app/(public)/calendar/page.tsx**
   - Removed `pt-20` from outer div
   - Kept `pt-20` on main tag

3. **app/(public)/seasons/page.tsx**
   - Removed `pt-20` from outer div
   - Kept `pt-20` on main tag

4. **app/(public)/teams/page.tsx**
   - Removed `pt-20` from outer div
   - Kept `pt-20` on main tag

5. **app/(public)/tournaments/page.tsx**
   - Removed `pt-20` from outer div
   - Kept `pt-20` on main tag

6. **app/(public)/seasons/[seasonId]/teams/page.tsx**
   - Removed `pt-20` from outer div
   - Changed `pt-24` to `pt-20` on main tag

7. **app/(public)/tournaments/[tournamentId]/page.tsx**
   - Removed `pt-20` from outer div
   - Changed `pt-24` to `pt-20` on main tag

### Team Pages

1. **app/(team)/team/auction/page.tsx**
   - Changed `pt-24` to `pt-20` in error states (2 occurrences)

2. **app/(team)/team/players/[playerId]/page.tsx**
   - Removed `pt-20` from outer div
   - Changed `pt-0` to `pt-20` on main tag

## Pattern Applied

### For pages with PublicHeader/TeamHeader (fixed header)
```tsx
// CORRECT - Single padding
<div className="min-h-screen bg-[#0a0a0a] text-white">
  <PublicHeader />
  <main className="pt-20 pb-16 px-6 lg:px-8">
    {/* Content */}
  </main>
</div>

// WRONG - Double padding
<div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
  <PublicHeader />
  <main className="pt-24 pb-16 px-6 lg:px-8">
    {/* Content */}
  </main>
</div>
```

### For pages with hero sections
```tsx
// CORRECT - Padding on first section only
<div className="min-h-screen bg-[#0a0a0a] text-white">
  <PublicHeader />
  <main>
    <section className="pt-24 pb-20">
      {/* Hero content */}
    </section>
  </main>
</div>
```

## Verification
Ran PowerShell command to verify no files contain both `pt-20` and `pt-24` in problematic patterns:
```powershell
Get-ChildItem -Path "app" -Recurse -Filter "*.tsx" | Select-String -Pattern "pt-20" | Select-String -Pattern "pt-24"
```
Result: 0 files found with double padding pattern

## Impact
- **Before**: Content appeared 44px below header (excessive spacing)
- **After**: Content appears 20px below header (correct spacing)
- **User Experience**: Pages now have consistent, proper spacing below the fixed header
- **Visual Consistency**: All pages now follow the same padding pattern

## Files Modified
- app/page.tsx
- app/(public)/auctions/page.tsx
- app/(public)/calendar/page.tsx
- app/(public)/seasons/page.tsx
- app/(public)/teams/page.tsx
- app/(public)/tournaments/page.tsx
- app/(public)/seasons/[seasonId]/teams/page.tsx
- app/(public)/tournaments/[tournamentId]/page.tsx
- app/(team)/team/auction/page.tsx
- app/(team)/team/players/[playerId]/page.tsx

Total: 10 files fixed
