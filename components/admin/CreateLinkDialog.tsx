'use client'

import { useState, useEffect } from 'react'

interface CreateLinkDialogProps {
  isOpen: boolean
  onClose: () => void
  sourceTournamentId: string
  seasonId: string
  onCreated: () => void
}

export default function CreateLinkDialog({
  isOpen,
  onClose,
  sourceTournamentId,
  seasonId,
  onCreated
}: CreateLinkDialogProps) {
  const [tournaments, setTournaments] = useState<any[]>([])
  const [targetTournamentId, setTargetTournamentId] = useState('')
  const [linkType, setLinkType] = useState('TOP_N')
  
  // TOP_N / BOTTOM_N / POSITION_RANGE
  const [count, setCount] = useState(8)
  const [startPosition, setStartPosition] = useState(2)
  const [endPosition, setEndPosition] = useState(5)
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [seedMappingText, setSeedMappingText] = useState('')

  // WINNER / RUNNER_UP
  const [slotNumber, setSlotNumber] = useState(1)

  // GROUP_POSITION
  const [position, setPosition] = useState(1)
  const [groupNamesText, setGroupNamesText] = useState('Group A, Group B, Group C, Group D')
  const [groupSeedMappingText, setGroupSeedMappingText] = useState('Group A: 1, Group B: 2, Group C: 3, Group D: 4')

  // MULTIPLE_POSITIONS_PER_GROUP
  const [positionsPerGroupText, setPositionsPerGroupText] = useState('1, 2')
  const [multipleGroupsText, setMultipleGroupsText] = useState('Group A, Group B')
  const [multipleSeedMappingText, setMultipleSeedMappingText] = useState('1, 3, 2, 4')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Fetch tournaments in season
      fetch(`/api/seasons/${seasonId}/tournaments`)
        .then(res => res.json())
        .then(data => {
          // Filter out source tournament
          const filtered = data.filter((t: any) => t.id !== sourceTournamentId)
          setTournaments(filtered)
          if (filtered.length > 0) {
            setTargetTournamentId(filtered[0].id)
          }
        })
        .catch(err => console.error('Error fetching tournaments:', err))
    }
  }, [isOpen, seasonId, sourceTournamentId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetTournamentId) {
      setError('Please select a target tournament')
      return
    }

    setLoading(true)
    setError('')

    // Build configuration based on type
    let qualificationConfig: any = {}

    try {
      if (linkType === 'TOP_N' || linkType === 'BOTTOM_N') {
        qualificationConfig = {
          count: Number(count),
          groupBy: groupBy || null,
          seedMapping: seedMappingText
            ? seedMappingText.split(',').map(s => Number(s.trim()))
            : null
        }
      } else if (linkType === 'POSITION_RANGE') {
        qualificationConfig = {
          startPosition: Number(startPosition),
          endPosition: Number(endPosition),
          groupBy: groupBy || null
        }
      } else if (linkType === 'WINNER' || linkType === 'RUNNER_UP') {
        qualificationConfig = {
          slotNumber: Number(slotNumber)
        }
      } else if (linkType === 'GROUP_POSITION') {
        const groups = groupNamesText.split(',').map(g => g.trim())
        
        // Parse mapping e.g. "Group A: 1, Group B: 2"
        const seedMap: Record<string, number> = {}
        if (groupSeedMappingText) {
          groupSeedMappingText.split(',').forEach(item => {
            const parts = item.split(':')
            if (parts.length === 2) {
              seedMap[parts[0].trim()] = Number(parts[1].trim())
            }
          })
        }

        qualificationConfig = {
          position: Number(position),
          groupNames: groups,
          seedMapping: Object.keys(seedMap).length > 0 ? seedMap : null
        }
      } else if (linkType === 'MULTIPLE_POSITIONS_PER_GROUP') {
        const positions = positionsPerGroupText.split(',').map(p => Number(p.trim()))
        const groups = multipleGroupsText.split(',').map(g => g.trim())
        const seeds = multipleSeedMappingText
          ? multipleSeedMappingText.split(',').map(s => Number(s.trim()))
          : null

        qualificationConfig = {
          positionsPerGroup: positions,
          groupNames: groups,
          seedMapping: seeds
        }
      }

      const response = await fetch('/api/admin/tournaments/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTournamentId,
          targetTournamentId,
          linkType,
          qualificationConfig
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create link')
      }

      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-[#0D0D0D]/90 border border-white/10 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] backdrop-blur-xl animate-scale-up">
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight font-mono">Create Tournament Link</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="p-4 mb-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Tournament */}
          <div>
            <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
              Target Tournament
            </label>
            {tournaments.length === 0 ? (
              <p className="text-xs text-yellow-500 font-bold uppercase tracking-wider font-mono">No other tournaments found. Create a target tournament first.</p>
            ) : (
              <select
                value={targetTournamentId}
                onChange={e => setTargetTournamentId(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono cursor-pointer"
              >
                {tournaments.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#0D0D0D]">
                    {t.name} ({t.tournamentType.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Link Type */}
          <div>
            <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
              Link Type
            </label>
            <select
              value={linkType}
              onChange={e => setLinkType(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono cursor-pointer"
            >
              <option value="TOP_N" className="bg-[#0D0D0D]">Top N Teams</option>
              <option value="BOTTOM_N" className="bg-[#0D0D0D]">Bottom N Teams</option>
              <option value="POSITION_RANGE" className="bg-[#0D0D0D]">Position Range</option>
              <option value="WINNER" className="bg-[#0D0D0D]">Winner Only</option>
              <option value="RUNNER_UP" className="bg-[#0D0D0D]">Runner-up Only</option>
              <option value="GROUP_POSITION" className="bg-[#0D0D0D]">Position from each Group</option>
              <option value="MULTIPLE_POSITIONS_PER_GROUP" className="bg-[#0D0D0D]">Multiple positions from Groups</option>
            </select>
          </div>

          <div className="border-t border-white/5 pt-4 my-2">
            <h3 className="text-[10px] font-extrabold uppercase text-[#E8A800] tracking-widest font-mono mb-3">Configuration</h3>
            
            {/* TOP_N / BOTTOM_N */}
            {(linkType === 'TOP_N' || linkType === 'BOTTOM_N') && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">Number of Teams</label>
                    <input
                      type="number"
                      min={1}
                      value={count}
                      onChange={e => setCount(Number(e.target.value))}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">Standings Grouping</label>
                    <select
                      value={groupBy || ''}
                      onChange={e => setGroupBy(e.target.value || null)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono cursor-pointer"
                    >
                      <option value="" className="bg-[#0D0D0D]">Overall Standings</option>
                      <option value="group" className="bg-[#0D0D0D]">Per Group</option>
                    </select>
                  </div>
                </div>

                {linkType === 'TOP_N' && (
                  <div>
                    <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">
                      Seed Mapping (Optional, comma-separated e.g. 1, 3, 2, 4)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1, 2, 3, 4"
                      value={seedMappingText}
                      onChange={e => setSeedMappingText(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {/* POSITION_RANGE */}
            {linkType === 'POSITION_RANGE' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">Start Position</label>
                    <input
                      type="number"
                      min={1}
                      value={startPosition}
                      onChange={e => setStartPosition(Number(e.target.value))}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">End Position</label>
                    <input
                      type="number"
                      min={1}
                      value={endPosition}
                      onChange={e => setEndPosition(Number(e.target.value))}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">Standings Grouping</label>
                  <select
                    value={groupBy || ''}
                    onChange={e => setGroupBy(e.target.value || null)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono cursor-pointer"
                  >
                    <option value="" className="bg-[#0D0D0D]">Overall Standings</option>
                    <option value="group" className="bg-[#0D0D0D]">Per Group</option>
                  </select>
                </div>
              </div>
            )}

            {/* WINNER / RUNNER_UP */}
            {(linkType === 'WINNER' || linkType === 'RUNNER_UP') && (
              <div>
                <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">
                  Target Seeding Slot (e.g. 1 for Seed 1, 2 for Seed 2)
                </label>
                <input
                  type="number"
                  min={1}
                  value={slotNumber}
                  onChange={e => setSlotNumber(Number(e.target.value))}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono"
                />
              </div>
            )}

            {/* GROUP_POSITION */}
            {linkType === 'GROUP_POSITION' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">Group Position</label>
                    <input
                      type="number"
                      min={1}
                      value={position}
                      onChange={e => setPosition(Number(e.target.value))}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">Groups (comma-separated)</label>
                    <input
                      type="text"
                      value={groupNamesText}
                      onChange={e => setGroupNamesText(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">Group Seed Mapping (e.g. Group A: 1, Group B: 2)</label>
                  <input
                    type="text"
                    value={groupSeedMappingText}
                    onChange={e => setGroupSeedMappingText(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono"
                  />
                </div>
              </div>
            )}

            {/* MULTIPLE_POSITIONS_PER_GROUP */}
            {linkType === 'MULTIPLE_POSITIONS_PER_GROUP' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">Positions (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. 1, 2"
                      value={positionsPerGroupText}
                      onChange={e => setPositionsPerGroupText(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">Groups (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Group A, Group B"
                      value={multipleGroupsText}
                      onChange={e => setMultipleGroupsText(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1.5">Seed Mapping Order (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1, 3, 2, 4"
                    value={multipleSeedMappingText}
                    onChange={e => setMultipleSeedMappingText(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || tournaments.length === 0}
              className="px-6 py-2.5 rounded-xl bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-extrabold uppercase tracking-wider text-xs transition-all cursor-pointer font-mono shadow-[0_0_20px_rgba(232,168,0,0.15)] disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
