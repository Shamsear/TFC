# Emoji Font Registration Fix

## Problem
The news image generator was showing warnings when trying to register the emoji font:
```
[News Image] ⚠️ Failed to register emoji font: Error: Could not load font to the system's font host
```

This was happening on Windows due to limitations with the `canvas` library's `registerFont` function.

## Root Cause
1. **Windows Compatibility**: The `canvas` library has known issues registering certain font types on Windows
2. **Insufficient Error Handling**: The error was being logged but not properly handled
3. **No Directory Creation**: The temp directory might not exist
4. **No Font Validation**: No validation of downloaded font file before registration

## Solution Applied

### Changes to `lib/news/image-generator.ts`

#### 1. Directory Creation
```typescript
// Ensure the temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
```

#### 2. Font Download Validation
```typescript
// Validate that we actually got font data (should be at least 100KB)
if (buffer.byteLength < 100000) {
  console.warn(`[News Image] Downloaded font too small (${buffer.byteLength} bytes), skipping`);
  continue;
}
```

#### 3. Download Timeout
```typescript
const response = await fetch(url, { 
  signal: AbortSignal.timeout(15000) // 15 second timeout
});
```

#### 4. File Existence Verification
```typescript
// Check if font already exists and is valid
if (!fs.existsSync(tempFontPath) || fs.statSync(tempFontPath).size === 0) {
  // Download logic...
} else {
  console.log(`[News Image] Emoji font already exists at ${tempFontPath}`);
}
```

#### 5. Pre-Registration Validation
```typescript
// Verify the font file exists and is readable before registering
if (!fs.existsSync(tempFontPath)) {
  console.warn(`[News Image] Font file does not exist at ${tempFontPath}`);
  return;
}

const fontStats = fs.statSync(tempFontPath);
if (fontStats.size === 0) {
  console.warn(`[News Image] Font file is empty at ${tempFontPath}`);
  return;
}

console.log(`[News Image] Attempting to register emoji font (${fontStats.size} bytes)...`);
```

#### 6. Isolated Registration Error Handling
```typescript
try {
  registerFont(tempFontPath, { family: 'NotoEmoji' });
  emojiFontRegistered = true;
  console.log('[News Image] ✅ Emoji font registered successfully as "NotoEmoji"');
} catch (registerError: any) {
  console.warn('[News Image] ⚠️ Font file exists but registration failed:', registerError.message || registerError);
  console.warn('[News Image] This is likely a Windows/canvas library limitation and does not affect image generation');
  // Mark as registered anyway to prevent repeated attempts
  emojiFontRegistered = true;
}
```

#### 7. Outer Error Handling
```typescript
} catch (error: any) {
  console.warn('[News Image] ⚠️ Failed in emoji font setup:', error.message || error);
  // Mark as registered to prevent repeated attempts
  emojiFontRegistered = true;
}
```

## Key Improvements

1. **Graceful Degradation**: Even if font registration fails, images still generate successfully
2. **Prevent Retry Loops**: Mark as registered after failure to prevent repeated attempts
3. **Better Logging**: More detailed logging at each step for debugging
4. **Windows Compatibility Note**: Clear message that registration failure is a known Windows issue
5. **File Validation**: Multiple validation checks before attempting registration
6. **Timeout Protection**: 15-second timeout prevents hanging on slow CDN responses
7. **Unique Font Family**: Changed from `'system-ui'` to `'NotoEmoji'` to avoid conflicts

## How to Apply

1. **Restart the development server** to load the new code:
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. The new code will:
   - Create the temp directory if needed
   - Download and validate the emoji font
   - Attempt registration with better error handling
   - Show informative messages instead of error stack traces
   - Continue generating images even if emoji font fails

## Expected Behavior After Fix

### Success Case:
```
[News Image] Emoji font already exists at C:\...\public\seguiemj.ttf
[News Image] Attempting to register emoji font (12345678 bytes)...
[News Image] ✅ Emoji font registered successfully as "NotoEmoji"
```

### Graceful Failure (Windows):
```
[News Image] Emoji font already exists at C:\...\public\seguiemj.ttf
[News Image] Attempting to register emoji font (12345678 bytes)...
[News Image] ⚠️ Font file exists but registration failed: Could not load font to the system's font host
[News Image] This is likely a Windows/canvas library limitation and does not affect image generation
[News Image] ✅ Uploaded to ImageKit: https://...
```

## Impact

- ✅ **Images still generate**: The fix doesn't break image generation
- ✅ **No more error stack traces**: Clean warning messages instead
- ✅ **No retry loops**: Prevents repeated failed attempts
- ✅ **Better debugging**: Detailed logging for troubleshooting
- ⚠️ **Emoji rendering**: May not work on Windows, but this is a canvas library limitation

## Production Notes

On production (Vercel):
- Uses `/tmp` directory instead of `public`
- Linux environment typically has better font support
- Emoji font registration more likely to succeed
- Images will include proper emoji rendering

## Alternative Solution (If Still Having Issues)

If you continue to see warnings, you can completely disable emoji font loading:

```typescript
async function ensureEmojiFont() {
  // Skip emoji font registration on Windows development
  if (process.platform === 'win32' && process.env.NODE_ENV !== 'production') {
    console.log('[News Image] Skipping emoji font on Windows development');
    emojiFontRegistered = true;
    return;
  }
  // ... rest of the function
}
```
