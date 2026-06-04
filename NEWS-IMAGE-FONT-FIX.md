# News Image Generation Font Fix

## Problem
Images generated with boxes/rectangles instead of text. This is caused by missing system fonts on the server.

## Root Cause
The image generator uses system-specific fonts:
- "Impact"
- "Bahnschrift" 
- "Segoe UI"

These fonts are not available on Linux servers (typical for Node.js hosting), causing the canvas library to fail to render text.

## Solution
Use web-safe fonts or register custom fonts with node-canvas.

### Option 1: Use Sans-Serif Fallback (Quick Fix)
Replace all font specifications with generic sans-serif:

```typescript
// Instead of:
ctx.font = 'bold 64px "Impact", "Bahnschrift", "Segoe UI", sans-serif';

// Use:
ctx.font = 'bold 64px sans-serif';
```

### Option 2: Register Custom Fonts (Better Solution)
1. Download font files (.ttf) and place in `/fonts` directory
2. Register fonts with canvas at startup:

```typescript
import { registerFont } from 'canvas';

// Register fonts
registerFont(path.join(process.cwd(), 'fonts', 'Impact.ttf'), { family: 'Impact' });
registerFont(path.join(process.cwd(), 'fonts', 'Arial-Bold.ttf'), { family: 'Arial', weight: 'bold' });
```

## Recommended Fix
Use "Arial" or leave as generic "sans-serif" since these are universally available.

## Files to Update
- `lib/news/image-generator.ts` - All font specifications
