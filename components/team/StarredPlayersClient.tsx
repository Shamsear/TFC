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
      <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-sm sm:text-base text-left"
      >
        <span className="truncate">
          {displayValue ? displayValue(value) : value}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto rounded-xl bg-[#121212]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgb(0,0,0,0.5)] py-1 focus:outline-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {options.map((option) => {
            const isSelected = option === value

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-[#E8A800]/10 hover:text-[#E8A800] ${
                  isSelected ? 'text-[#E8A800] bg-[#E8A800]/5 font-bold' : 'text-gray-300'
                }`}
              >
                <span className="truncate">{displayValue ? displayValue(option) : option}</span>
                {isSelected && (
                  <svg className="w-4 h-4 text-[#E8A800] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
  const [isModalLoadingMore, setIsModalLoadingMore] = useState(false)

  // Get unique playing styles
  const playingStyles = useMemo(() => {
    const styles = new Set<string>()
    players.forEach(p => {
      if (p.playingStyle) styles.add(p.playingStyle)
    })
    return ['all', ...Array.from(styles).sort()]
  }, [players])

  // Get unique playing styles for modal - keep the same as main for simplicity or derive from all players if needed
  // Since we fetch paginated data, we use the known playing styles from the starred list as options for now
  // to avoid sending a huge list of styles that might not be relevant.
  const modalPlayingStyles = playingStyles


  // Load modal players from server with pagination and filtering
  const loadModalPlayers = async (pageToLoad: number, append = false) => {
    if (append) {
      setIsModalLoadingMore(true)
    } else {
      setLoadingPlayers(true)
    }
    
    try {
      const searchParams = new URLSearchParams({
        seasonId,
        page: pageToLoad.toString(),
      })
      if (modalSearchQuery) searchParams.append('search', modalSearchQuery)
      if (modalPositionFilter !== 'ALL') searchParams.append('position', modalPositionFilter)
      if (modalPlayingStyleFilter !== 'all') searchParams.append('playingStyle', modalPlayingStyleFilter)

      const response = await fetch(`/api/players/search?${searchParams.toString()}`)
      const data = await response.json()
      
      // Filter out already starred players
      const starredIds = new Set(players.map(p => p.id))
      const unstarredPlayers = (data.players || []).filter((p: Player) => !starredIds.has(p.id))
      
      if (append) {
        setAllPlayers(prev => [...prev, ...unstarredPlayers])
      } else {
        setAllPlayers(unstarredPlayers)
      }
      
      setModalTotalPages(data.totalPages || 1)
      setModalPage(pageToLoad)
    } catch (error) {
      console.error('Error loading players:', error)
      alert('Failed to load players')
    } finally {
      setLoadingPlayers(false)
      setIsModalLoadingMore(false)
    }
  }

  // Effect to load modal players on filter/search change
  useEffect(() => {
    if (showAddModal) {
      const debounce = setTimeout(() => {
        loadModalPlayers(1, false)
      }, 300)
      return () => clearTimeout(debounce)
    }
  }, [showAddModal, modalSearchQuery, modalPositionFilter, modalPlayingStyleFilter])


  // Open modal
  const openAddModal = () => {
    setShowAddModal(true)
    // loadModalPlayers is triggered by useEffect on showAddModal becoming true
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

  // Server-filtered players are stored in allPlayers directly
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
      // Star each player
      const promises = Array.from(modalSelectedPlayers).map(playerId =>
        fetch('/api/team/starred-players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, seasonId }),
        })
      )
      
      await Promise.all(promises)
      
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
      // Get current plan
      const response = await fetch(`/api/team/auction-plan?seasonId=${seasonId}`)
      const data = await response.json()
      
      const currentPlan = data.plan?.positions || {}
      
      // Add players to their respective positions
      const playersToAdd = players.filter(p => playerIds.includes(p.id))
      
      playersToAdd.forEach(player => {
        if (!currentPlan[player.position]) {
          currentPlan[player.position] = {
            minPlayers: 0,
            maxPlayers: 0,
            targets: []
          }
        }
        
        // Check if player already exists
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
      
      // Save updated plan
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
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link
            href="/team"
            className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors font-medium text-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8A800] hover:bg-[#FFC93A] text-black rounded-lg font-bold text-sm transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Players
          </button>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
          <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
            ⭐ Starred Players
          </span>
        </h1>
        <p className="text-sm sm:text-base text-gray-400">
          {seasonName} • {players.length} starred player{players.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Position Filter */}
          <CustomSelect
            label="Position"
            value={positionFilter}
            options={POSITIONS}
            onChange={setPositionFilter}
            displayValue={(val) => val === 'ALL' ? 'All Positions' : val}
          />

          {/* Playing Style Filter */}
          <CustomSelect
            label="Playing Style"
            value={playingStyleFilter}
            options={playingStyles}
            onChange={setPlayingStyleFilter}
            displayValue={(val) => val === 'all' ? 'All Styles' : val}
          />
        </div>
      </div>

      {/* Selection Actions */}
      {selectedPlayers.size > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-[#E8A800]/20 to-[#FFB347]/20 border-2 border-[#E8A800]/50 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-white font-bold text-lg mb-1">
                {selectedPlayers.size} player{selectedPlayers.size !== 1 ? 's' : ''} selected
              </div>
              <div className="text-sm text-[#D4CCBB]">Add to auction planner</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => addToPlanner(Array.from(selectedPlayers), 'primary')}
                disabled={isAddingToPlanner}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              >
                Add as Primary
              </button>
              <button
                onClick={() => addToPlanner(Array.from(selectedPlayers), 'backup')}
                disabled={isAddingToPlanner}
                className="px-4 py-2 bg-[#FFB347] hover:bg-[#FFC93A] text-black rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              >
                Add as Backup
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">
          Showing {filteredPlayers.length} of {players.length} players
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all"
          >
            Select All
          </button>
          {selectedPlayers.size > 0 && (
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all"
            >
              Clear ({selectedPlayers.size})
            </button>
          )}
        </div>
      </div>

      {/* Players Grid */}
      {filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map(player => (
            <div
              key={player.id}
              className={`rounded-xl bg-white/5 border-2 transition-all ${
                selectedPlayers.has(player.id)
                  ? 'border-[#E8A800] bg-[#E8A800]/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="p-4">
                {/* Selection Checkbox */}
                <div className="flex items-start justify-between mb-3">
                  <button
                    onClick={() => togglePlayer(player.id)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                      selectedPlayers.has(player.id)
                        ? 'bg-[#E8A800] border-[#E8A800]'
                        : 'border-white/30 hover:border-white/50'
                    }`}
                  >
                    {selectedPlayers.has(player.id) && (
                      <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <Link
                    href={`/team/players/${player.id}`}
                    className="text-[#E8A800] hover:text-[#FFC93A] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>

                {/* Player Photo */}
                <div className="relative w-24 h-24 mx-auto mb-3">
                  <img
                    src={player.photoUrl}
                    alt={player.name}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                  />
                </div>

                {/* Player Info */}
                <div className="text-center mb-3">
                  <h3 className="text-white font-bold text-sm mb-1 line-clamp-1">{player.name}</h3>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-[#E8A800]/20 text-[#E8A800] font-bold">
                      {player.position}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FFB347]/20 text-[#FFB347] font-bold">
                      {player.overallRating}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-1">{player.realWorldClub}</div>
                  {player.playingStyle && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-1">{player.playingStyle}</div>
                  )}
                </div>

                {/* Quick Add Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => addToPlanner([player.id], 'primary')}
                    disabled={isAddingToPlanner}
                    className="flex-1 px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                  >
                    Primary
                  </button>
                  <button
                    onClick={() => addToPlanner([player.id], 'backup')}
                    disabled={isAddingToPlanner}
                    className="flex-1 px-3 py-2 bg-[#FFB347]/20 border border-[#FFB347]/30 text-[#FFB347] rounded-lg text-xs font-bold hover:bg-[#FFB347]/30 transition-all disabled:opacity-50"
                  >
                    Backup
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl bg-white/5 border border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No players found</h3>
          <p className="text-gray-400 text-sm mb-4">
            {players.length === 0
              ? "You haven't starred any players yet"
              : "No players match your current filters"}
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8A800] hover:bg-[#FFC93A] text-black rounded-lg font-bold text-sm transition-all"
          >
            Browse All Players
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Add Players Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-2xl font-black text-white mb-1">Add Players to Starred</h2>
                <p className="text-sm text-gray-400">Select players to add to your starred list</p>
              </div>
              <button
                onClick={closeAddModal}
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingPlayers ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#E8A800] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading players...</p>
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
                        placeholder="Search players by name..."
                        value={modalSearchQuery}
                        onChange={(e) => setModalSearchQuery(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all"
                      />
                    </div>

                    {/* Position and Style Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CustomSelect
                        label="Position"
                        value={modalPositionFilter}
                        options={POSITIONS}
                        onChange={setModalPositionFilter}
                        displayValue={(val) => val === 'ALL' ? 'All Positions' : val}
                      />

                      <CustomSelect
                        label="Playing Style"
                        value={modalPlayingStyleFilter}
                        options={modalPlayingStyles}
                        onChange={setModalPlayingStyleFilter}
                        displayValue={(val) => val === 'all' ? 'All Styles' : val}
                      />
                    </div>
                  </div>

                  {/* Selection Actions */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-400">
                      {modalSelectedPlayers.size > 0 && (
                        <span className="text-[#E8A800] font-bold">{modalSelectedPlayers.size} selected • </span>
                      )}
                      Showing {filteredModalPlayers.length} players
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllModal}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Select All
                      </button>
                      {modalSelectedPlayers.size > 0 && (
                        <button
                          onClick={clearModalSelection}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Players Grid */}
                  {filteredModalPlayers.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {filteredModalPlayers.map(player => (
                        <div
                          key={player.id}
                          onClick={() => toggleModalPlayer(player.id)}
                          className={`rounded-xl bg-white/5 border-2 transition-all cursor-pointer ${
                            modalSelectedPlayers.has(player.id)
                              ? 'border-[#E8A800] bg-[#E8A800]/10'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="p-3">
                            {/* Selection Checkbox */}
                            <div className="flex items-start justify-between mb-2">
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  modalSelectedPlayers.has(player.id)
                                    ? 'bg-[#E8A800] border-[#E8A800]'
                                    : 'border-white/30'
                                }`}
                              >
                                {modalSelectedPlayers.has(player.id) && (
                                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>

                            {/* Player Photo */}
                            <div className="relative w-16 h-16 mx-auto mb-2">
                              <img
                                src={player.photoUrl}
                                alt={player.name}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                              />
                            </div>

                            {/* Player Info */}
                            <div className="text-center">
                              <h3 className="text-white font-bold text-xs mb-1 line-clamp-1">{player.name}</h3>
                              <div className="flex items-center justify-center gap-1 text-xs mb-1">
                                <span className="px-1.5 py-0.5 rounded-full bg-[#E8A800]/20 text-[#E8A800] font-bold text-[10px]">
                                  {player.position}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-full bg-[#FFB347]/20 text-[#FFB347] font-bold text-[10px]">
                                  {player.overallRating}
                                </span>
                              </div>
                              {player.playingStyle && (
                                <div className="text-[10px] text-gray-400 line-clamp-1">{player.playingStyle}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Load More Button */}
                    {modalPage < modalTotalPages && (
                      <div className="mt-8 flex justify-center">
                        <button
                          onClick={() => loadModalPlayers(modalPage + 1, true)}
                          disabled={isModalLoadingMore}
                          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {isModalLoadingMore ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Loading...
                            </>
                          ) : (
                            'Load More Players'
                          )}
                        </button>
                      </div>
                    )}
                  ) : (
                    <div className="text-center py-12 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-gray-400 mb-2">No players found</div>
                      <div className="text-sm text-gray-500">Try adjusting your filters</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-4 p-6 border-t border-white/10">
              <button
                onClick={closeAddModal}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={starSelectedPlayers}
                disabled={modalSelectedPlayers.size === 0 || starringPlayers}
                className="px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-black rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {starringPlayers ? 'Adding...' : `Add ${modalSelectedPlayers.size > 0 ? modalSelectedPlayers.size : ''} Player${modalSelectedPlayers.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
