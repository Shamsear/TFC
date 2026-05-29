'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Player {
  id: string
  name: string
  position: string
  positionGroup: string | null
  overallRating: number
  realWorldClub: string
  photoUrl: string
  playingStyle: string | null
}

interface StarredPlayersClientProps {
  seasonId: string
  seasonName: string
  teamId: string
  players: Player[]
}

const POSITIONS = ['ALL', 'GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'SS', 'LWF', 'RWF', 'CF']

// ── Custom Select Component for Filters ──────────────────────────────────────
function CustomSelect({ 
  label, 
  value, 
  options, 
  onChange, 
  displayValue 
}: {
  label: string
  value: string
  options: string[]
  onChange: (val: string) => void
  displayValue?: (val: string) => string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest font-mono mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-black/40 border border-white/5 text-white focus:border-[#E8A800]/30 focus:outline-none transition-all text-xs font-mono text-left cursor-pointer"
      >
        <span className="truncate">
          {displayValue ? displayValue(value) : value}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2.5 w-full max-h-60 overflow-y-auto rounded-2xl bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/5 shadow-2xl py-2 font-mono scrollbar-none animate-[fadeIn_0.2s_ease-out]">
          {options.map((option) => {
            const isSelected = option === value

            return (
              <button
                type="button"
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs transition-colors hover:bg-[#E8A800]/10 hover:text-[#E8A800] cursor-pointer ${
                  isSelected ? 'text-[#E8A800] bg-white/[0.02] font-black' : 'text-gray-400'
                }`}
              >
                <span className="truncate">{displayValue ? displayValue(option) : option}</span>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-[#E8A800] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function StarredPlayersClient({
  seasonId,
  seasonName,
  teamId,
  players,
}: StarredPlayersClientProps) {
  const router = useRouter()
  const [positionFilter, setPositionFilter] = useState('ALL')
  const [playingStyleFilter, setPlayingStyleFilter] = useState('all')
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [isAddingToPlanner, setIsAddingToPlanner] = useState(false)
  const [addMode, setAddMode] = useState<'primary' | 'backup'>('primary')
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const [modalPositionFilter, setModalPositionFilter] = useState('ALL')
  const [modalPlayingStyleFilter, setModalPlayingStyleFilter] = useState('all')
  const [modalSelectedPlayers, setModalSelectedPlayers] = useState<Set<string>>(new Set())
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [starringPlayers, setStarringPlayers] = useState(false)
  const [modalPage, setModalPage] = useState(1)
  const [modalTotalPages, setModalTotalPages] = useState(1)

  // Get unique playing styles
  const playingStyles = useMemo(() => {
    const styles = new Set<string>()
    players.forEach(p => {
      if (p.playingStyle) styles.add(p.playingStyle)
    })
    return ['all', ...Array.from(styles).sort()]
  }, [players])

  const modalPlayingStyles = playingStyles

  // Load modal players from server with pagination and filtering
  const loadModalPlayers = async (pageToLoad: number) => {
    setLoadingPlayers(true)
    
    try {
      const searchParams = new URLSearchParams({
        seasonId,
        page: pageToLoad.toString(),
        team: 'Free Agent', // Only show eligible/unsold players
      })
      if (modalSearchQuery) searchParams.append('search', modalSearchQuery)
      if (modalPositionFilter !== 'ALL') searchParams.append('position', modalPositionFilter)
      if (modalPlayingStyleFilter !== 'all') searchParams.append('playingStyle', modalPlayingStyleFilter)

      const response = await fetch(`/api/players/search?${searchParams.toString()}`)
      const data = await response.json()
      
      // Filter out already starred players
      const starredIds = new Set(players.map(p => p.id))
      const unstarredPlayers = (data.players || []).filter((p: Player) => !starredIds.has(p.id))
      
      setAllPlayers(unstarredPlayers)
      setModalTotalPages(data.totalPages || 1)
      setModalPage(pageToLoad)
    } catch (error) {
      console.error('Error loading players:', error)
      alert('Failed to load players')
    } finally {
      setLoadingPlayers(false)
    }
  }

  // Effect to load modal players on filter/search change
  useEffect(() => {
    if (showAddModal) {
      const debounce = setTimeout(() => {
        loadModalPlayers(1)
      }, 300)
      return () => clearTimeout(debounce)
    }
  }, [showAddModal, modalSearchQuery, modalPositionFilter, modalPlayingStyleFilter])

  // Open modal
  const openAddModal = () => {
    setShowAddModal(true)
  }

  // Close modal and reset
  const closeAddModal = () => {
    setShowAddModal(false)
    setModalSearchQuery('')
    setModalPositionFilter('ALL')
    setModalPlayingStyleFilter('all')
    setModalSelectedPlayers(new Set())
    setModalPage(1)
  }

  const filteredModalPlayers = allPlayers

  // Toggle modal player selection
  const toggleModalPlayer = (playerId: string) => {
    const newSelected = new Set(modalSelectedPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      newSelected.add(playerId)
    }
    setModalSelectedPlayers(newSelected)
  }

  // Select all modal filtered players
  const selectAllModal = () => {
    const allIds = new Set(filteredModalPlayers.map(p => p.id))
    setModalSelectedPlayers(allIds)
  }

  // Clear modal selection
  const clearModalSelection = () => {
    setModalSelectedPlayers(new Set())
  }

  // Star selected players
  const starSelectedPlayers = async () => {
    if (modalSelectedPlayers.size === 0) return
    
    setStarringPlayers(true)
    try {
      const response = await fetch('/api/team/starred-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerIds: Array.from(modalSelectedPlayers), 
          seasonId 
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to star players')
      }
      
      alert(`Successfully starred ${modalSelectedPlayers.size} player(s)!`)
      closeAddModal()
      router.refresh()
    } catch (error) {
      console.error('Error starring players:', error)
      alert('Failed to star players')
    } finally {
      setStarringPlayers(false)
    }
  }

  // Filter players
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const positionMatch = positionFilter === 'ALL' || player.position === positionFilter
      const styleMatch = playingStyleFilter === 'all' || player.playingStyle === playingStyleFilter
      return positionMatch && styleMatch
    })
  }, [players, positionFilter, playingStyleFilter])

  // Toggle player selection
  const togglePlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      newSelected.add(playerId)
    }
    setSelectedPlayers(newSelected)
  }

  // Select all filtered players
  const selectAll = () => {
    const allIds = new Set(filteredPlayers.map(p => p.id))
    setSelectedPlayers(allIds)
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedPlayers(new Set())
  }

  // Add to planner (bulk or single)
  const addToPlanner = async (playerIds: string[], priority: 'primary' | 'backup') => {
    setIsAddingToPlanner(true)
    try {
      const response = await fetch(`/api/team/auction-plan?seasonId=${seasonId}`)
      const data = await response.json()
      
      const currentPlan = data.plan?.positions || {}
      const playersToAdd = players.filter(p => playerIds.includes(p.id))
      
      playersToAdd.forEach(player => {
        if (!currentPlan[player.position]) {
          currentPlan[player.position] = {
            minPlayers: 0,
            maxPlayers: 0,
            targets: []
          }
        }
        
        const exists = currentPlan[player.position].targets.some(
          (t: any) => t.playerId === player.id
        )
        
        if (!exists) {
          currentPlan[player.position].targets.push({
            id: `${player.id}-${Date.now()}`,
            playerId: player.id,
            playerName: player.name,
            position: player.position,
            minBid: 0,
            maxBid: 0,
            priority,
          })
        }
      })
      
      await fetch('/api/team/auction-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          plan: { positions: currentPlan }
        }),
      })
      
      alert(`Successfully added ${playerIds.length} player(s) to auction planner as ${priority} targets!`)
      clearSelection()
    } catch (error) {
      console.error('Error adding to planner:', error)
      alert('Failed to add players to planner')
    } finally {
      setIsAddingToPlanner(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white relative overflow-hidden">
      {/* Background spotlights */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-[#E8A800]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-5">
            <Link
              href="/team"
              className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors font-mono text-[10px] font-black uppercase tracking-wider"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-[#E8A800] border border-[#E8A800] hover:brightness-110 text-black rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(232,168,0,0.25)] hover:scale-[1.02] active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Star New Player
            </button>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(232,168,0,0.15)]">
              ⭐ Starred Watchlist
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 font-mono font-bold uppercase tracking-wider">
            {seasonName} <span className="text-gray-600">•</span> {players.length} starred player{players.length !== 1 ? 's' : ''} monitored
          </p>
        </div>

        {/* Filters */}
        <div className="rounded-3xl bg-[#0c0c0e]/80 border border-white/5 p-5 sm:p-6 mb-6 backdrop-blur-2xl shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Position Filter */}
            <CustomSelect
              label="Position Split"
              value={positionFilter}
              options={POSITIONS}
              onChange={setPositionFilter}
              displayValue={(val) => val === 'ALL' ? 'All Roles' : val}
            />

            {/* Playing Style Filter */}
            <CustomSelect
              label="Tactical Style"
              value={playingStyleFilter}
              options={playingStyles}
              onChange={setPlayingStyleFilter}
              displayValue={(val) => val === 'all' ? 'All Playing Styles' : val}
            />
          </div>
        </div>

        {/* Selection Actions Banner */}
        {selectedPlayers.size > 0 && (
          <div className="rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/30 p-5 mb-6 shadow-[0_0_15px_rgba(232,168,0,0.05)] animate-[fadeIn_0.2s_ease-out]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-white font-black text-sm uppercase tracking-wider">
                  {selectedPlayers.size} player{selectedPlayers.size !== 1 ? 's' : ''} selected
                </div>
                <div className="text-[10px] text-gray-400 font-mono mt-1 font-extrabold uppercase tracking-widest">Add to tactical auction plan</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => addToPlanner(Array.from(selectedPlayers), 'primary')}
                  disabled={isAddingToPlanner}
                  className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                >
                  Add Primary
                </button>
                <button
                  onClick={() => addToPlanner(Array.from(selectedPlayers), 'backup')}
                  disabled={isAddingToPlanner}
                  className="px-4 py-2.5 bg-[#FFB347]/10 border border-[#FFB347]/30 text-[#FFB347] hover:bg-[#FFB347]/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_10px_rgba(255,179,71,0.05)]"
                >
                  Add Backup
                </button>
                <button
                  onClick={clearSelection}
                  className="px-4 py-2.5 bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Header */}
        <div className="flex items-center justify-between mb-4.5 px-1 font-mono text-xs">
          <div className="text-gray-500 font-extrabold uppercase tracking-wider">
            Showing {filteredPlayers.length} / {players.length} candidates
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 bg-white/[0.01] hover:bg-white/[0.05] border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Select All
            </button>
            {selectedPlayers.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 bg-white/[0.01] hover:bg-white/[0.05] border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Clear ({selectedPlayers.size})
              </button>
            )}
          </div>
        </div>

        {/* Players Grid */}
        {filteredPlayers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredPlayers.map(player => (
              <div
                key={player.id}
                className={`rounded-2xl bg-[#0c0c0e]/80 border-2 transition-all duration-300 relative overflow-hidden group shadow-lg flex flex-col justify-between ${
                  selectedPlayers.has(player.id)
                    ? 'border-[#E8A800] bg-[#E8A800]/5 shadow-[0_0_15px_rgba(232,168,0,0.1)]'
                    : 'border-white/5 hover:border-white/10 hover:scale-[1.01]'
                }`}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.02] rounded-full blur-xl pointer-events-none" />
                
                <div className="p-5">
                  {/* Selection Checkbox & View link */}
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <button
                      onClick={() => togglePlayer(player.id)}
                      className={`w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                        selectedPlayers.has(player.id)
                          ? 'bg-[#E8A800] border-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.35)]'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      {selectedPlayers.has(player.id) && (
                        <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    
                    <Link
                      href={`/team/players/${player.id}`}
                      className="text-gray-500 hover:text-[#E8A800] p-1 border border-transparent hover:border-white/5 rounded-lg hover:bg-white/[0.02] transition-all"
                    >
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>

                  {/* Player Photo */}
                  <div className="relative w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden bg-black border border-white/5 flex-shrink-0">
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                    />
                  </div>

                  {/* Player Info */}
                  <div className="text-center mb-5 min-w-0">
                    <h3 className="text-white font-bold text-xs truncate leading-tight mb-2">{player.name}</h3>
                    <div className="flex items-center justify-center gap-1.5 text-[9px] mb-2 font-mono font-extrabold uppercase tracking-wider">
                      <span className="px-2 py-0.5 rounded bg-[#E8A800]/10 text-[#E8A800] border border-[#E8A800]/20">
                        {player.position}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#FFB347]/10 text-[#FFB347] border border-[#FFB347]/20">
                        OVR {player.overallRating}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono truncate">{player.realWorldClub}</div>
                    {player.playingStyle && (
                      <div className="inline-block mt-2 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[8px] font-extrabold font-mono uppercase tracking-wider border border-purple-500/20 truncate max-w-full">
                        {player.playingStyle}
                      </div>
                    )}
                  </div>

                  {/* Quick Add Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToPlanner([player.id], 'primary')}
                      disabled={isAddingToPlanner}
                      className="flex-1 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-emerald-500/25 transition-all cursor-pointer disabled:opacity-50 font-mono"
                    >
                      Primary
                    </button>
                    <button
                      onClick={() => addToPlanner([player.id], 'backup')}
                      disabled={isAddingToPlanner}
                      className="flex-1 py-1.5 bg-[#FFB347]/10 border border-[#FFB347]/20 text-[#FFB347] rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-[#FFB347]/25 transition-all cursor-pointer disabled:opacity-50 font-mono"
                    >
                      Backup
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-3xl bg-[#0c0c0e]/80 border border-white/5 backdrop-blur-2xl shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">No stars found</h3>
            <p className="text-gray-400 text-xs mb-5 font-mono max-w-xs mx-auto leading-relaxed uppercase">
              {players.length === 0
                ? "You haven't bookmarked any candidate stars yet"
                : "No stars match your filter sectors"}
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-[#E8A800] hover:brightness-110 text-black rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(232,168,0,0.2)]"
            >
              Browse Candidate Pool
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Add Players Modal */}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0c0c0e]/95 border border-white/5 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.01]">
              <div>
                <h2 className="text-xl font-black text-white mb-1 uppercase tracking-wider font-mono">Star New Candidates</h2>
                <p className="text-xs text-gray-500 font-mono font-bold uppercase tracking-wider">Select free agents to bookmark on your watchlist</p>
              </div>
              <button
                onClick={closeAddModal}
                className="w-10 h-10 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.05] flex items-center justify-center transition-all cursor-pointer"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
              {loadingPlayers ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#E8A800] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xs text-gray-500 font-mono font-bold uppercase tracking-wider">Locating FA Database...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Filters */}
                  <div className="mb-6 space-y-4">
                    {/* Search Bar */}
                    <div>
                      <input
                        type="text"
                        placeholder="Search candidates by name..."
                        value={modalSearchQuery}
                        onChange={(e) => setModalSearchQuery(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono text-xs"
                      />
                    </div>

                    {/* Position and Style Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CustomSelect
                        label="Target Role Sector"
                        value={modalPositionFilter}
                        options={POSITIONS}
                        onChange={setModalPositionFilter}
                        displayValue={(val) => val === 'ALL' ? 'All Roles' : val}
                      />

                      <CustomSelect
                        label="Target Playing Style"
                        value={modalPlayingStyleFilter}
                        options={modalPlayingStyles}
                        onChange={setModalPlayingStyleFilter}
                        displayValue={(val) => val === 'all' ? 'All Styles' : val}
                      />
                    </div>
                  </div>

                  {/* Selection Actions */}
                  <div className="flex items-center justify-between mb-4 px-1 font-mono text-xs">
                    <div className="text-gray-500 font-extrabold uppercase tracking-wider">
                      {modalSelectedPlayers.size > 0 && (
                        <span className="text-[#E8A800] font-black">{modalSelectedPlayers.size} SELECTED • </span>
                      )}
                      {filteredModalPlayers.length} free agents available
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllModal}
                        className="px-3 py-1.5 bg-white/[0.01] border border-white/5 hover:bg-white/[0.05] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Select All
                      </button>
                      {modalSelectedPlayers.size > 0 && (
                        <button
                          onClick={clearModalSelection}
                          className="px-3 py-1.5 bg-white/[0.01] border border-white/5 hover:bg-white/[0.05] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Players Grid */}
                  {filteredModalPlayers.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                        {filteredModalPlayers.map(player => (
                          <div
                            key={player.id}
                            onClick={() => toggleModalPlayer(player.id)}
                            className={`rounded-2xl bg-black/40 border-2 transition-all duration-300 cursor-pointer ${
                              modalSelectedPlayers.has(player.id)
                                ? 'border-[#E8A800] bg-[#E8A800]/5 shadow-[0_0_12px_rgba(232,168,0,0.1)]'
                                : 'border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="p-4">
                              {/* Selection Checkbox */}
                              <div className="flex items-start justify-between mb-3 relative z-10">
                                <div
                                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    modalSelectedPlayers.has(player.id)
                                      ? 'bg-[#E8A800] border-[#E8A800]'
                                      : 'border-white/20'
                                  }`}
                                >
                                  {modalSelectedPlayers.has(player.id) && (
                                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              </div>

                              {/* Player Photo */}
                              <div className="relative w-14 h-14 mx-auto mb-3 rounded-xl overflow-hidden bg-black border border-white/5 flex-shrink-0">
                                <img
                                  src={player.photoUrl}
                                  alt={player.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                                />
                              </div>

                              {/* Player Info */}
                              <div className="text-center">
                                <h3 className="text-white font-bold text-xs truncate leading-tight mb-1">{player.name}</h3>
                                <div className="flex items-center justify-center gap-1 mt-1.5 font-mono text-[8px] font-extrabold uppercase tracking-wider">
                                  <span className="px-1.5 py-0.5 rounded bg-[#E8A800]/10 text-[#E8A800] border border-[#E8A800]/20">
                                    {player.position}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-[#FFB347]/10 text-[#FFB347] border border-[#FFB347]/20">
                                    {player.overallRating}
                                  </span>
                                </div>
                                {player.playingStyle && (
                                  <div className="text-[8px] text-gray-500 font-mono mt-1 truncate uppercase">{player.playingStyle}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Pagination Controls */}
                      {modalTotalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4 font-mono text-xs">
                          <button
                            onClick={() => loadModalPlayers(Math.max(1, modalPage - 1))}
                            disabled={modalPage === 1}
                            className="px-3.5 py-2 bg-white/[0.01] hover:bg-white/[0.04] border border-white/5 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Prev
                          </button>
                          
                          <div className="text-gray-500 font-extrabold uppercase tracking-wider">
                            Page <span className="text-[#E8A800]">{modalPage}</span> / <span className="text-white">{modalTotalPages}</span>
                          </div>
                          
                          <button
                            onClick={() => loadModalPlayers(Math.min(modalTotalPages, modalPage + 1))}
                            disabled={modalPage === modalTotalPages}
                            className="px-3.5 py-2 bg-white/[0.01] hover:bg-white/[0.04] border border-white/5 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                          >
                            Next
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl bg-black/25 font-mono">
                      <div className="text-gray-600 text-xs font-bold uppercase tracking-wider">No free agents found</div>
                      <div className="text-[10px] text-gray-700 mt-1 uppercase">Try widening target filter sweeps</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-4 p-6 border-t border-white/5 bg-white/[0.01]">
              <button
                onClick={closeAddModal}
                className="px-5 py-3 bg-white/[0.01] border border-white/5 hover:bg-white/[0.05] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={starSelectedPlayers}
                disabled={modalSelectedPlayers.size === 0 || starringPlayers}
                className="px-5 py-3 bg-[#E8A800] hover:brightness-110 text-black rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_15px_rgba(232,168,0,0.2)]"
              >
                {starringPlayers ? 'Starring...' : `Star Selected (${modalSelectedPlayers.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
