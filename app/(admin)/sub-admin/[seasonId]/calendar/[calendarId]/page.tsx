"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import PageLoader from "@/components/ui/PageLoader"
import { normalizeForSearch } from "@/lib/search-utils"
import SearchableSelect from '@/components/ui/SearchableSelect'

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
  const [roundResults, setRoundResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)

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

  // Fetch round results when position changes
  useEffect(() => {
    if (!seasonId || !selectedPosition || !calendar) return

    const fetchRoundResults = async () => {
      try {
        // Find the round for this position
        const slot = calendar.auction_slots?.find((s: any) => s.position === selectedPosition)
        if (!slot?.roundId) {
          setRoundResults([])
          setShowResults(false)
          return
        }

        // Fetch round details
        const res = await fetch(`/api/admin/rounds/${slot.roundId}`)
        if (!res.ok) throw new Error('Failed to fetch round')
        const data = await res.json()

        // Only show results if round is completed
        if (data.round?.status === 'completed' && data.auctionResults) {
          setRoundResults(data.auctionResults)
          setShowResults(true)
        } else {
          setRoundResults([])
          setShowResults(false)
        }
      } catch (err) {
        console.error('Error fetching round results:', err)
        setRoundResults([])
        setShowResults(false)
      }
    }

    fetchRoundResults()
  }, [seasonId, selectedPosition, calendar])

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
    normalizeForSearch(player.name).includes(normalizeForSearch(searchQuery)) ||
    normalizeForSearch(player.realWorldClub).includes(normalizeForSearch(searchQuery))
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
      <div className="border-b border-white/5 bg-[#0D0D0D]/95 backdrop-blur-xl mb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <Link
            href={`/sub-admin/${seasonId}/calendar`}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors mb-4"
          >
            <ArrowLeftIcon />
            Back to Calendar
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black mb-2 uppercase font-mono tracking-tight text-white leading-none">
            {formatDate(calendar.auctionDate)}
          </h1>
          {calendar.description && (
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider font-mono">{calendar.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Position Selection & Player List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Position Tabs */}
            <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex gap-2 flex-wrap">
                {calendar?.auction_slots?.map((slot: any) => {
                  const isSelected = selectedPosition === slot.position;
                  const isBulk = slot.roundType === 'bulk';
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedPosition(slot.position)}
                      className={`px-5 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 border text-[10px] uppercase tracking-widest font-mono cursor-pointer ${
                        isSelected
                          ? isBulk
                            ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
                            : 'bg-[#E8A800] border-transparent text-black shadow-lg shadow-[#E8A800]/25'
                          : isBulk
                            ? 'bg-purple-500/5 border-purple-500/20 text-purple-400 hover:bg-purple-500/10'
                            : 'bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/[0.02]'
                      }`}
                    >
                      <span>{slot.position}</span>
                      {isBulk && (
                        <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-extrabold font-mono ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          Bulk
                        </span>
                      )}
                    </button>
                  );
                }) || <div className="text-gray-500 font-bold uppercase tracking-wider font-mono text-xs">No position slots available</div>}
              </div>
            </div>

            {/* Search Bar */}
            <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-4 shadow-2xl backdrop-blur-xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search players by name or club..."
                  className="w-full bg-white/[0.01] border border-white/5 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-[#E8A800]/30 transition-all text-white placeholder-gray-600 font-mono text-xs"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <SearchIcon />
                </div>
              </div>
            </div>

            {/* Round Results */}
            {showResults && roundResults.length > 0 && (
              <div className="rounded-3xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/15 p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Round Completed</h3>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest font-mono">{roundResults.length} players sold</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {roundResults.map((result: any) => {
                    const playerStats = result.basePlayer.seasonalPlayerStats[0]
                    return (
                      <div key={result.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-emerald-500/10 font-mono text-xs">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-900 border border-white/5 flex-shrink-0">
                            {result.basePlayer.photoUrl && (
                              <Image
                                src={result.basePlayer.photoUrl}
                                alt={result.basePlayer.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-white truncate text-sm uppercase tracking-tight">{result.basePlayer.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {playerStats && (
                                <>
                                  <span className="px-2 py-0.5 rounded-lg bg-white/5 text-gray-300 text-[9px] font-extrabold uppercase tracking-widest font-mono border border-white/5">
                                    {playerStats.position}
                                  </span>
                                  <span className="text-emerald-400 font-bold text-[10px]">
                                    OVR {playerStats.overallRating}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Sold to</div>
                            <div className="flex items-center gap-2">
                              {result.team.logoUrl && (
                                <div className="relative w-6 h-6 rounded overflow-hidden bg-gray-900 border border-white/5">
                                  <Image
                                    src={result.team.logoUrl}
                                    alt={result.team.name}
                                    fill
                                    className="object-contain p-0.5"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <span className="font-bold text-white text-xs uppercase tracking-tight">{result.team.name}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Price</div>
                            <div className="text-sm font-black text-emerald-400">
                              £{result.soldPrice.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Players Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlayers.length === 0 ? (
                <div className="col-span-2 rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-12 text-center shadow-2xl">
                  <div className="text-gray-500 font-bold uppercase tracking-wider font-mono text-xs">
                    {searchQuery ? 'No players found matching your search' : 'No available players for this position'}
                  </div>
                </div>
              ) : (
                filteredPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className={`text-left rounded-3xl border p-4 transition-all cursor-pointer shadow-2xl ${
                      selectedPlayer?.id === player.id
                        ? 'bg-[#E8A800]/10 border-[#E8A800]/50'
                        : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/40 border border-white/5">
                        <Image
                          src={player.photoUrl}
                          alt={player.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-extrabold text-white text-sm uppercase tracking-tight font-mono">{player.name}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-0.5">{player.realWorldClub}</div>
                        <div className="flex items-center gap-2 mt-2 font-mono">
                          <span className="px-2 py-0.5 rounded-lg bg-white/5 text-gray-300 text-[9px] font-extrabold uppercase tracking-widest border border-white/5">
                            {player.position}
                          </span>
                          <span className="text-emerald-400 font-black text-[10px]">
                            OVR {player.overallRating}
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
              <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 shadow-2xl backdrop-blur-xl">
                <div className="text-[10px] font-bold text-[#E8A800] uppercase tracking-widest font-mono mb-4">Selected Player</div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black/40 border border-white/5">
                    <Image
                      src={selectedPlayer.photoUrl}
                      alt={selectedPlayer.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-white uppercase tracking-tight font-mono">{selectedPlayer.name}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-0.5">{selectedPlayer.realWorldClub}</div>
                    <div className="text-lg font-black text-emerald-400 mt-1 font-mono">
                      OVR {selectedPlayer.overallRating}
                    </div>
                  </div>
                </div>

                {/* Team Selection */}
                <div className="mb-4">
                  <SearchableSelect
                    label="Select Team"
                    value={selectedTeam}
                    options={[
                      { value: '', label: 'Choose a team...' },
                      ...teams.map(team => ({
                        value: team.id,
                        label: `${team.name} (£${team.currentBudget.toLocaleString()})`
                      }))
                    ]}
                    onChange={setSelectedTeam}
                    required={true}
                    enableSearch={true}
                  />
                </div>

                {/* Price Input */}
                <div className="mb-6 font-mono">
                  <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">
                    Sold Price <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-extrabold">£</span>
                    <input
                      type="number"
                      value={soldPrice}
                      onChange={(e) => setSoldPrice(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full bg-white/[0.01] border border-white/5 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#E8A800]/50 transition-all text-white placeholder-gray-500 font-mono text-lg font-black"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold uppercase tracking-wider font-mono mb-4">
                    {error}
                  </div>
                )}

                {/* Sell Button */}
                <button
                  onClick={handleSellPlayer}
                  disabled={isSelling || !selectedTeam || !soldPrice}
                  className="w-full bg-[#E8A800] hover:bg-[#FFC93A] text-black px-6 py-3 rounded-xl font-black uppercase tracking-wider text-xs transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSelling ? 'Selling...' : 'SOLD!'}
                </button>
              </div>
            )}

            {/* Teams Budget */}
            <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 backdrop-blur-xl shadow-2xl">
              <div className="text-[10px] font-bold text-white uppercase tracking-widest font-mono mb-4">Teams Budget</div>
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black/40 border border-white/5 flex-shrink-0">
                        {team.logoUrl && (
                          <Image
                            src={team.logoUrl}
                            alt={team.name}
                            fill
                            className="object-contain p-1"
                            unoptimized
                          />
                        )}
                      </div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">{team.name}</span>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-400 font-mono">
                      £{team.currentBudget.toLocaleString()}
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
