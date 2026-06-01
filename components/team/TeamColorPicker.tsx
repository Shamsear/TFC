'use client'

import { useState, useRef, useEffect } from 'react'

interface TeamColorPickerProps {
  logoUrl: string
  currentColor?: string
  onColorSelect: (color: string) => void
}

export default function TeamColorPicker({ logoUrl, currentColor, onColorSelect }: TeamColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor || '#00e5ff')
  const [extractedColors, setExtractedColors] = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (logoUrl && showPicker) {
      extractColorsFromImage()
    }
  }, [logoUrl, showPicker])

  const extractColorsFromImage = () => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    // Store image reference
    imgRef.current = img
    
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      // Set canvas size to match image (max 300px for display)
      const maxSize = 300
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = img.width * scale
      canvas.height = img.height * scale

      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      setCanvasReady(true)

      // Get image data for color extraction
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = imageData.data

        // Extract colors
        const colorMap = new Map<string, number>()
        
        // Sample every 4th pixel for performance
        for (let i = 0; i < pixels.length; i += 16) {
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const a = pixels[i + 3]

          // Skip transparent or near-transparent pixels
          if (a < 50) continue

          // Skip very dark or very light colors
          const brightness = (r + g + b) / 3
          if (brightness < 30 || brightness > 240) continue

          const hex = rgbToHex(r, g, b)
          colorMap.set(hex, (colorMap.get(hex) || 0) + 1)
        }

        // Sort by frequency and get top 8 colors
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([color]) => color)

        setExtractedColors(sortedColors)
      } catch (error) {
        console.error('Error extracting colors:', error)
      }
    }
    
    img.onerror = (e) => {
      console.error('Failed to load image for color extraction:', e)
      setCanvasReady(false)
    }
    
    // Set src after event handlers
    img.src = logoUrl
  }

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !canvasReady) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)

    try {
      const pixel = ctx.getImageData(x, y, 1, 1).data
      
      // Check if pixel is transparent
      if (pixel[3] < 50) {
        console.log('Clicked on transparent area')
        return
      }
      
      const color = rgbToHex(pixel[0], pixel[1], pixel[2])
      
      setSelectedColor(color)
      onColorSelect(color)
    } catch (error) {
      console.error('Error picking color:', error)
    }
  }

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    onColorSelect(color)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold mb-2 text-white">
          Team Primary Color
        </label>
        <p className="text-xs text-[#7A7367] mb-3">
          Click on the logo to pick a color, or select from extracted colors below
        </p>
      </div>

      {/* Current Color Display */}
      <div className="flex items-center gap-3">
        <div
          className="w-16 h-16 rounded-lg border-2 border-white/20 shadow-lg"
          style={{ backgroundColor: selectedColor }}
        />
        <div>
          <div className="text-sm font-bold text-white">{selectedColor}</div>
          <div className="text-xs text-[#7A7367]">Current Color</div>
        </div>
      </div>

      {/* Toggle Picker Button */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-semibold transition-all"
      >
        {showPicker ? 'Hide' : 'Show'} Color Picker
      </button>

      {showPicker && (
        <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-xl">
          {/* Clickable Logo Canvas */}
          <div>
            <div className="text-sm font-bold text-white mb-2">Click on logo to pick any color</div>
            <div className="relative inline-block">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="cursor-crosshair border-2 border-white/20 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900"
                style={{ maxWidth: '300px', maxHeight: '300px', display: 'block' }}
              />
              {!canvasReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-lg">
                  <div className="text-xs text-[#7A7367]">Loading logo...</div>
                </div>
              )}
            </div>
            <div className="text-xs text-[#7A7367] mt-2">
              💡 Tip: Click directly on the logo to pick that exact color
            </div>
          </div>

          {/* Extracted Colors */}
          {extractedColors.length > 0 && (
            <div>
              <div className="text-sm font-bold text-white mb-2">Most Common Colors</div>
              <div className="grid grid-cols-4 gap-2">
                {extractedColors.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    className={`h-12 rounded-lg border-2 transition-all hover:scale-105 ${
                      selectedColor === color ? 'border-white ring-2 ring-white/50' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Manual Input */}
          <div>
            <label className="block text-sm font-bold text-white mb-2">
              Or enter hex color manually
            </label>
            <input
              type="text"
              value={selectedColor}
              onChange={(e) => {
                const value = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                  setSelectedColor(value)
                  if (value.length === 7) {
                    onColorSelect(value)
                  }
                }
              }}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
              placeholder="#00e5ff"
              maxLength={7}
            />
          </div>
        </div>
      )}
    </div>
  )
}
