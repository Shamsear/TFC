# News Share Preview (Open Graph)

## Feature Overview

When news articles are shared on WhatsApp, Facebook, Twitter, or other social platforms, they now display a rich preview with:
- ✅ News poster image
- ✅ Article title
- ✅ Article description/summary
- ✅ Proper metadata for link unfurling

## Implementation

### Open Graph Meta Tags

Both news detail pages (`app/(public)/news/[id]/page.tsx` and `app/(team)/team/news/[id]/page.tsx`) now export a `generateMetadata` function that provides:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const newsItem = await prisma.news.findUnique({ where: { id } });
  
  return {
    title: `${title} | TFC News`,
    description: newsItem.summary_en || newsItem.content_en.substring(0, 160),
    openGraph: {
      title,
      description,
      images: [{
        url: newsItem.image_url,
        width: 1200,
        height: 630,
        alt: title,
      }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [newsItem.image_url],
    },
  };
}
```

### Meta Tags Generated

```html
<!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
<meta property="og:title" content="Article Title | TFC News" />
<meta property="og:description" content="Article summary..." />
<meta property="og:image" content="https://yoursite.com/path/to/poster.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:type" content="article" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Article Title | TFC News" />
<meta name="twitter:description" content="Article summary..." />
<meta name="twitter:image" content="https://yoursite.com/path/to/poster.jpg" />
```

## How Smart Routing Works with Previews

### Share Flow

1. **User shares**: `https://yoursite.com/api/news/share/NEWS-123`
2. **Platform scrapes** the URL for meta tags
3. **API redirects** to appropriate page:
   - Team users → `/team/news/NEWS-123`
   - Public users → `/news/NEWS-123`
4. **Platform shows preview** with poster image

### Important Notes

**Initial Share:**
- When the share API URL is first shared, social platforms may not show a preview immediately
- They need to follow the redirect to the final page to get meta tags

**Recommended Solution:**
If you want instant previews without following redirects, update the share button to directly share the final URL instead of the API route:

```typescript
// Option 1: Always share public URL (works for everyone after redirect)
const shareUrl = `${baseUrl}/news/${news.id}`;

// Option 2: Share current page URL (context-aware)
const shareUrl = window.location.href;
```

However, the current API approach (`/api/news/share/[id]`) provides smart routing which is more important for functionality.

## Platform Support

| Platform | Preview Support | Image Size |
|----------|----------------|------------|
| WhatsApp | ✅ Yes | 1200x630 recommended |
| Facebook | ✅ Yes | 1200x630 required |
| Twitter | ✅ Yes | 1200x628 minimum |
| LinkedIn | ✅ Yes | 1200x627 |
| Telegram | ✅ Yes | Any size |
| iMessage | ✅ Yes | Any size |

## Testing Open Graph Tags

### Method 1: Online Tools
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### Method 2: View Source
Visit any news article and view page source to see meta tags:
```bash
curl https://yoursite.com/news/NEWS-123 | grep "og:"
```

### Method 3: Browser DevTools
1. Open news article
2. Right-click → "View Page Source"
3. Search for `<meta property="og:`

## Image Requirements

### Optimal Poster Dimensions
- **Width**: 1200px
- **Height**: 630px
- **Aspect Ratio**: 1.91:1
- **Format**: JPG or PNG
- **Size**: Under 1MB for fast loading

### Current Implementation
News poster images are generated at these dimensions automatically by the image generation system.

## Fallback Behavior

If a news article has no image (`image_url` is null):
- Falls back to: `/images/default-news.jpg`
- Ensure this file exists in your `public/images/` folder
- Or update the fallback path in `generateMetadata`

## Troubleshooting

### Preview Not Showing
1. **Check image URL is absolute**: Must include full domain (https://yoursite.com/...)
2. **Verify image is accessible**: Open image URL in browser
3. **Clear platform cache**: Use Facebook Debugger to refresh
4. **Check redirect**: API route redirects may delay preview

### Image Not Loading
1. **Check CORS settings**: Images must be publicly accessible
2. **Verify HTTPS**: Most platforms require secure URLs
3. **Check file size**: Keep under 1MB
4. **Test image dimensions**: 1200x630 is optimal

## Future Enhancements

Consider these improvements:
1. **Dynamic OG images**: Generate custom preview images for each article
2. **Multi-language support**: Serve Malayalam meta tags based on user preference
3. **Author attribution**: Add article author to meta tags
4. **Published date**: Include publish date in structured data
5. **Schema.org markup**: Add JSON-LD for rich search results

## Related Files

- `app/(public)/news/[id]/page.tsx` - Public news with metadata
- `app/(team)/team/news/[id]/page.tsx` - Team news with metadata  
- `app/api/news/share/[id]/route.ts` - Smart share router
- `components/news/NewsDetailView.tsx` - Share button implementation
