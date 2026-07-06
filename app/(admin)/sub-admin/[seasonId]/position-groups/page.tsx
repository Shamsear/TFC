'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPlayerCardById, getPhotoUrlFromDb } from '@/lib/image-cdn'
import { normalizeForSearch } from '@/lib/search-utils'

interface Player {
  id: string
  basePlayerId: string
  position: string
  position_group: string | null
  overallRating: number
  realWorldClub: string
  basePlayer: {
    id: string
    name: string
    photoUrl: string
  }
}

interface GroupData {
  groupA: Player[]
  groupB: Player[]
  unassigned: Player[]
}

interface Stats {
  groupA: { count: number; avgRating: number }
  groupB: { count: number; avgRating: number }
  unassigned: number
}

const POSITIONS = [
  { code: 'CB', name: 'Center Back' },
  { code: 'DMF', name: 'Defensive Midfielder' },
  { code: 'CMF', name: 'Central Midfielder' },
  { code: 'AMF', name: 'Attacking Midfielder' },
  { code: 'CF', name: 'Center Forward' }
]

export default function PositionGroupsPage() {
  const params = useParams()
  const router = useRouter()
  const seasonId = params.seasonId as string

  const [selectedPosition, setSelectedPosition] = useState('CB')
  const [grouped, setGrouped] = useState<Record<string, GroupData>>({})
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPageA, setCurrentPageA] = useState(1)
  const [currentPageB, setCurrentPageB] = useState(1)
  const [currentPageUnassigned, setCurrentPageUnassigned] = useState(1)
  const PLAYERS_PER_PAGE = 10

  useEffect(() => {
    fetchPositionGroups()
  }, [seasonId])

  const fetchPositionGroups = async () => {
    console.log('[Fetch] Starting to fetch position groups for season:', seasonId)
    
    try {
      setIsLoading(true)
      const url = `/api/seasons/${seasonId}/position-groups`
      console.log('[Fetch] Fetching from:', url)
      
      const response = await fetch(url)
      console.log('[Fetch] Response status:', response.status)
      console.log('[Fetch] Response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Fetch] Error response:', errorText)
        throw new Error('Failed to fetch position groups')
      }
      
      const data = await response.json()
      console.log('[Fetch] Data received:', {
        groupedKeys: Object.keys(data.grouped || {}),
        statsKeys: Object.keys(data.stats || {}),
        sampleGrouped: data.grouped?.CB ? {
          groupA: data.grouped.CB.groupA?.length || 0,
          groupB: data.grouped.CB.groupB?.length || 0,
          unassigned: data.grouped.CB.unassigned?.length || 0
        } : 'No CB data'
      })
      
      setGrouped(data.grouped)
      setStats(data.stats)
      console.log('[Fetch] State updated successfully')
    } catch (err) {
      console.error('[Fetch] Error caught:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
      console.log('[Fetch] Loading complete')
    }
  }

  const handleAutoDistribute = async () => {
    console.log('[Auto-Distribute] Starting auto-distribution for position:', selectedPosition)
    console.log('[Auto-Distribute] Current unassigned count:', currentStats.unassigned)
    
    if (!confirm(`Auto-distribute all ${selectedPosition} players into balanced groups?\n\nThis may take a minute for large datasets.`)) {
      console.log('[Auto-Distribute] User cancelled')
      return
    }

    try {
      setIsSaving(true)
      setError('') // Clear any previous errors
      console.log('[Auto-Distribute] Sending POST request to:', `/api/seasons/${seasonId}/position-groups`)
      console.log('[Auto-Distribute] Request body:', { position: selectedPosition })
      
      // Set a longer timeout for large datasets (5 minutes)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes
      
      const response = await fetch(`/api/seasons/${seasonId}/position-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: selectedPosition }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      
      console.log('[Auto-Distribute] Response status:', response.status)
      console.log('[Auto-Distribute] Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Auto-Distribute] Error response:', errorText)
        throw new Error('Failed to auto-distribute')
      }
      
      const result = await response.json()
      console.log('[Auto-Distribute] Success response:', result)
      
      console.log('[Auto-Distribute] Fetching updated position groups...')
      await fetchPositionGroups()
      console.log('[Auto-Distribute] Position groups refreshed successfully')
      
      // Show success message
      alert(`Successfully distributed ${result.distributed} players!\nGroup A: ${result.groupA}\nGroup B: ${result.groupB}`)
    } catch (err) {
      console.error('[Auto-Distribute] Error caught:', err)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. The operation may still be processing in the background.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to auto-distribute')
      }
    } finally {
      setIsSaving(false)
      console.log('[Auto-Distribute] Process completed')
    }
  }

  const handleMovePlayer = async (playerId: string, newGroup: 'A' | 'B' | null) => {
    console.log('[Move Player] Moving player:', playerId, 'to group:', newGroup)
    
    try {
      const response = await fetch(`/api/seasons/${seasonId}/position-groups/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, newGroup })
      })

      console.log('[Move Player] Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Move Player] Error response:', errorText)
        throw new Error('Failed to move player')
      }
      
      const result = await response.json()
      console.log('[Move Player] Success response:', result)
      
      await fetchPositionGroups()
      console.log('[Move Player] Position groups refreshed')
    } catch (err) {
      console.error('[Move Player] Error caught:', err)
      setError(err instanceof Error ? err.message : 'Failed to move player')
    }
  }

  const handleDragStart = (player: Player) => {
    setDraggedPlayer(player)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetGroup: 'A' | 'B' | null) => {
    if (!draggedPlayer) return

    await handleMovePlayer(draggedPlayer.id, targetGroup)
    setDraggedPlayer(null)
  }

  const currentData = grouped[selectedPosition] || { groupA: [], groupB: [], unassigned: [] }
  const currentStats = stats[selectedPosition] || { groupA: { count: 0, avgRating: 0 }, groupB: { count: 0, avgRating: 0 }, unassigned: 0 }

  // Filter players by search query
  const filterPlayers = (players: Player[]) => {
    if (!searchQuery.trim()) return players
    const query = normalizeForSearch(searchQuery)
    return players.filter(p => 
      normalizeForSearch(p.basePlayer.name).includes(query) ||
      normalizeForSearch(p.realWorldClub).includes(query)
    )
  }

  const filteredGroupA = filterPlayers(currentData.groupA)
  const filteredGroupB = filterPlayers(currentData.groupB)
  const filteredUnassigned = filterPlayers(currentData.unassigned)

  // Pagination
  const paginateArray = (array: Player[], page: number) => {
    const startIndex = (page - 1) * PLAYERS_PER_PAGE
    return array.slice(startIndex, startIndex + PLAYERS_PER_PAGE)
  }

  const paginatedGroupA = paginateArray(filteredGroupA, currentPageA)
  const paginatedGroupB = paginateArray(filteredGroupB, currentPageB)
  const paginatedUnassigned = paginateArray(filteredUnassigned, currentPageUnassigned)

  const totalPagesA = Math.ceil(filteredGroupA.length / PLAYERS_PER_PAGE)
  const totalPagesB = Math.ceil(filteredGroupB.length / PLAYERS_PER_PAGE)
  const totalPagesUnassigned = Math.ceil(filteredUnassigned.length / PLAYERS_PER_PAGE)

  // Reset pages when search changes
  useEffect(() => {
    setCurrentPageA(1)
    setCurrentPageB(1)
    setCurrentPageUnassigned(1)
  }, [searchQuery, selectedPosition])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E8A800] mx-auto mb-4"></div>
          <p className="text-[#D4CCBB]">Loading position groups...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}/all-players`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Players
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Position Groups
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          Distribute players into balanced groups for auction rounds
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl font-mono text-xs uppercase tracking-wider">
          {error}
        </div>
      )}

      {/* Position Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {POSITIONS.map(pos => (
          <button
            key={pos.code}
            onClick={() => setSelectedPosition(pos.code)}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all text-xs uppercase tracking-wider cursor-pointer ${
              selectedPosition === pos.code
                ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] shadow-md'
                : 'bg-white/[0.02] border border-white/5 hover:border-white/10 text-gray-400'
            }`}
          >
            {pos.code} - {pos.name}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players by name or club..."
            className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 pl-11 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
          />
          <svg 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">
            Found: {filteredGroupA.length} in Group A, {filteredGroupB.length} in Group B, {filteredUnassigned.length} unassigned
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-blue-500/[0.02] border border-blue-500/10 p-5 backdrop-blur-xl shadow-md transition-all">
          <div className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest font-mono mb-1">Group A</div>
          <div className="text-2xl font-black text-white font-mono">{currentStats.groupA.count} players</div>
          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">Avg Rating: {currentStats.groupA.avgRating}</div>
        </div>
        <div className="rounded-2xl bg-purple-500/[0.02] border border-purple-500/10 p-5 backdrop-blur-xl shadow-md transition-all">
          <div className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest font-mono mb-1">Group B</div>
          <div className="text-2xl font-black text-white font-mono">{currentStats.groupB.count} players</div>
          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">Avg Rating: {currentStats.groupB.avgRating}</div>
        </div>
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Unassigned</div>
            <div className="text-2xl font-black text-white font-mono">{currentStats.unassigned} players</div>
          </div>
          <button
            onClick={handleAutoDistribute}
            disabled={isSaving || currentStats.unassigned === 0}
            className="mt-4 w-fit bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0a0a] px-4 py-2 rounded-xl font-bold transition-all text-xs uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Auto-Distribute'
            )}
          </button>
        </div>
      </div>

        {/* Groups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Group A */}
          <div
            onDragOver={handleDragOver}
            onDrop={() => handleDrop('A')}
            className="rounded-2xl bg-blue-500/[0.01] border-2 border-blue-500/10 p-5 shadow-md backdrop-blur-xl"
          >
            <h2 className="text-lg font-black text-blue-400 mb-4 uppercase tracking-tight font-mono">
              Group A ({filteredGroupA.length})
              {searchQuery && filteredGroupA.length !== currentData.groupA.length && (
                <span className="text-xs font-bold text-gray-500 ml-2 uppercase tracking-wider">
                  (filtered from {currentData.groupA.length})
                </span>
              )}
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {paginatedGroupA.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onDragStart={() => handleDragStart(player)}
                  onMove={handleMovePlayer}
                />
              ))}
              {filteredGroupA.length === 0 && (
                <div className="text-center py-8 text-gray-500 font-bold uppercase tracking-wider font-mono text-xs">
                  {searchQuery ? 'No players found' : 'No players in Group A'}
                </div>
              )}
            </div>
            {totalPagesA > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-blue-500/10 pt-4">
                <button
                  onClick={() => setCurrentPageA(prev => Math.max(1, prev - 1))}
                  disabled={currentPageA === 1}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500/20 transition-all text-xs font-bold uppercase tracking-wider font-mono cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
                  Page {currentPageA} of {totalPagesA}
                </span>
                <button
                  onClick={() => setCurrentPageA(prev => Math.min(totalPagesA, prev + 1))}
                  disabled={currentPageA === totalPagesA}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500/20 transition-all text-xs font-bold uppercase tracking-wider font-mono cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Group B */}
          <div
            onDragOver={handleDragOver}
            onDrop={() => handleDrop('B')}
            className="rounded-2xl bg-purple-500/[0.01] border-2 border-purple-500/10 p-5 shadow-md backdrop-blur-xl"
          >
            <h2 className="text-lg font-black text-purple-400 mb-4 uppercase tracking-tight font-mono">
              Group B ({filteredGroupB.length})
              {searchQuery && filteredGroupB.length !== currentData.groupB.length && (
                <span className="text-xs font-bold text-gray-500 ml-2 uppercase tracking-wider">
                  (filtered from {currentData.groupB.length})
                </span>
              )}
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {paginatedGroupB.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onDragStart={() => handleDragStart(player)}
                  onMove={handleMovePlayer}
                />
              ))}
              {filteredGroupB.length === 0 && (
                <div className="text-center py-8 text-gray-500 font-bold uppercase tracking-wider font-mono text-xs">
                  {searchQuery ? 'No players found' : 'No players in Group B'}
                </div>
              )}
            </div>
            {totalPagesB > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-purple-500/10 pt-4">
                <button
                  onClick={() => setCurrentPageB(prev => Math.max(1, prev - 1))}
                  disabled={currentPageB === 1}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500/20 transition-all text-xs font-bold uppercase tracking-wider font-mono cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
                  Page {currentPageB} of {totalPagesB}
                </span>
                <button
                  onClick={() => setCurrentPageB(prev => Math.min(totalPagesB, prev + 1))}
                  disabled={currentPageB === totalPagesB}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500/20 transition-all text-xs font-bold uppercase tracking-wider font-mono cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Unassigned Players */}
        {filteredUnassigned.length > 0 && (
          <div
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(null)}
            className="mt-6 rounded-2xl bg-white/[0.01] border-2 border-white/5 p-5 shadow-md backdrop-blur-xl"
          >
            <h2 className="text-lg font-black text-gray-400 mb-4 uppercase tracking-tight font-mono">
              Unassigned ({filteredUnassigned.length})
              {searchQuery && filteredUnassigned.length !== currentData.unassigned.length && (
                <span className="text-xs font-bold text-gray-500 ml-2 uppercase tracking-wider">
                  (filtered from {currentData.unassigned.length})
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pr-1">
              {paginatedUnassigned.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onDragStart={() => handleDragStart(player)}
                  onMove={handleMovePlayer}
                />
              ))}
            </div>
            {totalPagesUnassigned > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                <button
                  onClick={() => setCurrentPageUnassigned(prev => Math.max(1, prev - 1))}
                  disabled={currentPageUnassigned === 1}
                  className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-all text-xs font-bold uppercase tracking-wider font-mono cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
                  Page {currentPageUnassigned} of {totalPagesUnassigned}
                </span>
                <button
                  onClick={() => setCurrentPageUnassigned(prev => Math.min(totalPagesUnassigned, prev + 1))}
                  disabled={currentPageUnassigned === totalPagesUnassigned}
                  className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-all text-xs font-bold uppercase tracking-wider font-mono cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
    </div>
  )
}

function PlayerCard({ 
  player, 
  onDragStart, 
  onMove 
}: { 
  player: Player
  onDragStart: () => void
  onMove: (playerId: string, group: 'A' | 'B' | null) => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl p-3 cursor-move transition-all shadow-sm"
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
        <img
          src={getPhotoUrlFromDb(player.basePlayer.photoUrl)}
          alt={player.basePlayer.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-white truncate text-sm uppercase tracking-tight">{player.basePlayer.name}</div>
        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5 truncate">{player.realWorldClub}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-lg font-black text-[#E8A800] font-mono">{player.overallRating}</div>
        <div className="flex gap-1 mt-1 font-mono">
          {player.position_group !== 'A' && (
            <button
              onClick={() => onMove(player.id, 'A')}
              className="text-[10px] bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-lg font-extrabold transition-all cursor-pointer"
            >
              →A
            </button>
          )}
          {player.position_group !== 'B' && (
            <button
              onClick={() => onMove(player.id, 'B')}
              className="text-[10px] bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-lg font-extrabold transition-all cursor-pointer"
            >
              →B
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
