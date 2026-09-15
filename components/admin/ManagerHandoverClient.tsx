'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SeasonTeamOption {
  id: string
  teamId: string
  teamName: string
  teamLogo: string
  currentManagerName: string
  matchCount: number
  hasHandover: boolean
}

interface MatchItem {
  id: string
  round: string
  matchDate: string
  tournamentName: string
  opponentName: string
  opponentLogo: string
  isHome: boolean
  homeScore: number | null
  awayScore: number | null
  result: 'W' | 'D' | 'L'
}

interface ManagerOption {
  id: string
  name: string
  photoUrl: string | null
}

interface ManagerHandoverClientProps {
  seasonId: string
  seasonName: string
  seasonTeams: SeasonTeamOption[]
  allManagers: ManagerOption[]
}

export default function ManagerHandoverClient({
  seasonId,
  seasonName,
  seasonTeams,
  allManagers
}: ManagerHandoverClientProps) {
  const router = useRouter()

  const [selectedSeasonTeamId, setSelectedSeasonTeamId] = useState<string>(seasonTeams[0]?.id || '')
  const [newManagerName, setNewManagerName] = useState<string>('')
  const [lastMatchId, setLastMatchId] = useState<string | null>(null)
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [existingTenures, setExistingTenures] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [reverting, setReverting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [step, setStep] = useState<number>(1)

  const selectedTeam = seasonTeams.find(t => t.id === selectedSeasonTeamId)

  // Fetch match details and tenure history when a team is selected
  useEffect(() => {
    if (!selectedSeasonTeamId) return

    async function fetchTeamDetails() {
      setLoadingDetails(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/seasons/${seasonId}/teams/${selectedSeasonTeamId}/handover`)
        if (!res.ok) {
          throw new Error('Failed to load team matches')
        }
        const data = await res.json()
        setMatches(data.matches || [])
        setExistingTenures(data.existingTenures || [])

        // If tenures already exist, set the last match of the first tenure as default
        if (data.existingTenures && data.existingTenures.length > 0) {
          const firstTenure = data.existingTenures[0]
          setLastMatchId(firstTenure.toMatchId || null)
        } else if (data.matches && data.matches.length > 0) {
          // Default: last match completed
          setLastMatchId(data.matches[data.matches.length - 1].id)
        } else {
          setLastMatchId(null)
        }
      } catch (err: any) {
        setError(err.message || 'Error loading team data')
      } finally {
        setLoadingDetails(false)
      }
    }

    fetchTeamDetails()
  }, [selectedSeasonTeamId, seasonId])

  // Calculate live preview stats
  const selectedMatchIndex = lastMatchId
    ? matches.findIndex(m => m.id === lastMatchId)
    : -1

  const oldManagerMatches = selectedMatchIndex >= 0
    ? matches.slice(0, selectedMatchIndex + 1)
    : []

  const newManagerMatches = selectedMatchIndex >= 0
    ? matches.slice(selectedMatchIndex + 1)
    : matches

  const calcStats = (matchList: MatchItem[]) => {
    let played = matchList.length
    let won = matchList.filter(m => m.result === 'W').length
    let drawn = matchList.filter(m => m.result === 'D').length
    let lost = matchList.filter(m => m.result === 'L').length
    let gf = matchList.reduce((acc, m) => acc + (m.isHome ? (m.homeScore || 0) : (m.awayScore || 0)), 0)
    let ga = matchList.reduce((acc, m) => acc + (m.isHome ? (m.awayScore || 0) : (m.homeScore || 0)), 0)
    let pts = won * 3 + drawn
    return { played, won, drawn, lost, gf, ga, gd: gf - ga, pts }
  }

  const oldStats = calcStats(oldManagerMatches)
  const newStats = calcStats(newManagerMatches)

  const handleExecuteHandover = async () => {
    if (!newManagerName.trim()) {
      setError('Please enter the name of the new manager')
      return
    }

    if (newManagerName.trim().toLowerCase() === selectedTeam?.currentManagerName.toLowerCase()) {
      setError('New manager must have a different name from the current manager')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/teams/${selectedSeasonTeamId}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newManagerName: newManagerName.trim(),
          lastMatchId: lastMatchId
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute handover')
      }

      setSuccess(`Handover successful! ${data.newManagerName} is now in charge. Stats have been divided seamlessly.`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to execute handover')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevertHandover = async () => {
    if (!confirm('Are you sure you want to revert this handover? This will restore the original manager and remove the tenure split.')) {
      return
    }

    setReverting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/teams/${selectedSeasonTeamId}/handover`, {
        method: 'DELETE'
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revert handover')
      }

      setSuccess(`Handover reverted! Restored to ${data.revertedTo}.`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to revert handover')
    } finally {
      setReverting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">✕</button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-300">✕</button>
        </div>
      )}

      {/* Safety Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Zero Disruption Guarantee</h4>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Performing a manager handover will <strong className="text-amber-300">NOT</strong> alter team standings, tournament points, squad players, or the remaining budget. Only the manager identity and match stats breakdown on manager profile pages are split at the selected match boundary.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Team & New Manager Selection */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Choose Team */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#E8A800] text-black font-bold text-xs flex items-center justify-center">1</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Team</h3>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {seasonTeams.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setSelectedSeasonTeamId(st.id)
                    setSuccess(null)
                    setError(null)
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                    selectedSeasonTeamId === st.id
                      ? 'bg-[#E8A800]/10 border-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.15)]'
                      : 'bg-white/[0.01] border-white/5 hover:border-white/20 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                      <Image
                        src={st.teamLogo || '/placeholder-team.png'}
                        alt={st.teamName}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{st.teamName}</div>
                      <div className="text-[11px] text-gray-400">
                        Mgr: <span className="text-[#E8A800]">{st.currentManagerName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
                      {st.matchCount} matches
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: New Manager Input */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#E8A800] text-black font-bold text-xs flex items-center justify-center">2</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">New Manager Information</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  New Manager Name
                </label>
                <input
                  type="text"
                  value={newManagerName}
                  onChange={(e) => setNewManagerName(e.target.value)}
                  placeholder="e.g. Ahmed, Rashid..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E8A800] transition-colors"
                />
              </div>

              {/* Suggestions from existing managers */}
              {allManagers.length > 0 && (
                <div>
                  <div className="text-[11px] text-gray-500 uppercase tracking-wider font-mono mb-2">
                    Quick Pick from Existing Managers:
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                    {allManagers
                      .filter(m => m.name.toLowerCase() !== selectedTeam?.currentManagerName.toLowerCase())
                      .map((mgr) => (
                        <button
                          key={mgr.id}
                          type="button"
                          onClick={() => setNewManagerName(mgr.name)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            newManagerName === mgr.name
                              ? 'bg-[#E8A800] text-black font-bold border-[#E8A800]'
                              : 'bg-white/[0.02] border-white/10 text-gray-300 hover:border-white/30'
                          }`}
                        >
                          {mgr.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Existing Tenure Alert if any */}
          {existingTenures.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Active Tenure Split</span>
                </div>
                <button
                  type="button"
                  onClick={handleRevertHandover}
                  disabled={reverting}
                  className="text-xs text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
                >
                  {reverting ? 'Reverting...' : 'Undo Handover'}
                </button>
              </div>
              <div className="space-y-2 text-xs text-gray-300">
                {existingTenures.map((t, i) => (
                  <div key={t.id} className="p-2 rounded bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">{t.managerName}</span>
                      <div className="text-[10px] text-gray-400">
                        {t.fromMatchId ? `From: ${t.fromMatchId}` : 'From start'} → {t.toMatchId ? `To: ${t.toMatchId}` : 'Present'}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      Tenure #{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Match Boundary Selection & Live Preview */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 3: Match Boundary Selection */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#E8A800] text-black font-bold text-xs flex items-center justify-center">3</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Handover Point</h3>
              </div>
              <span className="text-xs text-gray-400">
                {matches.length} completed match{matches.length === 1 ? '' : 'es'}
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Select the <strong className="text-white">last match</strong> that <span className="text-[#E8A800]">{selectedTeam?.currentManagerName}</span> managed. All subsequent matches will belong to <span className="text-emerald-400">{newManagerName || 'the new manager'}</span>.
            </p>

            {loadingDetails ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                Loading team match history...
              </div>
            ) : matches.length === 0 ? (
              <div className="p-6 rounded-xl bg-white/[0.01] border border-white/5 text-center text-gray-400 text-sm">
                No completed matches found for this team yet in {seasonName}. Handover will take effect starting from the very first match.
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {/* Option for handover before any matches */}
                <button
                  type="button"
                  onClick={() => setLastMatchId(null)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    lastMatchId === null
                      ? 'bg-[#E8A800]/10 border-[#E8A800]'
                      : 'bg-white/[0.01] border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Handover before any matches played</div>
                    <div className="text-[10px] text-gray-400">New manager gets credit for ALL matches in {seasonName}</div>
                  </div>
                  <input
                    type="radio"
                    checked={lastMatchId === null}
                    onChange={() => setLastMatchId(null)}
                    className="accent-[#E8A800]"
                  />
                </button>

                {matches.map((m, idx) => {
                  const isOldMgrMatch = selectedMatchIndex >= 0 && idx <= selectedMatchIndex
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setLastMatchId(m.id)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        lastMatchId === m.id
                          ? 'bg-[#E8A800]/15 border-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.1)]'
                          : isOldMgrMatch
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-emerald-500/5 border-emerald-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          m.result === 'W'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : m.result === 'D'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {m.result}
                        </span>
                        <div className="text-left">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>vs {m.opponentName}</span>
                            <span className="text-[11px] font-mono font-normal text-gray-400">
                              ({m.isHome ? `${m.homeScore}-${m.awayScore}` : `${m.awayScore}-${m.homeScore}`})
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {m.tournamentName} • {m.round}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isOldMgrMatch ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {isOldMgrMatch ? 'Old Mgr' : 'New Mgr'}
                        </span>
                        <input
                          type="radio"
                          checked={lastMatchId === m.id}
                          onChange={() => setLastMatchId(m.id)}
                          className="accent-[#E8A800]"
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Live Stats Preview */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Live Stats Allocation Preview
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Old Manager Preview */}
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
                  {selectedTeam?.currentManagerName || 'Current Manager'} (Departing)
                </div>
                <div className="text-2xl font-black text-white font-mono mt-2">
                  {oldStats.played} <span className="text-xs font-normal text-gray-400">matches</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center mt-3 pt-3 border-t border-white/5">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">W</div>
                    <div className="text-sm font-bold text-emerald-400">{oldStats.won}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">D</div>
                    <div className="text-sm font-bold text-amber-400">{oldStats.drawn}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">L</div>
                    <div className="text-sm font-bold text-rose-400">{oldStats.lost}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">Pts</div>
                    <div className="text-sm font-bold text-white font-mono">{oldStats.pts}</div>
                  </div>
                </div>
              </div>

              {/* New Manager Preview */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">
                  {newManagerName || 'New Manager'} (Incoming)
                </div>
                <div className="text-2xl font-black text-white font-mono mt-2">
                  {newStats.played} <span className="text-xs font-normal text-gray-400">matches</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center mt-3 pt-3 border-t border-white/5">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">W</div>
                    <div className="text-sm font-bold text-emerald-400">{newStats.won}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">D</div>
                    <div className="text-sm font-bold text-amber-400">{newStats.drawn}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">L</div>
                    <div className="text-sm font-bold text-rose-400">{newStats.lost}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">Pts</div>
                    <div className="text-sm font-bold text-white font-mono">{newStats.pts}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Execute Button */}
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-end gap-3">
              <Link
                href={`/sub-admin/${seasonId}/tools`}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleExecuteHandover}
                disabled={submitting || !newManagerName.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black font-extrabold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(232,168,0,0.25)]"
              >
                {submitting ? 'Processing Handover...' : 'Confirm Handover & Split Stats'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
