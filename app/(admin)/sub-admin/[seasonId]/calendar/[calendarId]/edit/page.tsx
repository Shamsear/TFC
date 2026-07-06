'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PageLoader from "@/components/ui/PageLoader"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

interface EditCalendarPageProps {
  params: Promise<{
    seasonId: string
    calendarId: string
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

const SaveIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'SS', 'LWF', 'RWF', 'CF'];
const GROUPED_POSITIONS = ['CB', 'DMF', 'CMF', 'AMF', 'CF'];

interface PositionSlot {
  position: string;
  group?: 'A' | 'B' | 'ALL';
  roundType: 'normal' | 'bulk';
  positionHidden?: boolean;
}

export default function EditCalendarPage({ params }: EditCalendarPageProps) {
  const router = useRouter()
  const [seasonId, setSeasonId] = useState<string>('')
  const [calendarId, setCalendarId] = useState<string>('')
  const [auctionDate, setAuctionDate] = useState('')
  const [auctionTime, setAuctionTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [positionSlots, setPositionSlots] = useState<PositionSlot[]>([])
  const [builderState, setBuilderState] = useState<{ roundType: 'normal' | 'bulk'; selectedPositions: string[]; selectedGroup: 'A' | 'B' | 'ALL'; positionHidden: boolean }>({
    roundType: 'normal',
    selectedPositions: [],
    selectedGroup: 'ALL',
    positionHidden: false
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    params.then(({ seasonId: sid, calendarId: cid }) => {
      setSeasonId(sid)
      setCalendarId(cid)
      
      // Fetch existing calendar data
      fetch(`/api/seasons/${sid}/calendar/${cid}`)
        .then(res => res.json())
        .then(data => {
          const dateObj = new Date(data.auctionDate)
          // Extract local date and time in the user's browser timezone
          const year = dateObj.getFullYear()
          const month = String(dateObj.getMonth() + 1).padStart(2, '0')
          const day = String(dateObj.getDate()).padStart(2, '0')
          const hours = String(dateObj.getHours()).padStart(2, '0')
          const minutes = String(dateObj.getMinutes()).padStart(2, '0')
          
          setAuctionDate(`${year}-${month}-${day}`)
          setAuctionTime(`${hours}:${minutes}`)
          
          // Handle endDate if it exists
          if (data.endDate) {
            const endDateObj = new Date(data.endDate)
            const endYear = endDateObj.getFullYear()
            const endMonth = String(endDateObj.getMonth() + 1).padStart(2, '0')
            const endDay = String(endDateObj.getDate()).padStart(2, '0')
            const endHours = String(endDateObj.getHours()).padStart(2, '0')
            const endMinutes = String(endDateObj.getMinutes()).padStart(2, '0')
            
            setEndDate(`${endYear}-${endMonth}-${endDay}`)
            setEndTime(`${endHours}:${endMinutes}`)
          } else {
            // If no endDate, default to +3 hours from auctionDate
            const defaultEndDate = new Date(dateObj.getTime() + 3 * 60 * 60 * 1000)
            const endYear = defaultEndDate.getFullYear()
            const endMonth = String(defaultEndDate.getMonth() + 1).padStart(2, '0')
            const endDay = String(defaultEndDate.getDate()).padStart(2, '0')
            const endHours = String(defaultEndDate.getHours()).padStart(2, '0')
            const endMinutes = String(defaultEndDate.getMinutes()).padStart(2, '0')
            
            setEndDate(`${endYear}-${endMonth}-${endDay}`)
            setEndTime(`${endHours}:${endMinutes}`)
          }
          
          setDescription(data.description || '')
          setPositionSlots(data.auctionSlots.map((slot: any) => ({
            position: slot.position,
            group: slot.position_group || 'ALL',
            roundType: (slot.roundType || 'normal') as 'normal' | 'bulk',
            positionHidden: slot.positionHidden || false
          })))
          setLoading(false)
        })
        .catch(err => {
          console.error('Error fetching calendar:', err)
          setError('Failed to load calendar data')
          setLoading(false)
        })
    })
  }, [params])

  const addSlot = (position: string, group: 'A' | 'B' | 'ALL', roundType: 'normal' | 'bulk', positionHidden: boolean = false) => {
    const existingIndex = positionSlots.findIndex(s => s.position === position && s.group === group && s.roundType === roundType)
    
    if (existingIndex >= 0) {
      // Remove if already exists (deselect)
      setPositionSlots(prev => prev.filter((_, i) => i !== existingIndex))
    } else {
      // Add if doesn't exist (select)
      setPositionSlots(prev => [...prev, { position, group, roundType, positionHidden }])
    }
  }

  const hasPositionSlot = (position: string, group: 'A' | 'B' | 'ALL', roundType: 'normal' | 'bulk') => {
    return positionSlots.some(s => s.position === position && s.group === group && s.roundType === roundType)
  }

  const removeSlot = (slotIdx: number) => {
    setPositionSlots(prev => prev.filter((_, i) => i !== slotIdx))
  }

  const updateBuilderState = (field: string, value: any) => {
    setBuilderState(prev => ({
      ...prev,
      [field]: value
    }))
    
    // If updating positionHidden, update all existing slots
    if (field === 'positionHidden') {
      setPositionSlots(prev => prev.map(slot => ({
        ...slot,
        positionHidden: value
      })))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (positionSlots.length === 0) {
      setError('Please select at least one position slot')
      return
    }

    setSubmitting(true)

    try {
      // Combine date and time in the local timezone and convert to ISO string
      const localDateObj = new Date(`${auctionDate}T${auctionTime || '00:00'}:00`)
      const combinedDateTime = localDateObj.toISOString()
      
      // Calculate end date/time
      let combinedEndDateTime
      if (endDate && endTime) {
        const localEndDateObj = new Date(`${endDate}T${endTime}:00`)
        combinedEndDateTime = localEndDateObj.toISOString()
      } else {
        // Default to +3 hours if not specified
        combinedEndDateTime = new Date(localDateObj.getTime() + 3 * 60 * 60 * 1000).toISOString()
      }
      
      const response = await fetch(`/api/seasons/${seasonId}/calendar/${calendarId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionDate: combinedDateTime,
          endDate: combinedEndDateTime,
          description,
          positionSlots
        })
      })

      if (response.ok) {
        router.push(`/sub-admin/${seasonId}/calendar`)
        router.refresh()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update auction date')
      }
    } catch (error) {
      console.error('Error updating calendar:', error)
      setError('Failed to update auction date')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
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
            Edit Auction Date
          </h1>
          <p className="text-sm sm:text-base text-[#D4CCBB]">
            Update auction date and configured position slots for this event
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

          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 space-y-4 sm:space-y-6 backdrop-blur-xl shadow-md">
            {/* Date, Time and Description Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Start Date */}
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-2 text-white uppercase tracking-wider font-mono">
                  Start Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={auctionDate}
                  onChange={(e) => setAuctionDate(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E8A800]/50 transition-all text-white text-sm"
                  required
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-2 text-white uppercase tracking-wider font-mono">
                  Start Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  value={auctionTime}
                  onChange={(e) => setAuctionTime(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E8A800]/50 transition-all text-white text-sm"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-2 text-white uppercase tracking-wider font-mono">
                  End Date (Deadline)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E8A800]/50 transition-all text-white text-sm"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-2 text-white uppercase tracking-wider font-mono">
                  End Time (Deadline)
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E8A800]/50 transition-all text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (auctionDate && auctionTime) {
                        const startDateTime = new Date(`${auctionDate}T${auctionTime}`)
                        const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000)
                        setEndDate(endDateTime.toISOString().split('T')[0])
                        setEndTime(endDateTime.toTimeString().slice(0, 5))
                      }
                    }}
                    className="px-4 py-2 bg-white/[0.02] border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/[0.04] hover:border-[#E8A800]/30 transition-all whitespace-nowrap uppercase tracking-wider font-mono cursor-pointer"
                    title="Set to +3 hours from start time"
                  >
                    +3h
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm font-bold mb-2 text-white uppercase tracking-wider font-mono">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E8A800]/50 transition-all text-white placeholder-gray-500 text-sm"
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
                {positionSlots.length === 0 ? (
                  <div className="text-sm text-gray-500 italic p-4 bg-black/25 border border-white/5 rounded-xl text-center">
                    No slots configured yet. Use the Slot Builder below to add position slots.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-black/25 border border-white/5 rounded-xl">
                    {positionSlots.map((slot, slotIdx) => (
                      <div
                        key={`${slot.position}-${slot.group}-${slotIdx}`}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          slot.roundType === 'bulk'
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:border-purple-500/50'
                            : 'bg-[#E8A800]/10 border-[#E8A800]/20 text-[#E8A800] hover:border-[#E8A800]/45'
                        } ${slot.positionHidden ? 'opacity-75' : ''}`}
                      >
                        <span>
                          {slot.positionHidden ? '???' : slot.position}{slot.group && slot.group !== 'ALL' && !slot.positionHidden ? `-${slot.group}` : ''}
                          <span className="opacity-60 font-normal ml-1">
                            ({slot.roundType === 'bulk' ? 'Bulk' : 'Normal'}{slot.positionHidden ? ' • Hidden' : ''})
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSlot(slotIdx)}
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
                      onClick={() => updateBuilderState('roundType', 'normal')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        builderState.roundType === 'normal'
                          ? 'bg-[#E8A800]/10 border-[#E8A800] text-[#E8A800]'
                          : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/15'
                      }`}
                    >
                      <span className="text-sm font-bold">Normal Round</span>
                      <span className="text-[10px] opacity-70 mt-0.5">Single position standard round</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => updateBuilderState('roundType', 'bulk')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        builderState.roundType === 'bulk'
                          ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                          : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/15'
                      }`}
                    >
                      <span className="text-sm font-bold">Bulk Round</span>
                      <span className="text-[10px] opacity-70 mt-0.5">Multi-position group bidding</span>
                    </button>
                  </div>
                </div>

                {/* Position Visibility Toggle */}
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={builderState.positionHidden}
                      onChange={(e) => updateBuilderState('positionHidden', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-amber-500/30 bg-black/50 text-amber-500 focus:ring-amber-500/20 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-amber-400 uppercase">Hide Position (Mystery Round)</div>
                      <div className="text-[10px] text-amber-300/70 mt-0.5">
                        Position will be hidden from teams until you reveal it later. Shows as "???" in the calendar.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Builder Forms based on type */}
                {builderState.roundType === 'normal' ? (
                  <div className="space-y-4 pt-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase">
                      Select Position (Click to Add as Normal Slot)
                    </label>
                    {/* Goalkeeper */}
                    <div>
                      <div className="text-[10px] font-bold text-yellow-400/80 mb-1.5">GOALKEEPER</div>
                      <button
                        type="button"
                        onClick={() => addSlot('GK', 'ALL', 'normal', builderState.positionHidden)}
                        className={`px-3 py-2 rounded-lg border font-bold text-xs transition-all ${
                          hasPositionSlot('GK', 'ALL', 'normal')
                            ? 'bg-[#E8A800]/20 border-[#E8A800] text-[#E8A800]'
                            : 'bg-black/40 border-white/10 text-gray-300 hover:border-[#E8A800]/50 hover:text-white'
                        }`}
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
                                  onClick={() => addSlot(position, 'A', 'normal', builderState.positionHidden)}
                                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                    hasPositionSlot(position, 'A', 'normal')
                                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                      : 'bg-black/40 border-white/10 text-gray-300 hover:border-blue-500/50 hover:text-white'
                                  }`}
                                >
                                  Group A
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addSlot(position, 'B', 'normal', builderState.positionHidden)}
                                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                    hasPositionSlot(position, 'B', 'normal')
                                      ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                      : 'bg-black/40 border-white/10 text-gray-300 hover:border-purple-500/50 hover:text-white'
                                  }`}
                                >
                                  Group B
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addSlot(position, 'ALL', 'normal', builderState.positionHidden)}
                                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                    hasPositionSlot(position, 'ALL', 'normal')
                                      ? 'bg-gray-500/20 border-gray-500 text-gray-300'
                                      : 'bg-black/40 border-white/10 text-gray-300 hover:border-gray-500/50 hover:text-white'
                                  }`}
                                >
                                  All
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addSlot(position, 'ALL', 'normal', builderState.positionHidden)}
                                className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                  hasPositionSlot(position, 'ALL', 'normal')
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'bg-black/40 border-white/10 text-gray-300 hover:border-blue-500/50 hover:text-white'
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
                      <div className="text-[10px] font-bold text-green-400/80 mb-1.5">MIDFIELDERS</div>
                      <div className="space-y-2">
                        {['DMF', 'CMF', 'LMF', 'RMF', 'AMF'].map((position) => (
                          <div key={position} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white w-8">{position}</span>
                            {GROUPED_POSITIONS.includes(position) ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => addSlot(position, 'A', 'normal', builderState.positionHidden)}
                                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                    hasPositionSlot(position, 'A', 'normal')
                                      ? 'bg-green-500/20 border-green-500 text-green-400'
                                      : 'bg-black/40 border-white/10 text-gray-300 hover:border-green-500/50 hover:text-white'
                                  }`}
                                >
                                  Group A
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addSlot(position, 'B', 'normal', builderState.positionHidden)}
                                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                    hasPositionSlot(position, 'B', 'normal')
                                      ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                      : 'bg-black/40 border-white/10 text-gray-300 hover:border-purple-500/50 hover:text-white'
                                  }`}
                                >
                                  Group B
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addSlot(position, 'ALL', 'normal', builderState.positionHidden)}
                                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                    hasPositionSlot(position, 'ALL', 'normal')
                                      ? 'bg-gray-500/20 border-gray-500 text-gray-300'
                                      : 'bg-black/40 border-white/10 text-gray-300 hover:border-gray-500/50 hover:text-white'
                                  }`}
                                >
                                  All
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addSlot(position, 'ALL', 'normal', builderState.positionHidden)}
                                className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                  hasPositionSlot(position, 'ALL', 'normal')
                                    ? 'bg-green-500/20 border-green-500 text-green-400'
                                    : 'bg-black/40 border-white/10 text-gray-300 hover:border-green-500/50 hover:text-white'
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
                      <div className="text-[10px] font-bold text-red-400/80 mb-1.5">FORWARDS</div>
                      <div className="space-y-2">
                        {['SS', 'LWF', 'RWF', 'CF'].map((position) => (
                          <div key={position} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white w-8">{position}</span>
                            {GROUPED_POSITIONS.includes(position) ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => addSlot(position, 'A', 'normal', builderState.positionHidden)}
                                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                    hasPositionSlot(position, 'A', 'normal')
                                      ? 'bg-red-500/20 border-red-500 text-red-400'
                                      : 'bg-black/40 border-white/10 text-gray-300 hover:border-red-500/50 hover:text-white'
                                  }`}
                                >
                                  Group A
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addSlot(position, 'B', 'normal', builderState.positionHidden)}
                                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                    hasPositionSlot(position, 'B', 'normal')
                                      ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                      : 'bg-black/40 border-white/10 text-gray-300 hover:border-purple-500/50 hover:text-white'
                                  }`}
                                >
                                  Group B
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addSlot(position, 'ALL', 'normal', builderState.positionHidden)}
                                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                    hasPositionSlot(position, 'ALL', 'normal')
                                      ? 'bg-gray-500/20 border-gray-500 text-gray-300'
                                      : 'bg-black/40 border-white/10 text-gray-300 hover:border-gray-500/50 hover:text-white'
                                  }`}
                                >
                                  All
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addSlot(position, 'ALL', 'normal', builderState.positionHidden)}
                                className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                                  hasPositionSlot(position, 'ALL', 'normal')
                                    ? 'bg-red-500/20 border-red-500 text-red-400'
                                    : 'bg-black/40 border-white/10 text-gray-300 hover:border-red-500/50 hover:text-white'
                                }`}
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
                          const currentSlots = [...positionSlots];
                          newSlots.forEach(ns => {
                            if (!currentSlots.some(s => s.position === ns.position && s.group === ns.group && s.roundType === ns.roundType)) {
                              currentSlots.push(ns);
                            }
                          });
                          setPositionSlots(currentSlots);
                        }}
                        className="px-3 py-1.5 bg-[#E8A800]/10 border border-[#E8A800]/20 text-[#E8A800] rounded-lg text-xs font-bold hover:bg-[#E8A800]/20 transition-all"
                      >
                        Select All (Normal)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPositionSlots([])}
                        className="px-3 py-1.5 bg-gray-500/10 border border-gray-500/20 text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-500/20 transition-all"
                      >
                        Clear All Slots
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
                          const isChecked = builderState.selectedPositions.includes(p);
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                const currentSel = builderState.selectedPositions;
                                if (currentSel.includes(p)) {
                                  updateBuilderState('selectedPositions', currentSel.filter(x => x !== p));
                                } else {
                                  updateBuilderState('selectedPositions', [...currentSel, p]);
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
                            onClick={() => updateBuilderState('selectedGroup', g)}
                            className={`px-4 py-2 rounded-lg border transition-all text-xs font-bold ${
                              builderState.selectedGroup === g
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
                      disabled={builderState.selectedPositions.length === 0}
                      onClick={() => {
                        if (builderState.selectedPositions.length > 0) {
                          const joined = builderState.selectedPositions.join(',');
                          addSlot(joined, builderState.selectedGroup, 'bulk', builderState.positionHidden);
                          // Reset selections
                          updateBuilderState('selectedPositions', []);
                        }
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-800 disabled:to-gray-900 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs tracking-wide uppercase transition-all shadow-md"
                    >
                      Add Bulk Slot (Positions: {builderState.selectedPositions.join(', ') || 'none'})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            {auctionDate && positionSlots.length > 0 && (
              <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon />
                  <div className="text-base sm:text-lg font-bold text-white">
                    {new Date(auctionDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                    {auctionTime && (
                      <span className="text-[#E8A800] ml-2">
                        @ {auctionTime}
                      </span>
                    )}
                  </div>
                </div>
                {(endDate || endTime) && (
                  <div className="text-xs sm:text-sm text-red-400 mb-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Deadline: {endDate && new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {endTime && ` @ ${endTime}`}
                    </span>
                  </div>
                )}
                {description && (
                  <div className="text-xs sm:text-sm text-gray-400 mb-3">{description}</div>
                )}
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {positionSlots.map((slot, idx) => (
                    <div
                      key={`${slot.position}-${slot.group}-${idx}`}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all ${
                        slot.roundType === 'bulk'
                          ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                          : 'bg-[#E8A800]/20 border-[#E8A800]/30 text-[#E8A800]'
                      } ${slot.positionHidden ? 'opacity-75' : ''}`}
                    >
                      {slot.positionHidden ? '???' : slot.position}{slot.group && slot.group !== 'ALL' && !slot.positionHidden ? `-${slot.group}` : ''}
                      <span className="opacity-60 font-normal ml-1">
                        ({slot.roundType === 'bulk' ? 'Bulk' : 'Normal'}{slot.positionHidden ? ' • Hidden' : ''})
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {positionSlots.length} position slot{positionSlots.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] px-4 sm:px-6 py-3 rounded-xl font-bold transition-all text-sm sm:text-base flex items-center justify-center gap-2"
            >
              {submitting && <LoadingSpinner size="sm" />}
              {submitting ? 'Updating...' : 'Update Auction Date'}
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
