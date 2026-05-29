'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPhotoUrlFromDb } from '@/lib/image-cdn'

interface TiebreakerBiddingClientProps {
  tiebreaker: {
    id: string
    originalAmount: number
    status: string
    basePlayer: {
      id: string
      name: string
      photoUrl: string
    }
    round: {
      id: string
      roundNumber: number
      position: string | null
      season: {
        id: string
        name: string
      }
    }
  }
  team: {
    id: string
    name: string
    logoUrl: string
  }
  budget: number
  myBid: {
    oldBidAmount: number
    newBidAmount: number | null
    submitted: boolean
    submittedAt: Date | null
  } | null
  allTiedTeams: Array<{
    teamId: string
    teamName: string
    teamLogo: string | null
    oldBidAmount: number
    submitted: boolean
    submittedAt: Date | null
    isCurrentTeam: boolean
  }>
}

export default function TiebreakerBiddingClient({
  tiebreaker,
  team,
  budget,
  myBid,
  allTiedTeams: initialTiedTeams
}: TiebreakerBiddingClientProps) {
  const router = useRouter()
  const [newBidAmount, setNewBidAmount] = useState(myBid?.newBidAmount || tiebreaker.originalAmount + 1)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [reserveInfo, setReserveInfo] = useState<any>(null)
  const [tiebreakerStatus, setTiebreakerStatus] = useState(tiebreaker.status)
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)
  const [liveTeams, setLiveTeams] = useState(initialTiedTeams)

  const maxBidLimit = reserveInfo ? reserveInfo.maxBid : budget

  // Poll tiebreaker status and redirect when resolved
  const checkTiebreakerStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/tiebreakers/${tiebreaker.id}/status`)
      if (res.ok) {
        const data = await res.json()
        // Update team submission statuses live
        if (data.teamBids) {
          setLiveTeams(prev => prev.map(t => {
            const fresh = data.teamBids.find((b: any) => b.teamId === t.teamId)
            return fresh ? { ...t, submitted: fresh.submitted, submittedAt: fresh.submittedAt } : t
          }))
        }
        if (data.status && data.status !== 'active') {
          setTiebreakerStatus(data.status)
        }
      }
    } catch {}
  }, [tiebreaker.id])

  useEffect(() => {
    // Poll always while tiebreaker is active so tied teams section stays live
    if (tiebreakerStatus !== 'active') return

    const interval = setInterval(checkTiebreakerStatus, 3000)
    return () => clearInterval(interval)
  }, [tiebreakerStatus, checkTiebreakerStatus])

  // Start redirect countdown when tiebreaker is resolved
  useEffect(() => {
    if (tiebreakerStatus !== 'active' && redirectCountdown === null) {
      setRedirectCountdown(5)
    }
  }, [tiebreakerStatus, redirectCountdown])

  useEffect(() => {
    if (redirectCountdown === null) return
    if (redirectCountdown <= 0) {
      router.push('/team/auction')
      return
    }
    const timer = setTimeout(() => setRedirectCountdown(c => (c ?? 1) - 1), 1000)
    return () => clearTimeout(timer)
  }, [redirectCountdown, router])

  // Fetch reserve info on mount
  useEffect(() => {
    async function fetchReserveInfo() {
      try {
        const timestamp = Date.now();
        const response = await fetch(`/api/team/reserve-info?season_id=${tiebreaker.round.season.id}&round_id=${tiebreaker.round.id}&_t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        if (response.ok) {
          const data = await response.json()
          setReserveInfo(data)
        }
      } catch (error) {
        console.error('Failed to fetch reserve info:', error)
      }
    }
    fetchReserveInfo()
  }, [tiebreaker.round.season.id, tiebreaker.round.id])

  const handleSubmit = async () => {
    if (!confirm(`Submit bid of £${newBidAmount.toLocaleString()}? This cannot be changed.`)) {
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      if (newBidAmount <= tiebreaker.originalAmount) {
        throw new Error(`Bid must be higher than £${tiebreaker.originalAmount.toLocaleString()}`)
      }

      if (newBidAmount > maxBidLimit) {
        throw new Error(`Bid £${newBidAmount.toLocaleString()} exceeds your maximum allowed bid of £${maxBidLimit.toLocaleString()} (required to maintain squad balance/reserve requirements).`)
      }

      const response = await fetch(`/api/tiebreakers/${tiebreaker.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newBidAmount })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit bid')
      }

      const data = await response.json()
      
      // Check if resolution is in progress (async)
      if (data.resolutionInProgress) {
        setMessage({ type: 'success', text: 'Bid submitted! Resolution in progress, please wait...' })
        // Start polling to check status
        router.refresh()
      } else if (data.roundComplete || data.tiebreakerResolved) {
        // Tiebreaker resolved right away (shouldn't happen with async, but keep for backwards compatibility)
        setMessage({ type: 'success', text: data.message || 'Bid submitted successfully!' })
        setTiebreakerStatus('completed')
      } else {
        // Wait for others — start polling
        setMessage({ type: 'success', text: data.message || 'Bid submitted successfully!' })
        router.refresh()
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 sm:pt-20 md:pt-24 relative overflow-hidden">
      {/* Decorative Lights */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/[0.03] rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#E8A800]/[0.02] rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md mb-6 relative z-10 shadow-lg shadow-black/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/team/auction"
            className="inline-flex items-center gap-2 text-[#D4CCBB] hover:text-[#E8A800] mb-4 transition-colors font-extrabold uppercase tracking-wider text-xs active:scale-95 duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Auction
          </Link>

          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 relative shadow-lg group">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-transparent transition-opacity duration-300 opacity-40 group-hover:opacity-60" />
              <img
                src={getPhotoUrlFromDb(tiebreaker.basePlayer.photoUrl)}
                alt={tiebreaker.basePlayer.name}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover relative z-10 transition-transform duration-300 group-hover:scale-105"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight bg-gradient-to-r from-white via-[#E8A800] to-purple-400 bg-clip-text text-transparent">
                Single Tiebreaker
              </h1>
              <p className="text-sm text-[#D4CCBB] font-semibold mt-1">
                {tiebreaker.basePlayer.name} <span className="text-[#7A7367]">•</span> Round {tiebreaker.round.roundNumber}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 p-4 transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/20 group">
              <div className="text-[10px] text-[#7A7367] mb-1 font-bold uppercase tracking-wider transition-colors group-hover:text-[#D4CCBB]">Your Budget</div>
              <div className="text-lg sm:text-xl font-black text-white font-mono">£{budget.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 p-4 transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/20 group">
              <div className="text-[10px] text-[#7A7367] mb-1 font-bold uppercase tracking-wider transition-colors group-hover:text-[#D4CCBB]">Original Bid</div>
              <div className="text-lg sm:text-xl font-black text-[#E8A800] drop-shadow-[0_0_8px_rgba(232,168,0,0.2)] font-mono">£{tiebreaker.originalAmount.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 p-4 transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/20 group col-span-2 sm:col-span-1">
              <div className="text-[10px] text-[#7A7367] mb-1 font-bold uppercase tracking-wider transition-colors group-hover:text-[#D4CCBB]">Status</div>
              <div className={`text-lg sm:text-xl font-black flex items-center gap-1.5 ${myBid?.submitted ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]' : 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.2)]'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${myBid?.submitted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                {myBid?.submitted ? 'Submitted' : 'Pending'}
              </div>
            </div>
          </div>

          {/* Reserve Information */}
          {reserveInfo && (
            <div className={`mt-5 rounded-2xl border p-4 backdrop-blur-md relative overflow-hidden transition-all duration-300 ${
              reserveInfo.phase === 'phase_1' 
                ? 'bg-red-500/5 border-red-500/20 shadow-lg shadow-red-950/10'
                : reserveInfo.phase === 'phase_2'
                ? 'bg-amber-500/5 border-amber-500/20 shadow-lg shadow-amber-950/10'
                : 'bg-blue-500/5 border-blue-500/20 shadow-lg shadow-blue-950/10'
            }`}>
              <div className="flex items-start gap-3 relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  reserveInfo.phase === 'phase_1' 
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                    : reserveInfo.phase === 'phase_2'
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0 text-sm text-[#D4CCBB]">
                  <h3 className={`font-extrabold uppercase tracking-wide text-xs mb-1.5 ${
                    reserveInfo.phase === 'phase_1' 
                      ? 'text-red-400'
                      : reserveInfo.phase === 'phase_2'
                      ? 'text-amber-400'
                      : 'text-blue-400'
                  }`}>
                    Budget Reserve - {reserveInfo.phase === 'phase_1' ? 'Phase 1 (Strict)' : reserveInfo.phase === 'phase_2' ? 'Phase 2 (Soft)' : 'Phase 3 (Flexible)'}
                  </h3>
                  <div className="space-y-1.5 font-medium text-white/95">
                    <p>Required Reserve: <span className="font-extrabold text-white">£{reserveInfo.floorReserve.toLocaleString()}</span></p>
                    <p>Maximum Allowed Bid: <span className="font-extrabold text-emerald-400">£{reserveInfo.maxBid.toLocaleString()}</span></p>
                    {reserveInfo.phase === 'phase_2' && (
                      <>
                        <p className="text-amber-300">Recommended Max: <span className="font-extrabold">£{reserveInfo.maxRecommendedBid.toLocaleString()}</span></p>
                        {reserveInfo.breakdown.phase2Reserve !== undefined && reserveInfo.breakdown.phase3Reserve !== undefined && (
                          <div className="mt-2 pt-2 border-t border-white/5 space-y-1 text-xs">
                            <p className="text-[#7A7367] font-semibold mb-1 uppercase tracking-wider">Reserve breakdown:</p>
                            <p className="text-emerald-400">
                              • Participate in this + remaining Phase 2: Reserve £{reserveInfo.reserve.toLocaleString()} = {reserveInfo.breakdown.phase2Reserve > 0 ? `Phase 2 (£${reserveInfo.breakdown.phase2Reserve.toLocaleString()})` : ''}{reserveInfo.breakdown.phase2Reserve > 0 && reserveInfo.breakdown.phase3Reserve > 0 ? ' + ' : ''}{reserveInfo.breakdown.phase3Reserve > 0 ? `Phase 3 (£${reserveInfo.breakdown.phase3Reserve.toLocaleString()})` : ''}
                            </p>
                            <p className="text-red-400/90">
                              • Skip this + remaining Phase 2: Reserve £{reserveInfo.floorReserve.toLocaleString()} (Phase 3 only)
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    <p className="text-[#7A7367] text-[10px] font-medium leading-relaxed mt-2">{reserveInfo.calculation}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border backdrop-blur-md text-sm font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-lg'
              : 'bg-red-500/5 border-red-500/20 text-red-400 shadow-lg'
          }`}>
            <span className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
            {message.text}
          </div>
        )}

        {/* Info Box */}
        <div className="mb-6 rounded-2xl bg-purple-950/10 border border-purple-500/20 p-5 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-[40px]" />
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400 shadow-inner">
              <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-wide mb-1">Tiebreaker Required</h3>
              <p className="text-sm text-purple-200 font-medium leading-relaxed">
                Multiple teams bid exactly <strong className="text-white font-extrabold">£{tiebreaker.originalAmount.toLocaleString()}</strong> for {tiebreaker.basePlayer.name}. Submit a higher bid to win the player. The highest bid secures the player.
              </p>
            </div>
          </div>
        </div>

        {/* Tied Teams Status */}
        <div className="mb-6 rounded-2xl bg-white/[0.01] border border-white/5 p-5 sm:p-6 backdrop-blur-md shadow-xl">
          <h2 className="text-base font-extrabold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8A800] animate-pulse" />
            Tied Competitors ({liveTeams.length})
          </h2>
          <div className="space-y-3">
            {liveTeams.map((tiedTeam) => (
              <div
                key={tiedTeam.teamId}
                className={`flex items-center justify-between p-4 rounded-xl border backdrop-blur-md transition-all duration-300 ${
                  tiedTeam.isCurrentTeam
                    ? 'bg-emerald-500/[0.04] border-emerald-500/20 shadow-lg'
                    : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {tiedTeam.teamLogo && (
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/40 border border-white/10 p-1 flex-shrink-0 flex items-center justify-center">
                      <img
                        src={tiedTeam.teamLogo}
                        alt={tiedTeam.teamName}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-team-logo.png' }}
                      />
                    </div>
                  )}
                  <div>
                    <div className="font-extrabold text-white flex items-center gap-2 text-sm tracking-wide">
                      {tiedTeam.teamName}
                      {tiedTeam.isCurrentTeam && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20 uppercase tracking-wider">
                          Your Club
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 font-semibold mt-0.5">
                      Original Bid: £{tiedTeam.oldBidAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {tiedTeam.submitted ? (
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></div>
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Submitted</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wider">Pending</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-[#7A7367]">
            <span>SUBMISSION PROGRESS</span>
            <span className="font-extrabold text-white text-sm font-mono">
              {liveTeams.filter(t => t.submitted).length} <span className="text-white/40">/</span> {liveTeams.length} SUBMITTED
            </span>
          </div>
        </div>

        {/* Bidding Form */}
        {!myBid?.submitted && tiebreaker.status === 'active' && (
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 sm:p-6 backdrop-blur-md shadow-xl">
            <h2 className="text-base font-extrabold text-white mb-4 uppercase tracking-wider">Submit Your New Bid</h2>

            <div className="mb-6">
              <label className="block text-xs font-extrabold text-[#D4CCBB] mb-2 uppercase tracking-wide">
                New Bid Amount (must exceed £{tiebreaker.originalAmount.toLocaleString()})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={newBidAmount}
                  onChange={(e) => setNewBidAmount(parseInt(e.target.value) || 0)}
                  min={tiebreaker.originalAmount + 1}
                  max={maxBidLimit}
                  step={1000}
                  className="w-full pl-9 pr-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 text-white text-xl font-extrabold font-mono focus:outline-none focus:border-[#E8A800] focus:ring-1 focus:ring-[#E8A800]"
                />
                <span className="absolute left-4 top-3 text-[#7A7367] font-black text-lg">£</span>
              </div>
              
              {/* Quick Increment Buttons */}
              <div className="flex gap-2.5 mt-4">
                <button
                  onClick={() => setNewBidAmount(prev => Math.min(prev + 5, maxBidLimit))}
                  disabled={newBidAmount + 5 > maxBidLimit}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-white hover:bg-white/5 hover:border-[#E8A800]/50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-extrabold text-xs uppercase tracking-wider cursor-pointer"
                >
                  +£5
                </button>
                <button
                  onClick={() => setNewBidAmount(prev => Math.min(prev + 10, maxBidLimit))}
                  disabled={newBidAmount + 10 > maxBidLimit}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-white hover:bg-white/5 hover:border-[#E8A800]/50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-extrabold text-xs uppercase tracking-wider cursor-pointer"
                >
                  +£10
                </button>
              </div>
              
              <p className="text-[10px] text-[#7A7367] font-semibold mt-3.5 uppercase tracking-wide flex justify-between font-mono">
                <span>Min: £{(tiebreaker.originalAmount + 1).toLocaleString()}</span>
                <span>Max Allowed: £{maxBidLimit.toLocaleString()}</span>
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || newBidAmount <= tiebreaker.originalAmount || newBidAmount > maxBidLimit}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold uppercase tracking-widest text-xs active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              {submitting ? 'Submitting Bid...' : `Submit Bid of £${newBidAmount.toLocaleString()}`}
            </button>
          </div>
        )}

        {/* Submitted State */}
        {myBid?.submitted && (
          <div className="rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 p-8 text-center backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-[50px]" />
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-inner">
              <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">Bid Submitted</h3>
            <p className="text-sm text-[#D4CCBB] font-semibold mb-4 leading-relaxed">
              You bid <strong className="text-emerald-400 font-mono text-base">£{myBid.newBidAmount?.toLocaleString()}</strong> for {tiebreaker.basePlayer.name}. We are waiting for other tied teams to submit their bids.
            </p>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between text-xs font-bold text-[#7A7367] max-w-sm mx-auto uppercase">
              <span>Progress Status</span>
              <span className="font-extrabold text-white text-sm font-mono">
                {liveTeams.filter(t => t.submitted).length} <span className="text-white/40">/</span> {liveTeams.length} submitted
              </span>
            </div>
          </div>
        )}

        {/* Resolved State */}
        {tiebreakerStatus !== 'active' && (
          <div className="rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 p-8 text-center backdrop-blur-md shadow-2xl relative overflow-hidden animate-[fadeIn_0.5s_ease-out]">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-[50px]" />
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-inner">
              <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">Tiebreaker Resolved!</h3>
            <p className="text-sm text-[#D4CCBB] font-semibold mb-5 leading-relaxed">
              This tiebreaker has been successfully resolved. You will be redirected shortly to inspect the official results board.
            </p>
            {redirectCountdown !== null && redirectCountdown > 0 && (
              <p className="text-xs text-[#7A7367] font-semibold uppercase tracking-wider mb-4">
                Redirecting in <span className="font-extrabold text-white font-mono text-sm">{redirectCountdown}</span> seconds...
              </p>
            )}
            <button
              onClick={() => router.push('/team/auction')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFC533] text-black font-extrabold text-xs uppercase tracking-wider hover:shadow-lg hover:shadow-[#E8A800]/25 transition-all cursor-pointer active:scale-95"
            >
              Go to Dashboard Now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
