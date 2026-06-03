# Get New Gemini API Key

## Issue
Your current Gemini API key appears to have quota/credit issues. All model attempts are failing with 404 or other errors.

## Solution: Get New FREE API Key

### Step 1: Go to Google AI Studio
Visit: **https://aistudio.google.com/apikey**

### Step 2: Create New API Key
1. Click "Create API Key"
2. Select "Create API key in new project" (or choose existing project)
3. Copy the new API key

### Step 3: Update .env File
Replace the old key in your `.env` file:

```env
# Old key (has issues)
# GEMINI_API_KEY=old_key_here

# New key (get from AI Studio)
GEMINI_API_KEY=your_new_free_key_here
```

### Step 4: Restart and Test
```bash
# Test news generation
npx tsx scripts/generate-match-news.ts TFCMA-2673
```

## Free Tier Limits

The FREE tier provides:
- **15 RPM** (Requests Per Minute)
- **1M TPM** (Tokens Per Minute)  
- **1,500 RPD** (Requests Per Day)

This is **MORE than enough** for your news generation needs!

## Why This Happened

Possible reasons:
1. Prepayment credits depleted (from earlier paid usage)
2. API key reached daily quota
3. Model access changed/restricted

## Current Model Fallback

The system will try these models in order:
1. `gemini-2.5-flash` (Primary - works with free tier)
2. `gemini-1.5-pro` (Fallback 1)
3. `gemini-pro` (Fallback 2)

All of these work with the FREE tier!

## Important Notes

- ⚠️ **NEVER share API keys publicly** (revoke if accidentally exposed)
- ✅ Store in `.env` file (not committed to git)
- ✅ `.env` is in `.gitignore` (already configured)
- ✅ Free tier resets daily

## After Getting New Key

The system should work immediately:
- News generation will succeed
- Manager quotes will be included
- Bilingual content (EN + ML)
- Automatic fallback between 3 models
- No payment required!
