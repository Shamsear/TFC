# News Share Button - Smart Routing

## Problem Solved

The news share button now uses a **smart routing API** that automatically redirects users to the correct page based on their authentication status.

### Previous Issue

- **Team users** couldn't access public news URLs (`/news/[id]`) without logging out
- **Public users** couldn't access team news URLs (`/team/news/[id]`) without logging in
- Sharing the "current" URL didn't work for recipients with different auth status

### Solution

Created a **smart share API endpoint** at `/api/news/share/[id]` that:
1. Checks if user is authenticated as a team member
2. Redirects to `/team/news/[id]` for team users
3. Redirects to `/news/[id]` for public/guest users

## Implementation

### API Endpoint

**File**: `app/api/news/share/[id]/route.ts`

```typescript
export async function GET(request, { params }) {
  const { id } = await params;
  const session = await auth();

  if (session?.user?.role === 'TEAM') {
    return NextResponse.redirect(new URL(`/team/news/${id}`, request.url));
  }

  return NextResponse.redirect(new URL(`/news/${id}`, request.url));
}
```

### Share Button

**File**: `components/news/NewsDetailView.tsx`

```typescript
const shareToWhatsApp = () => {
  const baseUrl = window.location.origin;
  const smartUrl = `${baseUrl}/api/news/share/${news.id}`;
  
  const text = `*${title}*\n\nRead more at: ${smartUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');
};
```

## How It Works

### User Flow

1. **Team user** shares news article
   - Shares: `https://yoursite.com/api/news/share/NEWS-123`
   
2. **Recipient clicks link:**
   - **If team user**: Redirects to `/team/news/NEWS-123` ✅
   - **If public user**: Redirects to `/news/NEWS-123` ✅

### Benefits

✅ **Single share URL** works for all users
✅ **No login/logout required** for recipients
✅ **Automatic routing** based on authentication
✅ **Clean URLs** in WhatsApp messages
✅ **SEO-friendly** (redirects preserve proper URLs)

## URL Structure

| Share URL | Team User Sees | Public User Sees |
|-----------|---------------|------------------|
| `/api/news/share/NEWS-123` | `/team/news/NEWS-123` | `/news/NEWS-123` |

## Testing

1. **As team user**:
   - Open `/team/news/[id]`
   - Click WhatsApp share button
   - Copy the shared URL
   - Open in incognito → should redirect to `/news/[id]`
   - Open while logged in → should redirect to `/team/news/[id]`

2. **As public user**:
   - Open `/news/[id]`
   - Click WhatsApp share button
   - Copy the shared URL
   - Same smart routing behavior

## Notes

- The API route is accessible to both authenticated and unauthenticated users
- Uses server-side auth check for reliable routing
- No client-side JavaScript required for routing logic
- Works with direct browser navigation and shared links
