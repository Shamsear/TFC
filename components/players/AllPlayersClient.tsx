'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Player {
  id: string
  name: string
  photoUrl: string
  position: string
  realWorldClub: string
  overallRating: number
  team: {
    id: string
    name: string
    logoUrl: string
  } | null
  soldPrice: number | null
  status: 'SOLD' | 'AVAILABLE'
}

interface AllPlayersClientProps {
  players: Player[]
  seasonId?: string
}

// Icon Components
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

export default function AllPlayersClient({ players, seasonId }: AllPlayersClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('ALL')
  const [teamFilter, setTeamFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'price'>('name')

  // Get unique positions
  const positions = useMemo(() => {
    const uniquePositions = new Set(players.map(p => p.position))
    return ['ALL', ...Array.from(uniquePositions).sort()]
  }, [players])

  // Get unique teams
  const teams = useMemo(() => {
    const uniqueTeams = new Set<string>()
    
    players.forEach(p => {
      if (p.team) {
        uniqueTeams.add(p.team.name)
      } else {
        uniqueTeams.add('Free Agent')
      }
    })
    
    const sortedTeams = Array.from(uniqueTeams).sort()
    return ['ALL', ...sortedTeams]
  }, [players])

  // Filter and sort players with improved search
  const filteredPlayers = useMemo(() => {
    let filtered = [...players] // Create a copy to avoid mutations

    // Search filter - case insensitive and handles null values
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(p => {
        const name = p.name?.toLowerCase() || ''
        const club = p.realWorldClub?.toLowerCase() || ''
        const team = p.team?.name?.toLowerCase() || ''
        const position = p.position?.toLowerCase() || ''
        
        return name.includes(query) || 
               club.includes(query) || 
               team.includes(query) ||
               position.includes(query)
      })
    }

    // Position filter
    if (positionFilter !== 'ALL') {
      filtered = filtered.filter(p => p.position === positionFilter)
    }

    // Team filter
    if (teamFilter !== 'ALL') {
      if (teamFilter === 'Free Agent') {
        filtered = filtered.filter(p => !p.team)
      } else {
        filtered = filtered.filter(p => p.team?.name === teamFilter)
      }
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '')
      } else if (sortBy === 'rating') {
        return (b.overallRating || 0) - (a.overallRating || 0)
      } else if (sortBy === 'price') {
        return (b.soldPrice || 0) - (a.soldPrice || 0)
      }
      return 0
    })

    return filtered
  }, [players, searchQuery, positionFilter, teamFilter, sortBy])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">
              Search Players
            </label>
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
                <SearchIcon />
              </div>
            </div>
          </div>

          {/* Position Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">
              Position
            </label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-sm sm:text-base"
            >
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">
              Team
            </label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-sm sm:text-base"
            >
              {teams.map(team => (
                <option key={team} value={team}>
                  {team === 'ALL' ? 'All Teams' : team}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2">
          <FilterIcon />
          <span className="text-xs sm:text-sm text-[#7A7367]">Sort by:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('name')}
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                sortBy === 'name'
                  ? 'bg-[#E8A800] text-[#0a0a0a]'
                  : 'bg-black/30 text-[#7A7367] hover:bg-black/50'
              }`}
            >
              Name
            </button>
            <button
              onClick={() => setSortBy('rating')}
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                sortBy === 'rating'
                  ? 'bg-[#E8A800] text-[#0a0a0a]'
                  : 'bg-black/30 text-[#7A7367] hover:bg-black/50'
              }`}
            >
              Rating
            </button>
            <button
              onClick={() => setSortBy('price')}
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                sortBy === 'price'
                  ? 'bg-[#E8A800] text-[#0a0a0a]'
                  : 'bg-black/30 text-[#7A7367] hover:bg-black/50'
              }`}
            >
              Price
            </button>
          </div>
        </div>
      </div>

      {/* Results Count with Search Info */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-[#D4CCBB] font-medium">
        <span>
          Showing {filteredPlayers.length} of {players.length} players
          {searchQuery && (
            <span className="text-[#E8A800] ml-2">
              • Searching for "{searchQuery}"
            </span>
          )}
        </span>
        {(searchQuery || positionFilter !== 'ALL' || teamFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('')
              setPositionFilter('ALL')
              setTeamFilter('ALL')
            }}
            className="text-[#E8A800] hover:text-[#FFC93A] transition-colors text-xs"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Players Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4">
            <SearchIcon />
          </div>
          <div className="text-[#D4CCBB] text-sm sm:text-base">No players found matching your filters</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {filteredPlayers.map((player) => (
            <Link
              key={player.id}
              href={seasonId ? `/sub-admin/${seasonId}/all-players/${player.id}` : `/players/${player.id}`}
              className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all p-4 sm:p-6 cursor-pointer group"
            >
              {/* Player Header */}
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 ring-2 ring-white/10">
                  <Image
                    src={player.photoUrl}
                    alt={player.name}
                    fill
                    className="object-cover"
                  />
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
                      <Image
                        src={player.team.logoUrl}
                        alt={player.team.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-emerald-400 mb-0.5 sm:mb-1 font-bold">SOLD TO</div>
                      <div className="text-xs sm:text-sm font-bold text-white truncate">
                        {player.team.name}
                      </div>
                      {player.soldPrice && (
                        <div className="text-xs text-[#7A7367]">
                          ${player.soldPrice.toLocaleString()}
                        </div>
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
  )
}
