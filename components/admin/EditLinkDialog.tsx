'use client'

import { useState, useEffect } from 'react'

interface EditLinkDialogProps {
  isOpen: boolean
  onClose: () => void
  link: any
  onUpdated: () => void
}

export default function EditLinkDialog({
  isOpen,
  onClose,
  link,
  onUpdated
}: EditLinkDialogProps) {
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
    if (isOpen && link) {
      setLinkType(link.linkType)
      const config = link.qualificationConfig || {}

      if (link.linkType === 'TOP_N' || link.linkType === 'BOTTOM_N') {
        setCount(config.count || 8)
        setGroupBy(config.groupBy || null)
        setSeedMappingText(config.seedMapping ? config.seedMapping.join(', ') : '')
      } else if (link.linkType === 'POSITION_RANGE') {
        setStartPosition(config.startPosition || 2)
        setEndPosition(config.endPosition || 5)
        setGroupBy(config.groupBy || null)
      } else if (link.linkType === 'WINNER' || link.linkType === 'RUNNER_UP') {
        setSlotNumber(config.slotNumber || (link.linkType === 'WINNER' ? 1 : 2))
      } else if (link.linkType === 'GROUP_POSITION') {
        setPosition(config.position || 1)
        setGroupNamesText(config.groupNames ? config.groupNames.join(', ') : '')
        
        if (config.seedMapping) {
          const mapText = Object.entries(config.seedMapping)
            .map(([gName, seed]) => `${gName}: ${seed}`)
            .join(', ')
          setGroupSeedMappingText(mapText)
        } else {
          setGroupSeedMappingText('')
        }
      } else if (link.linkType === 'MULTIPLE_POSITIONS_PER_GROUP') {
        setPositionsPerGroupText(config.positionsPerGroup ? config.positionsPerGroup.join(', ') : '')
        setMultipleGroupsText(config.groupNames ? config.groupNames.join(', ') : '')
        setMultipleSeedMappingText(config.seedMapping ? config.seedMapping.join(', ') : '')
      }
    }
  }, [isOpen, link])

  if (!isOpen || !link) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

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

      const response = await fetch(`/api/admin/tournaments/links/${link.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkType,
          qualificationConfig
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update link')
      }

      onUpdated()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-[#121212] border border-white/10 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div>
            <h2 className="text-xl font-black text-white">Edit Tournament Link</h2>
            <p className="text-xs text-[#7A7367] mt-0.5">
              Targeting: <span className="text-[#E8A800] font-bold">{link.targetTournament?.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7367] mb-2">
              Link Type
            </label>
            <select
              value={linkType}
              onChange={e => setLinkType(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer"
            >
              <option value="TOP_N">Top N Teams</option>
              <option value="BOTTOM_N">Bottom N Teams</option>
              <option value="POSITION_RANGE">Position Range</option>
              <option value="WINNER">Winner Only</option>
              <option value="RUNNER_UP">Runner-up Only</option>
              <option value="GROUP_POSITION">Position from each Group</option>
              <option value="MULTIPLE_POSITIONS_PER_GROUP">Multiple positions from Groups</option>
            </select>
          </div>

          <div className="border-t border-white/5 pt-4 my-2">
            <h3 className="text-xs font-black uppercase text-[#E8A800] tracking-wider mb-3">Configuration</h3>
            
            {/* TOP_N / BOTTOM_N */}
            {(linkType === 'TOP_N' || linkType === 'BOTTOM_N') && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Number of Teams</label>
                    <input
                      type="number"
                      min={1}
                      value={count}
                      onChange={e => setCount(Number(e.target.value))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Standings Grouping</label>
                    <select
                      value={groupBy || ''}
                      onChange={e => setGroupBy(e.target.value || null)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                    >
                      <option value="">Overall Standings</option>
                      <option value="group">Per Group</option>
                    </select>
                  </div>
                </div>

                {linkType === 'TOP_N' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      Seed Mapping (Optional, comma-separated e.g. 1, 3, 2, 4)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1, 2, 3, 4"
                      value={seedMappingText}
                      onChange={e => setSeedMappingText(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
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
                    <label className="block text-xs text-gray-400 mb-1.5">Start Position</label>
                    <input
                      type="number"
                      min={1}
                      value={startPosition}
                      onChange={e => setStartPosition(Number(e.target.value))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">End Position</label>
                    <input
                      type="number"
                      min={1}
                      value={endPosition}
                      onChange={e => setEndPosition(Number(e.target.value))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Standings Grouping</label>
                  <select
                    value={groupBy || ''}
                    onChange={e => setGroupBy(e.target.value || null)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                  >
                    <option value="">Overall Standings</option>
                    <option value="group">Per Group</option>
                  </select>
                </div>
              </div>
            )}

            {/* WINNER / RUNNER_UP */}
            {(linkType === 'WINNER' || linkType === 'RUNNER_UP') && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Target Seeding Slot (e.g. 1 for Seed 1, 2 for Seed 2)
                </label>
                <input
                  type="number"
                  min={1}
                  value={slotNumber}
                  onChange={e => setSlotNumber(Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                />
              </div>
            )}

            {/* GROUP_POSITION */}
            {linkType === 'GROUP_POSITION' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-400 mb-1.5">Group Position</label>
                    <input
                      type="number"
                      min={1}
                      value={position}
                      onChange={e => setPosition(Number(e.target.value))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1.5">Groups (comma-separated)</label>
                    <input
                      type="text"
                      value={groupNamesText}
                      onChange={e => setGroupNamesText(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Group Seed Mapping (e.g. Group A: 1, Group B: 2)</label>
                  <input
                    type="text"
                    value={groupSeedMappingText}
                    onChange={e => setGroupSeedMappingText(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                  />
                </div>
              </div>
            )}

            {/* MULTIPLE_POSITIONS_PER_GROUP */}
            {linkType === 'MULTIPLE_POSITIONS_PER_GROUP' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Positions (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. 1, 2"
                      value={positionsPerGroupText}
                      onChange={e => setPositionsPerGroupText(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Groups (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Group A, Group B"
                      value={multipleGroupsText}
                      onChange={e => setMultipleGroupsText(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Seed Mapping Order (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1, 3, 2, 4"
                    value={multipleSeedMappingText}
                    onChange={e => setMultipleSeedMappingText(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t border-white/10 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black font-black hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
