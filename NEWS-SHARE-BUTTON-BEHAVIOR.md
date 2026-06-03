# News Share Button Behavior

## Current Implementation

The news share button in `NewsDetailView.tsx` already implements context-aware sharing based on the user's current location.

### How It Works

```typescript
const [currentUrl, setCurrentUrl] = useState('');

useEffect(() => {
  setCurrentUrl(window.location.href);
}, []);

const shareToWhatsApp = () => {
  const text = `*${title}*\n\nRead more at: ${currentUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');
};
```

### Behavior

**✅ Logged-in team users** viewing `/team/news/[id]`:
- Share button shares: `https://yourdomain.com/team/news/[id]`
- Recipients with team access can view the news

**✅ Public/guest users** viewing `/news/[id]`:
- Share button shares: `https://yourdomain.com/news/[id]`
- Anyone can view the news (public access)

### Why This Works

The `NewsDetailView` component uses `window.location.href` to capture the current URL, which automatically:
- Shares the team URL when accessed from `/team/news/[id]`
- Shares the public URL when accessed from `/news/[id]`

### URL Structure

Both pages use the same component but different routes:

| User Type | News List Page | Detail Page | Share URL |
|-----------|---------------|-------------|-----------|
| Team (logged in) | `/team/news` | `/team/news/[id]` | `https://domain.com/team/news/[id]` |
| Public (guest) | `/news` | `/news/[id]` | `https://domain.com/news/[id]` |

### Access Control

**Important**: Both URLs access the same news data from the database. The route protection is handled by:

1. **Public routes** (`/news/*`): No authentication required
2. **Team routes** (`/team/news/*`): Require team authentication middleware

If a non-logged-in user tries to access `/team/news/[id]`, they should be redirected to login.
If a logged-in team user accesses `/news/[id]`, they can still view it (public route).

## Recommendation

The current implementation is **already correct** and follows best practices:

✅ Context-aware sharing (shares current URL)
✅ Works for both team and public users
✅ No code changes needed

### Optional Enhancement

If you want to ensure team users always share public URLs (for wider accessibility), you could modify the share function:

```typescript
const shareToWhatsApp = () => {
  // Always share public URL for wider accessibility
  const shareUrl = backUrl.includes('/team/') 
    ? currentUrl.replace('/team/news/', '/news/')
    : currentUrl;
  
  const text = `*${title}*\n\nRead more at: ${shareUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');
};
```

But this is **not recommended** unless you want team users to always share public links.

## Current Status

✅ **WORKING AS INTENDED** - No changes needed
