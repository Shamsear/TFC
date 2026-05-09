# Phase 2: Authentication Updates - COMPLETE ✅

## What Was Done

### 1. Updated Auth Configuration ✅
**File**: `lib/auth.ts`

#### Changes Made:
1. **Added teamId to JWT token**
   ```typescript
   async jwt({ token, user }) {
     if (user) {
       token.id = user.id
       token.role = user.role
       token.teamId = user.teamId  // ← NEW
     }
     return token
   }
   ```

2. **Added teamId to session**
   ```typescript
   async session({ session, token }) {
     if (session.user) {
       session.user.id = token.id as string
       session.user.role = token.role as any
       session.user.teamId = token.teamId as string  // ← NEW
     }
     return session
   }
   ```

3. **Added team route protection**
   ```typescript
   // Protect team routes
   if (pathname.startsWith("/team")) {
     if (!isLoggedIn) return false
     if (userRole !== "TEAM_MANAGER") return false
   }
   ```

### 2. Updated Auth API Route ✅
**File**: `app/api/auth/[...nextauth]/route.ts`

#### Changes Made:
1. **Added teamId to user object**
   ```typescript
   return {
     id: user.id,
     email: user.email,
     name: user.name,
     role: user.role,
     teamId: user.teamId  // ← NEW
   }
   ```

2. **Added isActive check**
   - Only active users can log in
   - Inactive users are rejected

### 3. Updated TypeScript Types ✅
**File**: `types/next-auth.d.ts`

#### Changes Made:
```typescript
interface Session {
  user: {
    id: string
    role: UserRole
    teamId?: string | null  // ← NEW
  } & DefaultSession["user"]
}

interface User {
  id: string
  email: string
  name: string | null
  role: UserRole
  teamId?: string | null  // ← NEW
}

interface JWT {
  id?: string
  role?: UserRole
  teamId?: string | null  // ← NEW
}
```

### 4. Created Team Authorization Helper ✅
**File**: `lib/team-auth.ts`

#### Functions Available:
```typescript
// Get team manager session
getTeamManagerSession()

// Get team manager's team
getTeamManagerTeam()

// Check if user is team manager for specific team
isTeamManager(teamId: string)

// Require team manager access (throws error if not)
requireTeamManager()

// Require team manager's team (throws error if not)
requireTeamManagerTeam()

// Check if user can view team data (all teams for team managers)
canViewTeam(teamId: string)

// Check if user can edit team data (only their own team)
canEditTeam(teamId: string)
```

#### Key Features:
- ✅ Team managers can **view all teams** (read-only for other teams)
- ✅ Team managers can **edit only their own team**
- ✅ Admins can view and edit all teams
- ✅ Proper error handling with descriptive messages

### 5. Updated SignIn Form ✅
**File**: `components/auth/SignInForm.tsx`

#### Changes Made:
**Role-based redirect after login:**
```typescript
// Fetch session to get user role
const response = await fetch('/api/auth/session');
const session = await response.json();

// Redirect based on role
if (session?.user?.role === 'SUPER_ADMIN') {
  router.push('/super-admin');
} else if (session?.user?.role === 'SUB_ADMIN') {
  router.push('/sub-admin');
} else if (session?.user?.role === 'TEAM_MANAGER') {
  router.push('/team');  // ← NEW
} else {
  router.push(callbackUrl);
}
```

---

## Authentication Flow

### Login Process:
1. User enters credentials on `/auth/signin`
2. NextAuth validates credentials
3. Checks if user is active
4. Creates JWT token with `id`, `role`, and `teamId`
5. Creates session with user info
6. Redirects based on role:
   - `SUPER_ADMIN` → `/super-admin`
   - `SUB_ADMIN` → `/sub-admin`
   - `TEAM_MANAGER` → `/team`

### Session Data:
```typescript
{
  user: {
    id: "TFCU-5",
    email: "manager@team.com",
    name: "Team Manager",
    role: "TEAM_MANAGER",
    teamId: "TFCT-1"  // ← Team they manage
  }
}
```

### Route Protection:
- `/super-admin/*` - Only SUPER_ADMIN
- `/sub-admin/*` - SUPER_ADMIN or SUB_ADMIN
- `/team/*` - Only TEAM_MANAGER
- Public routes - Everyone

---

## Team Manager Permissions

### What Team Managers Can Do:
✅ **View all teams** (read-only for other teams)
✅ **Edit their own team** (squad, profile, etc.)
✅ **View all matches** (including other teams)
✅ **View all tournaments and standings**
✅ **View their team's finances**
✅ **View their team's players**

### What Team Managers Cannot Do:
❌ Cannot edit other teams
❌ Cannot access admin functions
❌ Cannot create/delete players (admin only)
❌ Cannot create seasons or tournaments
❌ Cannot manage auctions (view only)

---

## Usage Examples

### In API Routes:
```typescript
import { requireTeamManager, canEditTeam } from '@/lib/team-auth'

export async function GET(request: NextRequest) {
  // Require team manager authentication
  const session = await requireTeamManager()
  
  // Get their team
  const team = await requireTeamManagerTeam()
  
  // Return team data
  return NextResponse.json({ team })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  // Check if user can edit this team
  const canEdit = await canEditTeam(params.teamId)
  
  if (!canEdit) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    )
  }
  
  // Update team...
}
```

### In Server Components:
```typescript
import { getTeamManagerTeam, canViewTeam } from '@/lib/team-auth'

export default async function TeamPage() {
  const team = await getTeamManagerTeam()
  
  if (!team) {
    redirect('/auth/signin')
  }
  
  return <div>Welcome, {team.name}!</div>
}
```

### In Client Components:
```typescript
'use client'
import { useSession } from 'next-auth/react'

export function TeamInfo() {
  const { data: session } = useSession()
  
  if (session?.user.role !== 'TEAM_MANAGER') {
    return null
  }
  
  return <div>Team ID: {session.user.teamId}</div>
}
```

---

## Testing Checklist

After Phase 2, test the following:

- [ ] Super Admin can log in and access `/super-admin`
- [ ] Sub Admin can log in and access `/sub-admin`
- [ ] Team Manager can log in and redirects to `/team`
- [ ] Team Manager cannot access `/super-admin` or `/sub-admin`
- [ ] Admins cannot access `/team` routes
- [ ] Session includes `teamId` for team managers
- [ ] Inactive users cannot log in
- [ ] Invalid credentials show error message

---

## What's Next

### Phase 3: Team Pages & Components
Now that authentication is ready, we can create:
1. Team dashboard layout
2. Team navigation
3. Team pages (squad, matches, finances, etc.)
4. Team-specific components

---

## Status: ✅ READY FOR PHASE 3

Phase 2 is complete! Authentication system now supports:
- ✅ TEAM_MANAGER role
- ✅ Team ID in sessions
- ✅ Role-based redirects
- ✅ Team authorization helpers
- ✅ Route protection for team pages

**Next Step**: Create team pages and components (Phase 3)
