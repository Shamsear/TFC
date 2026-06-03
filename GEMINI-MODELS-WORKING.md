# Working Gemini Models (June 2026)

## ✅ Verified Working Models

All models tested and confirmed working with your API keys:

1. **gemini-2.5-flash** ✅
   - Best price-performance ratio
   - Low latency, high volume tasks
   - **PRIMARY MODEL** in fallback chain

2. **gemini-3.5-flash** ✅
   - Latest generation model
   - Excellent for text generation
   - First fallback option

3. **gemini-2.5-flash-lite** ✅
   - Lighter, faster variant
   - Good for simple tasks
   - Second fallback option

4. **gemini-flash-latest** ✅
   - Alias pointing to latest flash release
   - Auto-updates to newest version
   - Last fallback option

## ❌ Models NOT Available in Free Tier

- **gemini-2.5-pro**: Requires paid plan (429 quota error)
- **gemini-1.5-flash**: Model not found (404 error)
- **gemini-1.5-pro**: Model not found (404 error)
- **gemini-pro**: Model not found (404 error)
- **gemini-1.0-pro**: Model not found (404 error)

## Current Configuration

File: `lib/gemini/config.ts`

```typescript
const MODELS = [
  'gemini-2.5-flash',         // Primary
  'gemini-3.5-flash',         // Fallback 1
  'gemini-2.5-flash-lite',    // Fallback 2
  'gemini-flash-latest',      // Fallback 3
] as const;
```

## Testing

To verify models work with your API keys:

```bash
npx tsx scripts/test-gemini-quick.ts
```

Expected output:
```
✅ gemini-2.5-flash WORKS!
✅ gemini-3.5-flash WORKS!
✅ gemini-2.5-flash-lite WORKS!
✅ gemini-flash-latest WORKS!
```

## API Key Configuration

You have 3 API keys configured (rotation enabled):

```.env
GEMINI_API_KEY=AQ.Ab8RN6Lt_8B3IKjJrcclbpeHAPfgUrp9z7v-Rqm8C-OGXzGaHQ
GEMINI_API_KEY_2=AIzaSyAiPDxCszUFuepFNBaKKmIUQGYWP4bkoGE
GEMINI_API_KEY_3=AQ.Ab8RN6LaS3TM4sRN0tMdhb-Rjz0IQNYu4LFD8LnLypxQwvjXbA
```

System automatically rotates keys on rate limit (429) errors.

## Rate Limits (Free Tier)

Based on error messages, free tier limits per model:
- Requests per minute: Limited
- Requests per day: Limited  
- Input tokens per day: Limited
- Input tokens per minute: Limited

When limits hit, system automatically:
1. Rotates to next API key
2. Falls back to next model after 3 failures
3. Waits with exponential backoff before retry

## Official Documentation

- Models list: https://ai.google.dev/gemini-api/docs/models
- Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Deprecations: https://ai.google.dev/gemini-api/docs/deprecations

## Troubleshooting

### 404 Not Found
Model doesn't exist in current API version. Update to working models above.

### 429 Too Many Requests
Hit rate limit or quota. Solutions:
- Use multiple API keys (already configured)
- Wait for quota reset
- Upgrade to paid tier (for pro models)

### 503 Service Unavailable
Model experiencing high demand. System automatically falls back to next model.

## Next Steps

Your system is now configured with 4 working models and 3 API keys. Malayalam content generation should work properly with the increased token limit (4096) and proper model configuration.

Try generating news:
```bash
npx tsx scripts/generate-match-news.ts
```

Or test Malayalam specifically:
```bash
npx tsx scripts/test-malayalam-generation.ts
```
