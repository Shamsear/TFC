# News System - Quick Debug Commands

## Diagnose Why News Wasn't Generated

```bash
# Check specific match
npm run news:diagnose TFCMA-2664

# Output shows:
# - Match details (status, scores)
# - Existing news for this match
# - Recent news activity
# - Round completion status
```

## Manually Generate News

```bash
# Generate news for a specific match
npm run news:generate TFCMA-2664

# This will:
# 1. Validate match is COMPLETED with scores
# 2. Fetch tournament context
# 3. Call Gemini AI to generate bilingual content
# 4. Generate and upload image to ImageKit
# 5. Save to database
```

## Test Configuration

```bash
# Test ImageKit connection
npm run test:imagekit

# Output:
# ✅ ImageKit connection successful
# OR
# ❌ ImageKit connection failed: <reason>
```

## Generate Images for Existing News

```bash
# Backfill images for news without images
npm run news:generate-images

# Finds all news with missing images and generates them
```

## Generate Matchday News

```bash
# Generate news for a complete matchday
npm run news:matchday

# Prompts for:
# - Season ID
# - Round/Matchday name
# Then generates:
# - Match result news for each completed match
# - Matchday completion overview
```

## List Available Rounds

```bash
# See all rounds/matchdays with completion status
npm run news:list-rounds

# Shows:
# - Round name
# - Completed vs total matches
# - Tournaments included
```

## Common Workflows

### 1. Debug Missing News
```bash
# Step 1: Check what happened
npm run news:diagnose TFCMA-2664

# Step 2: If no news found, generate manually
npm run news:generate TFCMA-2664
```

### 2. Fix Missing Images
```bash
# Generate images for all news without them
npm run news:generate-images
```

### 3. Verify System Health
```bash
# Test ImageKit
npm run test:imagekit

# Check recent news generation
npm run news:diagnose TFCMA-2664

# Try generating for a test match
npm run news:generate TFCMA-2664
```

### 4. Bulk Generate for Matchday
```bash
# List available rounds
npm run news:list-rounds

# Generate for specific matchday
npm run news:matchday
# (follow prompts)
```

## Vercel Logs to Check

Search for these patterns in Vercel logs:

**Success indicators:**
```
[News Trigger] Event: match_completed
[News AI] ✅ Bilingual generation successful
[News Image] ✅ Uploaded to ImageKit: https://...
[News Trigger] ✅ News created: NEWS-xxx
```

**Failure indicators:**
```
[News Trigger] ❌ Failed to trigger news:
[News AI] Error generating EN (attempt 1):
[News Image] ❌ ImageKit upload failed:
[News Image] ❌ Generation failed:
```

**Rate limit warnings:**
```
429
quota exceeded
RESOURCE_EXHAUSTED
```

## Environment Variables to Check

Required in Vercel:
```env
# Gemini API (for AI content generation)
GEMINI_API_KEY_1=AIza...
GEMINI_API_KEY_2=AIza...  # Optional: for rotation
GEMINI_API_KEY_3=AIza...  # Optional: for rotation

# ImageKit (for image hosting)
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=public_...
IMAGEKIT_PRIVATE_KEY=private_...
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/tfc/
```

## Quick Fixes

### News not generating at all
1. Check Gemini API key validity
2. Check Vercel logs for errors
3. Try manual generation

### Images not appearing
1. Run `npm run test:imagekit`
2. Check ImageKit dashboard
3. Run `npm run news:generate-images` to backfill

### Specific match missing news
1. Run `npm run news:diagnose TFCMA-2664`
2. Run `npm run news:generate TFCMA-2664`

### Rate limits
1. Add more Gemini API keys to `.env`
2. Keys rotate automatically on 429 errors
3. Upgrade to paid tier if needed

## Files to Check

**News generation logic:**
- `lib/news/trigger.ts` - Main entry point
- `lib/news/auto-generate.ts` - AI generation
- `lib/news/image-generator.ts` - Image creation

**API routes that trigger news:**
- `app/api/seasons/[seasonId]/tournaments/[tournamentId]/matches/[matchId]/route.ts` - Match updates

**Scripts:**
- `scripts/generate-match-news.ts` - Manual generation
- `scripts/diagnose-match-news.ts` - Diagnostics
- `scripts/generate-news-images.ts` - Image backfill
