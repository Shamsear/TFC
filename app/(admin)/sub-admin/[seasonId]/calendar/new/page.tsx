"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface NewCalendarPageProps {
  params: Promise<{
    seasonId: string
  }>
}

// Icon Components
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'SS', 'LWF', 'RWF', 'CF'];
const GROUPED_POSITIONS = ['CB', 'DMF', 'CMF', 'AMF', 'CF'];

interface PositionSlot {
  position: string;
  group?: 'A' | 'B' | 'ALL';
}

export default function NewCalendarPage({ params }: NewCalendarPageProps) {
  const router = useRouter()
  const [seasonId, setSeasonId] = useState<string>('')
  const [auctionDates, setAuctionDates] = useState([
    { auctionDate: '', auctionTime: '', description: '', positionSlots: [] as PositionSlot[] }
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Unwrap params using useEffect
  useEffect(() => {
    params.then(p => setSeasonId(p.seasonId))
  }, [params])

  const addAuctionDate = () => {
    setAuctionDates([...auctionDates, { auctionDate: '', auctionTime: '', description: '', positionSlots: [] }])
  }

  const removeAuctionDate = (index: number) => {
    if (auctionDates.length > 1) {
      setAuctionDates(auctionDates.filter((_, i) => i !== index))
    }
  }

  const updateAuctionDate = (index: number, field: string, value: any) => {
    const updated = [...auctionDates]
    updated[index] = { ...updated[index], [field]: value }
    setAuctionDates(updated)
  }

  const togglePositionSlot = (index: number, position: string, group?: 'A' | 'B' | 'ALL') => {
    const updated = [...auctionDates]
    const slots = updated[index].positionSlots
    
    // Check if this exact slot already exists
    const existingIndex = slots.findIndex(s => s.position === position && s.group === group)
    
    if (existingIndex >= 0) {
      // Remove the slot
      updated[index].positionSlots = slots.filter((_, i) => i !== existingIndex)
    } else {
      // Add the slot
      updated[index].positionSlots = [...slots, { position, group: group || 'ALL' }]
    }
    
    setAuctionDates(updated)
  }

  const hasPositionSlot = (index: number, position: string, group?: 'A' | 'B' | 'ALL') => {
    return auctionDates[index].positionSlots.some(s => s.position === position && s.group === group)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate all dates
    for (let i = 0; i < auctionDates.length; i++) {
      if (!auctionDates[i].auctionDate) {
        setError(`Please select a date for auction ${i + 1}`)
        return
      }
      if (!auctionDates[i].auctionTime) {
        setError(`Please select a time for auction ${i + 1}`)
        return
      }
      if (auctionDates[i].positionSlots.length === 0) {
        setError(`Please select at least one position slot for auction ${i + 1}`)
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Combine date and time for each auction
      const formattedAuctionDates = auctionDates.map(auction => ({
        auctionDate: `${auction.auctionDate}T${auction.auctionTime}:00`,
        description: auction.description,
        positionSlots: auction.positionSlots
      }))

      const response = await fetch(`/api/seasons/${seasonId}/calendar/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ auctionDates: formattedAuctionDates })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create auction dates')
      }

      router.push(`/sub-admin/${seasonId}/calendar`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create auction dates')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!seasonId) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href={`/sub-admin/${seasonId}/calendar`}
          className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] mb-4 sm:mb-6 transition-colors font-medium text-sm sm:text-base"
        >
          <ArrowLeftIcon />
          Back to Calendar
        </Link>

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2">
            Add Auction Date
          </h1>
          <p className="text-sm sm:text-base text-[#D4CCBB]">
            Create new auction dates with position slots for the season
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-xl flex items-start gap-2 sm:gap-3 text-sm sm:text-base">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Auction Dates */}
          {auctionDates.map((auction, index) => (
            <div key={index} className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Auction Date {index + 1}
                </h3>
                {auctionDates.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAuctionDate(index)}
                    className="px-2 sm:px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs sm:text-sm font-bold hover:bg-red-500/30 transition-all"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Date, Time and Description Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold mb-2 text-white">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={auction.auctionDate}
                    onChange={(e) => updateAuctionDate(index, 'auctionDate', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800] focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white text-sm sm:text-base"
                    required
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold mb-2 text-white">
                    Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={auction.auctionTime}
                    onChange={(e) => updateAuctionDate(index, 'auctionTime', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800] focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white text-sm sm:text-base"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold mb-2 text-white">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={auction.description}
                    onChange={(e) => updateAuctionDate(index, 'description', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800] focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white placeholder-gray-500 text-sm sm:text-base"
                    placeholder="e.g., Day 1 - Goalkeepers"
                  />
                </div>
              </div>

              {/* Position Selection */}
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-3 text-white">
                  Position Slots <span className="text-red-400">*</span>
                </label>
                
                {/* Position Categories */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Goalkeeper */}
                  <div>
                    <div className="text-xs font-bold text-yellow-400 mb-2">GOALKEEPER</div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => togglePositionSlot(index, 'GK', 'ALL')}
                        className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                          hasPositionSlot(index, 'GK', 'ALL')
                            ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                            : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        GK
                      </button>
                    </div>
                  </div>

                  {/* Defenders */}
                  <div>
                    <div className="text-xs font-bold text-blue-400 mb-2">DEFENDERS</div>
                    <div className="space-y-2">
                      {['CB', 'LB', 'RB'].map((position) => (
                        <div key={position} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white w-8">{position}</span>
                          {GROUPED_POSITIONS.includes(position) ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(index, position, 'A')}
                                className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                  hasPositionSlot(index, position, 'A')
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                Group A
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(index, position, 'B')}
                                className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                  hasPositionSlot(index, position, 'B')
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                Group B
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(index, position, 'ALL')}
                                className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                  hasPositionSlot(index, position, 'ALL')
                                    ? 'bg-gray-500/20 border-gray-500 text-gray-300'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                All
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => togglePositionSlot(index, position, 'ALL')}
                              className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                hasPositionSlot(index, position, 'ALL')
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                  : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                              }`}
                            >
                              {position}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Midfielders */}
                  <div>
                    <div className="text-xs font-bold text-green-400 mb-2">MIDFIELDERS</div>
                    <div className="space-y-2">
                      {['DMF', 'CMF', 'LMF', 'RMF', 'AMF'].map((position) => (
                        <div key={position} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white w-8">{position}</span>
                          {GROUPED_POSITIONS.includes(position) ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(index, position, 'A')}
                                className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                  hasPositionSlot(index, position, 'A')
                                    ? 'bg-green-500/20 border-green-500 text-green-400'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                Group A
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(index, position, 'B')}
                                className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                  hasPositionSlot(index, position, 'B')
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                Group B
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(index, position, 'ALL')}
                                className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                  hasPositionSlot(index, position, 'ALL')
                                    ? 'bg-gray-500/20 border-gray-500 text-gray-300'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                All
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => togglePositionSlot(index, position, 'ALL')}
                              className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                hasPositionSlot(index, position, 'ALL')
                                  ? 'bg-green-500/20 border-green-500 text-green-400'
                                  : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                              }`}
                            >
                              {position}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Forwards */}
                  <div>
                    <div className="text-xs font-bold text-red-400 mb-2">FORWARDS</div>
                    <div className="space-y-2">
                      {['SS', 'LWF', 'RWF', 'CF'].map((position) => (
                        <div key={position} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white w-8">{position}</span>
                          {GROUPED_POSITIONS.includes(position) ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(index, position, 'A')}
                                className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                  hasPositionSlot(index, position, 'A')
                                    ? 'bg-red-500/20 border-red-500 text-red-400'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                Group A
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(index, position, 'B')}
                                className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                  hasPositionSlot(index, position, 'B')
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                Group B
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(index, position, 'ALL')}
                                className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                  hasPositionSlot(index, position, 'ALL')
                                    ? 'bg-gray-500/20 border-gray-500 text-gray-300'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                All
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => togglePositionSlot(index, position, 'ALL')}
                              className={`px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${
                                hasPositionSlot(index, position, 'ALL')
                                  ? 'bg-red-500/20 border-red-500 text-red-400'
                                  : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                              }`}
                            >
                              {position}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Select Buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateAuctionDate(index, 'positions', POSITIONS)}
                    className="px-3 py-1 bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] rounded-lg text-xs font-bold hover:bg-[#E8A800]/30 transition-all"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAuctionDate(index, 'positions', [])}
                    className="px-3 py-1 bg-gray-500/20 border border-gray-500/30 text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-500/30 transition-all"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAuctionDate(index, 'positions', ['CB', 'LB', 'RB'])}
                    className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500/30 transition-all"
                  >
                    Defenders Only
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAuctionDate(index, 'positions', ['DMF', 'CMF', 'LMF', 'RMF', 'AMF'])}
                    className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/30 transition-all"
                  >
                    Midfielders Only
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAuctionDate(index, 'positions', ['SS', 'LWF', 'RWF', 'CF'])}
                    className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-all"
                  >
                    Forwards Only
                  </button>
                </div>
              </div>

              {/* Preview */}
              {auction.auctionDate && auction.positions.length > 0 && (
                <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon />
                    <div className="text-base sm:text-lg font-bold text-white">
                      {new Date(auction.auctionDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {auction.auctionTime && (
                        <span className="text-[#E8A800] ml-2">
                          @ {auction.auctionTime}
                        </span>
                      )}
                    </div>
                  </div>
                  {auction.description && (
                    <div className="text-xs sm:text-sm text-gray-400 mb-3">{auction.description}</div>
                  )}
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {auction.positions.map((position) => (
                      <div
                        key={position}
                        className="px-2 py-1 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] text-xs font-bold"
                      >
                        {position}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {auction.positions.length} position slot{auction.positions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add More Button */}
          <button
            type="button"
            onClick={addAuctionDate}
            className="w-full py-3 sm:py-4 bg-white/5 border-2 border-dashed border-white/20 hover:border-[#E8A800]/50 hover:bg-white/10 text-white rounded-xl font-bold transition-all text-sm sm:text-base"
          >
            + Add Another Auction Date
          </button>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] px-4 sm:px-6 py-3 rounded-xl font-bold transition-all text-sm sm:text-base"
            >
              {isSubmitting ? 'Creating...' : `Create ${auctionDates.length} Auction Date${auctionDates.length > 1 ? 's' : ''}`}
            </button>
            <Link
              href={`/sub-admin/${seasonId}/calendar`}
              className="px-4 sm:px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold transition-all text-center text-sm sm:text-base"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
