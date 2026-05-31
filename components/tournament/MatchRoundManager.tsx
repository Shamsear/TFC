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
      // Find the most common match date in this round
      const dates = roundMatches.map(m => m.matchDate)
      const isAnyLive = roundMatches.some(m => m.status === 'LIVE')
      const isAllCompleted = roundMatches.every(m => m.status === 'COMPLETED' || m.status === 'CANCELLED')
      
      // We assume the first match's date is representative if they vary, though they should ideally be the same
      const defaultDate = toLocalISOString(dates[0])
      
      return {
        name,
        matches: roundMatches,
        defaultDate,
        isActive: isAnyLive,
        isCompleted: isAllCompleted
      }
    }).sort((a, b) => {
      // Basic sorting by match count or name if we can parse numbers
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
      <div className="text-center py-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
        <p className="text-[#7A7367]">No rounds/matchdays found in this tournament.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Manage Match Rounds</h2>
          <p className="text-sm text-[#7A7367]">Set deadlines and start gameweeks</p>
        </div>
      </div>

      {/* Bulk Deadline Prefill Panel */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-white mb-3">Bulk Set Default Round Deadlines</h3>
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          <div className="w-full sm:w-40">
            <label className="block text-xs font-medium text-[#D4CCBB] mb-1.5">
              Deadline Time
            </label>
            <input
              type="time"
              value={defaultDeadlineTime}
              onChange={(e) => setDefaultDeadlineTime(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
            />
          </div>

          <div className="w-full sm:w-44">
            <label className="block text-xs font-medium text-[#D4CCBB] mb-1.5">
              Deadline Offset
            </label>
            <select
              value={defaultDeadlineOffset}
              onChange={(e) => setDefaultDeadlineOffset(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
            >
              <option value={0}>Same day</option>
              <option value={1}>1 day after</option>
              <option value={2}>2 days after</option>
              <option value={3}>3 days after</option>
              <option value={4}>4 days after</option>
              <option value={5}>5 days after</option>
              <option value={6}>6 days after</option>
              <option value={7}>7 days after</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleApplyDefaults}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#E8A800]/10 hover:bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] rounded-lg font-bold text-sm transition-all"
          >
            Apply to All Rounds
          </button>
        </div>

        {/* Live Preview Widget */}
        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 flex items-center justify-between gap-4 mt-4 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">📅</span>
            <div>
              <div className="text-[10px] text-[#7A7367] uppercase font-bold tracking-wider mb-0.5">Round Deadline Preview Example</div>
              <div className="font-bold text-white">
                Match Start (Today): <span className="text-[#D4CCBB]">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="mx-2 text-[#7A7367]">→</span>
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
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase">LIVE PREVIEW</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rounds.map((round) => (
          <div 
            key={round.name} 
            className={`p-4 rounded-xl border transition-all ${
              round.isActive 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : round.isCompleted
                  ? 'bg-white/5 border-white/10 opacity-75'
                  : 'bg-black/30 border-white/10'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-white">{round.name}</h3>
                <p className="text-xs text-[#7A7367] mt-1">{round.matches.length} Matches</p>
              </div>
              {round.isActive && (
                <span className="px-2 py-1 text-xs font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              )}
              {round.isCompleted && (
                <span className="px-2 py-1 text-xs font-bold rounded bg-white/10 text-gray-400">
                  COMPLETED
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#D4CCBB] mb-1">
                  Match Deadline
                </label>
                <input
                  type="datetime-local"
                  value={deadlines[round.name] || ''}
                  onChange={(e) => handleDeadlineChange(round.name, e.target.value)}
                  disabled={round.isCompleted || loading?.includes(round.name)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8A800]"
                />
              </div>

              {!round.isCompleted && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleStartRound(round.name)}
                    disabled={loading === round.name}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${
                      round.isActive
                        ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                        : 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-black'
                    }`}
                  >
                    {loading === round.name ? (
                      <LoadingSpinner size="sm" />
                    ) : round.isActive ? (
                      'Update Deadline / Resend Notification'
                    ) : (
                      'Start Gameweek'
                    )}
                  </button>

                  {round.isActive && (
                    <button
                      onClick={() => handleStopRound(round.name)}
                      disabled={loading === round.name + '_stop'}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
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
