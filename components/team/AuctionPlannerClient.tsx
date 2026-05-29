"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { normalizeForSearch } from "@/lib/search-utils"
import SearchableSelect from "@/components/ui/SearchableSelect"

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

const POSITION_GROUPS = {
  'Goalkeeper': ['GK'],
  'Defenders': ['CB', 'LB', 'RB'],
  'Midfielders': ['DMF', 'CMF', 'LMF', 'RMF', 'AMF'],
  'Forwards': ['SS', 'LWF', 'RWF', 'CF']
}

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
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [groupMode, setGroupMode] = useState<'positions' | 'groups'>('positions')
  const [minRating, setMinRating] = useState(60)
  const [maxRating, setMaxRating] = useState(99)
  const PLAYERS_PER_PAGE = 12

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

  // Get players for selected position or group
  const positionPlayers = useMemo(() => {
    if (groupMode === 'groups') {
      // Find which group contains the selected position
      const groupPositions = POSITION_GROUPS[selectedPosition as keyof typeof POSITION_GROUPS] || [selectedPosition]
      return players.filter(p => groupPositions.includes(p.position))
    }
    return players.filter(p => p.position === selectedPosition)
  }, [players, selectedPosition, groupMode])

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
      const query = normalizeForSearch(searchQuery)
      result = result.filter(p => 
        normalizeForSearch(p.name).includes(query) ||
        normalizeForSearch(p.realWorldClub).includes(query)
      )
    }
    
    // Filter by playing style
    if (selectedPlayingStyle !== 'all') {
      result = result.filter(p => p.playingStyle === selectedPlayingStyle)
    }
    
    // Filter by rating range
    result = result.filter(p => p.overallRating >= minRating && p.overallRating <= maxRating)
    
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
  }, [positionPlayers, searchQuery, selectedPlayingStyle, showStarredOnly, starredPlayerIds, minRating, maxRating])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedPosition, searchQuery, showStarredOnly, selectedPlayingStyle, minRating, maxRating])

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
      minBid: 0,
      maxBid: 0,
      priority,
    }

    // Always add to the player's actual position, not the group
    updatePositionPlan(player.position, {
      targets: [...(positionPlans.find(p => p.position === player.position)?.targets || []), newTarget],
    })
    
    // Close the dropdown after adding
    setOpenDropdownId(null)
  }

  const removePlayerTarget = (targetId: string) => {
    if (groupMode === 'groups') {
      // Find which position this target belongs to
      const groupPositions = POSITION_GROUPS[selectedPosition as keyof typeof POSITION_GROUPS] || []
      for (const pos of groupPositions) {
        const plan = positionPlans.find(p => p.position === pos)
        if (plan?.targets.some(t => t.id === targetId)) {
          updatePositionPlan(pos, {
            targets: plan.targets.filter(t => t.id !== targetId),
          })
          break
        }
      }
    } else {
      updatePositionPlan(selectedPosition, {
        targets: currentPlan.targets.filter(t => t.id !== targetId),
      })
    }
  }

  const updatePlayerTarget = (targetId: string, updates: Partial<PlayerTarget>) => {
    if (groupMode === 'groups') {
      // Find which position this target belongs to
      const groupPositions = POSITION_GROUPS[selectedPosition as keyof typeof POSITION_GROUPS] || []
      for (const pos of groupPositions) {
        const plan = positionPlans.find(p => p.position === pos)
        if (plan?.targets.some(t => t.id === targetId)) {
          updatePositionPlan(pos, {
            targets: plan.targets.map(t =>
              t.id === targetId ? { ...t, ...updates } : t
            ),
          })
          break
        }
      }
    } else {
      updatePositionPlan(selectedPosition, {
        targets: currentPlan.targets.map(t =>
          t.id === targetId ? { ...t, ...updates } : t
        ),
      })
    }
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

  const primaryTargets = groupMode === 'groups'
    ? positionPlans
        .filter(p => POSITION_GROUPS[selectedPosition as keyof typeof POSITION_GROUPS]?.includes(p.position))
        .flatMap(p => p.targets.filter(t => t.priority === 'primary'))
    : currentPlan.targets.filter(t => t.priority === 'primary')
  
  const backupTargets = groupMode === 'groups'
    ? positionPlans
        .filter(p => POSITION_GROUPS[selectedPosition as keyof typeof POSITION_GROUPS]?.includes(p.position))
        .flatMap(p => p.targets.filter(t => t.priority === 'backup'))
    : currentPlan.targets.filter(t => t.priority === 'backup')

  return (
    <div className="min-h-screen bg-[#070708] text-white relative overflow-hidden pb-12">
      {/* Background spotlights */}
      <div className="absolute top-24 left-1/4 w-[500px] h-[500px] bg-[#E8A800]/5 rounded-full blur-[150px] pointer-events-none animate-[pulse_8s_infinite]" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none animate-[pulse_10s_infinite]" />

      {/* Sticky Header */}
      <div className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/70 backdrop-blur-2xl shadow-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-4">
            {/* Title & Budget Summary */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(232,168,0,0.15)]">
                  Auction Planner
                </span>
              </h1>
              <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-xs font-mono text-gray-400">
                <span className="text-gray-300 font-bold uppercase tracking-wider">{seasonName}</span>
                <span className="text-gray-600">|</span>
                <span className="text-emerald-400 font-black uppercase tracking-widest">{formatCurrency(currentBudget)} Purse</span>
                <span className="hidden sm:inline text-gray-600">|</span>
                <span className="hidden sm:inline text-purple-400 font-extrabold uppercase tracking-wider">
                  {positionPlans.reduce((sum, p) => sum + p.targets.length, 0)} Targets Loaded
                </span>
              </div>
            </div>
            
            {/* Save Button */}
            <div className="flex items-center gap-3">
              {lastSaved && (
                <span className="hidden md:block text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">
                  Saved: {new Date(lastSaved).toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={savePlan}
                disabled={isSaving}
                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer border ${
                  isSaving
                    ? 'bg-white/5 border-white/5 text-gray-500 cursor-not-allowed opacity-50'
                    : 'bg-[#E8A800] text-black border-[#E8A800] hover:brightness-110 shadow-[0_0_20px_rgba(232,168,0,0.25)] hover:scale-[1.02] active:scale-95'
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>Save Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Position Tabs */}
      <div className="lg:hidden sticky top-[73px] sm:top-[81px] z-40 bg-[#0a0a0a]/90 backdrop-blur-2xl border-b border-white/5 transition-all duration-300 shadow-lg">
        {/* Group/Position Toggle */}
        <div className="flex items-center justify-center gap-1.5 p-2 bg-black/40">
          <button
            onClick={() => setGroupMode('positions')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              groupMode === 'positions'
                ? 'bg-[#E8A800] text-black shadow-md shadow-[#E8A800]/15'
                : 'bg-white/[0.01] border border-transparent text-gray-500 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Role Splits
          </button>
          <button
            onClick={() => {
              setGroupMode('groups')
              setSelectedPosition('Goalkeeper')
            }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              groupMode === 'groups'
                ? 'bg-[#E8A800] text-black shadow-md shadow-[#E8A800]/15'
                : 'bg-white/[0.01] border border-transparent text-gray-500 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Group Sectors
          </button>
        </div>
        
        {/* Tabs Scroll */}
        <div className="flex gap-1.5 p-2 overflow-x-auto scrollbar-none">
          {(groupMode === 'positions' ? POSITIONS : Object.keys(POSITION_GROUPS)).map(item => {
            const isSelected = selectedPosition === item
            let targetCount = 0
            
            if (groupMode === 'positions') {
              const plan = positionPlans.find(p => p.position === item)
              targetCount = plan?.targets.length || 0
            } else {
              const groupPositions = POSITION_GROUPS[item as keyof typeof POSITION_GROUPS]
              targetCount = positionPlans
                .filter(p => groupPositions.includes(p.position))
                .reduce((sum, p) => sum + p.targets.length, 0)
            }
            
            return (
              <button
                key={item}
                onClick={() => setSelectedPosition(item)}
                className={`relative px-3.5 py-2 rounded-xl font-mono text-[10px] font-extrabold transition-all uppercase tracking-wider whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#E8A800] text-black shadow-lg shadow-[#E8A800]/10'
                    : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                {item}
                {targetCount > 0 && (
                  <span className={`absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full text-[9px] flex items-center justify-center font-black ${
                    isSelected ? 'bg-black text-[#E8A800]' : 'bg-[#E8A800] text-black shadow-[0_0_8px_rgba(232,168,0,0.35)]'
                  }`}>
                    {targetCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6 relative z-10">
        {/* Enhanced Budget Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-[#0c0c0e]/80 border border-white/5 p-5 hover:border-white/10 transition-all shadow-xl backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A800]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#E8A800]/10 transition-all duration-500" />
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">Available Fund</div>
              <svg className="w-4 h-4 text-[#E8A800] filter drop-shadow-[0_0_8px_rgba(232,168,0,0.3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white leading-tight font-mono">{formatCurrency(currentBudget)}</div>
            <div className="mt-3.5 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] shadow-[0_0_8px_rgba(232,168,0,0.5)] rounded-full"
                style={{ width: `${(currentBudget / startingPurse) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="rounded-2xl bg-emerald-950/[0.15] border border-emerald-500/10 p-5 hover:border-emerald-500/20 transition-all shadow-xl backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-500" />
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] text-emerald-500/70 font-extrabold uppercase tracking-widest font-mono">Min Scenario Left</div>
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 leading-tight font-mono">{formatCurrency(calculations.minRemaining)}</div>
            <div className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-wider font-mono mt-2">{calculations.minPlayers} players factored</div>
          </div>
          
          <div className="rounded-2xl bg-amber-950/[0.1] border border-[#FFB347]/10 p-5 hover:border-[#FFB347]/20 transition-all shadow-xl backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFB347]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#FFB347]/10 transition-all duration-500" />
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] text-[#FFB347]/70 font-extrabold uppercase tracking-widest font-mono">Max Scenario Left</div>
              <svg className="w-4 h-4 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#FFB347] leading-tight font-mono">{formatCurrency(calculations.maxRemaining)}</div>
            <div className="text-[10px] text-[#FFB347]/60 font-bold uppercase tracking-wider font-mono mt-2">{calculations.maxPlayers} players factored</div>
          </div>
          
          <div className="rounded-2xl bg-purple-950/[0.1] border border-purple-500/10 p-5 hover:border-purple-500/20 transition-all shadow-xl backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-all duration-500" />
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] text-purple-400/70 font-extrabold uppercase tracking-widest font-mono">Active Target List</div>
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-400 leading-tight font-mono">
              {positionPlans.reduce((sum, p) => sum + p.targets.length, 0)}
            </div>
            <div className="text-[10px] text-purple-500/60 font-bold uppercase tracking-wider font-mono mt-2">
              {positionPlans.filter(p => p.targets.length > 0).length} splits mapped
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Enhanced Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-[110px] space-y-6">
              {/* Position Selector */}
              <div className="rounded-3xl bg-[#0c0c0e]/80 border border-white/5 p-5 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xs font-black uppercase tracking-wider text-gray-300 font-mono flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {groupMode === 'positions' ? 'Tactical Roles' : 'Group Sectors'}
                  </h2>
                  <button
                    onClick={() => {
                      const newMode = groupMode === 'positions' ? 'groups' : 'positions'
                      setGroupMode(newMode)
                      if (newMode === 'groups') {
                        setSelectedPosition('Goalkeeper')
                      } else {
                        setSelectedPosition('GK')
                      }
                    }}
                    className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] text-gray-400 hover:text-white transition-all cursor-pointer shadow-md"
                    title={groupMode === 'positions' ? 'Switch to Group Sectors' : 'Switch to Role Splits'}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-1.5 max-h-[calc(100vh-380px)] overflow-y-auto pr-1 scrollbar-none">
                  {(groupMode === 'positions' ? POSITIONS : Object.keys(POSITION_GROUPS)).map(item => {
                    const isSelected = selectedPosition === item
                    let targetCount = 0
                    let starredCount = 0
                    let minMax = ''
                    
                    if (groupMode === 'positions') {
                      const plan = positionPlans.find(p => p.position === item)!
                      targetCount = plan.targets.length
                      starredCount = players.filter(p => p.position === item && starredPlayerIds.has(p.id)).length
                      if (plan.targets.length > 0) {
                        minMax = `${plan.minPlayers}-${plan.maxPlayers}`
                      }
                    } else {
                      const groupPositions = POSITION_GROUPS[item as keyof typeof POSITION_GROUPS]
                      targetCount = positionPlans
                        .filter(p => groupPositions.includes(p.position))
                        .reduce((sum, p) => sum + p.targets.length, 0)
                      starredCount = players.filter(p => groupPositions.includes(p.position) && starredPlayerIds.has(p.id)).length
                      const groupPlans = positionPlans.filter(p => groupPositions.includes(p.position))
                      const totalMin = groupPlans.reduce((sum, p) => sum + p.minPlayers, 0)
                      const totalMax = groupPlans.reduce((sum, p) => sum + p.maxPlayers, 0)
                      if (totalMin > 0 || totalMax > 0) {
                        minMax = `${totalMin}-${totalMax}`
                      }
                    }
                    
                    return (
                      <button
                        key={item}
                        onClick={() => setSelectedPosition(item)}
                        className={`group w-full text-left px-3.5 py-3 rounded-xl transition-all duration-300 relative overflow-hidden cursor-pointer border ${
                          isSelected
                            ? 'bg-[#E8A800] text-black border-[#E8A800] shadow-lg shadow-[#E8A800]/15'
                            : 'bg-black/30 hover:bg-white/[0.02] text-white border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-black text-sm uppercase tracking-wide truncate">{item}</div>
                            <div className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider font-mono ${isSelected ? 'text-black/70' : 'text-gray-500'}`}>
                              {targetCount > 0 ? (
                                <span>{targetCount} target{targetCount > 1 ? 's' : ''}</span>
                              ) : (
                                <span>No targets</span>
                              )}
                              {starredCount > 0 && (
                                <span className="ml-2 font-sans text-xs">★ {starredCount}</span>
                              )}
                            </div>
                          </div>
                          {minMax && (
                            <div className={`text-[9px] font-black font-mono px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${
                              isSelected ? 'bg-black/15 border-black/25 text-black' : 'bg-[#E8A800]/10 border-[#E8A800]/20 text-[#E8A800]'
                            }`}>
                              {minMax}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="rounded-3xl bg-[#0c0c0e]/80 border border-white/5 p-5 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
                <h3 className="text-xs font-black text-purple-400 mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Sector Intel
                </h3>
                <div className="space-y-3.5 text-xs font-mono">
                  <div className="flex justify-between border-b border-white/[0.02] pb-2">
                    <span className="text-gray-500 font-extrabold uppercase tracking-wider">MAPPED ROLES</span>
                    <span className="text-white font-black">
                      {positionPlans.filter(p => p.targets.length > 0).length} / {POSITIONS.length}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.02] pb-2">
                    <span className="text-emerald-500/70 font-extrabold uppercase tracking-wider">PRIMARY TARGETS</span>
                    <span className="text-emerald-400 font-black">
                      {positionPlans.reduce((sum, p) => sum + p.targets.filter(t => t.priority === 'primary').length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.02] pb-2">
                    <span className="text-[#FFB347]/70 font-extrabold uppercase tracking-wider">BACKUP SCHEMES</span>
                    <span className="text-[#FFB347] font-black">
                      {positionPlans.reduce((sum, p) => sum + p.targets.filter(t => t.priority === 'backup').length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#E8A800]/70 font-extrabold uppercase tracking-wider">STAR BOOKMARKS</span>
                    <span className="text-[#E8A800] font-black">{starredPlayerIds.size}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Position Settings */}
            <div className="rounded-3xl bg-[#0c0c0e]/80 border border-white/5 p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8A800]/5 rounded-full blur-2xl pointer-events-none animate-pulse" />
              
              <h2 className="text-base font-black text-white uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8A800]" />
                {groupMode === 'groups' ? selectedPosition : `${selectedPosition}`} Sector Allotment
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest font-mono mb-2">
                    Min Required {groupMode === 'groups' && <span className="text-[8px] text-gray-500">(Total)</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={
                      groupMode === 'groups'
                        ? positionPlans
                            .filter(p => POSITION_GROUPS[selectedPosition as keyof typeof POSITION_GROUPS]?.includes(p.position))
                            .reduce((sum, p) => sum + p.minPlayers, 0)
                        : currentPlan.minPlayers
                    }
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0
                      if (groupMode === 'groups') {
                        const groupPositions = POSITION_GROUPS[selectedPosition as keyof typeof POSITION_GROUPS] || []
                        const perPosition = Math.floor(value / groupPositions.length)
                        const remainder = value % groupPositions.length
                        groupPositions.forEach((pos, idx) => {
                          updatePositionPlan(pos, {
                            minPlayers: perPosition + (idx < remainder ? 1 : 0)
                          })
                        })
                      } else {
                        updatePositionPlan(selectedPosition, { minPlayers: value })
                      }
                    }}
                    className="w-full bg-black/40 border border-white/5 focus:border-[#E8A800]/30 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest font-mono mb-2">
                    Max Ceiling {groupMode === 'groups' && <span className="text-[8px] text-gray-500">(Total)</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={
                      groupMode === 'groups'
                        ? positionPlans
                            .filter(p => POSITION_GROUPS[selectedPosition as keyof typeof POSITION_GROUPS]?.includes(p.position))
                            .reduce((sum, p) => sum + p.maxPlayers, 0)
                        : currentPlan.maxPlayers
                    }
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0
                      if (groupMode === 'groups') {
                        const groupPositions = POSITION_GROUPS[selectedPosition as keyof typeof POSITION_GROUPS] || []
                        const perPosition = Math.floor(value / groupPositions.length)
                        const remainder = value % groupPositions.length
                        groupPositions.forEach((pos, idx) => {
                          updatePositionPlan(pos, {
                            maxPlayers: perPosition + (idx < remainder ? 1 : 0)
                          })
                        })
                      } else {
                        updatePositionPlan(selectedPosition, { maxPlayers: value })
                      }
                    }}
                    className="w-full bg-black/40 border border-white/5 focus:border-[#E8A800]/30 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Primary Targets */}
              <div className="mb-6 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider font-mono">Primary Lock Targets</h3>
                </div>
                {primaryTargets.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-white/5 rounded-2xl bg-black/10 text-gray-500 text-xs font-bold font-mono tracking-wider">
                    NO PRIMARY TARGETS REGISTERED
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {primaryTargets.map(target => (
                      <div key={target.id} className="bg-black/40 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-4.5 transition-all duration-300 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/[0.02] rounded-full blur-lg pointer-events-none" />
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="font-bold text-sm text-white">{target.playerName}</div>
                            {groupMode === 'groups' && (
                              <div className="text-[9px] text-emerald-400 font-extrabold uppercase font-mono tracking-widest mt-1">{target.position}</div>
                            )}
                          </div>
                          <button
                            onClick={() => removePlayerTarget(target.id)}
                            className="text-red-400 hover:text-red-300 p-1 bg-white/[0.02] border border-white/5 hover:border-red-500/20 rounded-lg transition-all cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[8px] font-extrabold text-gray-500 uppercase tracking-widest font-mono mb-1.5">MIN LIMIT BID</label>
                            <input
                              type="number"
                              value={target.minBid}
                              onChange={(e) => updatePlayerTarget(target.id, {
                                minBid: parseInt(e.target.value) || 0
                              })}
                              className="w-full bg-black/50 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-extrabold text-gray-500 uppercase tracking-widest font-mono mb-1.5">MAX CEILING BID</label>
                            <input
                              type="number"
                              value={target.maxBid}
                              onChange={(e) => updatePlayerTarget(target.id, {
                                maxBid: parseInt(e.target.value) || 0
                              })}
                              className="w-full bg-black/50 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Backup Targets */}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB347] shadow-[0_0_8px_rgba(255,179,71,0.6)] animate-pulse" />
                  <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider font-mono">Backup Contingency Targets</h3>
                </div>
                {backupTargets.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-white/5 rounded-2xl bg-black/10 text-gray-500 text-xs font-bold font-mono tracking-wider">
                    NO BACKUP TARGETS REGISTERED
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {backupTargets.map(target => (
                      <div key={target.id} className="bg-black/40 border border-[#FFB347]/20 hover:border-[#FFB347]/40 rounded-2xl p-4.5 transition-all duration-300 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-[#FFB347]/[0.02] rounded-full blur-lg pointer-events-none" />
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="font-bold text-sm text-white">{target.playerName}</div>
                            {groupMode === 'groups' && (
                              <div className="text-[9px] text-[#FFB347] font-extrabold uppercase font-mono tracking-widest mt-1">{target.position}</div>
                            )}
                          </div>
                          <button
                            onClick={() => removePlayerTarget(target.id)}
                            className="text-red-400 hover:text-red-300 p-1 bg-white/[0.02] border border-white/5 hover:border-red-500/20 rounded-lg transition-all cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[8px] font-extrabold text-gray-500 uppercase tracking-widest font-mono mb-1.5">MIN LIMIT BID</label>
                            <input
                              type="number"
                              value={target.minBid}
                              onChange={(e) => updatePlayerTarget(target.id, {
                                minBid: parseInt(e.target.value) || 0
                              })}
                              className="w-full bg-black/50 border border-white/5 focus:border-[#FFB347]/30 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-extrabold text-gray-500 uppercase tracking-widest font-mono mb-1.5">MAX CEILING BID</label>
                            <input
                              type="number"
                              value={target.maxBid}
                              onChange={(e) => updatePlayerTarget(target.id, {
                                maxBid: parseInt(e.target.value) || 0
                              })}
                              className="w-full bg-black/50 border border-white/5 focus:border-[#FFB347]/30 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
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
            <div className="rounded-3xl bg-[#0c0c0e]/80 border border-white/5 p-5 sm:p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/[0.04]">
                <h2 className="text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] animate-pulse" />
                  Available {groupMode === 'groups' ? selectedPosition : `${selectedPosition}`} Pool
                </h2>
                <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                  {/* View Toggle */}
                  <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/5">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'list'
                          ? 'bg-[#E8A800] text-black shadow-md shadow-[#E8A800]/10'
                          : 'text-gray-500 hover:text-white'
                      }`}
                      title="Sector list grid"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'grid'
                          ? 'bg-[#E8A800] text-black shadow-md shadow-[#E8A800]/10'
                          : 'text-gray-500 hover:text-white'
                      }`}
                      title="Decks grid view"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => setShowStarredOnly(!showStarredOnly)}
                    className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                      showStarredOnly
                        ? 'bg-[#E8A800] text-black border-[#E8A800] shadow-md shadow-[#E8A800]/15'
                        : 'bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    {showStarredOnly ? '★ Mapped Stars' : 'Show Roster'}
                  </button>
                </div>
              </div>
              
              {/* Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search available players..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-black/40 border border-white/5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
                  />
                </div>
                
                {/* Playing Style Filter */}
                <div className="font-mono text-xs">
                  <SearchableSelect
                    value={selectedPlayingStyle}
                    options={[
                      { value: 'all', label: 'All Playing Styles' },
                      ...availablePlayingStyles.map(style => ({ value: style, label: style }))
                    ]}
                    onChange={setSelectedPlayingStyle}
                    enableSearch={true}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Active Filters Indicator */}
              {(searchQuery || selectedPlayingStyle !== 'all' || showStarredOnly) && (
                <div className="flex items-center gap-2 mb-5 flex-wrap">
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">Filters active:</span>
                  {searchQuery && (
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-white text-[10px] font-mono flex items-center gap-1.5">
                      Search: "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery('')}
                        className="hover:text-red-400 text-xs shrink-0 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedPlayingStyle !== 'all' && (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-[10px] font-mono flex items-center gap-1.5 border border-purple-500/20">
                      {selectedPlayingStyle}
                      <button
                        onClick={() => setSelectedPlayingStyle('all')}
                        className="hover:text-red-400 text-xs shrink-0 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {showStarredOnly && (
                    <span className="px-2.5 py-1 rounded-lg bg-[#E8A800]/10 text-[#E8A800] text-[10px] font-mono flex items-center gap-1.5 border border-[#E8A800]/20">
                      ★ Starred
                      <button
                        onClick={() => setShowStarredOnly(false)}
                        className="hover:text-red-400 text-xs shrink-0 cursor-pointer"
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
                    className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] hover:bg-red-500/20 border border-red-500/20 font-mono uppercase tracking-wider cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* Player count info */}
              <div className="flex items-center justify-between mb-4 text-xs font-mono">
                <span className="text-gray-500 font-extrabold uppercase tracking-wider">
                  {filteredPlayers.length} candidate{filteredPlayers.length !== 1 ? 's' : ''} mapped
                </span>
                {totalPages > 1 && (
                  <span className="text-gray-500 font-extrabold uppercase tracking-wider">
                    Page {currentPage} / {totalPages}
                  </span>
                )}
              </div>

              <div className={`gap-4 mb-6 ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3' : 'flex flex-col'}`}>
                {filteredPlayers.length === 0 ? (
                  <div className="col-span-full text-center py-12 border border-dashed border-white/5 rounded-2xl bg-black/20">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center justify-center text-gray-600 mx-auto mb-3">
                      {showStarredOnly ? (
                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider font-mono">
                      {showStarredOnly 
                        ? `No starred ${selectedPosition} targets`
                        : searchQuery 
                          ? 'No matches located'
                          : `No ${selectedPosition} candidates found`
                      }
                    </p>
                  </div>
                ) : (
                  paginatedPlayers.map(player => {
                  const isAdded = groupMode === 'groups'
                    ? positionPlans
                        .filter(p => POSITION_GROUPS[selectedPosition as keyof typeof POSITION_GROUPS]?.includes(p.position))
                        .some(p => p.targets.some(t => t.playerId === player.id))
                    : currentPlan.targets.some(t => t.playerId === player.id)
                  const isStarred = starredPlayerIds.has(player.id)
                  const isStarring = starringPlayerId === player.id
                  
                  if (viewMode === 'grid') {
                    // Grid View Card
                    return (
                      <div
                        key={player.id}
                        className="group relative bg-[#0e0e11]/60 border border-white/5 rounded-2xl p-4.5 hover:border-[#E8A800]/40 transition-all duration-300 flex flex-col justify-between shadow-lg overflow-hidden"
                      >
                        {/* Spot blur */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.02] rounded-full blur-xl pointer-events-none" />

                        {/* Star Button - Top Right */}
                        <button
                          onClick={() => toggleStar(player.id)}
                          disabled={isStarring}
                          className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all z-10 cursor-pointer ${
                            isStarred
                              ? 'bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.2)]'
                              : 'bg-black/40 border border-white/5 text-gray-500 hover:text-[#E8A800] hover:border-[#E8A800]/20'
                          } ${isStarring ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={isStarred ? 'Remove Star Bookmark' : 'Star Bookmark'}
                        >
                          <svg className="w-3.5 h-3.5" fill={isStarred ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>

                        {/* Player Image */}
                        <div className="relative w-16 h-16 mx-auto mb-3.5 rounded-xl overflow-hidden bg-black border border-white/5 flex-shrink-0">
                          <Image
                            src={player.photoUrl}
                            alt={player.name}
                            fill
                            unoptimized={true}
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* Rating Badge */}
                          <div className="absolute bottom-0 right-0 bg-[#0e0e11]/90 backdrop-blur-sm px-1.5 py-0.5 rounded-tl-lg border-t border-l border-white/5">
                            <span className="text-[#E8A800] font-black text-[10px] font-mono leading-none">{player.overallRating}</span>
                          </div>
                        </div>

                        {/* Player Info */}
                        <div className="text-center mb-4 min-w-0">
                          <h3 className="font-bold text-white text-xs truncate leading-tight mb-1">{player.name}</h3>
                          <p className="text-[10px] text-gray-500 truncate leading-none mb-2 font-mono">{player.realWorldClub}</p>
                          {player.playingStyle && (
                            <span className="inline-block px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[8px] font-extrabold uppercase font-mono border border-purple-500/20 truncate max-w-full">
                              {player.playingStyle}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {!isAdded ? (
                            <>
                              <button
                                onClick={() => addPlayerTarget(player, 'primary')}
                                className="flex-1 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-emerald-500/25 transition-all cursor-pointer"
                              >
                                Primary
                              </button>
                              <button
                                onClick={() => addPlayerTarget(player, 'backup')}
                                className="flex-1 py-1.5 bg-[#FFB347]/10 border border-[#FFB347]/20 text-[#FFB347] rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-[#FFB347]/25 transition-all cursor-pointer"
                              >
                                Backup
                              </button>
                            </>
                          ) : (
                            <div className="flex-1 py-1.5 bg-[#E8A800]/10 border border-[#E8A800]/25 text-[#E8A800] rounded-lg text-[9px] font-black uppercase tracking-wider text-center font-mono">
                              ✓ Drafted
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  } else {
                    // List View Card
                    return (
                      <div
                        key={player.id}
                        className="group bg-[#0e0e11]/60 border border-white/5 rounded-2xl p-3 hover:border-[#E8A800]/30 transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/[0.01] rounded-full blur-xl pointer-events-none" />
                        <div className="flex items-center gap-4">
                          {/* Player Image */}
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black border border-white/5 flex-shrink-0">
                            <Image
                              src={player.photoUrl}
                              alt={player.name}
                              fill
                              unoptimized={true}
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Rating Badge */}
                            <div className="absolute bottom-0 right-0 bg-[#0e0e11]/90 backdrop-blur-sm px-1.5 py-0.5 rounded-tl-lg border-t border-l border-white/5">
                              <span className="text-[#E8A800] font-black text-[10px] font-mono leading-none">{player.overallRating}</span>
                            </div>
                          </div>

                          {/* Player Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-xs truncate leading-tight mb-1">{player.name}</h3>
                            <p className="text-[10px] text-gray-500 mb-2 font-mono leading-none">{player.realWorldClub}</p>
                            {player.playingStyle && (
                              <span className="inline-block px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[8px] font-extrabold uppercase font-mono border border-purple-500/20">
                                {player.playingStyle}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Star Button */}
                            <button
                              onClick={() => toggleStar(player.id)}
                              disabled={isStarring}
                              className={`p-2 rounded-xl transition-all cursor-pointer ${
                                isStarred
                                  ? 'bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.2)]'
                                  : 'bg-white/[0.02] border border-white/5 text-gray-500 hover:text-[#E8A800] hover:border-[#E8A800]/25'
                              } ${isStarring ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={isStarred ? 'Remove Star Bookmark' : 'Star Bookmark'}
                            >
                              <svg className="w-3.5 h-3.5" fill={isStarred ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            
                            {/* Add Buttons */}
                            {!isAdded ? (
                              <>
                                <button
                                  onClick={() => addPlayerTarget(player, 'primary')}
                                  className="hidden sm:block px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-all whitespace-nowrap cursor-pointer"
                                >
                                  Primary
                                </button>
                                <button
                                  onClick={() => addPlayerTarget(player, 'backup')}
                                  className="hidden sm:block px-3 py-2 bg-[#FFB347]/10 border border-[#FFB347]/20 text-[#FFB347] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#FFB347]/20 transition-all whitespace-nowrap cursor-pointer"
                                >
                                  Backup
                                </button>
                                
                                {/* Mobile: Dropdown Menu */}
                                <div className="sm:hidden relative">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenDropdownId(openDropdownId === player.id ? null : player.id)
                                    }}
                                    className="p-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </button>
                                  {openDropdownId === player.id && (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={() => setOpenDropdownId(null)}
                                      />
                                      <div className="absolute right-0 mt-1 bg-black border border-white/10 rounded-lg shadow-xl z-20 min-w-[120px]">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            addPlayerTarget(player, 'primary')
                                          }}
                                          className="w-full px-3 py-2 text-left text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold"
                                        >
                                          Add Primary
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            addPlayerTarget(player, 'backup')
                                          }}
                                          className="w-full px-3 py-2 text-left text-[#FFB347] hover:bg-[#FFB347]/10 text-xs font-bold"
                                        >
                                          Add Backup
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span className="px-3 py-2 bg-[#E8A800]/10 border border-[#E8A800]/25 text-[#E8A800] rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap font-mono">
                                ✓ Added
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }
                })
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-5 border-t border-white/[0.04] flex-wrap gap-4 font-mono text-xs">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-xl font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                      currentPage === 1
                        ? 'bg-white/5 border-transparent text-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-[#0e0e11]/60 border-white/5 text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      const showPage = 
                        page === 1 || 
                        page === totalPages || 
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      
                      const showEllipsis = 
                        (page === 2 && currentPage > 3) ||
                        (page === totalPages - 1 && currentPage < totalPages - 2)
                      
                      if (showEllipsis) {
                        return (
                          <span key={page} className="text-gray-600 px-1 font-bold">
                            ...
                          </span>
                        )
                      }
                      
                      if (!showPage) return null
                      
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg font-bold transition-all cursor-pointer border ${
                            currentPage === page
                              ? 'bg-[#E8A800] text-black border-[#E8A800] shadow-md shadow-[#E8A800]/10'
                              : 'bg-white/[0.02] border-transparent text-gray-400 hover:text-white hover:bg-white/[0.06]'
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
                    className={`px-3 py-2 rounded-xl font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                      currentPage === totalPages
                        ? 'bg-white/5 border-transparent text-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-[#0e0e11]/60 border-white/5 text-white hover:bg-white/[0.05]'
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
