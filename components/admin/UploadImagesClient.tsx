'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import Link from 'next/link'

interface UploadItem {
  id: string // unique React key
  file: File
  previewUrl: string
  playerId: string
  imageType: 'photo' | 'card'
  status: 'pending' | 'converting' | 'uploading' | 'success' | 'error'
  progress: number
  errorMessage?: string
  githubUrl?: string
}

interface UploadImagesClientProps {
  hasToken: boolean
}

export default function UploadImagesClient({ hasToken }: UploadImagesClientProps) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [globalType, setGlobalType] = useState<'photo' | 'card'>('photo')
  const [isUploadingAll, setIsUploadingAll] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const [generalSuccess, setGeneralSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Extract digits (Player ID) from filename
  const extractPlayerId = (filename: string): string => {
    // Remove extension
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename
    // Try to find a sequence of numbers in the filename
    const match = nameWithoutExt.match(/\d+/)
    return match ? match[0] : ''
  }

  // Handle file selection
  const processFiles = (files: FileList) => {
    setGeneralError('')
    setGeneralSuccess('')
    
    const newItems: UploadItem[] = []
    
    Array.from(files).forEach((file) => {
      // Validate file is an image
      if (!file.type.startsWith('image/')) {
        setGeneralError('Only image files (PNG, JPG, JPEG, WEBP) are supported.')
        return
      }

      // Generate preview URL
      const previewUrl = URL.createObjectURL(file)
      const playerId = extractPlayerId(file.name)

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        playerId,
        imageType: globalType,
        status: 'pending',
        progress: 0
      })
    })

    setItems((prev) => [...prev, ...newItems])
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
  }

  // Remove individual item
  const removeItem = (id: string) => {
    setItems((prev) => {
      const itemToRemove = prev.find(item => item.id === id)
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.previewUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  // Clear all items
  const clearAll = () => {
    items.forEach(item => URL.revokeObjectURL(item.previewUrl))
    setItems([])
    setGeneralError('')
    setGeneralSuccess('')
  }

  // Update item field
  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  // Apply type globally to all pending items
  const handleGlobalTypeChange = (type: 'photo' | 'card') => {
    setGlobalType(type)
    setItems((prev) =>
      prev.map((item) => 
        item.status === 'pending' ? { ...item, imageType: type } : item
      )
    )
  }

  // Client-side image conversion using Canvas API
  const convertImage = (file: File, type: 'photo' | 'card'): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas 2D context not supported.'))
            return
          }
          ctx.drawImage(img, 0, 0)
          
          const mimeType = type === 'photo' ? 'image/webp' : 'image/png'
          const quality = type === 'photo' ? 0.85 : undefined

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Image conversion failed.'))
            }
          }, mimeType, quality)
        }
        img.onerror = () => reject(new Error('Failed to load image.'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file.'))
      reader.readAsDataURL(file)
    })
  }

  // Upload single item
  const uploadItem = async (item: UploadItem): Promise<boolean> => {
    if (!item.playerId) {
      updateItem(item.id, { 
        status: 'error', 
        errorMessage: 'Player ID is required.' 
      })
      return false
    }

    updateItem(item.id, { status: 'converting', progress: 20 })

    let convertedBlob: Blob
    try {
      convertedBlob = await convertImage(item.file, item.imageType)
    } catch (err: any) {
      updateItem(item.id, { 
        status: 'error', 
        errorMessage: `Format conversion failed: ${err.message || err}` 
      })
      return false
    }

    updateItem(item.id, { status: 'uploading', progress: 50 })

    try {
      const formData = new FormData()
      const extension = item.imageType === 'photo' ? 'webp' : 'png'
      const convertedFile = new File([convertedBlob], `${item.playerId}.${extension}`, {
        type: item.imageType === 'photo' ? 'image/webp' : 'image/png'
      })

      formData.append('file', convertedFile)
      formData.append('playerId', item.playerId)
      formData.append('imageType', item.imageType)

      const response = await fetch('/api/admin/upload-player-image', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image.')
      }

      updateItem(item.id, { 
        status: 'success', 
        progress: 100,
        githubUrl: data.htmlUrl
      })
      return true
    } catch (err: any) {
      updateItem(item.id, { 
        status: 'error', 
        errorMessage: err.message || 'Server upload failed.' 
      })
      return false
    }
  }

  // Upload all items sequentially
  const uploadAll = async () => {
    if (items.length === 0) return
    
    // Filter pending or error items to retry/upload
    const itemsToUpload = items.filter(item => item.status === 'pending' || item.status === 'error')
    if (itemsToUpload.length === 0) {
      setGeneralError('No pending files to upload. Remove success items or add new ones.')
      return
    }

    setIsUploadingAll(true)
    setGeneralError('')
    setGeneralSuccess('')

    let successCount = 0
    let failCount = 0

    for (const item of itemsToUpload) {
      const success = await uploadItem(item)
      if (success) {
        successCount++
      } else {
        failCount++
      }
    }

    setIsUploadingAll(false)

    if (failCount === 0) {
      setGeneralSuccess(`Successfully uploaded all ${successCount} images to GitHub!`)
    } else {
      setGeneralError(`Uploaded ${successCount} successfully, but ${failCount} failed. Check errors below.`)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/sub-admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Upload Player Images
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          Upload player photos (.webp) and cards (.png) directly to the Shamsear/TFC-Images GitHub repository storage.
        </p>
      </div>

      {/* GitHub Token Warning */}
      {!hasToken && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-2xl flex items-start gap-3 font-mono text-xs uppercase tracking-wider">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="font-extrabold block text-white mb-0.5">GitHub Integration Token Missing</span>
            Please configure the <code className="bg-black/40 px-1.5 py-0.5 rounded border border-white/5 text-[#E8A800] font-mono text-xs">GITHUB_TOKEN</code> or <code className="bg-black/40 px-1.5 py-0.5 rounded border border-white/5 text-[#E8A800] font-mono text-xs">GITHUB_PAT</code> environment variable in your server's <code className="text-white font-semibold">.env</code> file. Uploads are currently disabled.
          </div>
        </div>
      )}

        {generalError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 font-mono text-xs uppercase tracking-wider">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{generalError}</span>
          </div>
        )}

        {generalSuccess && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 font-mono text-xs uppercase tracking-wider animate-fade-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{generalSuccess}</span>
          </div>
        )}

        {/* Global Controls & Dropzone */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Dropzone */}
          <div className="lg:col-span-2">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => hasToken && !isUploadingAll && fileInputRef.current?.click()}
              className={`h-48 sm:h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-6 transition-all ${
                !hasToken
                  ? 'border-white/5 bg-white/[0.01] opacity-40 cursor-not-allowed'
                  : isUploadingAll
                  ? 'border-white/10 bg-white/5 cursor-wait'
                  : 'border-white/20 hover:border-[#E8A800]/50 hover:bg-[#E8A800]/5 cursor-pointer'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={!hasToken || isUploadingAll}
              />
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-bold text-sm sm:text-base text-white mb-1">
                Drag & drop player images here
              </p>
              <p className="text-xs sm:text-sm text-[#7A7367]">
                or click to browse from files (PNG, JPG, WEBP)
              </p>
            </div>
          </div>

          {/* Config sidebar */}
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-md flex flex-col justify-between">
            <div>
              <h3 className="font-black text-white text-lg mb-4 uppercase tracking-tight">Upload Settings</h3>
              
              <div className="mb-6">
                <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                  Default Target Type
                </label>
                <div className="grid grid-cols-2 gap-2 bg-white/[0.02] p-1.5 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => handleGlobalTypeChange('photo')}
                    disabled={isUploadingAll}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      globalType === 'photo'
                        ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-md'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    Photos (.webp)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGlobalTypeChange('card')}
                    disabled={isUploadingAll}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      globalType === 'card'
                        ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-md'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    Cards (.png)
                  </button>
                </div>
              </div>

              <div className="text-xs text-[#7A7367] space-y-2 mb-6 font-mono font-medium">
                <p>💡 **Pro-Tip**: Name your image file as the eFootball Player ID (e.g. <code className="bg-white/5 px-1 py-0.5 text-white rounded">17592186045227.png</code>) to automatically fill the ID input!</p>
                <p>📦 **Auto-Conversion**: Player photos are automatically compressed and saved as `.webp` files. Player cards are optimized as `.png` files in the browser.</p>
              </div>
            </div>

            {items.length > 0 && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={isUploadingAll}
                  className="flex-1 py-2.5 bg-white/[0.01] border border-white/5 hover:border-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                >
                  Clear Queue
                </button>
                <button
                  type="button"
                  onClick={uploadAll}
                  disabled={!hasToken || isUploadingAll}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isUploadingAll ? 'Uploading...' : 'Upload All'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upload List */}
        {items.length > 0 && (
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 overflow-hidden backdrop-blur-xl shadow-md">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h3 className="font-black text-base sm:text-lg uppercase tracking-tight">Upload Queue ({items.length} files)</h3>
              <span className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">
                {items.filter(i => i.status === 'success').length} of {items.length} succeeded
              </span>
            </div>
            
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Side: Thumbnail & File info */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="relative w-14 h-14 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img
                        src={item.previewUrl}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white truncate max-w-[250px] sm:max-w-xs md:max-w-[180px] lg:max-w-xs uppercase tracking-tight">
                        {item.file.name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {(item.file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  {/* Middle Side: Player ID and File Type inputs */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    {/* Player ID Field */}
                    <div className="relative">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 sm:hidden">
                        Player ID
                      </label>
                      <input
                        type="text"
                        value={item.playerId}
                        onChange={(e) => updateItem(item.id, { playerId: e.target.value })}
                        disabled={item.status !== 'pending' && item.status !== 'error'}
                        placeholder="Enter Player ID..."
                        className="w-full sm:w-44 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-sm text-white placeholder-gray-600 focus:border-[#E8A800]/30 focus:outline-none font-mono transition-all"
                      />
                    </div>

                    {/* Target Type Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 sm:hidden">
                        Image Type
                      </label>
                      <select
                        value={item.imageType}
                        onChange={(e) => updateItem(item.id, { imageType: e.target.value as 'photo' | 'card' })}
                        disabled={item.status !== 'pending' && item.status !== 'error'}
                        className="w-full sm:w-32 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-sm text-white focus:border-[#E8A800]/30 focus:outline-none transition-all cursor-pointer font-mono"
                      >
                        <option value="photo" className="bg-[#121212] text-white">Photo (.webp)</option>
                        <option value="card" className="bg-[#121212] text-white">Card (.png)</option>
                      </select>
                    </div>
                  </div>

                  {/* Right Side: Status, Path Preview and Action Button */}
                  <div className="flex items-center justify-between md:justify-end gap-4 md:w-64">
                    {/* Target Path Preview / Status Details */}
                    <div className="text-right flex-1 md:flex-none">
                      {item.status === 'pending' && (
                        <div className="text-xs text-[#7A7367] truncate max-w-[200px] font-mono">
                          Will upload to:<br />
                          {item.imageType === 'photo' 
                            ? `public/player_photos/${item.playerId || '{id}'}.webp`
                            : `public/player_cards/${item.playerId || '{id}'}.png`
                          }
                        </div>
                      )}
                      
                      {item.status === 'converting' && (
                        <div className="flex items-center justify-end gap-2 text-xs text-amber-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                          Converting format...
                        </div>
                      )}

                      {item.status === 'uploading' && (
                        <div className="flex items-center justify-end gap-2 text-xs text-[#E8A800] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E8A800] animate-ping"></span>
                          Pushing to GitHub...
                        </div>
                      )}

                      {item.status === 'success' && (
                        <div className="text-xs text-emerald-400 font-semibold">
                          <span className="block text-right">✓ Uploaded</span>
                          {item.githubUrl && (
                            <a
                              href={item.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#E8A800] hover:underline hover:text-[#FFC93A] font-mono text-[10px]"
                            >
                              View on GitHub
                            </a>
                          )}
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="text-xs text-red-400 font-bold max-w-[150px] truncate" title={item.errorMessage}>
                          Error: {item.errorMessage}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      {item.status === 'success' ? (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={isUploadingAll}
                          className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all disabled:opacity-30 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  )
}
