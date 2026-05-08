"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface Team {
  id: string
  name: string
  logoUrl: string
  currentBudget: number
}

interface Player {
  id: string
  name: string
  photoUrl: string
  position: string
  realWorldClub: string
  overallRating: number
}

interface AuctionSlot {
  id: string
  position: string
  slotOrder: number
}

interface AuctionCalendar {
  id: string
  auctionDate: Date
  description: string | null
  auctionSlots: AuctionSlot[]
}

interface SoldPlayer {
  id: string
  playerName: string
  photoUrl: string
  position: string
  realWorldClub: string
  overallRating: number
  teamName: string
  teamLogoUrl: string
  soldPrice: number
  soldDate: Date
}

interface AuctionInterfaceProps {
  seasonId: string
  calendar: AuctionCalendar[]
  teams: Team[]
}

// Icon Components
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default function AuctionInterface({ seasonId, calendar, teams: initialTeams }: AuctionInterfaceProps) {
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>(calendar?.[0]?.id || '')
  const [selectedPosition, setSelectedPosition] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [soldPrice, setSoldPrice] = useState<string>('')
  const [isSelling, setIsSelling] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [soldPlayers, setSoldPlayers] = useState<SoldPlayer[]>([])
  const [showSoldPlayers, setShowSoldPlayers] = useState(false)

  const selectedCalendar = calendar?.find(c => c.id === selectedCalendarId)

  // Fetch sold players on mount
  useEffect(() => {
    const fetchSoldPlayers = async () => {
      try {
        const res = await fetch(`/api/seasons/${seasonId}/auction/sold`)
        if (!res.ok) throw new Error('Failed to fetch sold players')
        const data = await res.json()
        setSoldPlayers(data)
      } catch (err) {
        console.error('Error fetching sold players:', err)
      }
    }

    fetchSoldPlayers()
  }, [seasonId])

  // Auto-select first position when calendar changes
  useEffect(() => {
    if (selectedCalendar?.auctionSlots && selectedCalendar.auctionSlots.length > 0) {
      setSelectedPosition(selectedCalendar.auctionSlots[0].position)
    }
  }, [selectedCalendarId, selectedCalendar])

  // Fetch players when position changes
  useEffect(() => {
    if (!seasonId || !selectedPosition) return

    const fetchPlayers = async () => {
      try {
        const res = await fetch(`/api/seasons/${seasonId}/players?position=${selectedPosition}&available=true`)
        if (!res.ok) throw new Error('Failed to fetch players')
        const data = await res.json()
        setPlayers(data)
      } catch (err) {
        console.error('Error fetching players:', err)
      }
    }

    fetchPlayers()
  }, [seasonId, selectedPosition])

  const handleSellPlayer = async () => {
    if (!selectedPlayer || !selectedTeam || !soldPrice) {
      setError('Please select a player, team, and enter a price')
      return
    }

    const price = parseInt(soldPrice)
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price')
      return
    }

    const team = teams.find(t => t.id === selectedTeam)
    if (team && price > team.currentBudget) {
      setError(`Team budget (${team.currentBudget.toLocaleString()}) is insufficient`)
      return
    }

    setIsSelling(true)
    setError('')
    setSuccessMessage('')

    try {
      const res = await fetch(`/api/seasons/${seasonId}/auction/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          teamId: selectedTeam,
          soldPrice: price
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to sell player')
      }

      setSuccessMessage(`${selectedPlayer.name} sold to ${team?.name} for $${price.toLocaleString()}!`)

      // Refresh players list
      const playersRes = await fetch(`/api/seasons/${seasonId}/players?position=${selectedPosition}&available=true`)
      const playersData = await playersRes.json()
      setPlayers(playersData)

      // Refresh teams budget
      const teamsRes = await fetch(`/api/seasons/${seasonId}/teams`)
      const teamsData = await teamsRes.json()
      setTeams(teamsData)

      // Refresh sold players list
      const soldRes = await fetch(`/api/seasons/${seasonId}/auction/sold`)
      const soldData = await soldRes.json()
      setSoldPlayers(soldData)

      // Reset form
      setSelectedPlayer(null)
      setSelectedTeam('')
      setSoldPrice('')
      setSearchQuery('')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sell player')
    } finally {
      setIsSelling(false)
    }
  }

  const filteredPlayers = (players || []).filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.realWorldClub.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 sm:px-4 py-2 sm:py-3 rounded-xl flex items-center gap-2 sm:gap-3 text-sm sm:text-base">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-4a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={() => setShowSoldPlayers(false)}
          className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base ${
            !showSoldPlayers
              ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a]'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
          }`}
        >
          Available Players
        </button>
        <button
          onClick={() => setShowSoldPlayers(true)}
          className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base ${
            showSoldPlayers
              ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a]'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
          }`}
        >
          Sold Players ({soldPlayers.length})
        </button>
      </div>

      {showSoldPlayers ? (
        // Sold Players View
        <div className="space-y-4 sm:space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-gray-400 mb-1">Total Sold</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{soldPlayers.length}</div>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-gray-400 mb-1">Total Spent</div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                ${soldPlayers.reduce((sum, p) => sum + p.soldPrice, 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-gray-400 mb-1">Avg Price</div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                ${soldPlayers.length > 0 ? Math.round(soldPlayers.reduce((sum, p) => sum + p.soldPrice, 0) / soldPlayers.length).toLocaleString() : 0}
              </div>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-gray-400 mb-1">Highest Bid</div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                ${soldPlayers.length > 0 ? Math.max(...soldPlayers.map(p => p.soldPrice)).toLocaleString() : 0}
              </div>
            </div>
          </div>

          {/* Sold Players List */}
          {soldPlayers.length === 0 ? (
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gray-800 flex items-center justify-center text-gray-600 mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-lg sm:text-xl font-bold text-white mb-2">No players sold yet</div>
              <p className="text-sm sm:text-base text-gray-400">
                Sold players will appear here once the auction starts
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {soldPlayers.map((player) => (
                <div
                  key={player.id}
                  className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 p-4 sm:p-5 transition-all"
                >
                  <div className="flex items-start gap-3 sm:gap-4 mb-4">
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                      <Image
                        src={player.photoUrl}
                        alt={player.playerName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm sm:text-base truncate mb-1">{player.playerName}</div>
                      <div className="text-xs text-gray-400 truncate mb-2">{player.realWorldClub}</div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#E8A800]/20 text-[#E8A800] text-xs font-bold">
                          {player.position}
                        </span>
                        <span className="text-emerald-400 font-bold text-xs">
                          {player.overallRating}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Team Info */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 p-2 sm:p-3 rounded-lg bg-black/30">
                    <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                      <Image
                        src={player.teamLogoUrl}
                        alt={player.teamName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400">Sold to</div>
                      <div className="font-bold text-white text-sm truncate">{player.teamName}</div>
                    </div>
                  </div>

                  {/* Price and Date */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div>
                      <div className="text-xs text-gray-400">Price</div>
                      <div className="text-lg sm:text-xl font-black text-emerald-400">
                        ${player.soldPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Date</div>
                      <div className="text-xs sm:text-sm font-medium text-white">
                        {new Date(player.soldDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Available Players View - Existing Auction Interface
        <>
      {/* Calendar Date Selection */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <CalendarIcon />
          <h2 className="text-base sm:text-lg font-bold text-white">Select Auction Date</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
          {calendar?.map((cal) => (
            <button
              key={cal.id}
              onClick={() => setSelectedCalendarId(cal.id)}
              className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all ${
                selectedCalendarId === cal.id
                  ? 'bg-[#E8A800]/20 border-[#E8A800] text-[#E8A800]'
                  : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              <div className="text-xs font-medium mb-1">{formatDate(cal.auctionDate)}</div>
              <div className="text-xs text-gray-500">{cal.auctionSlots?.length || 0} positions</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Position Selection & Player List */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Position Tabs */}
          {selectedCalendar?.auctionSlots && (
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="flex gap-2 flex-wrap">
                {selectedCalendar.auctionSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedPosition(slot.position)}
                    className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all text-xs sm:text-sm ${
                      selectedPosition === slot.position
                        ? 'bg-[#E8A800] text-[#0a0a0a]'
                        : 'bg-black/30 text-gray-400 hover:bg-black/50'
                    }`}
                  >
                    {slot.position}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players by name or club..."
                className="w-full bg-black/50 border border-white/10 rounded-lg sm:rounded-xl pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800] focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white placeholder-gray-500 text-sm sm:text-base"
              />
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </div>
            </div>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {filteredPlayers.length === 0 ? (
              <div className="col-span-2 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
                <div className="text-sm sm:text-base text-gray-400">
                  {searchQuery ? 'No players found matching your search' : 'No available players for this position'}
                </div>
              </div>
            ) : (
              filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`text-left rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 transition-all ${
                    selectedPlayer?.id === player.id
                      ? 'bg-[#E8A800]/20 border-[#E8A800]'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                      <Image
                        src={player.photoUrl}
                        alt={player.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm sm:text-base truncate">{player.name}</div>
                      <div className="text-xs sm:text-sm text-gray-400 truncate">{player.realWorldClub}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-[#E8A800]/20 text-[#E8A800] text-xs font-bold">
                          {player.position}
                        </span>
                        <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                          {player.overallRating}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Sell Interface */}
        <div className="space-y-4 sm:space-y-6">
          {/* Selected Player */}
          {selectedPlayer ? (
            <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 p-4 sm:p-6">
              <div className="text-xs sm:text-sm font-bold text-[#E8A800] uppercase tracking-wider mb-3 sm:mb-4">Selected Player</div>
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                  <Image
                    src={selectedPlayer.photoUrl}
                    alt={selectedPlayer.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg sm:text-xl font-black text-white truncate">{selectedPlayer.name}</div>
                  <div className="text-xs sm:text-sm text-gray-400 truncate">{selectedPlayer.realWorldClub}</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                    {selectedPlayer.overallRating}
                  </div>
                </div>
              </div>

              {/* Team Selection */}
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-bold mb-2 text-white">
                  Select Team <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800] focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white text-sm sm:text-base"
                >
                  <option value="">Choose a team...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} (${team.currentBudget.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Input */}
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-bold mb-2 text-white">
                  Sold Price <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm sm:text-base">$</span>
                  <input
                    type="number"
                    value={soldPrice}
                    onChange={(e) => setSoldPrice(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-black/50 border border-white/10 rounded-lg sm:rounded-xl pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800] focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white placeholder-gray-500 text-sm sm:text-base"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-xs sm:text-sm mb-3 sm:mb-4">
                  {error}
                </div>
              )}

              {/* Sell Button */}
              <button
                onClick={handleSellPlayer}
                disabled={isSelling || !selectedTeam || !soldPrice}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base"
              >
                {isSelling ? 'Selling...' : 'SOLD!'}
              </button>
            </div>
          ) : (
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
              <div className="text-gray-400 text-xs sm:text-sm">Select a player to start auction</div>
            </div>
          )}

          {/* Teams Budget */}
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-3 sm:mb-4">Teams Budget</div>
            <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="relative w-6 h-6 sm:w-8 sm:h-8 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                      <Image
                        src={team.logoUrl}
                        alt={team.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-white truncate">{team.name}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-emerald-400 ml-2">
                    ${team.currentBudget.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
