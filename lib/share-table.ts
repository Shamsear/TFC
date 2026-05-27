import { toPng } from 'html-to-image'

/**
 * Captures an HTMLElement as a PNG data URL.
 * The element should be positioned off-screen (absolute, left: -9999px)
 * rather than display:none so layout calculations remain intact.
 */
export async function captureTableAsPng(
  element: HTMLElement,
  options?: { width?: number; backgroundColor?: string }
): Promise<string> {
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
