# News Image Generation - Cloud Storage Fix

## Problem
Images were failing to generate in production (Vercel) due to read-only filesystem:
```
Error: EROFS: read-only file system, open '/var/task/public/news-images/NEWS-xxx.png'
```

## Root Cause
Serverless environments (like Vercel/Lambda) have read-only filesystems except for `/tmp`. Local file storage doesn't work in production.

## Solution
Upload generated images to **ImageKit** (already configured in the project).

## Changes Made

### 1. Updated `lib/news/image-generator.ts`
- Added ImageKit SDK import and configuration
- Changed `generateNewsImage()` to upload to ImageKit instead of local storage
- Added fallback to `/tmp` for serverless or local directory for development
- Removed `OUTPUT_DIR` constant and directory creation

### 2. ImageKit Configuration
Already configured via environment variables:
```env
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=public_ZYZEr5whB37/j8WYRWAPa2OQVVE=
IMAGEKIT_PRIVATE_KEY=private_v5s1cwXPJhBTSNNX/ytHswKCgJ4=
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/tfc/
```

### 3. Image Storage Flow
1. Generate canvas image in memory
2. Convert to PNG buffer
3. Upload to ImageKit `/news-images/` folder
4. Return ImageKit CDN URL
5. On upload failure → fallback to local/tmp storage

## Benefits
✅ Works in serverless production environments  
✅ CDN delivery for faster image loading  
✅ No disk space concerns  
✅ Automatic image optimization  
✅ Fallback to local storage in development  

## Frontend Integration

### News Pages ✅ Already Compatible
The following components automatically work with ImageKit URLs:
- `app/(public)/news/page.tsx` - Public news page
- `app/(public)/news/NewsPageClient.tsx` - News client
- `app/(team)/team/news/TeamNewsClient.tsx` - Team news page
- `components/news/NewsCard.tsx` - News card component

**How it works:**
- Components use `news.image_url` directly from database
- Works with both local paths (`/news-images/xxx.png`) and ImageKit URLs (`https://ik.imagekit.io/tfc/...`)
- Next.js `<Image>` component handles both automatically

### Backfill Script ✅ Already Updated
The `npm run news:generate-images` script automatically uses ImageKit:
```bash
npm run news:generate-images
```

**What it does:**
1. Finds all news items with missing images
2. Generates images using updated `generateNewsImage()` function
3. Uploads to ImageKit (or saves locally as fallback)
4. Updates database with image URLs

## Testing

### Local Development
```bash
npm run dev
# Automatic: New news → Upload to ImageKit
# Fallback: If ImageKit fails → Save to public/news-images/

# Manual backfill for existing news:
npm run news:generate-images
```

### Production (Vercel)
Images are automatically uploaded to ImageKit CDN:
- New news events → Auto-generate and upload
- Backfill existing news → Run `npm run news:generate-images`

## Image URLs
- **Production**: `https://ik.imagekit.io/tfc/news-images/NEWS-xxx.png`
- **Development (fallback)**: `/news-images/NEWS-xxx.png`

## Monitoring
Check logs for:
- `[News Image] ✅ Uploaded to ImageKit: <url>` - Success
- `[News Image] ⚠️ Saved locally (fallback): <path>` - Fallback used
- `[News Image] ❌ ImageKit upload failed: <error>` - Upload error

## Deployment Checklist
- [ ] Test ImageKit configuration locally:
  ```bash
  npm run test:imagekit
  ```
- [ ] Verify ImageKit credentials in Vercel environment variables:
  - `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`
  - `IMAGEKIT_PRIVATE_KEY`
  - `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`
- [ ] Deploy to Vercel
- [ ] Trigger a test news event (complete a match)
- [ ] Check logs for successful ImageKit upload
- [ ] Verify image appears on news page
- [ ] Check ImageKit dashboard for uploaded image
- [ ] Run `npm run news:generate-images` to backfill existing news

## Quick Commands

Test ImageKit configuration:
```bash
npm run test:imagekit
```

Generate images for existing news:
```bash
npm run news:generate-images
```

Generate matchday news (includes image):
```bash
npm run news:matchday
```
