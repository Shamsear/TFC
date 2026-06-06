# Font Registration Code for News Image Generator

Add this code block right after the imports in `lib/news/image-generator.ts` (after line 15, before the constants):

```typescript
import { createCanvas, loadImage, Image, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import ImageKit from 'imagekit';

// ========== ADD THIS FONT REGISTRATION BLOCK HERE ==========
try {
  const fontsPath = path.join(process.cwd(), 'fonts');
  
  // Bahnschrift (existing)
  registerFont(path.join(fontsPath, 'BAHNSCHRIFT.TTF'), { family: 'Bahnschrift' });
  
  // Segoe UI (existing)
  registerFont(path.join(fontsPath, 'Segoe UI.ttf'), { family: 'Segoe UI' });
  registerFont(path.join(fontsPath, 'Segoe UI Bold.ttf'), { family: 'Segoe UI', weight: 'bold' });
  
  // Oswald (existing)
  registerFont(path.join(fontsPath, 'Oswald-Bold.ttf'), { family: 'Oswald', weight: 'bold' });
  registerFont(path.join(fontsPath, 'Oswald-SemiBold.ttf'), { family: 'Oswald', weight: '600' });
  registerFont(path.join(fontsPath, 'Oswald-Medium.ttf'), { family: 'Oswald', weight: '500' });
  registerFont(path.join(fontsPath, 'Oswald-Regular.ttf'), { family: 'Oswald', weight: 'normal' });
  
  // Impact (NEW - CRITICAL for scores and large text)
  registerFont(path.join(fontsPath, 'Impact.ttf'), { family: 'Impact' });
  registerFont(path.join(fontsPath, 'impact.ttf'), { family: 'Impact' }); // Fallback lowercase
  registerFont(path.join(fontsPath, 'IMPACT.TTF'), { family: 'Impact' }); // Fallback uppercase
  
  // Segoe UI Emoji (NEW - for emoji support 🏆⚽)
  registerFont(path.join(fontsPath, 'seguiemj.ttf'), { family: 'system-ui' });
  registerFont(path.join(fontsPath, 'Segoe UI Emoji.ttf'), { family: 'system-ui' }); // Alternative name
  
  console.log('[News Image] ✅ All custom fonts registered successfully');
} catch (error) {
  console.error('[News Image] ⚠️ Font registration failed:', error);
  console.error('[News Image] Images will use fallback system fonts');
}
// ========== END FONT REGISTRATION BLOCK ==========

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;
const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png');
```

## What fonts you should have in your `fonts/` folder:

### Existing (keep):
- ✅ BAHNSCHRIFT.TTF
- ✅ Segoe UI.ttf
- ✅ Segoe UI Bold.ttf
- ✅ Oswald-Bold.ttf
- ✅ Oswald-SemiBold.ttf
- ✅ Oswald-Medium.ttf
- ✅ Oswald-Regular.ttf

### New (add these):
- 🆕 Impact.ttf (or impact.ttf or IMPACT.TTF) - any case works
- 🆕 seguiemj.ttf (Segoe UI Emoji from Windows fonts)

## Testing

After adding this code, restart your dev server and generate a news article. The images should now show:
- ✅ Large score numbers (Impact font)
- ✅ Emoji icons 🏆⚽ (Segoe UI Emoji)
- ✅ Team names and labels (Bahnschrift)
- ✅ Body text (Segoe UI)

## Troubleshooting

If you still see rectangles after adding fonts:
1. Check the console for "[News Image] ✅ All custom fonts registered successfully"
2. If you see an error, check that font files exist in the `fonts/` folder
3. Font file names are case-sensitive on some systems
4. Restart your dev server after adding fonts
