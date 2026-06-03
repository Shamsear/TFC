# Gemini Model Fallback System

## Overview
The news generation system now supports automatic fallback between multiple Gemini models to ensure high availability and handle quota/rate limit issues.

## Model Priority Order

The system starts with free/cheaper models and escalates to premium models only when needed:

1. **Gemini 1.5 Flash** (Primary)
   - Free tier available
   - Good quality and speed balance
   - Most commonly used model

2. **Gemini 1.5 Flash 8B** (Fallback 1)
   - Lightweight model (8 billion parameters)
   - Faster and more efficient
   - Lower quota consumption
   - Activated after 3 consecutive failures on primary

3. **Gemini Exp 1206** (Fallback 2)
   - Experimental Gemini 3 Flash
   - Next-generation model
   - May have higher quality

4. **Gemini 2.0 Flash Lite** (Fallback 3)
   - Lighter version of 2.0
   - Good balance of quality and cost

5. **Gemini 2.5 Flash TTS** (Fallback 4)
   - Text-to-speech optimized variant
   - May work better for text generation

6. **Gemini 2.5 Flash** (Fallback 5)
   - Premium model (last resort)
   - Highest quality output
   - Used only when all others fail
   - More expensive quota usage

## Strategy

This order prioritizes **cost efficiency** while maintaining quality:
- Start with free/cheap models that work well
- Escalate to premium only when needed
- Maximizes quota usage from free tier
- Reduces overall API costs

## How It Works

### Automatic Fallback
The system tracks failures and automatically switches models:

```
Primary (1.5 Flash - Free)
    ↓ (3 failures)
Fallback 1 (1.5 Flash 8B - Lighter)
    ↓ (3 failures)
Fallback 2 (Exp 1206 - Gemini 3)
    ↓ (3 failures)
Fallback 3 (2.0 Flash Lite)
    ↓ (3 failures)
Fallback 4 (2.5 Flash TTS)
    ↓ (3 failures)
Fallback 5 (2.5 Flash - Premium)
```

### Failure Triggers
Model fallback occurs when:
- 3 consecutive generation failures
- 500/503 server errors
- Model-specific errors
- Persistent API issues

### API Key Rotation
In addition to model fallback, the system rotates through multiple API keys:
- Handles 429 rate limit errors
- Distributes load across keys
- Works in combination with model fallback

### Auto-Recovery
After successful generation:
- System resets to primary model (2.5 Flash)
- Failure count resets to 0
- Ensures best quality when available

## Configuration

### Environment Variables
```env
# Primary API key (required)
GEMINI_API_KEY=your_primary_key

# Additional keys for rotation (optional)
GEMINI_API_KEY_2=your_secondary_key
GEMINI_API_KEY_3=your_tertiary_key
```

### Model Names
Configured in `lib/gemini/config.ts`:
```typescript
const MODELS = [
  'gemini-1.5-flash',       // Primary (Free)
  'gemini-1.5-flash-8b',    // Fallback 1
  'gemini-exp-1206',        // Fallback 2 (Gemini 3)
  'gemini-2.0-flash-lite',  // Fallback 3
  'gemini-2.5-flash-tts',   // Fallback 4
  'gemini-2.5-flash',       // Fallback 5 (Premium)
]
```

## Monitoring

### Console Logs
The system provides detailed logging:

```
[Gemini] Using model: gemini-1.5-flash (API key 1/3)
[News AI] Starting bilingual news generation
[News AI] ✅ Bilingual generation successful
[Gemini] ✅ Reset to primary model: gemini-1.5-flash
```

### Failure Handling
```
[News AI] Error generating EN (attempt 1): [Model Error]
[Gemini] ⚠️ Falling back to model: gemini-1.5-flash-8b
[News AI] Retrying with fallback model...
```

### Model Info API
Get current model status:
```typescript
import { getCurrentModelInfo } from '@/lib/gemini/config';

const info = getCurrentModelInfo();
// Returns:
// {
//   model: 'gemini-2.5-flash',
//   modelIndex: 0,
//   totalModels: 3,
//   apiKeyIndex: 0,
//   totalKeys: 3,
//   failureCount: 0
// }
```

## Benefits

### High Availability
- 3 models × 3 API keys = 9 fallback combinations
- Automatic recovery without manual intervention
- Graceful degradation

### Cost Optimization
- Use premium model when available
- Fallback to cheaper models during issues
- Reduce quota consumption with 8B model

### Quality Assurance
- Always try best model first
- Auto-recovery to premium model
- Maintain quality standards

### Rate Limit Protection
- API key rotation handles 429 errors
- Model fallback handles persistent issues
- Combined approach for maximum resilience

## Testing

### Test Model Fallback
```bash
# Generate news - will automatically fallback if needed
npx tsx scripts/generate-match-news.ts TFCMA-2673
```

### Force Fallback (for testing)
Temporarily disable primary model by:
1. Using invalid API key for testing
2. Exceeding rate limits intentionally
3. Watching logs for fallback activation

### Verify Auto-Recovery
After successful generation:
```
[Gemini] ✅ Reset to primary model: gemini-2.5-flash
```

## Error Scenarios

### Scenario 1: Rate Limit (429)
```
Error: 429 Too Many Requests
Action: Rotate to next API key
Result: Continue with same model
```

### Scenario 2: Server Error (500/503)
```
Error: 500 Internal Server Error (3x)
Action: Fallback to next model
Result: Switch to gemini-1.5-flash
```

### Scenario 3: All Models Exhausted
```
Error: All models failed
Action: Throw error to caller
Result: News generation fails gracefully
```

### Scenario 4: Successful Recovery
```
Status: Generation successful
Action: Reset to primary model
Result: Next generation uses gemini-2.5-flash
```

## Best Practices

### API Key Management
- Use at least 2-3 API keys for rotation
- Monitor quota usage across keys
- Rotate keys from different projects if possible

### Model Selection
- Primary: Best quality for important content
- Fallback 1: Reliable alternative
- Fallback 2: Emergency lightweight option

### Monitoring
- Watch for frequent fallbacks (indicates issues)
- Monitor success rates per model
- Track quota consumption

### Quota Management
- Free tier: 15 RPM, 1M TPM, 1,500 RPD per key
- Multiple keys multiply available quota
- 8B model consumes less quota

## Troubleshooting

### Issue: Constant Fallback to 8B Model
**Cause**: Primary models failing consistently
**Solution**: 
- Check API key validity
- Verify quota availability
- Check Google AI Studio status

### Issue: 429 Errors Despite Rotation
**Cause**: All keys exhausted
**Solution**:
- Add more API keys
- Wait for quota reset (daily)
- Consider paid tier

### Issue: Quality Degradation
**Cause**: Stuck on 8B model
**Solution**:
- Check why primary models failing
- Manually reset: restart application
- Verify model names are correct

## Updates

### Version History
- **v1.0** - Single model (gemini-2.5-flash)
- **v2.0** - Added model fallback system
- **v2.1** - Current: 3 models with auto-recovery

### Future Enhancements
- Configurable fallback thresholds
- Per-language model selection
- Quality scoring by model
- Usage analytics dashboard

## Files Modified

1. `lib/gemini/config.ts` - Model fallback logic
2. `lib/news/auto-generate.ts` - Integration with news gen
3. `GEMINI-MODEL-FALLBACK.md` - This documentation

## Summary

The model fallback system ensures:
✅ High availability (3 model options)
✅ Cost optimization (use cheaper models when needed)
✅ Quality maintenance (auto-recovery to premium)
✅ Rate limit protection (key rotation + model fallback)
✅ Graceful degradation (never complete failure)

News generation will automatically use the best available model at all times!
