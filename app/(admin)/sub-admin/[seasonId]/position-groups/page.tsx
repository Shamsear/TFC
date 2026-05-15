'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
    try {
      setIsLoading(true)
      const response = await fetch(`/api/seasons/${seasonId}/position-groups`)
      if (!response.ok) throw new Error('Failed to fetch position groups')
      
      const data = await response.json()
      setGrouped(data.grouped)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAutoDistribute = async () => {
    if (!confirm(`Auto-distribute all ${selectedPosition} players into balanced groups?`)) {
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch(`/api/seasons/${seasonId}/position-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: selectedPosition })
      })

      if (!response.ok) throw new Error('Failed to auto-distribute')
      
      await fetchPositionGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-distribute')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMovePlayer = async (playerId: string, newGroup: 'A' | 'B' | null) => {
    try {
      const response = await fetch(`/api/seasons/${seasonId}/position-groups/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, newGroup })
      })

      if (!response.ok) throw new Error('Failed to move player')
      
      await fetchPositionGroups()
    } catch (err) {
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
    const query = searchQuery.toLowerCase()
    return players.filter(p => 
      p.basePlayer.name.toLowerCase().includes(query) ||
      p.realWorldClub.toLowerCase().includes(query)
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
              className="mt-2 text-xs bg-[#E8A800] hover:bg-[#FFC93A] disabled:bg-gray-600 text-[#0a0a0a] px-3 py-1 rounded font-bold transition-all"
            >
              Auto-Distribute
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
        {currentData.unassigned.length > 0 && (
          <div
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(null)}
            className="mt-6 rounded-xl bg-gray-500/5 border-2 border-gray-500/20 p-4"
          >
            <h2 className="text-xl font-black text-gray-400 mb-4">Unassigned ({currentData.unassigned.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {currentData.unassigned.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onDragStart={() => handleDragStart(player)}
                  onMove={handleMovePlayer}
                />
              ))}
            </div>
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
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
        <Image
          src={getPhotoUrlFromDb(player.basePlayer.photoUrl)}
          alt={player.basePlayer.name}
          fill
          className="object-cover"
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
