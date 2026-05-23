'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPlayerCardById, getPhotoUrlFromDb } from '@/lib/image-cdn'

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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/sub-admin/${seasonId}/all-players`}
            className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] text-sm font-medium mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Players
          </Link>
          <h1 className="text-3xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Position Groups
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm">
            Distribute players into balanced groups for auction rounds
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Position Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {POSITIONS.map(pos => (
            <button
              key={pos.code}
              onClick={() => setSelectedPosition(pos.code)}
              className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                selectedPosition === pos.code
                  ? 'bg-[#E8A800] text-[#0a0a0a]'
                  : 'bg-white/5 text-[#D4CCBB] hover:bg-white/10'
              }`}
            >
              {pos.code} - {pos.name}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players by name or club..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-11 text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800]/50 focus:bg-white/[0.07] transition-all"
            />
            <svg 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7367]" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A7367] hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-[#D4CCBB]">
              Found: {filteredGroupA.length} in Group A, {filteredGroupB.length} in Group B, {filteredUnassigned.length} unassigned
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
            <div className="text-blue-400 text-sm font-bold mb-1">Group A</div>
            <div className="text-2xl font-black text-white">{currentStats.groupA.count} players</div>
            <div className="text-sm text-[#D4CCBB]">Avg Rating: {currentStats.groupA.avgRating}</div>
          </div>
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
            <div className="text-purple-400 text-sm font-bold mb-1">Group B</div>
            <div className="text-2xl font-black text-white">{currentStats.groupB.count} players</div>
            <div className="text-sm text-[#D4CCBB]">Avg Rating: {currentStats.groupB.avgRating}</div>
          </div>
          <div className="rounded-xl bg-gray-500/10 border border-gray-500/20 p-4">
            <div className="text-gray-400 text-sm font-bold mb-1">Unassigned</div>
            <div className="text-2xl font-black text-white">{currentStats.unassigned} players</div>
            <button
              onClick={handleAutoDistribute}
              disabled={isSaving || currentStats.unassigned === 0}
              className="mt-2 text-xs bg-[#E8A800] hover:bg-[#FFC93A] disabled:bg-gray-600 disabled:cursor-not-allowed text-[#0a0a0a] px-3 py-1 rounded font-bold transition-all flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
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
            className="rounded-xl bg-blue-500/5 border-2 border-blue-500/20 p-4"
          >
            <h2 className="text-xl font-black text-blue-400 mb-4">
              Group A ({filteredGroupA.length})
              {searchQuery && filteredGroupA.length !== currentData.groupA.length && (
                <span className="text-sm font-normal text-[#D4CCBB] ml-2">
                  (filtered from {currentData.groupA.length})
                </span>
              )}
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {paginatedGroupA.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onDragStart={() => handleDragStart(player)}
                  onMove={handleMovePlayer}
                />
              ))}
              {filteredGroupA.length === 0 && (
                <div className="text-center py-8 text-[#7A7367]">
                  {searchQuery ? 'No players found' : 'No players in Group A'}
                </div>
              )}
            </div>
            {totalPagesA > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-blue-500/20 pt-4">
                <button
                  onClick={() => setCurrentPageA(prev => Math.max(1, prev - 1))}
                  disabled={currentPageA === 1}
                  className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500/30 transition-all text-sm font-bold"
                >
                  Previous
                </button>
                <span className="text-sm text-[#D4CCBB]">
                  Page {currentPageA} of {totalPagesA}
                </span>
                <button
                  onClick={() => setCurrentPageA(prev => Math.min(totalPagesA, prev + 1))}
                  disabled={currentPageA === totalPagesA}
                  className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500/30 transition-all text-sm font-bold"
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
            className="rounded-xl bg-purple-500/5 border-2 border-purple-500/20 p-4"
          >
            <h2 className="text-xl font-black text-purple-400 mb-4">
              Group B ({filteredGroupB.length})
              {searchQuery && filteredGroupB.length !== currentData.groupB.length && (
                <span className="text-sm font-normal text-[#D4CCBB] ml-2">
                  (filtered from {currentData.groupB.length})
                </span>
              )}
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {paginatedGroupB.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onDragStart={() => handleDragStart(player)}
                  onMove={handleMovePlayer}
                />
              ))}
              {filteredGroupB.length === 0 && (
                <div className="text-center py-8 text-[#7A7367]">
                  {searchQuery ? 'No players found' : 'No players in Group B'}
                </div>
              )}
            </div>
            {totalPagesB > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-purple-500/20 pt-4">
                <button
                  onClick={() => setCurrentPageB(prev => Math.max(1, prev - 1))}
                  disabled={currentPageB === 1}
                  className="px-3 py-1 rounded bg-purple-500/20 text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500/30 transition-all text-sm font-bold"
                >
                  Previous
                </button>
                <span className="text-sm text-[#D4CCBB]">
                  Page {currentPageB} of {totalPagesB}
                </span>
                <button
                  onClick={() => setCurrentPageB(prev => Math.min(totalPagesB, prev + 1))}
                  disabled={currentPageB === totalPagesB}
                  className="px-3 py-1 rounded bg-purple-500/20 text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500/30 transition-all text-sm font-bold"
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
            className="mt-6 rounded-xl bg-gray-500/5 border-2 border-gray-500/20 p-4"
          >
            <h2 className="text-xl font-black text-gray-400 mb-4">
              Unassigned ({filteredUnassigned.length})
              {searchQuery && filteredUnassigned.length !== currentData.unassigned.length && (
                <span className="text-sm font-normal text-[#D4CCBB] ml-2">
                  (filtered from {currentData.unassigned.length})
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
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
              <div className="mt-4 flex items-center justify-between border-t border-gray-500/20 pt-4">
                <button
                  onClick={() => setCurrentPageUnassigned(prev => Math.max(1, prev - 1))}
                  disabled={currentPageUnassigned === 1}
                  className="px-3 py-1 rounded bg-gray-500/20 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-500/30 transition-all text-sm font-bold"
                >
                  Previous
                </button>
                <span className="text-sm text-[#D4CCBB]">
                  Page {currentPageUnassigned} of {totalPagesUnassigned}
                </span>
                <button
                  onClick={() => setCurrentPageUnassigned(prev => Math.min(totalPagesUnassigned, prev + 1))}
                  disabled={currentPageUnassigned === totalPagesUnassigned}
                  className="px-3 py-1 rounded bg-gray-500/20 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-500/30 transition-all text-sm font-bold"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
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
      className="flex items-center gap-3 bg-black/30 rounded-lg p-3 cursor-move hover:bg-black/50 transition-all"
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
        <img
          src={getPhotoUrlFromDb(player.basePlayer.photoUrl)}
          alt={player.basePlayer.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white truncate">{player.basePlayer.name}</div>
        <div className="text-xs text-[#D4CCBB] truncate">{player.realWorldClub}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-lg font-black text-[#E8A800]">{player.overallRating}</div>
        <div className="flex gap-1 mt-1">
          {player.position_group !== 'A' && (
            <button
              onClick={() => onMove(player.id, 'A')}
              className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-0.5 rounded"
            >
              →A
            </button>
          )}
          {player.position_group !== 'B' && (
            <button
              onClick={() => onMove(player.id, 'B')}
              className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-2 py-0.5 rounded"
            >
              →B
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
