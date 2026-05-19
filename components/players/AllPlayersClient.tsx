'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import PositionGroupBadge from '@/components/player/PositionGroupBadge'

interface Player {
  id: string
  name: string
  photoUrl: string
  position: string
  realWorldClub: string
  overallRating: number
  team: { id: string; name: string; logoUrl: string } | null
  soldPrice: number | null
  status: 'SOLD' | 'AVAILABLE'
  position_group?: string | null
}

interface AllPlayersClientProps {
  seasonId: string
  positions: string[]
  teams: string[]
  enableStarring?: boolean  // Enable star functionality for team users
  basePath?: string         // Base path for player links
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

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
            const isSeparator = option.includes('───')
            const isSelected = option === value
            
            if (isSeparator) {
              return (
                <div
                  key={option}
                  className="px-4 py-2 text-xs font-black text-gray-500 bg-white/5 select-none"
                >
                  {option}
                </div>
              )
            }

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

// ── Component ──────────────────────────────────────────────────────────────────
export default function AllPlayersClient({ seasonId, positions, teams, enableStarring = false, basePath }: AllPlayersClientProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Starring state
  const [starredPlayerIds, setStarredPlayerIds] = useState<Set<string>>(new Set())
  const [starringInProgress, setStarringInProgress] = useState<Set<string>>(new Set())

  // Position groups mapping
  const POSITION_GROUPS = {
    'Goalkeepers': ['GK'],
    'Defenders': ['CB', 'LB', 'RB'],
    'Midfielders': ['DMF', 'CMF', 'LMF', 'RMF', 'AMF'],
    'Forwards': ['SS', 'LWF', 'RWF', 'CF']
  }

  // Create enhanced position list with groups
  const enhancedPositions = [
    'ALL',
    '─── Position Groups ───',
    ...Object.keys(POSITION_GROUPS),
    '─── Individual Positions ───',
    ...positions.filter(p => p !== 'ALL').sort()
  ]

  // Read initial values from URL so direct links / back-nav work
  const getParam = (key: string, fallback: string) => {
    if (typeof window === 'undefined') return fallback
    return new URLSearchParams(window.location.search).get(key) || fallback
  }

  const [searchQuery, setSearchQuery] = useState(() => getParam('search', ''))
  const [positionFilter, setPositionFilter] = useState(() => getParam('position', 'ALL'))
  const [teamFilter, setTeamFilter] = useState(() => getParam('team', 'ALL'))
  const [groupFilter, setGroupFilter] = useState(() => getParam('group', 'ALL'))
  const [currentPage, setCurrentPage] = useState(() => parseInt(getParam('page', '1'), 10))

  const [players, setPlayers] = useState<Player[]>([])
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  // ── Load starred players ─────────────────────────────────────────────────────
  useEffect(() => {
    if (enableStarring) {
      fetch(`/api/team/starred-players?seasonId=${seasonId}`)
        .then(res => res.json())
        .then(data => {
          if (data.starredPlayerIds) {
            setStarredPlayerIds(new Set(data.starredPlayerIds))
          }
        })
        .catch(err => console.error('Error loading starred players:', err))
    }
  }, [enableStarring, seasonId])

  // ── Toggle star ──────────────────────────────────────────────────────────────
  const toggleStar = async (playerId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (starringInProgress.has(playerId)) return
    
    setStarringInProgress(prev => new Set(prev).add(playerId))
    const isCurrentlyStarred = starredPlayerIds.has(playerId)
    
    try {
      if (isCurrentlyStarred) {
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

  // ── Fetch from API ───────────────────────────────────────────────────────────
  const fetchPlayers = useCallback(async (opts: {
    search: string
    position: string
    team: string
    group: string
    page: number
  }) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ seasonId, page: String(opts.page), sort: 'rating' })
    if (opts.search) params.set('search', opts.search)
    
    // Handle position groups
    if (opts.position !== 'ALL' && !opts.position.includes('───')) {
      const groupPositions = POSITION_GROUPS[opts.position as keyof typeof POSITION_GROUPS]
      if (groupPositions) {
        // It's a group - send multiple positions
        params.set('positions', groupPositions.join(','))
      } else {
        // It's a single position
        params.set('position', opts.position)
      }
    }
    
    if (opts.team !== 'ALL') params.set('team', opts.team)
    if (opts.group !== 'ALL') params.set('group', opts.group)

    try {
      const res = await fetch(`/api/players/search?${params}`, { signal: controller.signal })
      if (!res.ok) throw new Error('Failed to fetch players')
      const data = await res.json()
      if (!controller.signal.aborted) {
        setPlayers(data.players)
        setTotalPlayers(data.totalPlayers)
        setTotalPages(data.totalPages)
        setLoading(false)
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Failed to load players. Please try again.')
        setLoading(false)
      }
    }
  }, [seasonId, POSITION_GROUPS])

  // ── Silently sync state → URL (no navigation, no reload) ────────────────────
  const syncURL = useCallback((opts: {
    search: string; position: string; team: string; group: string; page: number
  }) => {
    const params = new URLSearchParams()
    if (opts.page > 1) params.set('page', String(opts.page))
    if (opts.search) params.set('search', opts.search)
    if (opts.position !== 'ALL') params.set('position', opts.position)
    if (opts.team !== 'ALL') params.set('team', opts.team)
    if (opts.group !== 'ALL') params.set('group', opts.group)
    const qs = params.toString()
    window.history.replaceState({}, '', qs ? `${pathname}?${qs}` : pathname)
  }, [pathname])

  // ── Debounced search ─────────────────────────────────────────────────────────
  // Fires fetch 400ms after user stops typing — NO page reload
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const newPage = 1
      setCurrentPage(newPage)
      syncURL({ search: searchQuery, position: positionFilter, team: teamFilter, group: groupFilter, page: newPage })
      fetchPlayers({ search: searchQuery, position: positionFilter, team: teamFilter, group: groupFilter, page: newPage })
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // ── Instant filter changes ───────────────────────────────────────────────────
  const applyFilters = useCallback((overrides: Partial<{
    position: string; team: string; group: string; page: number
  }>) => {
    const next = {
      search: searchQuery,
      position: positionFilter,
      team: teamFilter,
      group: groupFilter,
      page: 1,
      ...overrides
    }
    setCurrentPage(next.page)
    syncURL(next)
    fetchPlayers(next)
  }, [searchQuery, positionFilter, teamFilter, groupFilter, syncURL, fetchPlayers])

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPlayers({ search: searchQuery, position: positionFilter, team: teamFilter, group: groupFilter, page: currentPage })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handlePositionChange = (value: string) => {
    setPositionFilter(value)
    applyFilters({ position: value })
  }

  const handleTeamChange = (value: string) => {
    setTeamFilter(value)
    applyFilters({ team: value })
  }

  const handleGroupChange = (value: string) => {
    setGroupFilter(value)
    applyFilters({ group: value })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    applyFilters({ page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setPositionFilter('ALL')
    setTeamFilter('ALL')
    setGroupFilter('ALL')
    const next = { search: '', position: 'ALL', team: 'ALL', group: 'ALL', page: 1 }
    syncURL(next)
    fetchPlayers(next)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">Search Players</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, club, team, or position..."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 pl-10 sm:pl-12 rounded-lg sm:rounded-xl bg-black/50 border border-white/10 text-white placeholder-[#7A7367] focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-sm sm:text-base"
                autoComplete="off"
              />
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[#7A7367]">
                {loading ? <SpinnerIcon /> : <SearchIcon />}
              </div>
            </div>
          </div>

          {/* Position Filter */}
          <CustomSelect
            label="Position"
            value={positionFilter}
            options={enhancedPositions}
            onChange={handlePositionChange}
          />

          {/* Team Filter */}
          <CustomSelect
            label="Team"
            value={teamFilter}
            options={teams}
            onChange={handleTeamChange}
            displayValue={(val) => val === 'ALL' ? 'All Teams' : val}
          />

          {/* Group Filter - Show when any position in the filter supports groups */}
          {(() => {
            // Check if current position filter includes any grouped positions
            const GROUPED_POSITIONS = ['CB', 'DMF', 'CMF', 'AMF', 'CF']
            
            // If it's a position group name, check if any positions in that group are grouped
            if (Object.keys(POSITION_GROUPS).includes(positionFilter)) {
              const groupPositions = POSITION_GROUPS[positionFilter as keyof typeof POSITION_GROUPS]
              const hasGroupedPosition = groupPositions.some(pos => GROUPED_POSITIONS.includes(pos))
              if (!hasGroupedPosition) return null
            } 
            // If it's an individual position, check if it's grouped
            else if (!GROUPED_POSITIONS.includes(positionFilter)) {
              return null
            }

            return (
              <CustomSelect
                label="Group"
                value={groupFilter}
                options={['ALL', 'A', 'B']}
                onChange={handleGroupChange}
                displayValue={(val) => val === 'ALL' ? 'All Groups' : `${positionFilter}-${val}`}
              />
            )
          })()}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-[#D4CCBB] font-medium">
        <span>
          {loading
            ? 'Loading...'
            : totalPlayers === 0
            ? 'No players found'
            : `Showing ${((currentPage - 1) * 24) + 1}–${Math.min(currentPage * 24, totalPlayers)} of ${totalPlayers} players`}
          {searchQuery && !loading && (
            <span className="text-[#E8A800] ml-2">• Searching for "{searchQuery}"</span>
          )}
        </span>
        {(searchQuery || positionFilter !== 'ALL' || teamFilter !== 'ALL' || groupFilter !== 'ALL') && (
          <button
            onClick={handleClearFilters}
            className="text-[#E8A800] hover:text-[#FFC93A] transition-colors text-xs"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Players Grid */}
      <div className={`transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {!loading && players.length === 0 && !error ? (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4">
              <SearchIcon />
            </div>
            <div className="text-[#D4CCBB] text-sm sm:text-base">No players found matching your filters</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {/* Skeleton cards while loading */}
            {loading && players.length === 0
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 animate-pulse">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-white/10 flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                        <div className="h-3 bg-white/10 rounded w-1/2" />
                        <div className="flex gap-2">
                          <div className="h-5 bg-white/10 rounded w-12" />
                          <div className="h-5 bg-white/10 rounded w-16" />
                        </div>
                      </div>
                    </div>
                    <div className="h-14 bg-white/10 rounded-lg" />
                  </div>
                ))
              : players.map((player) => {
                  const playerPath = basePath ? `${basePath}/${player.id}` : `/sub-admin/${seasonId}/all-players/${player.id}`
                  return (
                    <Link
                      key={player.id}
                      href={playerPath}
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
                            className="object-cover"
                          />
                        </div>

                        {/* Player Info - Right Side */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full border border-[#E8A800]/30 bg-[#E8A800]/20 text-[#E8A800] text-xs font-bold">
                                {player.position}
                              </span>
                              <PositionGroupBadge position={player.position} group={player.position_group} size="sm" />
                              <span className="px-2 py-0.5 rounded-full border border-[#FFB347]/30 bg-[#FFB347]/20 text-[#FFB347] text-xs font-bold">
                                {player.overallRating}
                              </span>
                            </div>
                            <h3 className="text-base font-black text-white mb-1 group-hover:text-[#E8A800] transition-colors line-clamp-1">
                              {player.name}
                            </h3>
                            <div className="text-xs text-gray-400 truncate">{player.realWorldClub}</div>
                          </div>
                        </div>
                      </div>

                      {/* Team or Free Agent */}
                      <div className="mt-3">
                        {player.team ? (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            <div className="relative w-5 h-5 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                              <Image
                                src={player.team.logoUrl}
                                alt={player.team.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-white truncate">{player.team.name}</div>
                              {player.soldPrice && player.soldPrice > 0 && (
                                <div className="text-xs font-bold text-emerald-400">
                                  ${player.soldPrice.toLocaleString()}
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
                  )
                })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 sm:mt-8">
          {currentPage === 1 ? (
            <span className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white opacity-50 cursor-not-allowed">
              <ChevronLeftIcon />
            </span>
          ) : (
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              <ChevronLeftIcon />
            </button>
          )}

          <div className="flex items-center gap-1 sm:gap-2">
            {currentPage > 3 && (
              <>
                <button onClick={() => handlePageChange(1)} className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-sm">1</button>
                {currentPage > 4 && <span className="text-[#7A7367] px-2">...</span>}
              </>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === currentPage || p === currentPage - 1 || p === currentPage + 1 ||
                (currentPage <= 2 && p <= 3) || (currentPage >= totalPages - 1 && p >= totalPages - 2))
              .map(p => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    p === currentPage
                      ? 'bg-[#E8A800] text-[#0a0a0a] pointer-events-none'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              ))}

            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <span className="text-[#7A7367] px-2">...</span>}
                <button onClick={() => handlePageChange(totalPages)} className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-sm">{totalPages}</button>
              </>
            )}
          </div>

          {currentPage === totalPages ? (
            <span className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white opacity-50 cursor-not-allowed">
              <ChevronRightIcon />
            </span>
          ) : (
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              <ChevronRightIcon />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
