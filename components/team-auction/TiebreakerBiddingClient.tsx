'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

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
}

export default function TiebreakerBiddingClient({
  tiebreaker,
  team,
  budget,
  myBid
}: TiebreakerBiddingClientProps) {
  const router = useRouter()
  const [newBidAmount, setNewBidAmount] = useState(myBid?.newBidAmount || tiebreaker.originalAmount + 1000)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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

      if (newBidAmount > budget) {
        throw new Error('Insufficient budget')
      }

      const response = await fetch(`/api/tiebreakers/${tiebreaker.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newBidAmount
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit bid')
      }

      setMessage({ type: 'success', text: 'Bid submitted successfully!' })
      router.refresh()
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
              <Image
                src={tiebreaker.basePlayer.photoUrl}
                alt={tiebreaker.basePlayer.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
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
                max={budget}
                step={1000}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-xl font-bold focus:outline-none focus:border-[#E8A800]"
              />
              <p className="text-xs text-[#7A7367] mt-2">
                Minimum: £{(tiebreaker.originalAmount + 1).toLocaleString()} • Maximum: £{budget.toLocaleString()}
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || newBidAmount <= tiebreaker.originalAmount || newBidAmount > budget}
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
        {tiebreaker.status !== 'active' && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Tiebreaker Resolved</h3>
            <p className="text-[#D4CCBB]">
              This tiebreaker has been resolved. Check the auction results for details.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
