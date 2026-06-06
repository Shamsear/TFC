# Poster Studio Font Fix

## Problem
When downloading posters from the Poster Studio, the downloaded image had different fonts and font sizes compared to what was displayed on the page. The preview showed beautiful "Barlow Condensed" and "Outfit" fonts, but the downloaded image used generic system fallback fonts.

## Root Cause
The issue was in the `captureTableAsPng` function in `lib/share-table.ts`:

1. **`skipFonts: true`** - This option told `html-to-image` to skip loading external fonts to avoid CORS issues. This caused the library to ignore the Google Fonts and use fallback system fonts instead.

2. **Font filtering** - The filter function was removing external stylesheet links (like Google Fonts), preventing the fonts from loading in the captured image.

3. **Insufficient font load time** - The delay before capturing wasn't long enough to ensure fonts were fully loaded and rendered.

## Solution

### Changes Made to `lib/share-table.ts`

#### 1. Font Loading Wait
Added explicit font loading check using the Font Loading API:
```typescript
// Ensure fonts are loaded by checking document.fonts if available
if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
  await document.fonts.ready
}
```

#### 2. Increased Delay
Extended the delay to ensure fonts are fully rendered:
```typescript
// Longer delay to ensure fonts and all styles are fully rendered
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
const delay = isMobile ? 1500 : 800  // Increased from 1000/300
await new Promise(resolve => setTimeout(resolve, delay))
```

#### 3. Enable Font Embedding
Changed `skipFonts: false` to allow fonts to be embedded in the image:
```typescript
skipFonts: false, // Allow fonts to be embedded in the image
```

#### 4. Keep Font Stylesheets
Removed the filter that was blocking Google Fonts stylesheet links:
```typescript
filter: (node) => {
  // Keep Google Fonts stylesheet links for proper font rendering
  return true
},
```

## How It Works Now

1. **Font Loading**: The function now waits for `document.fonts.ready`, which is a promise that resolves when all fonts used in the document are loaded.

2. **Extended Delay**: An 800ms delay (1500ms on mobile) ensures fonts are not just loaded but fully rendered before capture.

3. **Font Embedding**: With `skipFonts: false`, the `html-to-image` library will properly embed the Google Fonts (Barlow Condensed and Outfit) into the generated PNG.

4. **Stylesheet Preservation**: Google Fonts stylesheets are now included, allowing proper font rendering.

## Testing
To verify the fix:
1. Navigate to any tournament stats page
2. Open the Poster Studio
3. Select any theme (Golden Boot, Assists King, etc.)
4. Download the poster
5. Compare the downloaded image with the preview - fonts should now match exactly

## Affected Components
- `lib/share-table.ts` - Image capture utility
- All poster types in `components/tournaments/StatsPoster.tsx`:
  - Golden Boot poster
  - Assists King poster
  - Golden Glove poster
  - Clean Sheets poster
  - Team Matchday poster
  - Team Weekly poster

## Notes
- The fonts used are "Barlow Condensed" and "Outfit" from Google Fonts
- The fix maintains the high-quality output (pixelRatio: 2 for retina displays)
- Image quality remains at maximum (quality: 1)
- Background colors and all other styling remain unchanged
