"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"

interface PlayerStats {
  nationality: string | null
  position: string
  overallRating: number
  realWorldClub: string | null
  playing_style: string | null
}

interface BasePlayer {
  id: string
  player_id: string | null
  name: string
  photoUrl: string
  seasonalPlayerStats: PlayerStats[]
  transferHistory?: { id: string }[]
}

type SortField = 'name' | 'nationality' | 'club' | 'position' | 'rating' | 'playingStyle'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

export default function PlayersManagementClient() {
  const [players, setPlayers] = useState<BasePlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [positionFilter, setPositionFilter] = useState<string>("all")
  const [duplicatesMode, setDuplicatesMode] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([{ field: 'name', direction: 'asc' }])

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      // Build sort params from sortConfigs array
      const sortParams = sortConfigs.map((config, index) => 
        `sortField${index > 0 ? index + 1 : ''}=${config.field}&sortDirection${index > 0 ? index + 1 : ''}=${config.direction}`
      ).join('&')
      
      const res = await fetch(`/api/admin/players?query=${encodeURIComponent(query)}&duplicates=${duplicatesMode}&page=${page}&position=${positionFilter}&${sortParams}&t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setPlayers(data.players)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
      }
    } catch (error) {
      console.error("Failed to fetch players:", error)
    } finally {
      setLoading(false)
    }
  }, [query, duplicatesMode, page, positionFilter, sortConfigs])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSelectedPlayers(new Set())
    fetchPlayers()
  }

  const handleSort = (field: SortField, shiftKey: boolean = false) => {
    if (shiftKey) {
      // Multi-sort: Add or update this field in the sort configs
      const existingIndex = sortConfigs.findIndex(config => config.field === field)
      
      if (existingIndex >= 0) {
        // Toggle direction for existing field
        const newConfigs = [...sortConfigs]
        newConfigs[existingIndex].direction = newConfigs[existingIndex].direction === 'asc' ? 'desc' : 'asc'
        setSortConfigs(newConfigs)
      } else {
        // Add new sort field
        setSortConfigs([...sortConfigs, { field, direction: 'asc' }])
      }
    } else {
      // Single sort: Replace all sort configs
      const existingConfig = sortConfigs.find(config => config.field === field)
      if (existingConfig && sortConfigs.length === 1) {
        // Toggle direction if it's the only sort field
        setSortConfigs([{ field, direction: existingConfig.direction === 'asc' ? 'desc' : 'asc' }])
      } else {
        // Set as primary sort
        setSortConfigs([{ field, direction: 'asc' }])
      }
    }
    setPage(1) // Reset to first page when sorting changes
  }

  const getSortInfo = (field: SortField): { index: number; direction: SortDirection } | null => {
    const index = sortConfigs.findIndex(config => config.field === field)
    if (index >= 0) {
      return { index, direction: sortConfigs[index].direction }
    }
    return null
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    const sortInfo = getSortInfo(field)
    
    if (!sortInfo) {
      return (
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    
    return (
      <div className="flex items-center gap-1">
        {sortInfo.direction === 'asc' ? (
          <svg className="w-4 h-4 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
        {sortConfigs.length > 1 && (
          <span className="text-xs font-bold text-[#E8A800] bg-[#E8A800]/20 rounded px-1">
            {sortInfo.index + 1}
          </span>
        )}
      </div>
    )
  }

  const toggleSelection = (id: string) => {
    setSelectedPlayers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllOnPage = () => {
    if (selectedPlayers.size === players.length && players.length > 0) {
      setSelectedPlayers(new Set())
    } else {
      setSelectedPlayers(new Set(players.map(p => p.id)))
    }
  }

  const selectMatchingOnPage = () => {
    if (!query) return;
    const lowerQuery = query.toLowerCase()
    
    // Find all players on the current page that match the query
    const matchingIds = players.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(lowerQuery)
      const clubMatch = p.seasonalPlayerStats[0]?.realWorldClub?.toLowerCase().includes(lowerQuery)
      return nameMatch || clubMatch
    }).map(p => p.id)
    
    if (matchingIds.length === 0) return;

    setSelectedPlayers(prev => {
      const next = new Set(prev)
      matchingIds.forEach(id => next.add(id))
      return next
    })
  }

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true)
    try {
      const res = await fetch(`/api/admin/players`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: Array.from(selectedPlayers) })
      })
      if (res.ok) {
        setShowBulkDeleteModal(false)
        setSelectedPlayers(new Set())
        // Refetch to ensure duplicate grouping updates correctly
        fetchPlayers()
      } else {
        alert("Failed to delete players")
      }
    } catch (error) {
      console.error("Error bulk deleting:", error)
      alert("An error occurred")
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/players?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setShowDeleteModal(null)
        // Refetch to ensure duplicate grouping updates correctly
        fetchPlayers()
      } else {
        alert("Failed to delete player")
      }
    } catch (error) {
      console.error("Error deleting player:", error)
      alert("An error occurred")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <form onSubmit={handleSearch} className="flex-1 w-full max-w-xl flex gap-2">
          <input
            type="text"
            placeholder="Search players by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800] focus:ring-1 focus:ring-[#E8A800] transition-all"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap justify-end gap-2">
          {query && players.length > 0 && (
            <button
              onClick={selectMatchingOnPage}
              className="px-4 sm:px-6 py-3 rounded-xl font-bold transition-all border bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 text-sm whitespace-nowrap"
            >
              Select Matches
            </button>
          )}
          {selectedPlayers.size > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 sm:px-6 py-3 rounded-xl font-bold transition-all border bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 text-sm whitespace-nowrap"
            >
              Delete Selected ({selectedPlayers.size})
            </button>
          )}
          <button
            onClick={() => {
              setDuplicatesMode(!duplicatesMode)
              setPage(1)
              setSelectedPlayers(new Set())
            }}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold transition-all border text-sm whitespace-nowrap ${
              duplicatesMode 
                ? 'bg-[#E8A800] text-black border-[#E8A800] hover:bg-[#FFC93A]' 
                : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
            }`}
          >
            {duplicatesMode ? "Show All Players" : "Find Duplicates"}
          </button>
        </div>
      </div>

      {/* Position Filter */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-400 mb-2">Filter by Position</label>
        <div className="flex flex-wrap gap-2">
          {['all', 'GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'AMF', 'LMF', 'RMF', 'LWF', 'RWF', 'SS', 'CF'].map(pos => (
            <button
              key={pos}
              onClick={() => {
                setPositionFilter(pos)
                setPage(1)
                setSelectedPlayers(new Set())
              }}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                positionFilter === pos
                  ? 'bg-[#E8A800] text-black'
                  : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
              }`}
            >
              {pos === 'all' ? 'All Positions' : pos}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-400 flex items-center justify-between">
        <div>
          Found <span className="text-white font-bold">{totalCount}</span> {duplicatesMode ? "duplicate entries" : "players"}
        </div>
        {sortConfigs.length > 1 && (
          <button
            onClick={() => setSortConfigs([{ field: 'name', direction: 'asc' }])}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
          >
            Clear Multi-Sort
          </button>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={players.length > 0 && selectedPlayers.size === players.length}
                    onChange={toggleAllOnPage}
                    className="w-4 h-4 rounded border-white/20 bg-black/50 text-[#E8A800] focus:ring-[#E8A800] focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <button 
                    onClick={(e) => handleSort('name', e.shiftKey)}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                    title="Click to sort, Shift+Click for multi-sort"
                  >
                    Player
                    <SortIcon field="name" />
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <button 
                    onClick={(e) => handleSort('nationality', e.shiftKey)}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                    title="Click to sort, Shift+Click for multi-sort"
                  >
                    Nationality
                    <SortIcon field="nationality" />
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <button 
                    onClick={(e) => handleSort('club', e.shiftKey)}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                    title="Click to sort, Shift+Click for multi-sort"
                  >
                    Club
                    <SortIcon field="club" />
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <button 
                    onClick={(e) => handleSort('position', e.shiftKey)}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                    title="Click to sort, Shift+Click for multi-sort"
                  >
                    Position
                    <SortIcon field="position" />
                  </button>
                  {' / '}
                  <button 
                    onClick={(e) => handleSort('rating', e.shiftKey)}
                    className="inline-flex items-center gap-2 hover:text-white transition-colors"
                    title="Click to sort, Shift+Click for multi-sort"
                  >
                    Rating
                    <SortIcon field="rating" />
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <button 
                    onClick={(e) => handleSort('playingStyle', e.shiftKey)}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                    title="Click to sort, Shift+Click for multi-sort"
                  >
                    Playing Style
                    <SortIcon field="playingStyle" />
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-[#E8A800]/30 border-t-[#E8A800] rounded-full animate-spin" />
                      Loading players...
                    </div>
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No players found
                  </td>
                </tr>
              ) : (
                players.map((player) => {
                  const stats = player.seasonalPlayerStats[0]
                  const isSelected = selectedPlayers.has(player.id)
                  const isSold = player.transferHistory && player.transferHistory.length > 0
                  return (
                    <tr 
                      key={player.id} 
                      onClick={() => toggleSelection(player.id)}
                      className={`hover:bg-white/5 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#E8A800]/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(player.id)}
                          className="w-4 h-4 rounded border-white/20 bg-black/50 text-[#E8A800] focus:ring-[#E8A800] focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-black/50 border border-white/10 overflow-hidden relative">
                            <Image
                              src={getPlayerPhotoUrl(player.photoUrl)}
                              alt={player.name}
                              fill
                              unoptimized
                              className="object-contain"
                              sizes="48px"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{player.name}</div>
                            <div className="text-xs text-gray-400 font-mono">ID: {player.player_id || player.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-300">{stats?.nationality || "Unknown"}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-300">{stats?.realWorldClub || "Unknown"}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stats ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded bg-black/40 border border-white/10 text-xs font-bold text-white">
                              {stats.position}
                            </span>
                            <span className="text-sm font-black text-[#E8A800]">{stats.overallRating}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No stats</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stats?.playing_style ? (
                          <span className="text-sm text-gray-300">{stats.playing_style}</span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isSold ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Sold
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-500/10 border border-gray-500/30 text-gray-400 text-xs font-bold">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Unsold
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setShowDeleteModal(player.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-lg text-white font-bold transition-all hidden sm:block"
          >
            Prev
          </button>
          
          <div className="flex items-center gap-1 overflow-x-auto max-w-full">
            {(() => {
              const pages = []
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i)
              } else {
                if (page <= 4) {
                  for (let i = 1; i <= 5; i++) pages.push(i)
                  pages.push('...')
                  pages.push(totalPages)
                } else if (page >= totalPages - 3) {
                  pages.push(1)
                  pages.push('...')
                  for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
                } else {
                  pages.push(1)
                  pages.push('...')
                  for (let i = page - 1; i <= page + 1; i++) pages.push(i)
                  pages.push('...')
                  pages.push(totalPages)
                }
              }
              
              return pages.map((p, i) => (
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-3 py-2 text-gray-500">...</span>
                ) : (
                  <button
                    key={`page-${p}`}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[40px] px-3 py-2 rounded-lg font-bold transition-all ${
                      page === p 
                        ? 'bg-red-500 text-white border-red-500' 
                        : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                )
              ))
            })()}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-lg text-white font-bold transition-all hidden sm:block"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Delete Player?
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              This action cannot be undone. Deleting this player will permanently remove their base profile, all seasonal stats, transfer history, and starred records.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={deletingId === showDeleteModal}
                className="px-4 py-2 rounded-xl text-white font-bold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                disabled={deletingId === showDeleteModal}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all flex items-center gap-2"
              >
                {deletingId === showDeleteModal ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete Permanently"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Delete {selectedPlayers.size} Players?
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              This action cannot be undone. You are about to permanently delete <strong className="text-white">{selectedPlayers.size}</strong> players. This will remove their base profiles, all seasonal stats, transfer history, and starred records.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkDeleting}
                className="px-4 py-2 rounded-xl text-white font-bold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all flex items-center gap-2"
              >
                {isBulkDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete All Permanently"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
