"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import PageLoader from "@/components/ui/PageLoader"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

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
  roundType: 'normal' | 'bulk';
}

export default function NewCalendarPage({ params }: NewCalendarPageProps) {
  const router = useRouter()
  const [seasonId, setSeasonId] = useState<string>('')
  const [auctionDates, setAuctionDates] = useState([
    { auctionDate: '', auctionTime: '', description: '', positionSlots: [] as PositionSlot[] }
  ])
  const [builderStates, setBuilderStates] = useState<Record<number, { roundType: 'normal' | 'bulk'; selectedPositions: string[]; selectedGroup: 'A' | 'B' | 'ALL' }>>({})
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

  const getBuilderState = (index: number) => {
    return builderStates[index] || { roundType: 'normal', selectedPositions: [], selectedGroup: 'ALL' }
  }

  const updateBuilderState = (index: number, field: string, value: any) => {
    setBuilderStates(prev => ({
      ...prev,
      [index]: {
        ...getBuilderState(index),
        [field]: value
      }
    }))
  }

  const togglePositionSlot = (index: number, position: string, group?: 'A' | 'B' | 'ALL') => {
    const updated = [...auctionDates]
    const slots = updated[index].positionSlots
    const targetGroup = group || 'ALL'
    
    // Check if this exact slot already exists
    const existingIndex = slots.findIndex(s => s.position === position && s.group === targetGroup && s.roundType === 'normal')
    
    if (existingIndex >= 0) {
      // Remove the slot
      updated[index].positionSlots = slots.filter((_, i) => i !== existingIndex)
    } else {
      // Add the slot
      updated[index].positionSlots = [...slots, { position, group: targetGroup, roundType: 'normal' }]
    }
    
    setAuctionDates(updated)
  }

  const hasPositionSlot = (index: number, position: string, group?: 'A' | 'B' | 'ALL') => {
    return auctionDates[index].positionSlots.some(s => s.position === position && s.group === (group || 'ALL') && s.roundType === 'normal')
  }

  const addSlot = (index: number, position: string, group: 'A' | 'B' | 'ALL', roundType: 'normal' | 'bulk') => {
    const updated = [...auctionDates]
    const slots = updated[index].positionSlots
    
    if (!slots.some(s => s.position === position && s.group === group && s.roundType === roundType)) {
      updated[index].positionSlots = [...slots, { position, group, roundType }]
      setAuctionDates(updated)
    }
  }

  const removeSlot = (index: number, slotIndex: number) => {
    const updated = [...auctionDates]
    updated[index].positionSlots = updated[index].positionSlots.filter((_, i) => i !== slotIndex)
    setAuctionDates(updated)
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
      // Combine date and time for each auction in the local timezone and convert to ISO string
      const formattedAuctionDates = auctionDates.map(auction => {
        const localDate = new Date(`${auction.auctionDate}T${auction.auctionTime}:00`)
        return {
          auctionDate: localDate.toISOString(),
          description: auction.description,
          positionSlots: auction.positionSlots
        }
      })

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
    return <PageLoader />
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
                  Configured Position Slots <span className="text-red-400">*</span>
                </label>
                
                {/* Configured Slots List */}
                <div className="mb-6">
                  {auction.positionSlots.length === 0 ? (
                    <div className="text-sm text-gray-500 italic p-4 bg-black/25 border border-white/5 rounded-xl text-center">
                      No slots configured yet. Use the Slot Builder below to add position slots.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-3 bg-black/25 border border-white/5 rounded-xl">
                      {auction.positionSlots.map((slot, slotIdx) => (
                        <div
                          key={`${slot.position}-${slot.group}-${slotIdx}`}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            slot.roundType === 'bulk'
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:border-purple-500/50'
                              : 'bg-[#E8A800]/10 border-[#E8A800]/20 text-[#E8A800] hover:border-[#E8A800]/45'
                          }`}
                        >
                          <span>
                            {slot.position}{slot.group && slot.group !== 'ALL' ? `-${slot.group}` : ''}
                            <span className="opacity-60 font-normal ml-1">({slot.roundType === 'bulk' ? 'Bulk' : 'Normal'})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSlot(index, slotIdx)}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Slot Builder UI */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
                  <div className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                    Slot Builder
                  </div>

                  {/* Choose Slot Type */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
                      Round Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => updateBuilderState(index, 'roundType', 'normal')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                          getBuilderState(index).roundType === 'normal'
                            ? 'bg-[#E8A800]/10 border-[#E8A800] text-[#E8A800]'
                            : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/15'
                        }`}
                      >
                        <span className="text-sm font-bold">Normal Round</span>
                        <span className="text-[10px] opacity-70 mt-0.5">Single position standard round</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => updateBuilderState(index, 'roundType', 'bulk')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                          getBuilderState(index).roundType === 'bulk'
                            ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                            : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/15'
                        }`}
                      >
                        <span className="text-sm font-bold">Bulk Round</span>
                        <span className="text-[10px] opacity-70 mt-0.5">Multi-position group bidding</span>
                      </button>
                    </div>
                  </div>

                  {/* Builder Forms based on type */}
                  {getBuilderState(index).roundType === 'normal' ? (
                    <div className="space-y-4 pt-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase">
                        Select Position (Click to Add as Normal Slot)
                      </label>
                      {/* Goalkeeper */}
                      <div>
                        <div className="text-[10px] font-bold text-yellow-400/80 mb-1.5">GOALKEEPER</div>
                        <button
                          type="button"
                          onClick={() => addSlot(index, 'GK', 'ALL', 'normal')}
                          className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-xs hover:border-[#E8A800]/50 hover:text-white transition-all"
                        >
                          GK
                        </button>
                      </div>

                      {/* Defenders */}
                      <div>
                        <div className="text-[10px] font-bold text-blue-400/80 mb-1.5">DEFENDERS</div>
                        <div className="space-y-2">
                          {['CB', 'LB', 'RB'].map((position) => (
                            <div key={position} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white w-8">{position}</span>
                              {GROUPED_POSITIONS.includes(position) ? (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => addSlot(index, position, 'A', 'normal')}
                                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-blue-500/50 hover:text-white transition-all"
                                  >
                                    Group A
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => addSlot(index, position, 'B', 'normal')}
                                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-purple-500/50 hover:text-white transition-all"
                                  >
                                    Group B
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => addSlot(index, position, 'ALL', 'normal')}
                                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-gray-500/50 hover:text-white transition-all"
                                  >
                                    All
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addSlot(index, position, 'ALL', 'normal')}
                                  className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-blue-500/50 hover:text-white transition-all"
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
                        <div className="text-[10px] font-bold text-green-400/80 mb-1.5">MIDFIELDERS</div>
                        <div className="space-y-2">
                          {['DMF', 'CMF', 'LMF', 'RMF', 'AMF'].map((position) => (
                            <div key={position} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white w-8">{position}</span>
                              {GROUPED_POSITIONS.includes(position) ? (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => addSlot(index, position, 'A', 'normal')}
                                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-green-500/50 hover:text-white transition-all"
                                  >
                                    Group A
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => addSlot(index, position, 'B', 'normal')}
                                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-purple-500/50 hover:text-white transition-all"
                                  >
                                    Group B
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => addSlot(index, position, 'ALL', 'normal')}
                                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-gray-500/50 hover:text-white transition-all"
                                  >
                                    All
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addSlot(index, position, 'ALL', 'normal')}
                                  className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-green-500/50 hover:text-white transition-all"
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
                        <div className="text-[10px] font-bold text-red-400/80 mb-1.5">FORWARDS</div>
                        <div className="space-y-2">
                          {['SS', 'LWF', 'RWF', 'CF'].map((position) => (
                            <div key={position} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white w-8">{position}</span>
                              {GROUPED_POSITIONS.includes(position) ? (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => addSlot(index, position, 'A', 'normal')}
                                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-red-500/50 hover:text-white transition-all"
                                  >
                                    Group A
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => addSlot(index, position, 'B', 'normal')}
                                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-purple-500/50 hover:text-white transition-all"
                                  >
                                    Group B
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => addSlot(index, position, 'ALL', 'normal')}
                                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-gray-500/50 hover:text-white transition-all"
                                  >
                                    All
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addSlot(index, position, 'ALL', 'normal')}
                                  className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-bold text-[10px] hover:border-red-500/50 hover:text-white transition-all"
                                >
                                  {position}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Select Buttons */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newSlots = POSITIONS.map(p => ({ position: p, group: 'ALL' as const, roundType: 'normal' as const }));
                            const currentSlots = [...auction.positionSlots];
                            newSlots.forEach(ns => {
                              if (!currentSlots.some(s => s.position === ns.position && s.group === ns.group && s.roundType === ns.roundType)) {
                                currentSlots.push(ns);
                              }
                            });
                            updateAuctionDate(index, 'positionSlots', currentSlots);
                          }}
                          className="px-3 py-1.5 bg-[#E8A800]/10 border border-[#E8A800]/20 text-[#E8A800] rounded-lg text-xs font-bold hover:bg-[#E8A800]/20 transition-all"
                        >
                          Select All (Normal)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAuctionDate(index, 'positionSlots', [])}
                          className="px-3 py-1.5 bg-gray-500/10 border border-gray-500/20 text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-500/20 transition-all"
                        >
                          Clear All Slots
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const defenders = ['CB', 'LB', 'RB'];
                            const newSlots = defenders.map(p => ({ position: p, group: 'ALL' as const, roundType: 'normal' as const }));
                            const currentSlots = [...auction.positionSlots];
                            newSlots.forEach(ns => {
                              if (!currentSlots.some(s => s.position === ns.position && s.group === ns.group && s.roundType === ns.roundType)) {
                                currentSlots.push(ns);
                              }
                            });
                            updateAuctionDate(index, 'positionSlots', currentSlots);
                          }}
                          className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500/20 transition-all"
                        >
                          Defenders Only (Normal)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const midfielders = ['DMF', 'CMF', 'LMF', 'RMF', 'AMF'];
                            const newSlots = midfielders.map(p => ({ position: p, group: 'ALL' as const, roundType: 'normal' as const }));
                            const currentSlots = [...auction.positionSlots];
                            newSlots.forEach(ns => {
                              if (!currentSlots.some(s => s.position === ns.position && s.group === ns.group && s.roundType === ns.roundType)) {
                                currentSlots.push(ns);
                              }
                            });
                            updateAuctionDate(index, 'positionSlots', currentSlots);
                          }}
                          className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/20 transition-all"
                        >
                          Midfielders Only (Normal)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const forwards = ['SS', 'LWF', 'RWF', 'CF'];
                            const newSlots = forwards.map(p => ({ position: p, group: 'ALL' as const, roundType: 'normal' as const }));
                            const currentSlots = [...auction.positionSlots];
                            newSlots.forEach(ns => {
                              if (!currentSlots.some(s => s.position === ns.position && s.group === ns.group && s.roundType === ns.roundType)) {
                                currentSlots.push(ns);
                              }
                            });
                            updateAuctionDate(index, 'positionSlots', currentSlots);
                          }}
                          className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all"
                        >
                          Forwards Only (Normal)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      {/* Bulk Builder Form */}
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                          1. Check Positions to include in this Bulk Slot
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-3 bg-black/35 rounded-xl border border-white/5">
                          {POSITIONS.map(p => {
                            const isChecked = getBuilderState(index).selectedPositions.includes(p);
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => {
                                  const currentSel = getBuilderState(index).selectedPositions;
                                  if (currentSel.includes(p)) {
                                    updateBuilderState(index, 'selectedPositions', currentSel.filter(x => x !== p));
                                  } else {
                                    updateBuilderState(index, 'selectedPositions', [...currentSel, p]);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg border-2 font-bold text-xs flex items-center justify-between transition-all ${
                                  isChecked
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400 font-black'
                                    : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                <span>{p}</span>
                                {isChecked && (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Group Selector */}
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                          2. Group Division (Optional)
                        </label>
                        <div className="flex gap-2">
                          {['ALL', 'A', 'B'].map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => updateBuilderState(index, 'selectedGroup', g)}
                              className={`px-4 py-2 rounded-lg border transition-all text-xs font-bold ${
                                getBuilderState(index).selectedGroup === g
                                  ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                  : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                              }`}
                            >
                              {g === 'ALL' ? 'All (No division)' : `Group ${g}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Add Bulk Slot Trigger */}
                      <button
                        type="button"
                        disabled={getBuilderState(index).selectedPositions.length === 0}
                        onClick={() => {
                          const state = getBuilderState(index);
                          if (state.selectedPositions.length > 0) {
                            const joined = state.selectedPositions.join(',');
                            addSlot(index, joined, state.selectedGroup, 'bulk');
                            // Reset selections
                            updateBuilderState(index, 'selectedPositions', []);
                          }
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-800 disabled:to-gray-900 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs tracking-wide uppercase transition-all shadow-md"
                      >
                        Add Bulk Slot (Positions: {getBuilderState(index).selectedPositions.join(', ') || 'none'})
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {auction.auctionDate && auction.positionSlots.length > 0 && (
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
                    {auction.positionSlots.map((slot, idx) => (
                      <div
                        key={`${slot.position}-${slot.group}-${idx}`}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all ${
                          slot.roundType === 'bulk'
                            ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                            : 'bg-[#E8A800]/20 border-[#E8A800]/30 text-[#E8A800]'
                        }`}
                      >
                        {slot.position}{slot.group && slot.group !== 'ALL' ? `-${slot.group}` : ''}
                        <span className="opacity-60 font-normal ml-1">({slot.roundType === 'bulk' ? 'Bulk' : 'Normal'})</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {auction.positionSlots.length} position slot{auction.positionSlots.length !== 1 ? 's' : ''}
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
              className="flex-1 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] px-4 sm:px-6 py-3 rounded-xl font-bold transition-all text-sm sm:text-base flex items-center justify-center gap-2"
            >
              {isSubmitting && <LoadingSpinner size="sm" />}
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
