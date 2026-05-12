'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

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
}

interface AllPlayersClientProps {
  seasonId: string
  positions: string[]
  teams: string[]
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

// ── Component ──────────────────────────────────────────────────────────────────
export default function AllPlayersClient({ seasonId, positions, teams }: AllPlayersClientProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Read initial values from URL so direct links / back-nav work
  const getParam = (key: string, fallback: string) => {
    if (typeof window === 'undefined') return fallback
    return new URLSearchParams(window.location.search).get(key) || fallback
  }

  const [searchQuery, setSearchQuery] = useState(() => getParam('search', ''))
  const [positionFilter, setPositionFilter] = useState(() => getParam('position', 'ALL'))
  const [teamFilter, setTeamFilter] = useState(() => getParam('team', 'ALL'))
  const [currentPage, setCurrentPage] = useState(() => parseInt(getParam('page', '1'), 10))

  const [players, setPlayers] = useState<Player[]>([])
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch from API ───────────────────────────────────────────────────────────
  const fetchPlayers = useCallback(async (opts: {
    search: string
    position: string
    team: string
    page: number
  }) => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ seasonId, page: String(opts.page), sort: 'rating' })
    if (opts.search) params.set('search', opts.search)
    if (opts.position !== 'ALL') params.set('position', opts.position)
    if (opts.team !== 'ALL') params.set('team', opts.team)

    try {
      const res = await fetch(`/api/players/search?${params}`, { signal: abortRef.current.signal })
      if (!res.ok) throw new Error('Failed to fetch players')
      const data = await res.json()
      setPlayers(data.players)
      setTotalPlayers(data.totalPlayers)
      setTotalPages(data.totalPages)
    } catch (err: any) {
      if (err.name !== 'AbortError') setError('Failed to load players. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [seasonId])

  // ── Silently sync state → URL (no navigation, no reload) ────────────────────
  const syncURL = useCallback((opts: {
    search: string; position: string; team: string; page: number
  }) => {
    const params = new URLSearchParams()
    if (opts.page > 1) params.set('page', String(opts.page))
    if (opts.search) params.set('search', opts.search)
    if (opts.position !== 'ALL') params.set('position', opts.position)
    if (opts.team !== 'ALL') params.set('team', opts.team)
    const qs = params.toString()
    window.history.replaceState({}, '', qs ? `${pathname}?${qs}` : pathname)
  }, [pathname])

  // ── Debounced search ─────────────────────────────────────────────────────────
  // Fires fetch 400ms after user stops typing — NO page reload
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const newPage = 1
      setCurrentPage(newPage)
      syncURL({ search: searchQuery, position: positionFilter, team: teamFilter, page: newPage })
      fetchPlayers({ search: searchQuery, position: positionFilter, team: teamFilter, page: newPage })
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // ── Instant filter changes ───────────────────────────────────────────────────
  const applyFilters = useCallback((overrides: Partial<{
    position: string; team: string; page: number
  }>) => {
    const next = {
      search: searchQuery,
      position: positionFilter,
      team: teamFilter,
      page: 1,
      ...overrides
    }
    setCurrentPage(next.page)
    syncURL(next)
    fetchPlayers(next)
  }, [searchQuery, positionFilter, teamFilter, syncURL, fetchPlayers])

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPlayers({ search: searchQuery, position: positionFilter, team: teamFilter, page: currentPage })
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    applyFilters({ page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setPositionFilter('ALL')
    setTeamFilter('ALL')
    const next = { search: '', position: 'ALL', team: 'ALL', page: 1 }
    syncURL(next)
    fetchPlayers(next)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          <div>
            <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">Position</label>
            <select
              value={positionFilter}
              onChange={(e) => handlePositionChange(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-sm sm:text-base"
            >
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">Team</label>
            <select
              value={teamFilter}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-sm sm:text-base"
            >
              {teams.map(team => (
                <option key={team} value={team}>{team === 'ALL' ? 'All Teams' : team}</option>
              ))}
            </select>
          </div>
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
        {(searchQuery || positionFilter !== 'ALL' || teamFilter !== 'ALL') && (
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
              : players.map((player) => (
                  <Link
                    key={player.id}
                    href={`/sub-admin/${seasonId}/all-players/${player.id}`}
                    className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all p-4 sm:p-6 cursor-pointer group"
                  >
                    {/* Player Header */}
                    <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 ring-2 ring-white/10">
                        <Image src={player.photoUrl} alt={player.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-black text-white group-hover:text-[#E8A800] mb-1 truncate transition-colors">
                          {player.name}
                        </h3>
                        <div className="text-xs sm:text-sm text-[#7A7367] mb-2 truncate">{player.realWorldClub}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 sm:py-1 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] text-xs font-bold">
                            {player.position}
                          </span>
                          <span className="px-2 py-0.5 sm:py-1 rounded-lg bg-[#FFB347]/20 border border-[#FFB347]/30 text-[#FFB347] text-xs font-bold">
                            {player.overallRating} OVR
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Team Assignment */}
                    {player.team ? (
                      <div className="rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 ring-2 ring-emerald-500/20">
                            <Image src={player.team.logoUrl} alt={player.team.name} fill className="object-contain p-1" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-emerald-400 mb-0.5 font-bold">SOLD TO</div>
                            <div className="text-xs sm:text-sm font-bold text-white truncate">{player.team.name}</div>
                            {player.soldPrice && (
                              <div className="text-xs text-[#7A7367]">${player.soldPrice.toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg sm:rounded-xl bg-[#FFB347]/10 border border-[#FFB347]/30 p-3 sm:p-4 text-center">
                        <div className="text-xs sm:text-sm font-bold text-[#FFB347]">AVAILABLE</div>
                        <div className="text-xs text-[#7A7367] mt-1">Not assigned to any team</div>
                      </div>
                    )}
                  </Link>
                ))}
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
