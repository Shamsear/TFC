'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface PlayerImageStatus {
  id: string
  name: string
  hasPhoto: boolean
  hasCard: boolean
}

export default function DeleteImagesClient() {
  const [players, setPlayers] = useState<PlayerImageStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  
  // Track delete load states per player + asset type
  // e.g. "12345-photo" -> true
  const [deletingStates, setDeletingStates] = useState<Record<string, boolean>>({})

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch players and their image status
  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/player-images?page=${page}&query=${encodeURIComponent(debouncedQuery)}&limit=12`)
      if (res.ok) {
        const data = await res.json()
        setPlayers(data.players)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
      }
    } catch (err) {
      console.error('Failed to load player images status:', err)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedQuery])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  // Handle single asset deletion
  const handleDelete = async (playerId: string, name: string, imageType: 'photo' | 'card') => {
    const assetName = imageType === 'photo' ? 'profile photo' : 'squad card'
    const confirmMessage = `Are you absolutely sure you want to permanently delete the ${assetName} for "${name}" (ID: ${playerId})?`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    const stateKey = `${playerId}-${imageType}`
    setDeletingStates(prev => ({ ...prev, [stateKey]: true }))

    try {
      const res = await fetch('/api/admin/delete-player-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ playerId, imageType })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Failed to delete ${imageType}`)
      }

      // Success: update state locally
      setPlayers(prev =>
        prev.map(p =>
          p.id === playerId
            ? {
                ...p,
                hasPhoto: imageType === 'photo' ? false : p.hasPhoto,
                hasCard: imageType === 'card' ? false : p.hasCard
              }
            : p
        )
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred during deletion.')
    } finally {
      setDeletingStates(prev => ({ ...prev, [stateKey]: false }))
    }
  }

  // Get direct raw github image URL with a cachebuster to avoid CDN/Browser cache
  const getImageUrl = (playerId: string, type: 'photo' | 'card') => {
    const folder = type === 'photo' ? 'player_photos' : 'player_cards'
    const ext = type === 'photo' ? 'webp' : 'png'
    return `https://raw.githubusercontent.com/Shamsear/TFC-Images/main/public/${folder}/${playerId}.${ext}?cb=${Date.now()}`
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
          Manage Player Images
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          Search for players to view and delete their active photos or cards from GitHub storage
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-b border-white/5 py-4 mb-6">
        <div className="text-xs text-gray-400 font-mono tracking-wider">
          Total matched players: <span className="text-white font-bold">{totalCount}</span>
        </div>
        
        {/* Search Input */}
        <div className="w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search players by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.01] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800] focus:ring-1 focus:ring-[#E8A800] transition-all text-xs font-mono uppercase tracking-wider"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-24 text-center text-gray-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[#E8A800]/30 border-t-[#E8A800] rounded-full animate-spin" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Loading players...</span>
          </div>
        </div>
      ) : players.length === 0 ? (
        <div className="py-24 text-center border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-xl">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-tight">No Players Found</h3>
          <p className="text-xs text-gray-500 font-mono">Try searching with a different name or ID query</p>
        </div>
      ) : (
        <>
          {/* Players Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {players.map((player) => (
              <div 
                key={player.id} 
                className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 flex flex-col justify-between backdrop-blur-xl hover:border-white/10 transition-all shadow-lg"
              >
                {/* Header Info */}
                <div className="mb-4">
                  <h3 className="font-black text-white text-base uppercase tracking-tight truncate" title={player.name}>
                    {player.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-mono">ID: {player.id}</p>
                </div>

                {/* Display grid for Photo & Card */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Photo Column */}
                  <div className="flex flex-col items-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">Profile Photo</span>
                    {player.hasPhoto ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10 bg-black/30 mb-3 flex items-center justify-center">
                          <img
                            src={getImageUrl(player.id, 'photo')}
                            alt="Photo"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback on load error (e.g. if deleted recently but browser cache exists)
                              (e.target as HTMLImageElement).src = '/default-player.png'
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleDelete(player.id, player.name, 'photo')}
                          disabled={deletingStates[`${player.id}-photo`]}
                          className="w-full py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-black border border-red-500/20 text-red-400 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-1"
                        >
                          {deletingStates[`${player.id}-photo`] ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center flex-1 py-4">
                        <span className="text-[10px] text-gray-600 font-mono uppercase">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Card Column */}
                  <div className="flex flex-col items-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">Squad Card</span>
                    {player.hasCard ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="relative w-16 h-20 overflow-hidden border border-white/10 bg-black/30 mb-3 flex items-center justify-center rounded-lg">
                          <img
                            src={getImageUrl(player.id, 'card')}
                            alt="Card"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/default-player-card.png'
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleDelete(player.id, player.name, 'card')}
                          disabled={deletingStates[`${player.id}-card`]}
                          className="w-full py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-black border border-red-500/20 text-red-400 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-1"
                        >
                          {deletingStates[`${player.id}-card`] ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center flex-1 py-4">
                        <span className="text-[10px] text-gray-600 font-mono uppercase">No Card</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4 font-mono">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-30 disabled:hover:bg-white/5"
              >
                Prev
              </button>
              <span className="text-xs text-gray-400">
                Page <span className="text-white font-bold">{page}</span> of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-30 disabled:hover:bg-white/5"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
