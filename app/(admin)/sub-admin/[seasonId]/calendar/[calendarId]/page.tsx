"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import PageLoader from "@/components/ui/PageLoader"

interface CalendarAuctionPageProps {
  params: Promise<{
    seasonId: string
    calendarId: string
  }>
}

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

// Icon Components
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default function CalendarAuctionPage({ params }: CalendarAuctionPageProps) {
  const router = useRouter()
  const [seasonId, setSeasonId] = useState<string>('')
  const [calendarId, setCalendarId] = useState<string>('')
  const [calendar, setCalendar] = useState<any>(null)
  const [selectedPosition, setSelectedPosition] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [soldPrice, setSoldPrice] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSelling, setIsSelling] = useState(false)
  const [error, setError] = useState('')

  // Unwrap params
  useEffect(() => {
    params.then(p => {
      setSeasonId(p.seasonId)
      setCalendarId(p.calendarId)
    })
  }, [params])

  // Fetch calendar data
  useEffect(() => {
    if (!seasonId || !calendarId) return

    const fetchData = async () => {
      try {
        const [calendarRes, teamsRes] = await Promise.all([
          fetch(`/api/seasons/${seasonId}/calendar/${calendarId}`),
          fetch(`/api/seasons/${seasonId}/teams`)
        ])

        if (!calendarRes.ok || !teamsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const calendarData = await calendarRes.json()
        const teamsData = await teamsRes.json()

        setCalendar(calendarData)
        setTeams(teamsData)
        
        // Auto-select first position if available
        if (calendarData?.auction_slots?.length > 0) {
          setSelectedPosition(calendarData.auction_slots[0].position)
        }
      } catch (err) {
        setError('Failed to load auction data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [seasonId, calendarId])

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

    setIsSelling(true)
    setError('')

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

      // Refresh players list
      const playersRes = await fetch(`/api/seasons/${seasonId}/players?position=${selectedPosition}&available=true`)
      const playersData = await playersRes.json()
      setPlayers(playersData)

      // Refresh teams budget
      const teamsRes = await fetch(`/api/seasons/${seasonId}/teams`)
      const teamsData = await teamsRes.json()
      setTeams(teamsData)

      // Reset form
      setSelectedPlayer(null)
      setSelectedTeam('')
      setSoldPrice('')
      setSearchQuery('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sell player')
    } finally {
      setIsSelling(false)
    }
  }

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.realWorldClub.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return <PageLoader />
  }

  if (!calendar) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-xl text-red-400">Calendar not found</div>
      </div>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/50 backdrop-blur-xl mb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <Link
            href={`/sub-admin/${seasonId}/calendar`}
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeftIcon />
            Back to Calendar
          </Link>
          <h1 className="text-4xl font-black mb-2">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {formatDate(calendar.auctionDate)}
            </span>
          </h1>
          {calendar.description && (
            <p className="text-gray-400">{calendar.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Position Selection & Player List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Position Tabs */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex gap-2 flex-wrap">
                {calendar?.auction_slots?.map((slot: any) => {
                  const isSelected = selectedPosition === slot.position;
                  const isBulk = slot.roundType === 'bulk';
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedPosition(slot.position)}
                      className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 border ${
                        isSelected
                          ? isBulk
                            ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                            : 'bg-[#E8A800] border-[#E8A800] text-[#0a0a0a] shadow-lg shadow-[#E8A800]/20'
                          : isBulk
                            ? 'bg-purple-500/5 border-purple-500/20 text-purple-400 hover:bg-purple-500/10'
                            : 'bg-[#E8A800]/5 border-dashed border-[#E8A800]/20 text-[#E8A800] hover:bg-[#E8A800]/10'
                      }`}
                    >
                      <span>{slot.position}</span>
                      {isBulk && (
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-extrabold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          Bulk
                        </span>
                      )}
                    </button>
                  );
                }) || <div className="text-gray-400">No position slots available</div>}
              </div>
            </div>

            {/* Search Bar */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search players by name or club..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all text-white placeholder-gray-500"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <SearchIcon />
                </div>
              </div>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlayers.length === 0 ? (
                <div className="col-span-2 rounded-2xl bg-white/5 border border-white/10 p-12 text-center">
                  <div className="text-gray-400">
                    {searchQuery ? 'No players found matching your search' : 'No available players for this position'}
                  </div>
                </div>
              ) : (
                filteredPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className={`text-left rounded-2xl border-2 p-4 transition-all ${
                      selectedPlayer?.id === player.id
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-800">
                        <Image
                          src={player.photoUrl}
                          alt={player.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white">{player.name}</div>
                        <div className="text-sm text-gray-400">{player.realWorldClub}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs font-bold">
                            {player.position}
                          </span>
                          <span className="text-emerald-400 font-bold text-sm">
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
          <div className="space-y-6">
            {/* Selected Player */}
            {selectedPlayer && (
              <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-6">
                <div className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-4">Selected Player</div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-800">
                    <Image
                      src={selectedPlayer.photoUrl}
                      alt={selectedPlayer.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xl font-black text-white">{selectedPlayer.name}</div>
                    <div className="text-sm text-gray-400">{selectedPlayer.realWorldClub}</div>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      {selectedPlayer.overallRating}
                    </div>
                  </div>
                </div>

                {/* Team Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2 text-white">
                    Select Team <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all text-white"
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
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2 text-white">
                    Sold Price <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input
                      type="number"
                      value={soldPrice}
                      onChange={(e) => setSoldPrice(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm mb-4">
                    {error}
                  </div>
                )}

                {/* Sell Button */}
                <button
                  onClick={handleSellPlayer}
                  disabled={isSelling || !selectedTeam || !soldPrice}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-emerald-500/50"
                >
                  {isSelling ? 'Selling...' : 'SOLD!'}
                </button>
              </div>
            )}

            {/* Teams Budget */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="text-sm font-bold text-white uppercase tracking-wider mb-4">Teams Budget</div>
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                        <Image
                          src={team.logoUrl}
                          alt={team.name}
                          width={32}
                          height={32}
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                      <span className="text-sm font-medium text-white">{team.name}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">
                      ${team.currentBudget.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
