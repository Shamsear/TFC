'use client'

import { useState, useEffect, useCallback } from 'react'
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

    // Clear any previous error
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

      // Mark success
      setSuccessIds(prev => {
        const next = new Set(prev)
        next.add(playerId)
        return next
      })

      // Update local statistics counts
      setStats(prev => {
        if (!prev) return null
        return {
          ...prev,
          totalCards: prev.totalCards + 1,
          missingCards: Math.max(0, prev.missingCards - 1)
        }
      })

      // Automatically remove from listing after 1.5 seconds
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
  };

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

      <div className="text-xs text-gray-400 font-mono tracking-wider">
        Showing <span className="text-white font-bold">{totalCount}</span> players missing a {activeTab}
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
                    // Photos can be uploaded manually
                    <div className="flex flex-col items-center text-center p-2 text-gray-500">
                      <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-[9px] font-mono leading-tight">No Photo Uploaded</span>
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
                <div className="mt-auto w-full">
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
                    // Photo uploads are done manually via upload-images page
                    <Link
                      href="/sub-admin/upload-images"
                      className="block w-full text-center py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-white/5 hover:bg-[#FFB347] hover:text-black border border-white/10 text-white transition-all"
                    >
                      Upload Photo
                    </Link>
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
    </div>
  )
}
