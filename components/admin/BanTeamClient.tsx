'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import SearchableSelect from '@/components/ui/SearchableSelect'
import TeamLogo from '@/components/team/TeamLogo'

interface Season {
  id: string
  name: string
  seasonNumber: number
}

interface TeamInSeason {
  id: string
  name: string
  logoUrl: string
  managerName: string
  currentBudget: number
  startingPurse: number
  activePlayersCount: number
}

interface BanTeamClientProps {
  initialSeasonId: string
  seasons: Season[]
}

export default function BanTeamClient({ initialSeasonId, seasons }: BanTeamClientProps) {
  const router = useRouter()
  const [seasonId, setSeasonId] = useState(initialSeasonId)
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<TeamInSeason[]>([])
  const [seasonName, setSeasonName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [selectedTeam, setSelectedTeam] = useState<TeamInSeason | null>(null)
  const [reason, setReason] = useState('Inactive team banned and removed from season')
  const [isBanning, setIsBanning] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSeasonTeams(seasonId)
  }, [seasonId])

  const fetchSeasonTeams = async (sId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/seasons/${sId}/teams`)
      const data = await res.json()
      if (res.ok) {
        setTeams(data.teams || [])
        setSeasonName(data.season?.name || '')
      } else {
        console.error('Failed to fetch season teams:', data.error)
      }
    } catch (err) {
      console.error('Error fetching season teams:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSeasonChange = (newSeasonId: string) => {
    if (newSeasonId && newSeasonId !== seasonId) {
      setSeasonId(newSeasonId)
      router.push(`/sub-admin/${newSeasonId}/tools/ban-team`)
    }
  }

  const handleBanTeam = async () => {
    if (!selectedTeam) return
    setIsBanning(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/ban-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeam.id,
          reason
        })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
        setSelectedTeam(null)
        // Refresh list
        fetchSeasonTeams(seasonId)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to ban team' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred' })
    } finally {
      setIsBanning(false)
    }
  }

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.managerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}/tools`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Admin Tools
        </Link>
      </div>

      {/* Header & Season Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 bg-gradient-to-r from-red-400 to-rose-600 bg-clip-text text-transparent uppercase tracking-wider">
            Team Ban & Free Agent Tool
          </h1>
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest font-mono">
            Remove inactive teams from season history and release their players to Free Agency
          </p>
        </div>

        <div className="w-full md:w-72">
          <SearchableSelect
            label="Select Season"
            value={seasonId}
            options={seasons.map(s => ({ value: s.id, label: s.name }))}
            onChange={handleSeasonChange}
            enableSearch={false}
          />
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div className={`p-4 rounded-2xl mb-8 flex items-center justify-between border font-mono text-xs font-bold ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div>{message.text}</div>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-white font-black ml-4">✕</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search team or manager..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 pl-9 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="text-xs text-gray-400 font-mono hidden sm:block">
          Active Teams in {seasonName}: <span className="text-white font-bold">{teams.length}</span>
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent mb-4"></div>
          <div className="text-xs text-gray-500 font-extrabold uppercase tracking-wider font-mono">Loading teams...</div>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-12 text-center text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">
          No teams found in this season.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map(team => (
            <div
              key={team.id}
              className="rounded-2xl bg-white/[0.01] border border-white/5 hover:border-red-500/30 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-white text-lg truncate">{team.name}</h3>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono">
                      Manager: {team.managerName}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 py-3 border-y border-white/5 font-mono text-xs mb-6">
                  <div className="flex justify-between text-gray-400">
                    <span>Squad Roster:</span>
                    <span className="text-white font-bold">{team.activePlayersCount || 0} Players</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Budget:</span>
                    <span className="text-[#E8A800] font-extrabold">£{(team.currentBudget || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedTeam(team)
                  setReason('Inactive team banned and removed from season')
                }}
                className="w-full py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Ban & Release Squad
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-[#121212] border border-rose-500/30 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Confirm Ban & Removal</h3>
                <div className="text-xs font-bold text-gray-400 font-mono">{selectedTeam.name} ({seasonName})</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono space-y-2 text-rose-200">
              <div className="font-bold text-rose-400 uppercase tracking-wider">⚠️ Action Consequences:</div>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>Make all <strong className="text-white">{selectedTeam.activePlayersCount || 0} players</strong> free agents (released back to base pool).</li>
                <li>Remove <strong className="text-white">{selectedTeam.name}</strong> from {seasonName} roster & standings history.</li>
                <li>Delete pending bids, auction plans, squad formations, and ledger logs for this team in this season.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">Reason / Notes:</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                placeholder="Reason for banning team..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                disabled={isBanning}
                className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleBanTeam}
                disabled={isBanning}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isBanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Confirm Ban & Release Squad'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
