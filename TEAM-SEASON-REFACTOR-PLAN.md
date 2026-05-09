# Team-Season Refactor Plan

## Overview
Refactor the team management system to be season-based and combine team creation with manager account creation.

---

## Changes Required

### 1. Schema Changes
**Current State:**
- `users.assignedSeasons` - JSON array (not used effectively)
- Teams exist globally, not tied to seasons
- Team managers created separately from teams

**New Approach:**
- Team managers should only see data for seasons they're assigned to
- When creating a team, automatically create the manager account
- Auto-generate login credentials (email + password)

**Schema Updates Needed:**
- ✅ `users.assignedSeasons` already exists - use it properly
- No schema changes needed, just implementation changes

---

### 2. Team Creation Flow

**Old Flow:**
1. Super admin creates team (name, manager name, logo)
2. Separately, super admin creates team manager user
3. Manually assign team to user

**New Flow:**
1. Super admin creates team with:
   - Team name
   - Manager name
   - Team logo
   - **Auto-generate email**: `{teamname}@tfc.com` (lowercase, no spaces)
   - **Auto-generate password**: Random 8-character password
   - **Display credentials** after creation
2. System automatically:
   - Creates team record
   - Creates user record with TEAM_MANAGER role
   - Links user to team
   - Assigns to active season (or selected season)
   - Shows generated credentials to super admin

---

### 3. Season Assignment

**Implementation:**
- When team is created, assign to active season by default
- Super admin can change season assignments later
- Team managers only see data for their assigned seasons

**Pages to Update:**
- Dashboard: Filter by assigned seasons
- Squad: Filter by assigned seasons
- Matches: Filter by assigned seasons
- Tournaments: Filter by assigned seasons
- Finances: Filter by assigned seasons
- Profile: Show all seasons, but highlight assigned ones

---

### 4. Files to Modify

#### API Routes
- ✅ `app/api/teams/route.ts` - Update POST to create user + team
- ✅ `app/api/admin/team-managers/route.ts` - Keep for manual creation (optional)
- ✅ `app/api/admin/team-managers/[id]/route.ts` - Update to handle season assignments

#### Admin Pages
- ✅ `app/(admin)/super-admin/teams/new/page.tsx` - Add season selection, show credentials
- ✅ `app/(admin)/super-admin/teams/[teamId]/edit/page.tsx` - Add season management
- ✅ `app/(admin)/super-admin/team-managers/page.tsx` - Show season assignments
- ✅ `app/(admin)/super-admin/team-managers/[id]/edit/page.tsx` - Add season selector

#### Team Pages (Filter by assigned seasons)
- ✅ `app/(team)/team/page.tsx` - Dashboard
- ✅ `app/(team)/team/squad/page.tsx` - Squad list
- ✅ `app/(team)/team/squad/[playerId]/page.tsx` - Player details
- ✅ `app/(team)/team/matches/page.tsx` - Matches
- ✅ `app/(team)/team/matches/[matchId]/page.tsx` - Match details
- ✅ `app/(team)/team/tournaments/page.tsx` - Tournaments
- ✅ `app/(team)/team/tournaments/[tournamentId]/page.tsx` - Tournament details
- ✅ `app/(team)/team/finances/page.tsx` - Finances
- ✅ `app/(team)/team/profile/page.tsx` - Profile

#### Components
- ✅ `components/team/TeamNavigation.tsx` - Add season selector
- ✅ `components/admin/CreateTeamForm.tsx` - New component for combined creation
- ✅ `components/ui/CredentialsDisplay.tsx` - Show generated credentials

#### Utilities
- ✅ `lib/team-auth.ts` - Add season filtering helpers
- ✅ `lib/password-generator.ts` - Generate random passwords

---

### 5. Season Filtering Logic

**Helper Function:**
```typescript
// lib/team-auth.ts
export async function getAssignedSeasons(userId: string): Promise<string[]> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { assignedSeasons: true }
  })
  
  if (!user || !user.assignedSeasons) return []
  
  return user.assignedSeasons as string[]
}

export async function canAccessSeason(userId: string, seasonId: string): Promise<boolean> {
  const assignedSeasons = await getAssignedSeasons(userId)
  return assignedSeasons.includes(seasonId)
}
```

**Usage in Pages:**
```typescript
// Get assigned seasons
const assignedSeasons = await getAssignedSeasons(session.user.id)

// Filter data by assigned seasons
const matches = await prisma.matches.findMany({
  where: {
    tournament: {
      seasonId: { in: assignedSeasons }
    }
  }
})
```

---

### 6. Credential Generation

**Email Format:**
- Pattern: `{teamname}@tfc.com`
- Example: "Real Madrid" → `realmadrid@tfc.com`
- Remove spaces, convert to lowercase
- Handle special characters

**Password Generation:**
- 8 characters minimum
- Mix of uppercase, lowercase, numbers
- Easy to type (avoid ambiguous characters)
- Example: `Abc12345`

**Display:**
- Show credentials immediately after team creation
- Allow copy to clipboard
- Warn that credentials won't be shown again
- Option to send via email (future enhancement)

---

### 7. Migration Strategy

**For Existing Teams:**
1. Keep existing teams and team managers as-is
2. Assign all existing team managers to all seasons (backward compatible)
3. New teams follow new flow

**Migration Script (Optional):**
```sql
-- Assign all existing team managers to all seasons
UPDATE users
SET assigned_seasons = (
  SELECT json_agg(id) FROM seasons
)
WHERE role = 'TEAM_MANAGER';
```

---

### 8. UI/UX Improvements

**Team Creation Page:**
- Season selector (default to active season)
- Auto-generate credentials checkbox (default: on)
- Preview of generated email
- Success modal with credentials display
- Copy buttons for email and password
- Print credentials option

**Team Manager Dashboard:**
- Season selector dropdown in navigation
- Show current season prominently
- Filter all data by selected season
- "No data for this season" empty states

**Super Admin Pages:**
- Show season assignments in team manager list
- Quick edit season assignments
- Bulk assign seasons
- Season filter in lists

---

### 9. Testing Checklist

- [ ] Create team with auto-generated credentials
- [ ] Verify user can log in with generated credentials
- [ ] Verify team manager only sees assigned season data
- [ ] Verify season filtering works on all pages
- [ ] Verify super admin can change season assignments
- [ ] Verify existing teams still work
- [ ] Verify credentials display and copy functionality
- [ ] Verify season selector in navigation

---

### 10. Implementation Order

**Phase 1: Utilities & Helpers**
1. Create password generator utility
2. Add season filtering helpers to team-auth.ts
3. Create credentials display component

**Phase 2: API Updates**
1. Update team creation API to create user
2. Add season assignment to user creation
3. Update team manager edit API for seasons

**Phase 3: Admin Pages**
1. Update team creation form
2. Add credentials display modal
3. Update team manager edit form
4. Add season management UI

**Phase 4: Team Pages**
1. Add season selector to navigation
2. Update all team pages to filter by season
3. Add empty states for no season data
4. Test all pages with season filtering

**Phase 5: Polish**
1. Add loading states
2. Add success messages
3. Add error handling
4. Add documentation

---

## Benefits

✅ Simplified team creation (one step instead of two)
✅ Automatic credential generation (no manual password creation)
✅ Season-based data isolation (better security)
✅ Cleaner data model (one manager per team)
✅ Better UX (team managers see only relevant data)
✅ Easier onboarding (credentials provided immediately)

---

## Risks & Mitigation

**Risk**: Existing teams break
**Mitigation**: Assign all existing managers to all seasons

**Risk**: Lost credentials
**Mitigation**: Super admin can reset passwords

**Risk**: Email conflicts
**Mitigation**: Check for duplicates, add number suffix if needed

**Risk**: Weak passwords
**Mitigation**: Force password change on first login (future)

---

**Status**: Planning Complete
**Next**: Begin Implementation

