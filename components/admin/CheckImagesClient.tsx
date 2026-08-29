'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Player {
  id: string
  player_id: string | null
  name: string
}

interface Stats {
  totalPlayers: number
  totalPhotos: number
  totalCards: number
  missingPhotos: number
  missingCards: number
}

export default function CheckImagesClient() {
  const [activeTab, setActiveTab] = useState<'card' | 'photo'>('card')
  const [players, setPlayers] = useState<Player[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set())
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({})
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  // Crop from card state variables
  const [cropPlayer, setCropPlayer] = useState<Player | null>(null)
  const [cropX, setCropX] = useState(50) // center X (%)
  const [cropY, setCropY] = useState(25) // center Y (%)
  const [cropSize, setCropSize] = useState(22) // width/height size (%)
  const [isCropping, setIsCropping] = useState(false)
  const [cropError, setCropError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset crop values when changing crop player
  useEffect(() => {
    if (cropPlayer) {
      setCropX(50)
      setCropY(25)
      setCropSize(22)
      setCropError(null)
    }
  }, [cropPlayer])

  // Draggable and key-controlled crop box movement
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const startMouseX = e.clientX
    const startMouseY = e.clientY
    const startCropX = cropX
    const startCropY = cropY
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startMouseX
      const dy = moveEvent.clientY - startMouseY
      
      const pctDx = (dx / rect.width) * 100
      const pctDy = (dy / rect.height) * 100
      
      let newX = startCropX + pctDx
      let newY = startCropY + pctDy
      
      const minX = cropSize / 2
      const maxX = 100 - cropSize / 2
      const minY = cropSize / 2
      const maxY = 100 - cropSize / 2
      
      newX = Math.max(minX, Math.min(maxX, newX))
      newY = Math.max(minY, Math.min(maxY, newY))
      
      setCropX(Math.round(newX * 10) / 10)
      setCropY(Math.round(newY * 10) / 10)
    }
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const startMouseX = touch.clientX
    const startMouseY = touch.clientY
    const startCropX = cropX
    const startCropY = cropY
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return
      const t = moveEvent.touches[0]
      const dx = t.clientX - startMouseX
      const dy = t.clientY - startMouseY
      
      const pctDx = (dx / rect.width) * 100
      const pctDy = (dy / rect.height) * 100
      
      let newX = startCropX + pctDx
      let newY = startCropY + pctDy
      
      const minX = cropSize / 2
      const maxX = 100 - cropSize / 2
      const minY = cropSize / 2
      const maxY = 100 - cropSize / 2
      
      newX = Math.max(minX, Math.min(maxX, newX))
      newY = Math.max(minY, Math.min(maxY, newY))
      
      setCropX(Math.round(newX * 10) / 10)
      setCropY(Math.round(newY * 10) / 10)
    }
    
    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
    
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
  }

  useEffect(() => {
    if (!cropPlayer) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 5 : 1
      const minX = cropSize / 2
      const maxX = 100 - cropSize / 2
      const minY = cropSize / 2
      const maxY = 100 - cropSize / 2

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          setCropY(y => Math.max(minY, Math.min(maxY, y - step)))
          break
        case 'ArrowDown':
          e.preventDefault()
          setCropY(y => Math.max(minY, Math.min(maxY, y + step)))
          break
        case 'ArrowLeft':
          e.preventDefault()
          setCropX(x => Math.max(minX, Math.min(maxX, x - step)))
          break
        case 'ArrowRight':
          e.preventDefault()
          setCropX(x => Math.max(minX, Math.min(maxX, x + step)))
          break
        case '+':
        case '=':
          e.preventDefault()
          setCropSize(size => Math.min(45, size + 1))
          break
        case '-':
        case '_':
          e.preventDefault()
          setCropSize(size => Math.max(8, size - 1))
          break
        case 'Escape':
          e.preventDefault()
          setCropPlayer(null)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cropPlayer, cropSize])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchMissing = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/check-images?type=${activeTab}&page=${page}&query=${encodeURIComponent(debouncedQuery)}&limit=24`)
      if (res.ok) {
        const data = await res.json()
        setPlayers(data.players)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to check missing images:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, debouncedQuery])

  useEffect(() => {
    fetchMissing()
  }, [fetchMissing])

  const handleFetchCard = async (playerId: string) => {
    if (processingIds.has(playerId)) return

    setProcessingIds(prev => {
      const next = new Set(prev)
      next.add(playerId)
      return next
    })

    setErrorMessages(prev => {
      const next = { ...prev }
      delete next[playerId]
      return next
    })

    try {
      const response = await fetch('/api/admin/fetch-and-upload-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch and upload card.')
      }

      setSuccessIds(prev => {
        const next = new Set(prev)
        next.add(playerId)
        return next
      })

      setStats(prev => {
        if (!prev) return null
        return {
          ...prev,
          totalCards: prev.totalCards + 1,
          missingCards: Math.max(0, prev.missingCards - 1)
        }
      })

      setTimeout(() => {
        setPlayers(prev => prev.filter(p => (p.player_id || p.id) !== playerId))
        setSuccessIds(prev => {
          const next = new Set(prev)
          next.delete(playerId)
          return next
        })
        setTotalCount(prev => Math.max(0, prev - 1))
      }, 1500)

    } catch (err) {
      setErrorMessages(prev => ({
        ...prev,
        [playerId]: err instanceof Error ? err.message : 'Unknown error occurred.'
      }))
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(playerId)
        return next
      })
    }
  }

  const handleBulkFetch = async () => {
    if (isBulkProcessing || players.length === 0) return
    
    const pagePlayerIds = players.map(p => p.player_id || p.id).filter(Boolean) as string[]
    if (pagePlayerIds.length === 0) return

    setIsBulkProcessing(true)
    try {
      const res = await fetch('/api/admin/bulk-fetch-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: pagePlayerIds })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete bulk fetch.')
      }

      alert(`Bulk fetch completed!\nSuccessfully uploaded: ${data.successCount}\nFailures: ${data.failureCount}`)
      fetchMissing()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred during bulk fetch.')
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleCropAndUpload = async () => {
    if (!cropPlayer) return
    setIsCropping(true)
    setCropError(null)

    const id = cropPlayer.player_id || cropPlayer.id
    const proxiedUrl = `/api/admin/proxy-image?url=https://pesdb.net/assets/img/card/f${id}.png`

    try {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.src = proxiedUrl
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => reject(new Error('Failed to load card image for cropping. Make sure card exists on PESDB.'))
      })

      const canvas = document.createElement('canvas')
      canvas.width = 140
      canvas.height = 140
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Could not create canvas drawing context.')
      }

      // Enable high-quality image smoothing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Percentage math to natural coordinate translation
      // naturalWidth / naturalHeight
      const naturalWidth = img.naturalWidth
      const naturalHeight = img.naturalHeight

      // Square crop dimensions (using width as baseline)
      const naturalSize = (cropSize * naturalWidth) / 100
      const naturalX = ((cropX - cropSize / 2) * naturalWidth) / 100
      const naturalY = ((cropY - cropSize / 2) * naturalHeight) / 100

      ctx.drawImage(img, naturalX, naturalY, naturalSize, naturalSize, 0, 0, 140, 140)

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setCropError('Failed to generate cropped WebP blob.')
          setIsCropping(false)
          return
        }

        try {
          const formData = new FormData()
          formData.append('file', blob, `${id}.webp`)
          formData.append('playerId', id)
          formData.append('imageType', 'photo')

          const res = await fetch('/api/admin/upload-player-image', {
            method: 'POST',
            body: formData
          })

          const data = await res.json()

          if (!res.ok) {
            throw new Error(data.error || 'Failed to upload photo to GitHub storage.')
          }

          // Successfully uploaded! Update local counts
          setStats(prev => {
            if (!prev) return null
            return {
              ...prev,
              totalPhotos: prev.totalPhotos + 1,
              missingPhotos: Math.max(0, prev.missingPhotos - 1)
            }
          })

          // Remove cropped player from listing
          setPlayers(prev => prev.filter(p => (p.player_id || p.id) !== id))
          setTotalCount(prev => Math.max(0, prev - 1))
          
          // Close modal
          setCropPlayer(null)
        } catch (err) {
          setCropError(err instanceof Error ? err.message : 'Photo upload failed.')
        } finally {
          setIsCropping(false)
        }
      }, 'image/webp', 1.0)

    } catch (err) {
      setCropError(err instanceof Error ? err.message : 'Cropping failed.')
      setIsCropping(false)
    }
  }

  const getPesdbCardUrl = (playerId: string) => {
    return `https://pesdb.net/assets/img/card/f${playerId}.png`
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="mb-4">
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
      <div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Image Scanner
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          Audit which players do not have photos or cards uploaded in the system
        </p>
      </div>

      {/* Stats Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-mono">
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl">
            <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Total Players</div>
            <div className="text-2xl font-black text-white tracking-tight">{stats.totalPlayers.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl">
            <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Total Cards</div>
            <div className="text-2xl font-black text-[#E8A800] tracking-tight">{stats.totalCards.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl">
            <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Total Photos</div>
            <div className="text-2xl font-black text-cyan-400 tracking-tight">{stats.totalPhotos.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5">
            <div className="text-[9px] text-red-500 font-extrabold uppercase tracking-widest mb-1.5">Missing Cards</div>
            <div className="text-2xl font-black text-red-400 tracking-tight">{stats.missingCards.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5">
            <div className="text-[9px] text-red-500 font-extrabold uppercase tracking-widest mb-1.5">Missing Photos</div>
            <div className="text-2xl font-black text-red-400 tracking-tight">{stats.missingPhotos.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Tabs & Search controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-b border-white/5 py-4">
        {/* Toggle tabs */}
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => {
              setActiveTab('card')
              setPage(1)
            }}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              activeTab === 'card'
                ? 'bg-[#E8A800] text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Missing Cards ({stats ? stats.missingCards : '...'})
          </button>
          <button
            onClick={() => {
              setActiveTab('photo')
              setPage(1)
            }}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              activeTab === 'photo'
                ? 'bg-[#E8A800] text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Missing Photos ({stats ? stats.missingPhotos : '...'})
          </button>
        </div>

        {/* Search */}
        <div className="w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search missing players by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.01] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800] focus:ring-1 focus:ring-[#E8A800] transition-all text-xs font-mono uppercase tracking-wider"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-xs text-gray-400 font-mono tracking-wider">
          Showing <span className="text-white font-bold">{totalCount}</span> players missing a {activeTab}
        </div>
        {activeTab === 'card' && players.length > 0 && (
          <button
            onClick={handleBulkFetch}
            disabled={isBulkProcessing}
            className="px-4 py-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] text-black border border-white/10 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isBulkProcessing ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing Bulk...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Fetch all {players.length} on page</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Grid of Results */}
      {loading ? (
        <div className="py-24 text-center text-gray-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[#E8A800]/30 border-t-[#E8A800] rounded-full animate-spin" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Scanning images...</span>
          </div>
        </div>
      ) : players.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-white/[0.01] border border-white/5 p-8 backdrop-blur-xl">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">All caught up! No players are missing a {activeTab}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {players.map(player => {
            const id = player.player_id || player.id
            const isProcessing = processingIds.has(id)
            const isSuccess = successIds.has(id)
            const errorMessage = errorMessages[id]

            return (
              <div
                key={player.id}
                className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 flex flex-col items-center shadow-lg transition-all hover:border-white/10 hover:bg-white/[0.03]"
              >
                {/* Image Section */}
                <div className="relative w-36 h-36 rounded-2xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center mb-4 p-1 shadow-md">
                  {activeTab === 'card' ? (
                    <Image
                      src={getPesdbCardUrl(id)}
                      alt={player.name}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    // Photos missing: preview card so we can crop face from it
                    <div className="relative w-full h-full">
                      <Image
                        src={getPesdbCardUrl(id)}
                        alt={player.name}
                        fill
                        className="object-contain opacity-55 hover:opacity-100 transition-opacity"
                        unoptimized
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="px-2 py-1 rounded bg-black/75 border border-white/10 text-[9px] text-gray-400 font-mono">NO PHOTO</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="text-center w-full min-w-0 mb-4">
                  <div className="text-xs font-bold text-white uppercase tracking-wider truncate mb-1" title={player.name}>
                    {player.name}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    ID: {id}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto w-full space-y-2">
                  {errorMessage && (
                    <div className="text-[9px] text-red-400 text-center font-mono leading-tight mb-2 border border-red-500/10 bg-red-500/5 rounded p-1">
                      {errorMessage}
                    </div>
                  )}

                  {activeTab === 'card' ? (
                    <button
                      onClick={() => handleFetchCard(id)}
                      disabled={isProcessing || isSuccess}
                      className={`w-full py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        isSuccess
                          ? 'bg-emerald-500 text-black border-emerald-500'
                          : isProcessing
                          ? 'bg-white/10 text-gray-400 border border-white/5 cursor-not-allowed'
                          : 'bg-white/5 hover:bg-[#E8A800] hover:text-black border border-white/10 text-white'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Fetching...</span>
                        </>
                      ) : isSuccess ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Uploaded!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Fetch Card</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1.5 w-full">
                      {/* Crop face from card */}
                      <button
                        onClick={() => setCropPlayer(player)}
                        className="w-full py-2 text-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-white/5 hover:bg-[#E8A800] hover:text-black border border-white/10 text-white transition-all flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Crop from Card
                      </button>
                      {/* Manual Upload */}
                      <Link
                        href="/sub-admin/upload-images"
                        className="w-full text-center py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-white/5 hover:bg-[#FFB347] hover:text-black border border-white/10 text-white transition-all block"
                      >
                        Upload Photo
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8 font-mono">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-lg text-white font-bold transition-all text-xs"
          >
            Prev
          </button>
          
          <span className="text-xs text-gray-500 font-bold">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-lg text-white font-bold transition-all text-xs"
          >
            Next
          </button>
        </div>
      )}

      {/* Draggable/Slider Cropper Modal */}
      {cropPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Crop Player Photo</h3>
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                  Adjust sliders to frame {cropPlayer.name}'s face from eFootball card
                </p>
              </div>
              <button
                onClick={() => setCropPlayer(null)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {cropError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl font-mono text-xs uppercase tracking-wider leading-tight">
                {cropError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Image with interactive Crop Overlay */}
              <div className="flex flex-col items-center justify-center">
                <div 
                  ref={containerRef}
                  className="relative w-56 aspect-[3/4] bg-black/50 border border-white/10 rounded-xl overflow-hidden shadow-inner flex items-center justify-center select-none"
                >
                  {/* Proxied image to allow Canvas drawing */}
                  <img
                    src={`/api/admin/proxy-image?url=https://pesdb.net/assets/img/card/f${cropPlayer.player_id || cropPlayer.id}.png`}
                    alt={cropPlayer.name}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  {/* Dynamic draggable square crop overlay */}
                  <div
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    className="absolute border-2 border-dashed border-[#E8A800] bg-black/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] rounded-lg cursor-move select-none"
                    style={{
                      left: `${cropX - cropSize / 2}%`,
                      top: `${cropY - cropSize / 2}%`,
                      width: `${cropSize}%`,
                      height: `0`,
                      paddingBottom: `${cropSize}%`
                    }}
                  />
                </div>
                <span className="text-[9px] text-gray-500 font-mono tracking-wider mt-2">Drag box or use arrow keys to adjust</span>
              </div>

              {/* Right Column: Controls */}
              <div className="flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Vertical position Y slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-gray-400">
                      <span>Vertical Position (Y)</span>
                      <span>{cropY}%</span>
                    </div>
                    <input
                      type="range"
                      min={cropSize / 2}
                      max={100 - cropSize / 2}
                      value={cropY}
                      onChange={(e) => setCropY(Number(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E8A800]"
                    />
                  </div>

                  {/* Horizontal position X slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-gray-400">
                      <span>Horizontal Position (X)</span>
                      <span>{cropX}%</span>
                    </div>
                    <input
                      type="range"
                      min={cropSize / 2}
                      max={100 - cropSize / 2}
                      value={cropX}
                      onChange={(e) => setCropX(Number(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E8A800]"
                    />
                  </div>

                  {/* Size slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-gray-400">
                      <span>Crop Area Size</span>
                      <span>{cropSize}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="55"
                      value={cropSize}
                      onChange={(e) => setCropSize(Number(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E8A800]"
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => setCropPlayer(null)}
                    disabled={isCropping}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCropAndUpload}
                    disabled={isCropping}
                    className="flex-1 py-2.5 bg-[#E8A800] hover:bg-[#FFC93A] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isCropping ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Crop & Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
