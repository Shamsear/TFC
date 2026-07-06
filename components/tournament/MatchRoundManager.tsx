'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/ToastProvider'

interface MatchRoundManagerProps {
  matches: any[]
  tournamentId: string
  seasonId: string
}

const toLocalISOString = (dateVal: any) => {
  if (!dateVal) return ''
  const date = new Date(dateVal)
  if (isNaN(date.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function MatchRoundManager({ matches, tournamentId, seasonId }: MatchRoundManagerProps) {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  
  // Group matches by round
  const rounds = useMemo(() => {
    const grouped = new Map<string, any[]>()
    
    matches.forEach(match => {
      if (!match.round) return
      if (!grouped.has(match.round)) {
        grouped.set(match.round, [])
      }
      grouped.get(match.round)!.push(match)
    })
    
    return Array.from(grouped.entries()).map(([name, roundMatches]) => {
      const dates = roundMatches.map(m => m.matchDate)
      const isAnyLive = roundMatches.some(m => m.status === 'LIVE')
      const isAllCompleted = roundMatches.every(m => m.status === 'COMPLETED' || m.status === 'CANCELLED')
      const defaultDate = toLocalISOString(dates[0])
      
      return {
        name,
        matches: roundMatches,
        defaultDate,
        isActive: isAnyLive,
        isCompleted: isAllCompleted
      }
    }).sort((a, b) => {
      const aNum = parseInt(a.name.replace(/[^0-9]/g, '')) || 0
      const bNum = parseInt(b.name.replace(/[^0-9]/g, '')) || 0
      if (aNum !== bNum) return aNum - bNum
      return a.name.localeCompare(b.name)
    })
  }, [matches])

  const [defaultDeadlineTime, setDefaultDeadlineTime] = useState('22:00')
  const [defaultDeadlineOffset, setDefaultDeadlineOffset] = useState(2)

  const [deadlines, setDeadlines] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    rounds.forEach(r => {
      initial[r.name] = r.defaultDate
    })
    return initial
  })

  const handleApplyDefaults = () => {
    const updated = { ...deadlines }
    rounds.forEach(r => {
      if (r.matches.length === 0) return
      
      const earliestMatch = r.matches.reduce((earliest, match) => {
        const d = new Date(match.matchDate)
        return d < earliest ? d : earliest
      }, new Date(r.matches[0].matchDate))

      const [hours, minutes] = defaultDeadlineTime.split(':')
      
      const deadlineDate = new Date(
        earliestMatch.getFullYear(),
        earliestMatch.getMonth(),
        earliestMatch.getDate() + Number(defaultDeadlineOffset),
        Number(hours),
        Number(minutes)
      )

      const year = deadlineDate.getFullYear()
      const month = String(deadlineDate.getMonth() + 1).padStart(2, '0')
      const day = String(deadlineDate.getDate()).padStart(2, '0')
      const hr = String(deadlineDate.getHours()).padStart(2, '0')
      const min = String(deadlineDate.getMinutes()).padStart(2, '0')
      
      updated[r.name] = `${year}-${month}-${day}T${hr}:${min}`
    })
    setDeadlines(updated)
    toast.success('Applied default deadlines to all rounds!')
  }

  const handleDeadlineChange = (roundName: string, value: string) => {
    setDeadlines(prev => ({
      ...prev,
      [roundName]: value
    }))
  }

  const handleStartRound = async (roundName: string) => {
    if (!confirm(`Are you sure you want to START ${roundName}? This will set all matches in this round to LIVE, update their deadline, and notify teams.`)) {
      return
    }

    setLoading(roundName)
    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournamentId}/rounds/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: roundName,
          deadline: new Date(deadlines[roundName]).toISOString()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start round')
      }

      toast.success(`${roundName} started successfully`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(null)
    }
  }

  const handleStopRound = async (roundName: string) => {
    if (!confirm(`Are you sure you want to STOP ${roundName}? This will set all matches in this round to COMPLETED and notify teams that the deadline has ended.`)) {
      return
    }

    setLoading(roundName + '_stop')
    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournamentId}/rounds/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: roundName })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to stop round')
      }

      toast.success(`${roundName} stopped successfully`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(null)
    }
  }

  if (rounds.length === 0) {
    return (
      <div className="rounded-3xl bg-white/[0.01] border border-white/5 p-12 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">No rounds/matchdays found in this tournament.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">Manage Match Rounds</h2>
          <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider font-mono mt-1">Set deadlines and start gameweeks</p>
        </div>
      </div>

      {/* Bulk Deadline Prefill Panel */}
      <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
        <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono mb-4">Bulk Set Default Round Deadlines</h3>
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          <div className="w-full sm:w-40">
            <label className="block text-[10px] font-extrabold uppercase text-gray-500 tracking-widest font-mono mb-2">
              Deadline Time
            </label>
            <input
              type="time"
              value={defaultDeadlineTime}
              onChange={(e) => setDefaultDeadlineTime(e.target.value)}
              className="w-full bg-white/[0.01] border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-[#E8A800] focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer font-mono uppercase tracking-wider transition-all hover:bg-white/[0.03]"
            />
          </div>

          <div className="w-full sm:w-44">
            <label className="block text-[10px] font-extrabold uppercase text-gray-500 tracking-widest font-mono mb-2">
              Deadline Offset
            </label>
            <select
              value={defaultDeadlineOffset}
              onChange={(e) => setDefaultDeadlineOffset(parseInt(e.target.value) || 0)}
              className="w-full bg-white/[0.01] border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-[#E8A800] focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer font-mono uppercase tracking-wider transition-all hover:bg-white/[0.03]"
            >
              <option value={0} className="bg-[#0c0c0c] text-white">Same day</option>
              <option value={1} className="bg-[#0c0c0c] text-white">1 day after</option>
              <option value={2} className="bg-[#0c0c0c] text-white">2 days after</option>
              <option value={3} className="bg-[#0c0c0c] text-white">3 days after</option>
              <option value={4} className="bg-[#0c0c0c] text-white">4 days after</option>
              <option value={5} className="bg-[#0c0c0c] text-white">5 days after</option>
              <option value={6} className="bg-[#0c0c0c] text-white">6 days after</option>
              <option value={7} className="bg-[#0c0c0c] text-white">7 days after</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleApplyDefaults}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#E8A800]/10 hover:bg-[#E8A800]/20 border border-[#E8A800]/20 text-[#E8A800] hover:text-[#FFB347] rounded-xl text-xs font-bold uppercase tracking-wider font-mono transition-all cursor-pointer"
          >
            Apply to All Rounds
          </button>
        </div>

        {/* Live Preview Widget */}
        <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-3.5 flex items-center justify-between gap-4 mt-5 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-xl">📅</span>
            <div>
              <div className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-0.5">Round Deadline Preview Example</div>
              <div className="font-extrabold text-white text-xs">
                Match Start (Today): <span className="text-[#D4CCBB]">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="mx-2 text-gray-600">→</span>
                Deadline: <span className="text-emerald-400">{(() => {
                  const now = new Date()
                  const [hours, minutes] = defaultDeadlineTime.split(':')
                  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hours), Number(minutes))
                  const deadline = new Date(base.getTime() + (Number(defaultDeadlineOffset) * 24 * 60 * 60 * 1000))
                  return deadline.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + deadline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                })()}</span>
              </div>
            </div>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">LIVE PREVIEW</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rounds.map((round) => (
          <div 
            key={round.name} 
            className={`p-5 rounded-2xl border transition-all ${
              round.isActive 
                ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                : round.isCompleted
                  ? 'bg-white/[0.01] border-white/5 opacity-60'
                  : 'bg-[#0D0D0D]/90 border-white/5'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold uppercase text-white text-sm font-mono tracking-tight">{round.name}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 font-mono">{round.matches.length} Matches</p>
              </div>
              {round.isActive && (
                <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                  LIVE
                </span>
              )}
              {round.isCompleted && (
                <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-white/5 border border-white/5 text-gray-500 font-mono">
                  COMPLETED
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-gray-500 tracking-widest font-mono mb-2">
                  Match Deadline
                </label>
                <input
                  type="datetime-local"
                  value={deadlines[round.name] || ''}
                  onChange={(e) => handleDeadlineChange(round.name, e.target.value)}
                  disabled={round.isCompleted || loading?.includes(round.name)}
                  className="w-full bg-white/[0.01] border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-[#E8A800] focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer font-mono uppercase tracking-wider transition-all hover:bg-white/[0.03]"
                />
              </div>

              {!round.isCompleted && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleStartRound(round.name)}
                    disabled={loading === round.name}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs uppercase tracking-wider font-mono transition-all cursor-pointer ${
                      round.isActive
                        ? 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                        : 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-black font-extrabold shadow-[0_0_15px_rgba(232,168,0,0.1)]'
                    }`}
                  >
                    {loading === round.name ? (
                      <LoadingSpinner size="sm" />
                    ) : round.isActive ? (
                      'Update Deadline'
                    ) : (
                      'Start Gameweek'
                    )}
                  </button>

                  {round.isActive && (
                    <button
                      onClick={() => handleStopRound(round.name)}
                      disabled={loading === round.name + '_stop'}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs uppercase tracking-wider font-mono transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/25 cursor-pointer"
                    >
                      {loading === round.name + '_stop' ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        'Stop Gameweek'
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
