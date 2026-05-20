'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Player {
  id: string
  name: string
  position: string
  position_group?: string | null
  overall: number
  nationality: string
  imageUrl: string | null
}

interface Team {
  id: string
  name: string
  logoUrl: string | null
}

interface AuctionSlot {
  id: string
  position: string
  position_group?: string | null
  roundType?: string | null
  slotOrder: number
}

interface AuctionCalendar {
  id: string
  auctionDate: Date
  description: string | null
  auctionSlots: AuctionSlot[]
}

interface CreateRoundClientProps {
  seasonId: string
  availablePlayers: Player[]
  teams: Team[]
  auctionCalendar: AuctionCalendar[]
  nextRoundNumber: number
  seasonDefaults: {
    maxBidsPerTeam: number
    basePrice: number
  }
}

export default function CreateRoundClient({ 
  seasonId, 
  availablePlayers, 
  teams,
  auctionCalendar,
  nextRoundNumber,
  seasonDefaults
}: CreateRoundClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Form state
  const [roundType, setRoundType] = useState<'normal' | 'bulk'>('normal')
  const [finalizationMode, setFinalizationMode] = useState<'auto' | 'manual'>('auto')
  const [durationHours, setDurationHours] = useState('1')
  const [durationMinutes, setDurationMinutes] = useState('0')
  const [selectedCalendarId, setSelectedCalendarId] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')

  const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'SS', 'LWF', 'RWF', 'CF']
  const [checkedPositions, setCheckedPositions] = useState<string[]>([])

  // Get selected calendar and slot
  const selectedCalendar = auctionCalendar.find(c => c.id === selectedCalendarId)
  const selectedSlot = selectedCalendar?.auctionSlots.find(s => s.id === selectedSlotId)
  const selectedPosition = selectedSlot?.position
  const selectedPositionGroup = selectedSlot?.position_group

  // Synchronize custom positions when calendar slot changes
  useEffect(() => {
    if (selectedSlot) {
      if (selectedSlot.position) {
        const parsedPositions = selectedSlot.position.split(',').map(p => p.trim()).filter(Boolean)
        setCheckedPositions(parsedPositions)
      } else {
        setCheckedPositions([])
      }
    } else {
      setCheckedPositions([])
    }
  }, [selectedSlotId])

  // Synchronize custom positions or default when round type toggles to bulk (if no positions are checked)
  useEffect(() => {
    if (roundType === 'bulk' && checkedPositions.length === 0) {
      setCheckedPositions(POSITIONS)
    }
  }, [roundType])

  // Calculate total duration in hours
  const totalDurationHours = parseFloat(durationHours || '0') + parseFloat(durationMinutes || '0') / 60

  // Calculate end time based on start time and duration
  const calculatedEndTime = selectedCalendar && (durationHours || durationMinutes)
    ? new Date(new Date(selectedCalendar.auctionDate).getTime() + totalDurationHours * 60 * 60 * 1000)
    : null

  // Get all eligible players for the selected position and position group
  const eligiblePlayers = availablePlayers
    .filter(player => {
      if (checkedPositions.length === 0) return false
      
      if (!checkedPositions.includes(player.position)) return false
      
      // If position_group is 'ALL' or null, include all players of this position
      if (!selectedPositionGroup || selectedPositionGroup === 'ALL') return true
      
      // Filter by matching position_group
      return player.position_group === selectedPositionGroup
    })
    .sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!selectedCalendarId || !selectedSlotId) {
        throw new Error('Please fill in all required fields')
      }

      if (checkedPositions.length === 0) {
        throw new Error('Please select at least one position')
      }

      if (eligiblePlayers.length === 0) {
        throw new Error('No eligible players found for selected positions')
      }

      // Calculate duration in seconds
      const durationSeconds = Math.round(totalDurationHours * 3600)

      const endpoint = roundType === 'normal' 
        ? '/api/admin/rounds'
        : '/api/admin/bulk-rounds'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          roundNumber: nextRoundNumber,
          durationSeconds,
          position: checkedPositions.join(','),
          position_group: selectedPositionGroup,
          roundType: roundType,
          maxBidsPerTeam: seasonDefaults.maxBidsPerTeam,
          basePrice: seasonDefaults.basePrice,
          finalizationMode: finalizationMode
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create round')
      }

      router.push(`/sub-admin/${seasonId}/auction`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Round Type */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6">
        <label className="block text-sm font-bold text-white mb-3">Round Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setRoundType('normal')}
            className={`p-4 rounded-xl border-2 transition-all ${
              roundType === 'normal'
                ? 'border-[#E8A800] bg-[#E8A800]/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="font-bold text-white mb-1">Normal Round</div>
            <div className="text-xs text-gray-400">Teams bid on players</div>
          </button>
          <button
            type="button"
            onClick={() => setRoundType('bulk')}
            className={`p-4 rounded-xl border-2 transition-all ${
              roundType === 'bulk'
                ? 'border-[#E8A800] bg-[#E8A800]/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="font-bold text-white mb-1">Bulk Round</div>
            <div className="text-xs text-gray-400">Teams select players</div>
          </button>
        </div>
      </div>

      {/* Finalization Mode */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6">
        <label className="block text-sm font-bold text-white mb-3">Finalization Mode</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setFinalizationMode('auto')}
            className={`p-4 rounded-xl border-2 transition-all ${
              finalizationMode === 'auto'
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="font-bold text-white mb-1">Auto Finalize</div>
            <div className="text-xs text-gray-400">Results applied when timer ends</div>
          </button>
          <button
            type="button"
            onClick={() => setFinalizationMode('manual')}
            className={`p-4 rounded-xl border-2 transition-all ${
              finalizationMode === 'manual'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="font-bold text-white mb-1">Manual Preview</div>
            <div className="text-xs text-gray-400">Review results before applying</div>
          </button>
        </div>
      </div>

      {/* Auction Calendar Selection */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-white mb-2">Round Number</label>
            <div className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white flex items-center justify-between">
              <span className="text-2xl font-black text-[#E8A800]">{nextRoundNumber}</span>
              <span className="text-xs text-gray-400">Auto-generated</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Based on existing rounds in this season
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-2">Duration</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  min="0"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none"
                  placeholder="Hours"
                />
                <div className="text-xs text-gray-400 mt-1 text-center">Hours</div>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none"
                  placeholder="Minutes"
                />
                <div className="text-xs text-gray-400 mt-1 text-center">Minutes</div>
              </div>
            </div>
            {calculatedEndTime && (
              <div className="text-xs text-[#E8A800] mt-2 font-medium">
                Ends: {calculatedEndTime.toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </div>
            )}
            {!selectedCalendar && (
              <div className="text-xs text-gray-400 mt-1">
                Select auction date to see end time
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-white mb-2">Select Auction Date</label>
          {auctionCalendar.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border border-white/10 rounded-lg">
              No auction dates scheduled. Please create auction calendar first.
            </div>
          ) : (
            <div className="space-y-2">
              {auctionCalendar.map(calendar => (
                <button
                  key={calendar.id}
                  type="button"
                  onClick={() => {
                    setSelectedCalendarId(calendar.id)
                    setSelectedSlotId('')
                  }}
                  className={`w-full p-4 rounded-lg border transition-all text-left ${
                    selectedCalendarId === calendar.id
                      ? 'border-[#E8A800] bg-[#E8A800]/10'
                      : 'border-white/10 bg-black/20 hover:border-white/20'
                  }`}
                >
                  <div className="font-bold text-white">
                    {new Date(calendar.auctionDate).toLocaleString('en-US', {
                      dateStyle: 'full',
                      timeStyle: 'short'
                    })}
                  </div>
                  {calendar.description && (
                    <div className="text-xs text-gray-400 mt-1">{calendar.description}</div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {calendar.auctionSlots.map(slot => (
                      <span
                        key={slot.id}
                        className={`px-2 py-0.5 rounded text-xs border ${
                          slot.roundType === 'bulk'
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 font-semibold'
                            : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                      >
                        {slot.position.split(',').join(', ')}{slot.position_group && slot.position_group !== 'ALL' ? `-${slot.position_group}` : ''}
                        {slot.roundType === 'bulk' && ' (Bulk)'}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedCalendar && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-white mb-2">Select Position Slot</label>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {selectedCalendar.auctionSlots.map(slot => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlotId(slot.id)
                      if (slot.roundType === 'bulk' || slot.roundType === 'normal') {
                        setRoundType(slot.roundType)
                      }
                    }}
                    className={`p-3 rounded-lg border transition-all w-full min-w-0 overflow-hidden flex items-center justify-center ${
                      selectedSlotId === slot.id
                        ? slot.roundType === 'bulk'
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-[#E8A800] bg-[#E8A800]/10 text-white'
                        : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold flex flex-col xs:flex-row items-center justify-center gap-1.5 flex-wrap w-full text-center break-words">
                      <span className="break-words max-w-full">
                        {slot.position.split(',').join(', ')}{slot.position_group && slot.position_group !== 'ALL' ? `-${slot.position_group}` : ''}
                      </span>
                      {slot.roundType === 'bulk' && (
                        <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 font-extrabold shrink-0">
                          Bulk
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedSlot && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-sm font-bold text-white">Customize Positions for this Round</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckedPositions(POSITIONS)}
                      className={`text-xs font-bold transition-all bg-white/5 px-2.5 py-1 rounded border border-white/10 hover:bg-white/10 ${
                        roundType === 'bulk' ? 'text-purple-400 hover:text-purple-300' : 'text-[#E8A800] hover:text-[#FFB347]'
                      }`}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckedPositions([])}
                      className="text-xs font-bold text-gray-400 hover:text-white transition-all bg-white/5 px-2.5 py-1 rounded border border-white/10 hover:bg-white/10"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
                  {POSITIONS.map(position => {
                    const isChecked = checkedPositions.includes(position)
                    return (
                      <button
                        key={position}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setCheckedPositions(checkedPositions.filter(p => p !== position))
                          } else {
                            setCheckedPositions([...checkedPositions, position])
                          }
                        }}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                          isChecked
                            ? roundType === 'bulk'
                              ? 'border-purple-500 bg-purple-500/20 text-white shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                              : 'border-[#E8A800] bg-[#E8A800]/20 text-white shadow-[0_0_10px_rgba(232,168,0,0.2)]'
                            : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        {position}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          href={`/sub-admin/${seasonId}/auction`}
          className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all text-center"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || checkedPositions.length === 0 || !selectedSlotId}
          className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            roundType === 'bulk'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
              : 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a]'
          }`}
        >
          {loading ? 'Creating...' : 'Create Round'}
        </button>
      </div>
    </form>
  )
}
