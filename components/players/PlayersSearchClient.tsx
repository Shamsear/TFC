"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { normalizeForSearch } from "@/lib/search-utils"

interface PlayerData {
  id: string
  name: string
  photoUrl: string
  position: string
  nationality: string
  realWorldClub: string
  overallRating: number
  playingStyle: string | null
  teamId: string | null
  teamName: string | null
  teamLogoUrl: string | null
  soldPrice: number | null
  isStarred?: boolean
}

interface Team {
  id: string
  name: string
  logoUrl: string
}

interface PlayersSearchClientProps {
  players: PlayerData[]
  teams: Team[]
  stats: {
    totalPlayers: number
    totalValue: number
    avgRating: number
    soldPlayers: number
    freeAgents: number
  }
  basePath?: string // Optional base path for player links (defaults to /players)
  seasonId?: string // Season ID for starring players
  enableStarring?: boolean // Enable star functionality
}

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'SS', 'LWF', 'RWF', 'CF']
const ITEMS_PER_PAGE = 20

export default function PlayersSearchClient({ 
  players, 
  teams, 
  stats, 
  basePath = '/players',
  seasonId,
  enableStarring = false 
}: PlayersSearchClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL')
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL')
  const [selectedPlayingStyle, setSelectedPlayingStyle] = useState<string>('ALL')
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [starredPlayerIds, setStarredPlayerIds] = useState<Set<string>>(new Set())
  const [starringInProgress, setStarringInProgress] = useState<Set<string>>(new Set())

  // Load starred players on mount
  useEffect(() => {
    if (enableStarring && seasonId) {
      // Clear starred players immediately to prevent showing stale data
      setStarredPlayerIds(new Set())
      
      const timestamp = Date.now()
      fetch(`/api/team/starred-players?seasonId=${seasonId}&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.starredPlayerIds) {
            setStarredPlayerIds(new Set(data.starredPlayerIds))
          }
        })
        .catch(err => {
          console.error('Error loading starred players:', err)
          setStarredPlayerIds(new Set())
        })
    }
  }, [enableStarring, seasonId])

  // Toggle star for a player
  const toggleStar = async (playerId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!seasonId || starringInProgress.has(playerId)) return
    
    setStarringInProgress(prev => new Set(prev).add(playerId))
    const isCurrentlyStarred = starredPlayerIds.has(playerId)
    
    try {
      if (isCurrentlyStarred) {
        // Unstar
        const res = await fetch(`/api/team/starred-players?playerId=${playerId}&seasonId=${seasonId}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          setStarredPlayerIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(playerId)
            return newSet
          })
        }
      } else {
        // Star
        const res = await fetch('/api/team/starred-players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, seasonId }),
        })
        if (res.ok) {
          setStarredPlayerIds(prev => new Set(prev).add(playerId))
        }
      }
    } catch (err) {
      console.error('Error toggling star:', err)
    } finally {
      setStarringInProgress(prev => {
        const newSet = new Set(prev)
        newSet.delete(playerId)
        return newSet
      })
    }
  }

  // Get unique playing styles based on selected position
  const availablePlayingStyles = useMemo(() => {
    const filteredByPosition = selectedPosition === 'ALL' 
      ? players 
      : players.filter(p => p.position === selectedPosition)
    
    const styles = new Set<string>()
    filteredByPosition.forEach(player => {
      if (player.playingStyle) {
        styles.add(player.playingStyle)
      }
    })
    return Array.from(styles).sort()
  }, [players, selectedPosition])

  // Reset playing style when position changes
  useMemo(() => {
    if (selectedPlayingStyle !== 'ALL' && !availablePlayingStyles.includes(selectedPlayingStyle)) {
      setSelectedPlayingStyle('ALL')
    }
  }, [selectedPosition, availablePlayingStyles, selectedPlayingStyle])

  // Real-time filtering
  const filteredPlayers = useMemo(() => {
    let filtered = players.filter(player => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        normalizeForSearch(player.name).includes(normalizeForSearch(searchQuery)) ||
        normalizeForSearch(player.realWorldClub).includes(normalizeForSearch(searchQuery)) ||
        normalizeForSearch(player.nationality).includes(normalizeForSearch(searchQuery))

      // Position filter
      const matchesPosition = selectedPosition === 'ALL' || player.position === selectedPosition

      // Team filter
      const matchesTeam = selectedTeam === 'ALL' || 
        (selectedTeam === 'FREE_AGENT' && player.teamId === null) ||
        (selectedTeam !== 'FREE_AGENT' && player.teamId === selectedTeam)

      // Playing style filter
      const matchesPlayingStyle = selectedPlayingStyle === 'ALL' || player.playingStyle === selectedPlayingStyle

      return matchesSearch && matchesPosition && matchesTeam && matchesPlayingStyle
    })

    // Sort: starred players first, then by name
    if (enableStarring) {
      filtered.sort((a, b) => {
        const aStarred = starredPlayerIds.has(a.id)
        const bStarred = starredPlayerIds.has(b.id)
        if (aStarred && !bStarred) return -1
        if (!aStarred && bStarred) return 1
        return a.name.localeCompare(b.name)
      })
    }

    return filtered
  }, [players, searchQuery, selectedPosition, selectedTeam, selectedPlayingStyle, enableStarring, starredPlayerIds])

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedPosition, selectedTeam, selectedPlayingStyle])

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount}`
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-[#FFB347]/10 border-[#FFB347]/30 text-[#FFB347]'
      case 'CB': return 'bg-[#4A90E2]/10 border-[#4A90E2]/30 text-[#4A90E2]'
      case 'LB': case 'RB': return 'bg-[#5BA3F5]/10 border-[#5BA3F5]/30 text-[#5BA3F5]'
      case 'DMF': return 'bg-[#2E7D32]/10 border-[#2E7D32]/30 text-[#4CAF50]'
      case 'CMF': return 'bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]'
      case 'LMF': case 'RMF': return 'bg-[#66BB6A]/10 border-[#66BB6A]/30 text-[#66BB6A]'
      case 'AMF': return 'bg-[#26A69A]/10 border-[#26A69A]/30 text-[#26A69A]'
      case 'SS': return 'bg-[#FF9800]/10 border-[#FF9800]/30 text-[#FF9800]'
      case 'LWF': case 'RWF': return 'bg-[#F44336]/10 border-[#F44336]/30 text-[#F44336]'
      case 'CF': return 'bg-[#E53935]/10 border-[#E53935]/30 text-[#E53935]'
      default: return 'bg-white/5 border-white/10 text-[#7A7367]'
    }
  }

  const getSelectedTeamDisplay = () => {
    if (selectedTeam === 'ALL') return 'All Teams'
    if (selectedTeam === 'FREE_AGENT') return 'Free Agents'
    const team = teams.find(t => t.id === selectedTeam)
    return team?.name || 'Select Team'
  }

  const getSelectedTeamLogo = () => {
    if (selectedTeam === 'ALL' || selectedTeam === 'FREE_AGENT') return null
    const team = teams.find(t => t.id === selectedTeam)
    return team?.logoUrl || null
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 p-4">
          <div className="text-2xl sm:text-3xl font-black text-white mb-1">{stats.totalPlayers}</div>
          <div className="text-xs text-gray-400">Total Players</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4">
          <div className="text-2xl sm:text-3xl font-black text-white mb-1">{stats.soldPlayers}</div>
          <div className="text-xs text-gray-400">Sold</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-4">
          <div className="text-2xl sm:text-3xl font-black text-white mb-1">{stats.freeAgents}</div>
          <div className="text-xs text-gray-400">Free Agents</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-4">
          <div className="text-2xl sm:text-3xl font-black text-white mb-1">{formatCurrency(stats.totalValue)}</div>
          <div className="text-xs text-gray-400">Total Value</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 p-4">
          <div className="text-2xl sm:text-3xl font-black text-white mb-1">{stats.avgRating}</div>
          <div className="text-xs text-gray-400">Avg Rating</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by player name, club, or nationality..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 sm:py-4 focus:outline-none focus:border-[#E8A800] focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white placeholder-gray-500 text-sm sm:text-base"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Position Filter - Horizontal Scroll */}
          <div className="lg:col-span-3 rounded-xl bg-white/5 border border-white/10 p-4">
            <label className="block text-sm font-bold text-white mb-3">Position</label>
            <div className="relative">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 min-w-max pb-2">
                  <button
                    onClick={() => setSelectedPosition('ALL')}
                    className={`px-4 py-2 rounded-lg font-bold transition-all text-sm whitespace-nowrap flex-shrink-0 ${
                      selectedPosition === 'ALL'
                        ? 'bg-[#E8A800] text-[#0a0a0a]'
                        : 'bg-black/30 text-gray-400 hover:bg-black/50'
                    }`}
                  >
                    All Positions
                  </button>
                  {POSITIONS.map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setSelectedPosition(pos)}
                      className={`px-4 py-2 rounded-lg font-bold transition-all text-sm whitespace-nowrap flex-shrink-0 ${
                        selectedPosition === pos
                          ? 'bg-[#E8A800] text-[#0a0a0a]'
                          : 'bg-black/30 text-gray-400 hover:bg-black/50'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
              {/* Scroll Indicator */}
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Team Dropdown */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <label className="block text-sm font-bold text-white mb-2">Team</label>
            <div className="relative">
              <button
                onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#E8A800] focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white text-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {getSelectedTeamLogo() && (
                    <div className="relative w-5 h-5 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                      <Image
                        src={getSelectedTeamLogo()!}
                        alt=""
                        fill
                        unoptimized={true}
                        className="object-cover"
                      />
                    </div>
                  )}
                  <span>{getSelectedTeamDisplay()}</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${isTeamDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isTeamDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsTeamDropdownOpen(false)}
                  />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute z-20 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedTeam('ALL')
                        setIsTeamDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 ${
                        selectedTeam === 'ALL' ? 'bg-[#E8A800]/20 text-[#E8A800]' : 'text-white'
                      }`}
                    >
                      All Teams
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTeam('FREE_AGENT')
                        setIsTeamDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 ${
                        selectedTeam === 'FREE_AGENT' ? 'bg-[#E8A800]/20 text-[#E8A800]' : 'text-white'
                      }`}
                    >
                      Free Agents
                    </button>
                    <div className="border-t border-white/10 my-1" />
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => {
                          setSelectedTeam(team.id)
                          setIsTeamDropdownOpen(false)
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 ${
                          selectedTeam === team.id ? 'bg-[#E8A800]/20 text-[#E8A800]' : 'text-white'
                        }`}
                      >
                        <div className="relative w-5 h-5 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                          <Image
                            src={team.logoUrl}
                            alt={team.name}
                            fill
                            unoptimized={true}
                            className="object-cover"
                          />
                        </div>
                        {team.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Playing Style Dropdown */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <label className="block text-sm font-bold text-white mb-2">Playing Style</label>
            <select
              value={selectedPlayingStyle}
              onChange={(e) => setSelectedPlayingStyle(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#E8A800] focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={availablePlayingStyles.length === 0}
            >
              <option value="ALL">All Styles</option>
              {availablePlayingStyles.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
            {availablePlayingStyles.length === 0 && (
              <div className="text-xs text-gray-500 mt-1">No styles for selected position</div>
            )}
          </div>

          {/* Clear Filters Button */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-end">
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedPosition('ALL')
                setSelectedTeam('ALL')
                setSelectedPlayingStyle('ALL')
              }}
              disabled={searchQuery === '' && selectedPosition === 'ALL' && selectedTeam === 'ALL' && selectedPlayingStyle === 'ALL'}
              className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white disabled:text-gray-600 rounded-lg font-bold transition-all text-sm"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Showing <span className="text-white font-bold">{startIndex + 1}-{Math.min(endIndex, filteredPlayers.length)}</span> of <span className="text-white font-bold">{filteredPlayers.length}</span> players
        </div>
        {(searchQuery || selectedPosition !== 'ALL' || selectedTeam !== 'ALL' || selectedPlayingStyle !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedPosition('ALL')
              setSelectedTeam('ALL')
              setSelectedPlayingStyle('ALL')
            }}
            className="text-sm text-[#E8A800] hover:text-[#FFC93A] font-bold transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Players Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-12 text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div className="text-xl font-bold text-white mb-2">No players found</div>
          <p className="text-gray-400 mb-4">Try adjusting your search or filters</p>
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedPosition('ALL')
              setSelectedTeam('ALL')
              setSelectedPlayingStyle('ALL')
            }}
            className="px-6 py-2 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-all"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedPlayers.map((player) => (
              <Link
                key={player.id}
                href={`${basePath}/${player.id}`}
                className="group rounded-xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/10 p-4 transition-all relative"
              >
                {/* Star Button */}
                {enableStarring && (
                  <button
                    onClick={(e) => toggleStar(player.id, e)}
                    disabled={starringInProgress.has(player.id)}
                    className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-black/50 hover:bg-black/70 transition-all disabled:opacity-50"
                    title={starredPlayerIds.has(player.id) ? 'Unstar player' : 'Star player'}
                  >
                    {starredPlayerIds.has(player.id) ? (
                      <svg className="w-5 h-5 text-[#E8A800] fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400 hover:text-[#E8A800] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Player Card - Horizontal Layout */}
                <div className="flex gap-4">
                  {/* Player Photo - Left Side */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                    <Image
                      src={player.photoUrl}
                      alt={player.name}
                      fill
                      unoptimized={true}
                      className="object-cover"
                    />
                  </div>

                  {/* Player Info - Right Side */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${getPositionColor(player.position)}`}>
                          {player.position}
                        </span>
                        <span className="px-2 py-0.5 rounded-full border border-[#E8A800]/20 bg-[#3D2A00] text-xs font-bold text-[#E8A800]">
                          {player.overallRating}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-white mb-1 group-hover:text-[#E8A800] transition-colors line-clamp-1">
                        {player.name}
                      </h3>
                      <div className="text-xs text-gray-400 truncate">{player.realWorldClub}</div>
                      {player.playingStyle && (
                        <div className="text-xs text-gray-500 truncate italic">{player.playingStyle}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Team or Free Agent */}
                <div className="mt-3">
                  {player.teamId ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-black/30">
                      <div className="relative w-5 h-5 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                        <Image
                          src={player.teamLogoUrl!}
                          alt={player.teamName!}
                          fill
                          unoptimized={true}
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{player.teamName}</div>
                        {player.soldPrice && player.soldPrice > 0 && (
                          <div className="text-xs font-bold text-[#E8A800]">
                            {formatCurrency(player.soldPrice)}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                      <div className="text-xs text-blue-400 font-bold">Free Agent</div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {/* First page */}
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => goToPage(1)}
                      className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all"
                    >
                      1
                    </button>
                    {currentPage > 4 && <span className="text-gray-500">...</span>}
                  </>
                )}

                {/* Page numbers around current page */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    return page === currentPage || 
                           page === currentPage - 1 || 
                           page === currentPage + 1 ||
                           (page === currentPage - 2 && currentPage <= 3) ||
                           (page === currentPage + 2 && currentPage >= totalPages - 2)
                  })
                  .map(page => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`w-10 h-10 rounded-lg font-bold transition-all ${
                        page === currentPage
                          ? 'bg-[#E8A800] text-[#0a0a0a]'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                {/* Last page */}
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="text-gray-500">...</span>}
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all"
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
