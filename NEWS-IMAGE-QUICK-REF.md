# News Image Generation - Quick Reference

## 🔥 The Fix
Changed from local filesystem to **ImageKit CDN** for serverless compatibility.

## ⚡ Quick Test
```bash
# Test ImageKit connection
npm run test:imagekit

# Generate images for existing news
npm run news:generate-images
```

## 📋 Deployment Checklist
```
✅ npm run test:imagekit          # Verify locally
✅ Push to GitHub                 # Deploy to Vercel
✅ Complete a match               # Test image generation
✅ Check /news page               # Verify image displays
✅ npm run news:generate-images   # Backfill old news (optional)
```

## 🎯 What to Look For

### ✅ Success (Vercel Logs)
```
[News Image] ✅ Uploaded to ImageKit: https://ik.imagekit.io/tfc/...
```

### ❌ Previous Error (Fixed)
```
Error: EROFS: read-only file system  ← This is now fixed!
```

## 🔧 Environment Variables
Already configured in `.env`:
```env
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=public_...
IMAGEKIT_PRIVATE_KEY=private_...
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/tfc/
```

## 📦 Files Changed
- `lib/news/image-generator.ts` - Upload to ImageKit
- `.gitignore` - Exclude local images
- `package.json` - Added test script

## 🚀 No Breaking Changes
- Frontend: Already compatible (uses `image_url`)
- Database: No schema changes
- API: No changes needed
- Scripts: Automatically updated

## 💡 How It Works
1. Generate image in memory (canvas)
2. Convert to PNG buffer
3. Upload to ImageKit `/news-images/` folder
4. Return CDN URL
5. Save URL to database
6. Display on news pages

## 🎨 Image Templates
All templates work with ImageKit:
- Match results (with team logos & colors)
- Matchday start/complete
- Achievements & level-ups
- Generic news updates

## 📸 Image URLs
**Production:** `https://ik.imagekit.io/tfc/news-images/NEWS-xxx.png`  
**Development:** `/news-images/NEWS-xxx.png` (fallback)

---

**Ready to deploy!** 🚀
