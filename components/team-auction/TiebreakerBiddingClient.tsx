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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/team/auction"
            className="inline-flex items-center gap-2 text-[#D4CCBB] hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Auction
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10">
              <img
                src={getPhotoUrlFromDb(tiebreaker.basePlayer.photoUrl)}
                alt={tiebreaker.basePlayer.name}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
              />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                Tiebreaker
              </h1>
              <p className="text-sm text-[#D4CCBB]">
                {tiebreaker.basePlayer.name} — Round {tiebreaker.round.roundNumber}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Your Budget</div>
              <div className="text-xl font-bold text-white">£{budget.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Original Bid</div>
              <div className="text-xl font-bold text-white">£{tiebreaker.originalAmount.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-[#7A7367] mb-1">Status</div>
              <div className={`text-xl font-bold ${myBid?.submitted ? 'text-emerald-400' : 'text-amber-400'}`}>
                {myBid?.submitted ? 'Submitted' : 'Pending'}
              </div>
            </div>
          </div>

          {/* Reserve Information */}
          {reserveInfo && (
            <div className={`mt-4 rounded-lg border p-4 ${
              reserveInfo.phase === 'phase_1' 
                ? 'bg-red-500/10 border-red-500/30'
                : reserveInfo.phase === 'phase_2'
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  reserveInfo.phase === 'phase_1' 
                    ? 'bg-red-500/20 text-red-300'
                    : reserveInfo.phase === 'phase_2'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`text-sm font-bold mb-1 ${
                    reserveInfo.phase === 'phase_1' 
                      ? 'text-red-300'
                      : reserveInfo.phase === 'phase_2'
                      ? 'text-amber-300'
                      : 'text-blue-300'
                  }`}>
                    Budget Reserve - {reserveInfo.phase === 'phase_1' ? 'Phase 1 (Strict)' : reserveInfo.phase === 'phase_2' ? 'Phase 2 (Soft)' : 'Phase 3 (Flexible)'}
                  </h3>
                  <div className="space-y-1 text-xs text-white/80">
                    <p><strong>Required Reserve:</strong> £{reserveInfo.floorReserve.toLocaleString()}</p>
                    <p><strong>Maximum Bid:</strong> £{reserveInfo.maxBid.toLocaleString()}</p>
                    {reserveInfo.phase === 'phase_2' && (
                      <>
                        <p className="text-amber-300"><strong>Recommended Max:</strong> £{reserveInfo.maxRecommendedBid.toLocaleString()}</p>
                        {reserveInfo.breakdown.phase2Reserve !== undefined && reserveInfo.breakdown.phase3Reserve !== undefined && (
                          <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                            <p className="text-white/60 font-semibold mb-1">Breakdown:</p>
                            <p className="text-emerald-400">
                              • Participate in this + remaining Phase 2: Reserve £{reserveInfo.reserve.toLocaleString()} = {reserveInfo.breakdown.phase2Reserve > 0 ? `Phase 2 (£${reserveInfo.breakdown.phase2Reserve.toLocaleString()})` : ''}{reserveInfo.breakdown.phase2Reserve > 0 && reserveInfo.breakdown.phase3Reserve > 0 ? ' + ' : ''}{reserveInfo.breakdown.phase3Reserve > 0 ? `Phase 3 (£${reserveInfo.breakdown.phase3Reserve.toLocaleString()})` : ''}
                            </p>
                            <p className="text-red-400">
                              • Skip this + remaining Phase 2: Reserve £{reserveInfo.floorReserve.toLocaleString()} (Phase 3 only)
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    <p className="text-white/60 text-xs mt-1">{reserveInfo.calculation}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Info Box */}
        <div className="mb-6 rounded-xl bg-purple-500/10 border border-purple-500/30 p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Tiebreaker Required</h3>
              <p className="text-sm text-purple-200 mb-2">
                Multiple teams bid £{tiebreaker.originalAmount.toLocaleString()} for {tiebreaker.basePlayer.name}.
              </p>
              <p className="text-sm text-purple-200">
                Submit a higher bid to win this player. The highest bid wins.
              </p>
            </div>
          </div>
        </div>

        {/* Tied Teams Status */}
        <div className="mb-6 rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Tied Teams ({liveTeams.length})</h2>
          <div className="space-y-3">
            {liveTeams.map((tiedTeam) => (
              <div
                key={tiedTeam.teamId}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  tiedTeam.isCurrentTeam
                    ? 'bg-[#E8A800]/10 border-[#E8A800]/30'
                    : 'bg-black/30 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {tiedTeam.teamLogo && (
                    <img
                      src={tiedTeam.teamLogo}
                      alt={tiedTeam.teamName}
                      loading="eager"
                      decoding="async"
                      className="w-8 h-8 rounded"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-team-logo.png' }}
                    />
                  )}
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      {tiedTeam.teamName}
                      {tiedTeam.isCurrentTeam && (
                        <span className="px-2 py-0.5 rounded-full bg-[#E8A800]/20 text-[#E8A800] text-xs font-bold border border-[#E8A800]/30">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      Original bid: £{tiedTeam.oldBidAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {tiedTeam.submitted ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span className="text-sm font-bold text-emerald-400">Submitted</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                      <span className="text-sm font-bold text-amber-400">Pending</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Submission Progress</span>
              <span className="font-bold text-white">
                {liveTeams.filter(t => t.submitted).length} / {liveTeams.length} submitted
              </span>
            </div>
          </div>
        </div>

        {/* Bidding Form */}
        {!myBid?.submitted && tiebreaker.status === 'active' && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Submit Your New Bid</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                New Bid Amount (must be higher than £{tiebreaker.originalAmount.toLocaleString()})
              </label>
              <input
                type="number"
                value={newBidAmount}
                onChange={(e) => setNewBidAmount(parseInt(e.target.value) || 0)}
                min={tiebreaker.originalAmount + 1}
                max={maxBidLimit}
                step={1000}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-xl font-bold focus:outline-none focus:border-[#E8A800]"
              />
              
              {/* Quick Increment Buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setNewBidAmount(prev => Math.min(prev + 5, maxBidLimit))}
                  disabled={newBidAmount + 5 > maxBidLimit}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-[#E8A800]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  +£5
                </button>
                <button
                  onClick={() => setNewBidAmount(prev => Math.min(prev + 10, maxBidLimit))}
                  disabled={newBidAmount + 10 > maxBidLimit}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-[#E8A800]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  +£10
                </button>
              </div>
              
              <p className="text-xs text-[#7A7367] mt-2">
                Minimum: £{(tiebreaker.originalAmount + 1).toLocaleString()} • Maximum: £{maxBidLimit.toLocaleString()}
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || newBidAmount <= tiebreaker.originalAmount || newBidAmount > maxBidLimit}
              className="w-full px-6 py-3 rounded-lg bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-bold transition-all disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : `Submit Bid of £${newBidAmount.toLocaleString()}`}
            </button>
          </div>
        )}

        {/* Submitted State */}
        {myBid?.submitted && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Bid Submitted</h3>
            <p className="text-emerald-300 mb-4">
              You bid £{myBid.newBidAmount?.toLocaleString()} for {tiebreaker.basePlayer.name}
            </p>
            <p className="text-sm text-[#D4CCBB]">
              Waiting for other teams to submit their bids...
            </p>
          </div>
        )}

        {/* Resolved State */}
        {tiebreakerStatus !== 'active' && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Tiebreaker Resolved!</h3>
            <p className="text-emerald-300 mb-4">
              This tiebreaker has been resolved. Check the auction results for details.
            </p>
            {redirectCountdown !== null && redirectCountdown > 0 && (
              <p className="text-sm text-[#D4CCBB]">
                Redirecting to auction dashboard in <span className="font-bold text-white">{redirectCountdown}</span>s...
              </p>
            )}
            <button
              onClick={() => router.push('/team/auction')}
              className="mt-4 px-6 py-2 rounded-lg bg-[#E8A800] text-black font-bold hover:bg-[#E8A800]/90 transition-all"
            >
              Go to Dashboard Now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
