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
      const defaultDate = new Date(dates[0]).toISOString().slice(0, 16)
      
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

  const [deadlines, setDeadlines] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    rounds.forEach(r => {
      initial[r.name] = r.defaultDate
    })
    return initial
  })

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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Manage Match Rounds</h2>
        <p className="text-sm text-[#7A7367]">Set deadlines and start gameweeks</p>
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
