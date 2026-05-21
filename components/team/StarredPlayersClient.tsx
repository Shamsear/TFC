'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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

  // Get unique playing styles
  const playingStyles = useMemo(() => {
    const styles = new Set<string>()
    players.forEach(p => {
      if (p.playingStyle) styles.add(p.playingStyle)
    })
    return ['all', ...Array.from(styles).sort()]
  }, [players])

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
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/team"
            className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors font-medium text-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
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
          <div>
            <label className="block text-sm font-bold text-white mb-2">Position</label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all"
            >
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos === 'ALL' ? 'All Positions' : pos}</option>
              ))}
            </select>
          </div>

          {/* Playing Style Filter */}
          <div>
            <label className="block text-sm font-bold text-white mb-2">Playing Style</label>
            <select
              value={playingStyleFilter}
              onChange={(e) => setPlayingStyleFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all"
            >
              {playingStyles.map(style => (
                <option key={style} value={style}>
                  {style === 'all' ? 'All Styles' : style}
                </option>
              ))}
            </select>
          </div>
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
                  <Image
                    src={player.photoUrl}
                    alt={player.name}
                    fill
                    className="object-cover rounded-lg"
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
          <Link
            href="/team/players"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8A800] hover:bg-[#FFC93A] text-black rounded-lg font-bold text-sm transition-all"
          >
            Browse All Players
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}
