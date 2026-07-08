'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TournamentStatusSelectorProps {
  tournamentId: string
  seasonId: string
  initialStatus: string
}

const STATUS_OPTIONS = [
  { value: 'UPCOMING', label: 'Upcoming', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20' },
  { value: 'COMPLETED', label: 'Completed', color: 'text-[#7A7367] bg-[#7A7367]/10 border-[#7A7367]/20 hover:bg-[#7A7367]/20' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20' },
]

export default function TournamentStatusSelector({
  tournamentId,
  seasonId,
  initialStatus,
}: TournamentStatusSelectorProps) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const currentOption = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0]

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status || loading) return
    setLoading(true)
    setIsOpen(false)
    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setStatus(newStatus)
        router.refresh()
      } else {
        console.error('Failed to update tournament status')
        alert('Failed to update status. Please try again.')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        disabled={loading}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${currentOption.color} ${loading ? 'opacity-55' : ''}`}
      >
        {loading ? (
          <span className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
        )}
        <span>{status.replace('_', ' ')}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 z-50 w-40 rounded-xl bg-[#121212] border border-white/10 shadow-[0_8px_32px_rgb(0,0,0,0.5)] p-1.5 space-y-1">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[10px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer ${
                  status === option.value
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
