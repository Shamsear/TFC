# News Generation Troubleshooting Guide

## Problem: News Not Generated for Match

### Quick Diagnostics

**Step 1: Check if match qualifies for news**
```bash
npm run news:diagnose TFCMA-2664
```

This will show:
- Match details (status, scores, teams)
- Any existing news for this match
- Recent news activity
- Completed matches in the same round

**Step 2: Manually generate news for the match**
```bash
npm run news:generate TFCMA-2664
```

This will:
- Validate match status and scores
- Fetch tournament context
- Generate AI content with Gemini
- Create news article with image

## Common Causes

### 1. Silent Failures (No Errors in Logs)

**Why:** The `triggerNews()` function catches all errors to prevent breaking the main flow. Errors are logged but not visible unless you're watching logs closely.

**Check Vercel Logs:**
```
[News Trigger] Event: match_completed
[News AI] Error generating EN (attempt 1): <error>
[News Trigger] ❌ Failed to trigger news: <error>
```

**Common Silent Failures:**
- Gemini API rate limit (429 errors)
- Gemini API timeout
- Invalid API key
- ImageKit upload failure (won't prevent news, just no image)

### 2. Gemini API Issues

**Rate Limiting:**
- Free tier: 15 requests/minute
- Paid tier: 1000+ requests/minute
- Code automatically rotates between API keys if rate limited

**Check `.env` for API keys:**
```env
GEMINI_API_KEY_1=AIza...
GEMINI_API_KEY_2=AIza...
GEMINI_API_KEY_3=AIza...
```

**Test API key:**
```bash
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY"
```

### 3. Match Conditions Not Met

News is **only** generated when:
- ✅ Status changes from non-COMPLETED to COMPLETED
- ✅ Both homeScore and awayScore are set (not null)
- ✅ The match update API is called (admin panel or API)

**Won't generate news if:**
- ❌ Match was already COMPLETED before
- ❌ Scores are missing (null)
- ❌ Match status is SCHEDULED, LIVE, POSTPONED, etc.

### 4. ImageKit Upload Failures

**Error:** `EROFS: read-only file system`
- ✅ **Fixed:** Images now upload to ImageKit CDN
- If ImageKit fails, images fall back to local storage
- **News is still created** even if image generation fails

**Test ImageKit:**
```bash
npm run test:imagekit
```

### 5. Database Insert Failures

**Raw SQL Insert:**
The code uses raw SQL (`$executeRawUnsafe`) which can fail on:
- Single quotes in content (should be escaped with `''`)
- Special characters
- Invalid JSON in metadata

**Check for SQL errors in logs:**
```
[News Trigger] ❌ Failed to trigger news: syntax error at or near...
```

## Manual Recovery

### If news wasn't generated for a completed match:

**Option 1: Re-trigger by updating the match**
1. Go to admin panel
2. Change match status to SCHEDULED
3. Save
4. Change status back to COMPLETED with scores
5. Save (this triggers news generation)

**Option 2: Use the manual generation script**
```bash
npm run news:generate TFCMA-2664
```

**Option 3: Use the bulk matchday script**
```bash
npm run news:matchday
```
(Generates news for all matches in a specific matchday)

## Monitoring Best Practices

### Enable Detailed Logging

Add to your monitoring:
```
[News Trigger] Event:           # News generation started
[News AI] Raw ML response:      # Gemini API responded
[News AI] ✅ Bilingual:         # Content generated successfully
[News Image] Generating:        # Image generation started
[News Image] ✅ Uploaded:       # Image uploaded to ImageKit
[News Trigger] ✅ News created: # News saved to database
```

### Check for Failures

Watch for these patterns:
```
[News Trigger] ❌ Failed to trigger news:
[News AI] Error generating:
[News Image] ❌ Generation failed:
[News Image] ❌ ImageKit upload failed:
```

### Vercel Log Filters

In Vercel dashboard, filter logs by:
- `[News Trigger]` - All news events
- `[News AI]` - AI generation
- `[News Image]` - Image generation
- `❌` - Failures only

## Prevention

### 1. Monitor API Quotas

**Gemini API:**
- Check usage at: https://aistudio.google.com/app/apikey
- Set up billing alerts
- Add multiple API keys for rotation

**ImageKit:**
- Check usage at: https://imagekit.io/dashboard
- Monitor bandwidth and storage
- Upgrade plan if needed

### 2. Test Before Deploying

```bash
# Test ImageKit connection
npm run test:imagekit

# Test news generation locally
npm run news:generate TFCMA-2664

# Test image generation for existing news
npm run news:generate-images
```

### 3. Set Up Alerts

Configure alerts in Vercel for:
- Error rate increases
- Failed function executions
- Timeout errors

## Debug Checklist

- [ ] Run `npm run news:diagnose TFCMA-2664`
- [ ] Check Vercel logs for errors
- [ ] Verify Gemini API key is valid
- [ ] Test ImageKit connection with `npm run test:imagekit`
- [ ] Check match status is COMPLETED with scores
- [ ] Look for rate limit errors (429)
- [ ] Try manual generation with `npm run news:generate TFCMA-2664`
- [ ] Check database for partial data (news record without content)
- [ ] Verify environment variables are set in Vercel

## Getting Help

If issues persist:
1. Run diagnostics: `npm run news:diagnose TFCMA-2664`
2. Check last 50 Vercel logs for errors
3. Test API keys: `npm run test:imagekit`
4. Check Gemini API quota
5. Review database for partial records
6. Try manual generation to isolate the issue
