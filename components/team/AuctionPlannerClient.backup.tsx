"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"

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

interface PlayerTarget {
  id: string
  playerId: string
  playerName: string
  position: string
  minBid: number
  maxBid: number
  priority: 'primary' | 'backup'
}

interface PositionPlan {
  position: string
  minPlayers: number
  maxPlayers: number
  targets: PlayerTarget[]
}

interface AuctionPlannerClientProps {
  seasonId: string
  seasonName: string
  teamId: string
  teamName: string
  currentBudget: number
  startingPurse: number
  players: Player[]
  initialStarredPlayerIds: string[]
}

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'SS', 'LWF', 'RWF', 'CF']

export default function AuctionPlannerClient({
  seasonId,
  seasonName,
  teamId,
  teamName,
  currentBudget,
  startingPurse,
  players,
  initialStarredPlayerIds,
}: AuctionPlannerClientProps) {
  const [positionPlans, setPositionPlans] = useState<PositionPlan[]>(
    POSITIONS.map(pos => ({
      position: pos,
      minPlayers: 0,
      maxPlayers: 0,
      targets: [],
    }))
  )
  const [selectedPosition, setSelectedPosition] = useState<string>('GK')
  const [searchQuery, setSearchQuery] = useState('')
  const [starredPlayerIds, setStarredPlayerIds] = useState<Set<string>>(new Set(initialStarredPlayerIds))
  const [starringPlayerId, setStarringPlayerId] = useState<string | null>(null)
  const [showStarredOnly, setShowStarredOnly] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPlayingStyle, setSelectedPlayingStyle] = useState<string>('all')
  const PLAYERS_PER_PAGE = 10

  // Load saved plan on mount
  useEffect(() => {
    const loadPlan = async () => {
      try {
        const response = await fetch(`/api/team/auction-plan?seasonId=${seasonId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.plan) {
            // Convert saved plan to position plans format
            const loadedPlans = POSITIONS.map(pos => {
              const savedPos = data.plan.positions?.[pos]
              return {
                position: pos,
                minPlayers: savedPos?.minPlayers || 0,
                maxPlayers: savedPos?.maxPlayers || 0,
                targets: savedPos?.targets || [],
              }
            })
            setPositionPlans(loadedPlans)
            setLastSaved(new Date(data.lastUpdated))
          }
        }
      } catch (error) {
        console.error('Error loading plan:', error)
      }
    }
    loadPlan()
  }, [seasonId])

  // Auto-save function
  const savePlan = async () => {
    setIsSaving(true)
    try {
      // Convert position plans to save format
      const planToSave = {
        positions: positionPlans.reduce((acc, plan) => {
          acc[plan.position] = {
            minPlayers: plan.minPlayers,
            maxPlayers: plan.maxPlayers,
            targets: plan.targets,
          }
          return acc
        }, {} as Record<string, any>)
      }

      const response = await fetch('/api/team/auction-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, plan: planToSave }),
      })

      if (response.ok) {
        const data = await response.json()
        setLastSaved(new Date(data.lastUpdated))
      }
    } catch (error) {
      console.error('Error saving plan:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Get players for selected position
  const positionPlayers = useMemo(() => {
    return players.filter(p => p.position === selectedPosition)
  }, [players, selectedPosition])

  // Get unique playing styles for current position
  const availablePlayingStyles = useMemo(() => {
    const styles = new Set<string>()
    positionPlayers.forEach(p => {
      if (p.playingStyle) {
        styles.add(p.playingStyle)
      }
    })
    return Array.from(styles).sort()
  }, [positionPlayers])

  // Filter players by search
  const filteredPlayers = useMemo(() => {
    let result = positionPlayers
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.realWorldClub.toLowerCase().includes(query)
      )
    }
    
    // Filter by playing style
    if (selectedPlayingStyle !== 'all') {
      result = result.filter(p => p.playingStyle === selectedPlayingStyle)
    }
    
    // Filter by starred only
    if (showStarredOnly) {
      result = result.filter(p => starredPlayerIds.has(p.id))
    }
    
    // Sort: starred players first, then by rating
    return result.sort((a, b) => {
      const aStarred = starredPlayerIds.has(a.id)
      const bStarred = starredPlayerIds.has(b.id)
      if (aStarred && !bStarred) return -1
      if (!aStarred && bStarred) return 1
      return b.overallRating - a.overallRating
    })
  }, [positionPlayers, searchQuery, selectedPlayingStyle, showStarredOnly, starredPlayerIds])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedPosition, searchQuery, showStarredOnly, selectedPlayingStyle])

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE)
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE
    const endIndex = startIndex + PLAYERS_PER_PAGE
    return filteredPlayers.slice(startIndex, endIndex)
  }, [filteredPlayers, currentPage])

  // Get current position plan
  const currentPlan = positionPlans.find(p => p.position === selectedPosition)!

  // Calculate totals
  const calculations = useMemo(() => {
    let minTotal = 0
    let maxTotal = 0
    let minPlayers = 0
    let maxPlayers = 0

    positionPlans.forEach(plan => {
      const primaryTargets = plan.targets.filter(t => t.priority === 'primary')
      const backupTargets = plan.targets.filter(t => t.priority === 'backup')

      // Min scenario: get minimum players at minimum bids
      const minNeeded = Math.min(plan.minPlayers, primaryTargets.length)
      const minBids = primaryTargets
        .slice(0, minNeeded)
        .reduce((sum, t) => sum + t.minBid, 0)
      
      minTotal += minBids
      minPlayers += minNeeded

      // Max scenario: get maximum players at maximum bids
      const maxNeeded = Math.min(plan.maxPlayers, primaryTargets.length + backupTargets.length)
      const allTargets = [...primaryTargets, ...backupTargets]
      const maxBids = allTargets
        .slice(0, maxNeeded)
        .reduce((sum, t) => sum + t.maxBid, 0)
      
      maxTotal += maxBids
      maxPlayers += maxNeeded
    })

    return {
      minTotal,
      maxTotal,
      minPlayers,
      maxPlayers,
      minRemaining: currentBudget - minTotal,
      maxRemaining: currentBudget - maxTotal,
    }
  }, [positionPlans, currentBudget])

  const updatePositionPlan = (position: string, updates: Partial<PositionPlan>) => {
    setPositionPlans(prev =>
      prev.map(p => p.position === position ? { ...p, ...updates } : p)
    )
  }

  const addPlayerTarget = (player: Player, priority: 'primary' | 'backup') => {
    const newTarget: PlayerTarget = {
      id: `${player.id}-${Date.now()}`,
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      minBid: 10000,
      maxBid: 50000,
      priority,
    }

    updatePositionPlan(selectedPosition, {
      targets: [...currentPlan.targets, newTarget],
    })
  }

  const removePlayerTarget = (targetId: string) => {
    updatePositionPlan(selectedPosition, {
      targets: currentPlan.targets.filter(t => t.id !== targetId),
    })
  }

  const updatePlayerTarget = (targetId: string, updates: Partial<PlayerTarget>) => {
    updatePositionPlan(selectedPosition, {
      targets: currentPlan.targets.map(t =>
        t.id === targetId ? { ...t, ...updates } : t
      ),
    })
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    return `$${(amount / 1000).toFixed(0)}K`
  }

  const toggleStar = async (playerId: string) => {
    const isStarred = starredPlayerIds.has(playerId)
    setStarringPlayerId(playerId)

    try {
      if (isStarred) {
        // Unstar
        const response = await fetch(
          `/api/team/starred-players?playerId=${playerId}&seasonId=${seasonId}`,
          { method: 'DELETE' }
        )
        if (response.ok) {
          setStarredPlayerIds(prev => {
            const next = new Set(prev)
            next.delete(playerId)
            return next
          })
        }
      } else {
        // Star
        const response = await fetch('/api/team/starred-players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, seasonId }),
        })
        if (response.ok) {
          setStarredPlayerIds(prev => new Set(prev).add(playerId))
        }
      }
    } catch (error) {
      console.error('Error toggling star:', error)
    } finally {
      setStarringPlayerId(null)
    }
  }

  const primaryTargets = currentPlan.targets.filter(t => t.priority === 'primary')
  const backupTargets = currentPlan.targets.filter(t => t.priority === 'backup')

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-12">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-4 sm:mb-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-1 sm:mb-2">
                <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                  Auction Planner
                </span>
              </h1>
              <p className="text-[#D4CCBB] text-xs sm:text-sm lg:text-base">
                Plan your auction strategy for {seasonName}
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
              <button
                onClick={savePlan}
                disabled={isSaving}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  isSaving
                    ? 'bg-white/5 text-[#7A7367] cursor-not-allowed'
                    : 'bg-[#E8A800] text-black hover:bg-[#FFC93A]'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Plan'}
              </button>
              {lastSaved && (
                <span className="text-xs text-[#7A7367]">
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Budget Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4">
            <div className="text-xs text-[#7A7367] mb-1">Current Budget</div>
            <div className="text-xl sm:text-2xl font-black text-white">{formatCurrency(currentBudget)}</div>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4">
            <div className="text-xs text-[#7A7367] mb-1">Min Scenario</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">{formatCurrency(calculations.minRemaining)}</div>
            <div className="text-xs text-[#7A7367] mt-1">{calculations.minPlayers} players</div>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4">
            <div className="text-xs text-[#7A7367] mb-1">Max Scenario</div>
            <div className="text-xl sm:text-2xl font-black text-[#FFB347]">{formatCurrency(calculations.maxRemaining)}</div>
            <div className="text-xs text-[#7A7367] mt-1">{calculations.maxPlayers} players</div>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4">
            <div className="text-xs text-[#7A7367] mb-1">Total Targets</div>
            <div className="text-xl sm:text-2xl font-black text-purple-400">
              {positionPlans.reduce((sum, p) => sum + p.targets.length, 0)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Position Selection */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-black text-white mb-3 sm:mb-4">Positions</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-1 gap-2">
                {POSITIONS.map(pos => {
                  const plan = positionPlans.find(p => p.position === pos)!
                  const isSelected = selectedPosition === pos
                  const positionStarredCount = players.filter(p => p.position === pos && starredPlayerIds.has(p.id)).length
                  
                  return (
                    <button
                      key={pos}
                      onClick={() => setSelectedPosition(pos)}
                      className={`w-full text-left px-3 py-2 sm:py-3 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-[#E8A800] text-black'
                          : 'bg-white/5 hover:bg-white/10 text-white'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row items-start lg:items-center lg:justify-between">
                        <div className="w-full">
                          <div className="font-bold text-sm sm:text-base">{pos}</div>
                          <div className="text-xs opacity-70 truncate">
                            {plan.targets.length} targets
                            {positionStarredCount > 0 && ` • ${positionStarredCount} ★`}
                          </div>
                        </div>
                        {plan.targets.length > 0 && (
                          <div className="text-xs mt-1 lg:mt-0">
                            {plan.minPlayers}-{plan.maxPlayers}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Main Planning Area */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-1 lg:order-2">
            {/* Position Settings */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-6">
              <h2 className="text-xl font-black text-white mb-4">{selectedPosition} Planning</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-white mb-2">
                    Min Players
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentPlan.minPlayers}
                    onChange={(e) => updatePositionPlan(selectedPosition, {
                      minPlayers: parseInt(e.target.value) || 0
                    })}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white mb-2">
                    Max Players
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentPlan.maxPlayers}
                    onChange={(e) => updatePositionPlan(selectedPosition, {
                      maxPlayers: parseInt(e.target.value) || 0
                    })}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>

              {/* Primary Targets */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-3">Primary Targets</h3>
                {primaryTargets.length === 0 ? (
                  <div className="text-center py-8 text-[#7A7367] text-sm">
                    No primary targets added yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {primaryTargets.map(target => (
                      <div key={target.id} className="bg-black/30 border border-emerald-500/30 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="font-bold text-white">{target.playerName}</div>
                          <button
                            onClick={() => removePlayerTarget(target.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-[#7A7367] mb-1">Min Bid</label>
                            <input
                              type="number"
                              value={target.minBid}
                              onChange={(e) => updatePlayerTarget(target.id, {
                                minBid: parseInt(e.target.value) || 0
                              })}
                              className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#7A7367] mb-1">Max Bid</label>
                            <input
                              type="number"
                              value={target.maxBid}
                              onChange={(e) => updatePlayerTarget(target.id, {
                                maxBid: parseInt(e.target.value) || 0
                              })}
                              className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Backup Targets */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3">Backup Targets</h3>
                {backupTargets.length === 0 ? (
                  <div className="text-center py-8 text-[#7A7367] text-sm">
                    No backup targets added yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {backupTargets.map(target => (
                      <div key={target.id} className="bg-black/30 border border-[#FFB347]/30 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="font-bold text-white">{target.playerName}</div>
                          <button
                            onClick={() => removePlayerTarget(target.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-[#7A7367] mb-1">Min Bid</label>
                            <input
                              type="number"
                              value={target.minBid}
                              onChange={(e) => updatePlayerTarget(target.id, {
                                minBid: parseInt(e.target.value) || 0
                              })}
                              className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#7A7367] mb-1">Max Bid</label>
                            <input
                              type="number"
                              value={target.maxBid}
                              onChange={(e) => updatePlayerTarget(target.id, {
                                maxBid: parseInt(e.target.value) || 0
                              })}
                              className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Available Players */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-white">Available {selectedPosition} Players</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#7A7367]">{starredPlayerIds.size} starred</span>
                  <button
                    onClick={() => setShowStarredOnly(!showStarredOnly)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      showStarredOnly
                        ? 'bg-[#E8A800] text-black'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {showStarredOnly ? '★ Starred Only' : 'Show All'}
                  </button>
                </div>
              </div>
              
              {/* Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {/* Search */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search players..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
                
                {/* Playing Style Filter */}
                <select
                  value={selectedPlayingStyle}
                  onChange={(e) => setSelectedPlayingStyle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white"
                >
                  <option value="all">All Playing Styles</option>
                  {availablePlayingStyles.map(style => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Filters Indicator */}
              {(searchQuery || selectedPlayingStyle !== 'all' || showStarredOnly) && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-xs text-[#7A7367]">Active filters:</span>
                  {searchQuery && (
                    <span className="px-2 py-1 rounded bg-white/10 text-white text-xs flex items-center gap-1">
                      Search: "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery('')}
                        className="hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedPlayingStyle !== 'all' && (
                    <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs flex items-center gap-1 border border-purple-500/30">
                      {selectedPlayingStyle}
                      <button
                        onClick={() => setSelectedPlayingStyle('all')}
                        className="hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {showStarredOnly && (
                    <span className="px-2 py-1 rounded bg-[#E8A800]/20 text-[#E8A800] text-xs flex items-center gap-1 border border-[#E8A800]/30">
                      ★ Starred Only
                      <button
                        onClick={() => setShowStarredOnly(false)}
                        className="hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedPlayingStyle('all')
                      setShowStarredOnly(false)
                    }}
                    className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 border border-red-500/30"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* Player count and pagination info */}
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-[#7A7367]">
                  {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} found
                </span>
                {totalPages > 1 && (
                  <span className="text-[#7A7367]">
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 mb-4">
                {filteredPlayers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-4">
                      {showStarredOnly ? (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-[#7A7367] text-sm">
                      {showStarredOnly 
                        ? `No starred ${selectedPosition} players`
                        : searchQuery 
                          ? 'No players found'
                          : `No ${selectedPosition} players available`
                      }
                    </p>
                  </div>
                ) : (
                  paginatedPlayers.map(player => {
                  const isAdded = currentPlan.targets.some(t => t.playerId === player.id)
                  const isStarred = starredPlayerIds.has(player.id)
                  const isStarring = starringPlayerId === player.id
                  
                  return (
                    <div
                      key={player.id}
                      className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                          <Image
                            src={player.photoUrl}
                            alt={player.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white text-sm truncate">{player.name}</div>
                          <div className="text-xs text-[#7A7367]">
                            {player.realWorldClub} • OVR {player.overallRating}
                          </div>
                          {player.playingStyle && (
                            <div className="mt-1">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30">
                                {player.playingStyle}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Star Button */}
                        <button
                          onClick={() => toggleStar(player.id)}
                          disabled={isStarring}
                          className={`p-2 rounded-lg transition-all ${
                            isStarred
                              ? 'bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800]'
                              : 'bg-white/5 border border-white/10 text-[#7A7367] hover:text-[#E8A800] hover:border-[#E8A800]/30'
                          } ${isStarring ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={isStarred ? 'Unstar player' : 'Star player'}
                        >
                          <svg className="w-4 h-4" fill={isStarred ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        
                        {/* Add to Plan Buttons */}
                        {!isAdded && (
                          <>
                            <button
                              onClick={() => addPlayerTarget(player, 'primary')}
                              className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded text-xs font-bold hover:bg-emerald-500/30 whitespace-nowrap"
                            >
                              Primary
                            </button>
                            <button
                              onClick={() => addPlayerTarget(player, 'backup')}
                              className="px-3 py-1 bg-[#FFB347]/20 border border-[#FFB347]/30 text-[#FFB347] rounded text-xs font-bold hover:bg-[#FFB347]/30 whitespace-nowrap"
                            >
                              Backup
                            </button>
                          </>
                        )}
                        {isAdded && (
                          <span className="text-xs text-[#E8A800] font-bold whitespace-nowrap">Added</span>
                        )}
                      </div>
                    </div>
                  )
                })
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      currentPage === 1
                        ? 'bg-white/5 text-[#7A7367] cursor-not-allowed'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      // Show first page, last page, current page, and pages around current
                      const showPage = 
                        page === 1 || 
                        page === totalPages || 
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      
                      const showEllipsis = 
                        (page === 2 && currentPage > 3) ||
                        (page === totalPages - 1 && currentPage < totalPages - 2)
                      
                      if (showEllipsis) {
                        return (
                          <span key={page} className="text-[#7A7367] px-2">
                            ...
                          </span>
                        )
                      }
                      
                      if (!showPage) return null
                      
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                            currentPage === page
                              ? 'bg-[#E8A800] text-black'
                              : 'bg-white/5 text-white hover:bg-white/10'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      currentPage === totalPages
                        ? 'bg-white/5 text-[#7A7367] cursor-not-allowed'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
