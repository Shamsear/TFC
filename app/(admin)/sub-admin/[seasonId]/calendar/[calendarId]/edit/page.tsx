'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

const SaveIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ChevronDownIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'SS', 'LWF', 'RWF', 'CF'];
const GROUPED_POSITIONS = ['CB', 'DMF', 'CMF', 'AMF', 'CF'];

// Position groups mapping for quick selection
const POSITION_GROUPS: Record<string, string[]> = {
  'Goalkeepers': ['GK'],
  'Defenders': ['CB', 'LB', 'RB'],
  'Midfielders': ['DMF', 'CMF', 'LMF', 'RMF', 'AMF'],
  'Forwards': ['SS', 'LWF', 'RWF', 'CF']
};

interface PositionSlot {
  position: string;
  group?: 'A' | 'B' | 'ALL';
}

export default function EditCalendarPage({ params }: EditCalendarPageProps) {
  const router = useRouter()
  const [seasonId, Id] = useState<string>('')
  const [calendarId, setCalendarId] = useState<string>('')
  const [auctionDate, setAuctionDate] = useState('')
  const [description, setDescription] = useState('')
  const [positionSlots, setPositionSlots] = useState<PositionSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('quick')

  useEffect(() => {
    params.then(({ seasonId: sid, calendarId: cid }) => {
      setSeasonId(sid)
      setCalendarId(cid)
      
      // Fetch existing calendar data
      fetch(`/api/seasons/${sid}/calendar/${cid}`)
        .then(res => res.json())
        .then(data => {
          setAuctionDate(new Date(data.auctionDate).toISOString().split('T')[0])
          setDescription(data.description || '')
          setPositionSlots(data.auctionSlots.map((slot: any) => ({
            position: slot.position,
            group: slot.group || 'ALL'
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

  const togglePositionSlot = (position: string, group?: 'A' | 'B' | 'ALL') => {
    const existingIndex = positionSlots.findIndex(s => s.position === position && s.group === group)
    
    if (existingIndex >= 0) {
      // Remove the slot
etPositionSlots(prev => prev.filter((_, i) => i !== existingIndex))
    } else {
      // Add the slot
      setPositionSlots(prev => [...prev, { position, group: group || 'ALL' }])
    }
  }

  const hasPositionSlot = (position: string, group?: 'A' | 'B' | 'ALL') => {
    return positionSlots.some(s => s.position === position && s.group === group)
  }

  const togglePositionGroup = (groupPositions: string[]) => {
    const allSelected = groupPositions.every(pos => 
      positionSlots.some(s => s.position === pos && s.group === 'ALL')
    )
    if (allSelected) {
      // Deselect all positions in the group
      setPositionSlots(prev => prev.filter(s => 
        !groupPositions.includes(s.position) || s.group !== 'ALL'
      ))
    } else {
      // Select all positions in the group with 'ALL' group
      setPositionSlots(prev => {
        const newSlots = [...prev]
        groupPositions.forEach(pos => {
          if (!newSlots.some(s => s.position === pos && s.group === 'ALL')) {
            ion: pos, group: 'ALL' })
          }
        })
        return newSlots
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (positionSlots.length === 0) {
      setError('Please select at least one position')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/seasons/${seasonId}/calendar/${calendarId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionDate,
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
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      {/* Compact Sticky Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
sName="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href={`/sub-admin/${seasonId}/calendar`}
                className="flex-shrink-0 p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeftIcon />
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-black truncate">
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Edit Auction Date
                  </span>
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  {positionSlots.length} slot{positionSlots.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>
            <button
              type="submit"
              form="edit-calendar-form"
              disabled={submitting}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <SaveIcon />
              <span className="hidden sm:inline">{submitting ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <form id="edit-calendar-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg flex items-start gap-2 text-sm">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info Card */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Auction Date */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">
                  Auction Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={auctionDate}
                  onChange={(e) => setAuctionDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Round 1"
                  classN-all"
                />
              </div>
            </div>

            {/* Preview */}
            {auctionDate && positionSlots.length > 0 && (
              <div className="rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-white">
                    {new Date(auctionDate + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  {description && (
                    <div className="text-xs text-gray-400">{description}</div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {positionSlots.map((slot, idx) => (
                    <div
                      key={`${slot.position}-${slot.group}-${idx}`}
                      className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold"
                    >
                      {slot.position}{slot.group && slot.group !== 'ALL' ? `-${slot.group}` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Position Selection Card */}
          <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <label className="block text-sm font-bold text-white">
                Position Slots <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Select positions and their groups for this auction
              </p>
            </div>
            
            <div className="divide-y divide-white/10">
              {/* Quick Select - Collapsible */}
              <div>
                <button
                  type="button"
                  onClick={() => setExpandedCategory(expandedCategory === 'quick' ? null : 'quick')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Quick Select Groups</span>
                  <Chev= 'quick' ? 'rotate-180' : ''}`} />
                </button>
                {expandedCategory === 'quick' && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(POSITION_GROUPS).map(([groupName, groupPositions]) => {
                        const allSelected = groupPositions.every(pos => 
                          positionSlots.some(s => s.position === pos && s.group === 'ALL')
                        )
                        const someSelected = groupPositions.some(pos => 
                          positionSlots.some(s => s.position === pos)
                        )
                        return (
                          <button
                            key={groupName}
                            type="button"
                            onClick={() => togglePositionGroup(groupPositions)}
                            className={`p-2 rounded-lg border transition-all text-xs font-bold ${
                              allSelected
                                ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                : someSelected
                                ? 'bg-purple-500/10 border-purple-500/50 text-purple-300'
                                : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            <div className="truncate">{groupName}</div>
                            <div className="text-[10px] opacity-70 mt-0.5 truncate">
                              {groupPositions.join(', ')}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Individual Position Categories - Collapsible */}
              <div className="divide-y divide-white/10">
                {/* Goalkeeper */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(expandedCategory === 'gk' ? null : 'gk')}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <span className="text-xs font-bold text-yellow-400 uppercase">Goalkeeper</span>
                    <Chevtate-180' : ''}`} />
                  </button>
                  {expandedCategory === 'gk' && (
                    <div className="px-4 pb-3">
                      <button
                        type="button"
                        onClick={() => togglePositionSlot('GK', 'ALL')}
                        className={`px-3 py-1.5 rounded-lg border transition-all font-bold text-xs ${
                          hasPositionSlot('GK', 'ALL')
                            ? 'bg-yellow-500/20xt-yellow-400'
                            : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        GK
                      </button>
                    </div>
                  )}
                </div>

                {/* Defenders */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(expandedCategory === 'def' ? null : 'def')}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <span className="text-xs font-bold text-blue-400 uppercase">Defenders</span>
                    <ChevronDownIcon className={`w-4 h-4 transform transition-transform ${expandedCategory === 'def' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedCategory === 'def' && (
                    <div className="px-4 pb-3 space-y-2">
                      {['CB', 'LB', 'RB'].map((position) => (
                        <div key={position} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white w-10">{position}</span>
                          {GROUPED_POSITIONS.includes(position) ? (
                            <div className="flex gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => togglePositionS(position, 'A')}
                                className={`px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                  hasPositionSlot(position, 'A')
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                A
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(position, 'B')}
                                className={`px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                  hasPositionSlot(position, 'B')
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                             ay-400 hover:border-white/20'
                                }`}
                              >
                                B
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(position, 'ALL')}
                                className={`px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                  hasPositionSlot(position, 'ALL')
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
                              onClick={() => togglePositionSlot(position, 'ALL')}
                              className={`px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                hasPositionSlot(position, 'ALL')
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
                  )}
                </div>

                {/* Midfielders */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(expandedCategory === 'mid' ? null : 'mid')}
                    className="w-full px-4 py-2.5 flexs"
                  >
                    <span className="text-xs font-bold text-green-400 uppercase">Midfielders</span>
                    <ChevronDownIcon className={`w-4 h-4 transform transition-transform ${expandedCategory === 'mid' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedCategory === 'mid' && (
                    <div className="px-4 pb-3 space-y-2">
                      {['DMF', 'CMF', 'LMF', 'RMF', 'AMF'].map((position) => (
                        <div key={position} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white w-10">{position}</span>
                          {GROUPED_POSITIONS.includes(position) ? (
                            <div className="flex gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(position, 'A')}
                                className={`px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                  hasPositionSlot(position, 'A')
                                    ? 'bg-green-500/20 border-green-500 text-green-400'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                A
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(position, 'B')}
                                className={`px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                  hasPositionSlot(position, 'B')
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                B
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(position, 'ALL')}
                                className={`px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                  hasPositionSlot(position, 'ALL')
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
                              onClick={() => togglePositionSlot(position, 'ALL')}
                        `px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                hasPositionSlot(position, 'ALL')
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
                  )}
                </div>

                {/* Forwards */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(expandedCategory === 'fwd' ? null : 'fwd')}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <span className="00 uppercase">Forwards</span>
                    <ChevronDownIcon className={`w-4 h-4 transform transition-transform ${expandedCategory === 'fwd' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedCategory === 'fwd' && (
                    <div className="px-4 pb-3 space-y-2">
                      {['SS', 'LWF', 'RWF', 'CF'].map((position) => (
                        <div key={position} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white w-10">{position}</span>
                          {GROUPED_POSITIONS.includes(position) ? (
                            <div className="flex gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(position, 'A')}
                                className={`px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                  hasPositionSlot(position, 'A')
                                    ? 'bg-red-500/20 border-red-500 text-red-400'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                A
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(position, 'B')}
                                className={`px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                  hasPositionSlot(position, 'B')
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                B
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePositionSlot(position, 'ALL')}
                                className={`px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                  hasPositionSlot(position, 'ALL')
                                    ? 'bg-gray-500/20 border-gray-500 text-gray-300'
                       
                                }`}
                              >
                                All
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => togglePositionSlot(position, 'ALL')}
                              className={`px-2.5 py-1 rounded-md border transition-all font-bold text-xs ${
                                hasPositionSlot(position, 'ALL')
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
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
