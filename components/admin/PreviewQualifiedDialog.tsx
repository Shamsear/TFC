'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PreviewQualifiedDialogProps {
  isOpen: boolean
  onClose: () => void
  link: any
  onPopulated: () => void
}

export default function PreviewQualifiedDialog({
  isOpen,
  onClose,
  link,
  onPopulated
}: PreviewQualifiedDialogProps) {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [populating, setPopulating] = useState(false)
  const [error, setError] = useState('')

  const fetchPreview = () => {
    if (!link) return
    setLoading(true)
    setError('')
    fetch(`/api/admin/tournaments/links/${link.id}/preview`)
      .then(res => res.json())
      .then(d => {
        if (d.error) {
          setError(d.error)
        } else {
          setData(d)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching preview:', err)
        setError('Failed to fetch preview data')
        setLoading(false)
      })
  }

  useEffect(() => {
    if (isOpen && link) {
      fetchPreview()
    }
  }, [isOpen, link])

  if (!isOpen || !link) return null

  const handlePopulate = async (force = false) => {
    setPopulating(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/tournaments/links/${link.id}/populate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to populate teams')
      }

      onPopulated()
      fetchPreview()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPopulating(false)
    }
  }

  const handleToggleExclude = async (teamId: string, exclude: boolean) => {
    setError('')
    try {
      const currentConfig = data?.link?.qualificationConfig || {}
      const excludeTeamIds = currentConfig.excludeTeamIds || []
      
      let newExcludeIds = []
      if (exclude) {
        newExcludeIds = [...excludeTeamIds, teamId]
      } else {
        newExcludeIds = excludeTeamIds.filter((id: string) => id !== teamId)
      }

      const response = await fetch(`/api/admin/tournaments/links/${link.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qualificationConfig: {
            ...currentConfig,
            excludeTeamIds: newExcludeIds
          }
        })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to update exclusion rules')
      }

      fetchPreview()
      onPopulated()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all populated teams for this link? This will remove them from the target tournament.')) {
      return
    }

    setPopulating(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/tournaments/links/${link.id}/clear`, {
        method: 'POST'
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to clear teams')
      }

      onPopulated()
      fetchPreview()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPopulating(false)
    }
  }

  const showGroupColumn = data?.preview?.some((item: any) => item.groupName) || link.targetTournament?.tournamentType === 'GROUP_KNOCKOUT' || link.linkType?.includes('GROUP')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-[#0D0D0D]/90 border border-white/10 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] backdrop-blur-xl animate-scale-up">
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight font-mono">Preview Qualified Teams</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1">
              Link: <span className="text-white font-bold">{link.sourceTournament?.name}</span> → <span className="text-[#E8A800] font-bold">{link.targetTournament?.name}</span>
            </p>
          </div>
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

        {loading ? (
          <div className="py-12 text-center text-gray-500 font-bold uppercase tracking-wider font-mono text-xs">Loading preview standings...</div>
        ) : (
          <div className="space-y-6">
            {/* Warning if source is not complete */}
            {data?.link?.sourceTournament?.status !== 'COMPLETED' && (
              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-yellow-500 text-xs font-bold uppercase tracking-wider font-mono flex gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p>Source tournament is in progress ({data?.link?.sourceTournament?.status.replace('_', ' ')}).</p>
                  <p className="font-normal text-gray-400 mt-0.5 lowercase font-sans">This shows provisional standings. Teams marked Confirmed have mathematically clinched their spots.</p>
                </div>
              </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-2 text-center font-mono">
              <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Slots</div>
                <div className="text-lg font-black text-white mt-0.5">{data?.summary?.total || 0}</div>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Confirmed</div>
                <div className="text-lg font-black text-emerald-400 mt-0.5">{data?.summary?.confirmed || 0}</div>
              </div>
              <div className="bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-xl">
                <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Provisional</div>
                <div className="text-lg font-black text-yellow-400 mt-0.5">{data?.summary?.provisional || 0}</div>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl">
                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Populated</div>
                <div className="text-lg font-black text-blue-400 mt-0.5">{data?.summary?.alreadyPopulated || 0}</div>
              </div>
            </div>

            {/* Teams Table */}
            <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#0a0a0a] max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-gray-500 font-extrabold uppercase tracking-widest font-mono text-[10px]">
                    <th className="px-4 py-3">Pos</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3 text-center">Pts</th>
                    {showGroupColumn && <th className="px-4 py-3">Group</th>}
                    <th className="px-4 py-3 text-center">Target Seed</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs">
                  {data?.preview?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500 font-bold uppercase tracking-wider text-[10px]">No teams currently qualifying</td>
                    </tr>
                  ) : (
                    data?.preview?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5 text-gray-500">{item.qualificationPosition}</td>
                        <td className="px-4 py-3.5 flex items-center gap-2">
                          {item.logoUrl ? (
                            <img src={item.logoUrl} alt={item.teamName} className="w-5 h-5 rounded object-contain flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded bg-[#E8A800]/20 flex items-center justify-center text-[10px] text-[#E8A800] font-black flex-shrink-0">
                              {item.teamName[0]}
                            </div>
                          )}
                          <span className="text-white truncate max-w-[150px] font-extrabold uppercase tracking-tight">{item.teamName}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center text-[#E8A800] font-extrabold">{item.points}</td>
                        {showGroupColumn && <td className="px-4 py-3.5 text-gray-300 font-extrabold">{item.groupName || '-'}</td>}
                        <td className="px-4 py-3.5 text-center text-[#FFB347] font-extrabold">Seed {item.seedPosition}</td>
                        <td className="px-4 py-3.5 text-center">
                          {item.isPopulated ? (
                            <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-extrabold uppercase tracking-wider">
                              ✓ Populated
                            </span>
                          ) : item.isConfirmed ? (
                            <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold uppercase tracking-wider animate-pulse">
                              ★ Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-lg bg-yellow-500/5 text-yellow-500/80 border border-yellow-500/20 text-[9px] font-extrabold uppercase tracking-wider">
                              Provisional
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {!item.isPopulated && (
                            <button
                              type="button"
                              onClick={() => handleToggleExclude(item.seasonTeamId, true)}
                              className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Exclude
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Excluded Teams Section */}
            {data?.excluded && data.excluded.length > 0 && (
              <div className="space-y-2 border-t border-white/5 pt-4">
                <h3 className="text-xs font-black uppercase text-red-400 tracking-wider flex items-center gap-1.5 font-mono">
                  <span>Excluded Teams (Skipping)</span>
                  <span className="px-2 py-0.5 rounded bg-red-500/10 text-[9px] border border-red-500/20 text-red-400">
                    {data.excluded.length}
                  </span>
                </h3>
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#0a0a0a] max-h-[150px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody className="divide-y divide-white/5 font-mono text-xs">
                      {data.excluded.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors bg-red-500/[0.01]">
                          <td className="px-4 py-2.5 text-gray-500 w-16">Pos {item.currentPosition || '-'}</td>
                          <td className="px-4 py-2.5 flex items-center gap-2">
                            {item.logoUrl ? (
                              <img src={item.logoUrl} alt={item.teamName} className="w-4 h-4 rounded object-contain flex-shrink-0 opacity-50" />
                            ) : (
                              <div className="w-4 h-4 rounded bg-red-500/10 flex items-center justify-center text-[8px] text-red-400 font-black flex-shrink-0">
                                {item.teamName[0]}
                              </div>
                            )}
                            <span className="text-gray-400 line-through truncate max-w-[150px] font-extrabold uppercase tracking-tight">{item.teamName}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-500 w-20">{item.points} pts</td>
                          <td className="px-4 py-2.5 text-right w-24">
                            <button
                              type="button"
                              onClick={() => handleToggleExclude(item.seasonTeamId, false)}
                              className="px-2.5 py-1 rounded-lg bg-[#E8A800]/10 hover:bg-[#E8A800]/20 text-[#E8A800] border border-[#E8A800]/20 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Include
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Note about resetting population to apply exclusions */}
            {(data?.summary?.alreadyPopulated > 0 || data?.summary?.targetTeamsCount > 0) && (
              <div className="mt-4 text-xs text-yellow-500 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-2 uppercase tracking-wide font-mono text-[10px] font-bold">
                <span className="flex-shrink-0">💡</span>
                <span>
                  This tournament is currently populated. To apply changes to exclusions, click <strong>Clear Populated Teams</strong> first, then re-populate.
                </span>
              </div>
            )}

            {/* Manual Trigger Section */}
            <div className="flex flex-col sm:flex-row gap-2 justify-between border-t border-white/5 pt-4 mt-6">
              {(data?.summary?.alreadyPopulated > 0 || data?.summary?.targetTeamsCount > 0) && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={populating}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold hover:bg-red-500/20 transition-all text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  Clear Populated Teams
                </button>
              )}
              
              <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer font-mono text-center"
                >
                  Close
                </button>

                {/* If provisional values exist and source is not complete, show "Populate Now (Force)" */}
                {data?.link?.sourceTournament?.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => handlePopulate(true)}
                    disabled={populating || !data?.preview || data.preview.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-extrabold uppercase tracking-wider text-xs transition-all cursor-pointer font-mono shadow-[0_0_20px_rgba(232,168,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed text-center"
                  >
                    {populating ? 'Populating...' : 'Populate Now (Force)'}
                  </button>
                )}

                {/* If source is complete and not populated yet, show standard Populate */}
                {data?.link?.sourceTournament?.status === 'COMPLETED' && data?.summary?.alreadyPopulated < data?.summary?.total && (
                  <button
                    type="button"
                    onClick={() => handlePopulate(false)}
                    disabled={populating || !data?.preview || data.preview.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-extrabold uppercase tracking-wider text-xs transition-all cursor-pointer font-mono shadow-[0_0_20px_rgba(232,168,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed text-center"
                  >
                    {populating ? 'Populating...' : 'Populate Standings'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
