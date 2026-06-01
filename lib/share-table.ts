import { toPng } from 'html-to-image'

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
      if (img.complete && img.naturalHeight !== 0 && img.naturalWidth !== 0) {
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
        if (img.naturalHeight !== 0 && img.naturalWidth !== 0) {
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

      // Timeout after 15 seconds (increased for mobile)
      setTimeout(() => {
        cleanup()
        console.warn('Image load timeout:', img.src)
        resolve()
      }, 15000)

      // Force reload if image is in error state
      if (img.complete && img.naturalHeight === 0) {
        const currentSrc = img.src
        img.src = ''
        img.src = currentSrc
      }
    })
  })

  await Promise.all(imagePromises)
}

/**
 * Captures an HTMLElement as a PNG data URL.
 * The element should be positioned off-screen (absolute, left: -9999px)
 * rather than display:none so layout calculations remain intact.
 * Waits for all images to load before capturing.
 */
export async function captureTableAsPng(
  element: HTMLElement,
  options?: { width?: number; backgroundColor?: string }
): Promise<string> {
  // Wait for all images to load first
  await waitForImagesToLoad(element)
  
  // Longer delay for mobile devices to ensure rendering is complete
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const delay = isMobile ? 500 : 200
  await new Promise(resolve => setTimeout(resolve, delay))
  
  return toPng(element, {
    cacheBust: true,
    width: options?.width ?? 1200,
    backgroundColor: options?.backgroundColor ?? '#0a0a0a',
    quality: 1,
    pixelRatio: 2, // retina-quality output
  })
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
