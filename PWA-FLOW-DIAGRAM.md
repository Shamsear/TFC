# PWA Authentication Flow Diagram

## Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER OPENS PWA                               │
│                  (from home screen)                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Browser sends │
                    │  GET /?source=pwa │
                    └────────┬───────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                    SERVICE WORKER                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Check: Is this the root path "/"?                       │  │
│  │  ✅ YES → DO NOT SERVE FROM CACHE                        │  │
│  │  ✅ Fetch from network (allow server to handle)         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE.TS                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Check: Is user authenticated?                           │  │
│  │                                                           │  │
│  │  ❌ NO  → Allow request to continue to landing page      │  │
│  │                                                           │  │
│  │  ✅ YES → Check user role:                               │  │
│  │           • SUPER_ADMIN → Redirect to /super-admin       │  │
│  │           • SUB_ADMIN → Redirect to /sub-admin           │  │
│  │           • TEAM_MANAGER → Redirect to /team             │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌───────────────────┐    ┌───────────────────┐
    │  NOT LOGGED IN    │    │   LOGGED IN       │
    └─────────┬─────────┘    └─────────┬─────────┘
              │                         │
              ▼                         ▼
    ┌───────────────────┐    ┌───────────────────┐
    │  Render Landing   │    │  Server Redirect  │
    │  Page (/)         │    │  (307 Temporary)  │
    └─────────┬─────────┘    └─────────┬─────────┘
              │                         │
              ▼                         ▼
    ┌───────────────────┐    ┌───────────────────┐
    │  <AuthRedirect /> │    │  Load Dashboard   │
    │  (Client Check)   │    │  /team or /admin  │
    │  No action needed │    └───────────────────┘
    └───────────────────┘
```

## Caching Strategy Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST TYPES                                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────────┐
│   Route      │   Strategy   │   Cached?    │   Reason         │
├──────────────┼──────────────┼──────────────┼──────────────────┤
│ /            │ Network-only │ ❌ NEVER     │ Auth redirect    │
│ /auth/*      │ Network-only │ ❌ NEVER     │ Session mgmt     │
│ /api/*       │ Network-only │ ❌ NEVER     │ Real-time data   │
│ /team/*      │ Network-first│ ✅ Fallback  │ Offline support  │
│ /sub-admin/* │ Network-first│ ✅ Fallback  │ Offline support  │
│ /super-admin*│ Network-first│ ✅ Fallback  │ Offline support  │
│ /players     │ Network-first│ ✅ Fallback  │ Offline support  │
│ /teams       │ Network-first│ ✅ Fallback  │ Offline support  │
│ *.png, *.jpg │ Cache-first  │ ✅ Always    │ Performance      │
│ *.wasm       │ Cache-first  │ ✅ Always    │ Performance      │
└──────────────┴──────────────┴──────────────┴──────────────────┘
```

## Network-First Strategy Detail

```
┌─────────────────────────────────────────────────────────────────┐
│                   NETWORK-FIRST FLOW                             │
└─────────────────────────────────────────────────────────────────┘

Request for /team/squad
         │
         ▼
    Try Network
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Success    Failure
    │         │
    │         ▼
    │    Check Cache
    │         │
    │    ┌────┴────┐
    │    │         │
    │    ▼         ▼
    │  Found    Not Found
    │    │         │
    │    │         ▼
    │    │    Show Offline
    │    │    Page
    │    │
    ▼    ▼
  Return Response
    │
    ▼
  Update Cache
  (for next time)
```

## Role-Based Routing

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ROLES & ROUTES                           │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  User Opens PWA  │
└────────┬─────────┘
         │
         ▼
┌────────────────────┐
│ Check Session      │
└────────┬───────────┘
         │
    ┌────┴────┬────────────┬────────────┐
    │         │            │            │
    ▼         ▼            ▼            ▼
┌────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐
│ Guest  │ │ Team │ │   Sub    │ │  Super   │
│        │ │ Mgr  │ │  Admin   │ │  Admin   │
└───┬────┘ └──┬───┘ └────┬─────┘ └────┬─────┘
    │         │           │            │
    ▼         ▼           ▼            ▼
┌────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐
│   /    │ │/team │ │/sub-admin│ │/super-   │
│Landing │ │      │ │          │ │admin     │
└────────┘ └──────┘ └──────────┘ └──────────┘
```

## Service Worker Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                SERVICE WORKER LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────┘

First Visit
    │
    ▼
┌──────────────┐
│  INSTALL     │  Cache offline.html, icons, manifest
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  ACTIVATE    │  Delete old caches (tfc-v1.0.1)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  FETCH       │  Intercept requests, apply caching strategy
└──────────────┘

Update Available
    │
    ▼
┌──────────────┐
│  INSTALL     │  New SW installs in background
│  (waiting)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Show Banner │  "A new version is available!"
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ User Clicks  │
│  "Refresh"   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ SKIP_WAITING │  New SW activates immediately
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   RELOAD     │  Page reloads with new SW
└──────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                               │
└─────────────────────────────────────────────────────────────────┘

Network Request
       │
       ▼
   Try Fetch
       │
   ┌───┴───┐
   │       │
   ▼       ▼
Success  Failure
   │       │
   │       ▼
   │   Check Request Type
   │       │
   │   ┌───┴───┬───────────┬──────────┐
   │   │       │           │          │
   │   ▼       ▼           ▼          ▼
   │ Navigate API Route  Static   Other
   │   │       │           │          │
   │   ▼       ▼           ▼          ▼
   │ Offline Return    Return    Return
   │  Page   Error     Cached    Error
   │   │       │           │          │
   └───┴───────┴───────────┴──────────┘
                   │
                   ▼
            User Sees Result
```

## Three-Layer Protection

```
┌─────────────────────────────────────────────────────────────────┐
│              THREE-LAYER AUTHENTICATION                          │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Service Worker
┌────────────────────────────────────────┐
│ • Never cache root path                │
│ • Never cache auth routes              │
│ • Never cache redirects                │
│ • Allow server to handle auth          │
└────────────────┬───────────────────────┘
                 │
                 ▼
Layer 2: Middleware (Server-Side)
┌────────────────────────────────────────┐
│ • Check authentication                 │
│ • Determine user role                  │
│ • Perform server redirect              │
│ • Primary routing mechanism            │
└────────────────┬───────────────────────┘
                 │
                 ▼
Layer 3: AuthRedirect (Client-Side)
┌────────────────────────────────────────┐
│ • Fallback protection                  │
│ • Checks session on mount              │
│ • Client-side redirect if needed       │
│ • Only runs on root path               │
└────────────────────────────────────────┘
```

## Before vs After

```
┌─────────────────────────────────────────────────────────────────┐
│                        BEFORE FIX                                │
└─────────────────────────────────────────────────────────────────┘

User Opens PWA
     │
     ▼
Service Worker: "I have / cached!"
     │
     ▼
Serve Cached Landing Page
     │
     ▼
Middleware: "User is logged in, redirect!"
     │
     ▼
❌ ERROR: "service worker redirected"
     │
     ▼
User Sees Error Message


┌─────────────────────────────────────────────────────────────────┐
│                        AFTER FIX                                 │
└─────────────────────────────────────────────────────────────────┘

User Opens PWA
     │
     ▼
Service Worker: "Root path? Fetch from server!"
     │
     ▼
Middleware: "User is logged in, redirect to /team"
     │
     ▼
✅ Server Redirect (307)
     │
     ▼
Load /team Dashboard
     │
     ▼
User Sees Dashboard Immediately
```

## Legend

```
✅ = Success / Allowed
❌ = Error / Blocked
│ = Flow continues
▼ = Next step
┌─┐ = Process/Decision box
```
