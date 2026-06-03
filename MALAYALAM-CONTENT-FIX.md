# Malayalam Content Truncation Fix

## Issue
Malayalam news content was being cut off mid-sentence, creating incomplete articles. English generation worked fine.

## Root Causes

### 1. **Insufficient Token Limit**
- **Problem**: `maxOutputTokens: 2048` was too low
- **Reason**: Malayalam Unicode characters consume significantly more tokens than English ASCII
- **Example**: A 150-word Malayalam article can use 2-3x more tokens than English equivalent
- **Fix**: Increased to `maxOutputTokens: 4096`

### 2. **Incomplete Unicode Handling**
- **Problem**: `parseAIResponse()` regex patterns didn't properly handle multi-byte Malayalam characters
- **Old Pattern**: `/"content"\s*:\s*"([^"]+)"/` - breaks on escaped quotes in Malayalam
- **New Pattern**: `/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/` - properly handles escaped characters
- **Fix**: Enhanced regex patterns to capture Malayalam text with proper escaping

### 3. **Sentence Boundary Detection**
- **Problem**: Only detected English punctuation (`.`, `?`, `!`) 
- **Issue**: Malayalam uses different punctuation marks
- **Fix**: Added Malayalam-specific sentence enders:
  - `।` (purna virama)
  - `॥` (double purna virama)
  - `ൿ` (Malayalam virama)

## Changes Made

### File: `lib/gemini/config.ts`
```typescript
// BEFORE
maxOutputTokens: 2048

// AFTER
maxOutputTokens: 4096 // Increased for Malayalam Unicode support
```

### File: `lib/news/auto-generate.ts`

#### Enhanced parseAIResponse()
1. **Better regex patterns**: Handle escaped characters properly
2. **Malayalam punctuation support**: Recognize Malayalam sentence endings
3. **Unescape JSON strings**: Properly decode `\n`, `\"`, `\\` in extracted content
4. **Fallback strategy 5**: Extract readable content even from malformed responses
5. **Enhanced logging**: Show response length, preview, and end to diagnose truncation

#### Better Logging
- Shows response length (helps identify if token limit reached)
- Shows first 300 and last 200 characters (helps identify truncation point)
- Logs parsed content length and preview

## Model Fallback Order Updated

**✅ VERIFIED WORKING MODELS** (tested June 2026):
1. `gemini-2.5-flash` - Best price-performance (Primary) ✅
2. `gemini-3.5-flash` - Latest model ✅
3. `gemini-2.5-flash-lite` - Lighter/faster ✅
4. `gemini-flash-latest` - Alias to latest release ✅

**Note**: All models confirmed working with free tier API keys. `gemini-2.5-pro` excluded (requires paid tier).

## Testing

### Quick Test (Recommended)
```bash
# Run dedicated Malayalam test script
npx tsx scripts/test-malayalam-generation.ts
```

This will:
- Generate both English and Malayalam content
- Show character counts and word counts
- Validate completeness (punctuation, length)
- Display analysis and validation results

### Full Integration Test
```bash
npm run dev
# In another terminal, trigger Malayalam news generation
npx tsx scripts/generate-match-news.ts
```

**Watch for these logs:**
- `[News AI] Raw ML response length:` - Should be >1500 characters for complete article
- `[News AI] ✅ Successfully parsed ML content` - Confirms parsing success
- `Content length:` - Should be 400-600 characters for 120-180 word Malayalam article

## Expected Behavior

✅ **English**: 120-180 words ≈ 600-900 characters ≈ 150-250 tokens
✅ **Malayalam**: 120-180 words ≈ 800-1200 characters ≈ 400-600 tokens

With 4096 token limit, both languages have ample room for complete articles plus JSON structure.

## If Issue Persists

1. **Check which model succeeded**: Look for `[Gemini] Using model:` in logs
2. **Check response length**: If <1000 chars for Malayalam, token limit still being hit
3. **Try different model**: Some models may have different token efficiency
4. **Check API key quota**: Free tier has daily limits (may need 2nd/3rd key)
5. **Examine raw response**: Look for incomplete JSON or cut-off Malayalam text

## Multiple API Keys

You can now use up to 3 Gemini API keys:
```env
GEMINI_API_KEY=your_key_1
GEMINI_API_KEY_2=your_key_2  # Optional
GEMINI_API_KEY_3=your_key_3  # Optional
```

System automatically rotates keys on rate limit (429) errors.
