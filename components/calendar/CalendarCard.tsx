'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PositionGroupBadge from '@/components/player/PositionGroupBadge'

interface CalendarCardProps {
  calendar: {
    id: string
    auctionDate: Date
    description: string | null
    formattedDate: string
    auctionSlots: Array<{
      id: string
      position: string
      position_group?: string | null
      roundType?: string | null
      positionHidden?: boolean | null
    }>
  }
  seasonId: string
}

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(date))
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date))
}

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

export default function CalendarCard({ calendar, seasonId }: CalendarCardProps) {
  const router = useRouter()

  const hasHiddenPositions = calendar.auctionSlots.some(slot => slot.positionHidden)

  const handleReveal = async () => {
    if (!confirm('Are you sure you want to reveal all hidden positions for this auction date?')) {
      return
    }

    try {
      const response = await fetch(`/api/seasons/${seasonId}/calendar/${calendar.id}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body reveals all positions
      })

      if (response.ok) {
        router.refresh()
      } else {
        alert('Failed to reveal positions')
      }
    } catch (error) {
      console.error('Error revealing positions:', error)
      alert('Failed to reveal positions')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this auction date?')) {
      return
    }

    try {
      const response = await fetch(`/api/seasons/${seasonId}/calendar/${calendar.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.refresh()
      } else {
        alert('Failed to delete auction date')
      }
    } catch (error) {
      console.error('Error deleting calendar:', error)
      alert('Failed to delete auction date')
    }
  }

  return (
    <div className="group rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <Link
          href={`/sub-admin/${seasonId}/calendar/${calendar.id}`}
          className="flex-1 min-w-0"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] flex-shrink-0">
              <CalendarIcon />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg sm:text-2xl font-black text-white truncate">
                {formatDate(calendar.auctionDate)}
              </div>
              <div className="text-sm text-[#E8A800] font-bold mt-0.5">
                {formatTime(calendar.auctionDate)}
              </div>
              {calendar.description && (
                <div className="text-xs sm:text-sm text-[#7A7367] mt-1 line-clamp-2">{calendar.description}</div>
              )}
            </div>
          </div>

          {/* Position Slots */}
          <div className="flex flex-wrap gap-2 mt-4">
            {calendar.auctionSlots.length === 0 ? (
              <div className="text-xs sm:text-sm text-[#7A7367]">No position slots configured</div>
            ) : (
              calendar.auctionSlots.map((slot) => {
                const isBulk = slot.roundType === 'bulk';
                const displayPosition = slot.positionHidden ? '???' : slot.position;
                const displayGroup = slot.positionHidden ? '' : (slot.position_group && slot.position_group !== 'ALL' ? `-${slot.position_group}` : '');
                return (
                  <div
                    key={slot.id}
                    className={`px-2 sm:px-3 py-1 rounded-lg border text-xs sm:text-sm font-bold transition-all ${
                      isBulk
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                        : 'bg-[#E8A800]/10 border-[#E8A800]/30 text-[#E8A800]'
                    } ${slot.positionHidden ? 'opacity-75' : ''}`}
                  >
                    {displayPosition}{displayGroup}
                    {isBulk && <span className="text-[10px] font-normal ml-1 opacity-80">(Bulk)</span>}
                    {slot.positionHidden && <span className="text-[10px] font-normal ml-1 opacity-80">(Hidden)</span>}
                  </div>
                );
              })
            )}
          </div>
        </Link>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasHiddenPositions && (
            <button
              type="button"
              onClick={handleReveal}
              className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all"
              title="Reveal Hidden Positions"
            >
              <EyeIcon />
            </button>
          )}
          <Link
            href={`/sub-admin/${seasonId}/calendar/${calendar.id}/edit`}
            className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all"
            title="Edit"
          >
            <EditIcon />
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
            title="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
