import { toPng } from 'html-to-image'

/**
 * Preload images by creating new Image objects
 * This ensures images are in browser cache before capture
 */
async function preloadImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'))
  
  if (images.length === 0) {
    return Promise.resolve()
  }

  const preloadPromises = images
    .filter(img => img.src && img.src !== '')
    .map((img) => {
      return new Promise<void>((resolve) => {
        // If already loaded, resolve immediately
        if (img.complete && img.naturalHeight > 0 && img.naturalWidth > 0) {
          resolve()
          return
        }

        // Create a new image to preload
        const preloadImg = new Image()
        preloadImg.crossOrigin = 'anonymous'
        
        let resolved = false
        const cleanup = () => {
          if (!resolved) {
            resolved = true
            preloadImg.onload = null
            preloadImg.onerror = null
          }
        }

        preloadImg.onload = () => {
          cleanup()
          // Update the original image src to trigger reload
          const originalSrc = img.src
          img.src = ''
          img.src = originalSrc
          // Wait a bit for the DOM to update
          setTimeout(resolve, 50)
        }

        preloadImg.onerror = () => {
          cleanup()
          console.warn('Failed to preload image:', img.src)
          resolve()
        }

        // Timeout
        setTimeout(() => {
          cleanup()
          resolve()
        }, 10000)

        preloadImg.src = img.src
      })
    })

  await Promise.all(preloadPromises)
}

/**
 * Wait for all images within an element to load
 * Enhanced for mobile compatibility
 */
async function waitForImagesToLoad(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'))
  
  if (images.length === 0) {
    return Promise.resolve()
  }

  const imagePromises = images.map((img) => {
    return new Promise<void>((resolve) => {
      // If image is already loaded and has valid dimensions
      if (img.complete && img.naturalHeight > 0 && img.naturalWidth > 0) {
        resolve()
        return
      }

      // If image has no src, resolve immediately
      if (!img.src || img.src === '') {
        resolve()
        return
      }

      let resolved = false
      const cleanup = () => {
        if (!resolved) {
          resolved = true
          img.removeEventListener('load', onLoad)
          img.removeEventListener('error', onError)
        }
      }

      const onLoad = () => {
        cleanup()
        // Extra check to ensure image actually loaded
        if (img.naturalHeight > 0 && img.naturalWidth > 0) {
          resolve()
        } else {
          // If dimensions are still 0, wait a bit more
          setTimeout(resolve, 100)
        }
      }

      const onError = () => {
        cleanup()
        console.warn('Image failed to load:', img.src)
        resolve() // Resolve anyway to not block
      }

      img.addEventListener('load', onLoad)
      img.addEventListener('error', onError)

      // Timeout after 20 seconds (increased for mobile)
      setTimeout(() => {
        cleanup()
        console.warn('Image load timeout:', img.src)
        resolve()
      }, 20000)

      // Force reload if image is in error state
      if (img.complete && img.naturalHeight === 0) {
        const currentSrc = img.src
        img.src = ''
        setTimeout(() => {
          img.src = currentSrc
        }, 10)
      }
    })
  })

  await Promise.all(imagePromises)
}

/**
 * Temporarily overrides document.styleSheets to filter out cross-origin stylesheets
 * that throw a SecurityError when reading their cssRules property.
 * Restores the original prototype getter when the returned callback is called.
 */
function makeStyleSheetsSafe(): () => void {
  if (typeof document === 'undefined') return () => {}
  try {
    const sheetsArray = Array.from(document.styleSheets)
    const safeSheets = sheetsArray.filter(sheet => {
      try {
        // Accessing cssRules will throw a SecurityError if the stylesheet is cross-origin
        // and loaded without CORS headers/attributes
        const rules = sheet.cssRules
        return true
      } catch (e) {
        console.warn('[captureTableAsPng] Skipping cross-origin stylesheet to prevent SecurityError:', sheet.href)
        return false
      }
    })

    // If all stylesheets are safe, no need to override
    if (safeSheets.length === sheetsArray.length) {
      return () => {}
    }

    // Temporarily define styleSheets on the document instance
    Object.defineProperty(document, 'styleSheets', {
      value: safeSheets,
      configurable: true,
      writable: true
    })

    return () => {
      try {
        delete (document as any).styleSheets
      } catch (e) {
        console.error('[captureTableAsPng] Failed to restore document.styleSheets:', e)
      }
    }
  } catch (e) {
    console.error('[captureTableAsPng] Failed to make stylesheets safe:', e)
    return () => {}
  }
}

/**
 * Captures an HTMLElement as a PNG data URL.
 * The element should be positioned off-screen (fixed, left: -9999px)
 * rather than display:none so layout calculations remain intact.
 * Waits for all images to load before capturing.
 */
export async function captureTableAsPng(
  element: HTMLElement,
  options?: { width?: number; backgroundColor?: string }
): Promise<string> {
  // First preload all images
  await preloadImages(element)
  
  // Then wait for them to be rendered in the DOM
  await waitForImagesToLoad(element)
  
  // Ensure fonts are loaded by checking document.fonts if available
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    await document.fonts.ready
  }
  
  // Longer delay to ensure fonts and all styles are fully rendered
  // Extra time for mobile devices and to ensure font rendering is complete
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const delay = isMobile ? 1500 : 800
  await new Promise(resolve => setTimeout(resolve, delay))
  
  // Clean up cross-origin stylesheets that would cause a SecurityError
  const restoreStyleSheets = makeStyleSheetsSafe()
  
  try {
    return await toPng(element, {
      cacheBust: true,
      width: options?.width ?? 1200,
      backgroundColor: options?.backgroundColor ?? '#0a0a0a',
      quality: 1,
      pixelRatio: 2, // retina-quality output
      skipFonts: false, // Allow fonts to be embedded in the image
      filter: (node) => {
        // Keep Google Fonts stylesheet links for proper font rendering
        return true
      },
    })
  } finally {
    restoreStyleSheets()
  }
}

/**
 * Triggers download or native share of a data URL.
 * Falls back to download on unsupported browsers.
 */
export async function shareOrDownloadPng(dataUrl: string, filename: string, title?: string): Promise<void> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const file = new File([blob], filename, { type: 'image/png' })

  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      title: title ?? filename.replace('.png', ''),
    })
  } else {
    // Fallback: direct download
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    link.click()
    // Clean up
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }
}
