import { toPng } from 'html-to-image'

/**
 * Wait for all images within an element to load
 */
async function waitForImagesToLoad(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'))
  
  if (images.length === 0) {
    return Promise.resolve()
  }

  const imagePromises = images.map((img) => {
    return new Promise<void>((resolve, reject) => {
      // If image is already loaded
      if (img.complete && img.naturalHeight !== 0) {
        resolve()
        return
      }

      // Wait for image to load
      const onLoad = () => {
        cleanup()
        resolve()
      }

      const onError = () => {
        cleanup()
        // Resolve anyway to not block the capture
        console.warn('Image failed to load:', img.src)
        resolve()
      }

      const cleanup = () => {
        img.removeEventListener('load', onLoad)
        img.removeEventListener('error', onError)
      }

      img.addEventListener('load', onLoad)
      img.addEventListener('error', onError)

      // Timeout after 10 seconds
      setTimeout(() => {
        cleanup()
        console.warn('Image load timeout:', img.src)
        resolve()
      }, 10000)
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
  
  // Small delay to ensure rendering is complete
  await new Promise(resolve => setTimeout(resolve, 100))
  
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
