'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface MaintenanceToggleProps {
  initialMaintenance: boolean
}

export default function MaintenanceToggle({ initialMaintenance }: MaintenanceToggleProps) {
  const [isMaintenance, setIsMaintenance] = useState(initialMaintenance)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleToggle = async () => {
    const nextState = !isMaintenance
    const confirmMessage = nextState
      ? 'Are you sure you want to ACTIVATE Maintenance Mode? Public and Team manager pages will be hidden and show "Opening Shortly". Admins will still have access.'
      : 'Are you sure you want to DEACTIVATE Maintenance Mode and make the portal public again?'

    if (!window.confirm(confirmMessage)) {
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/system/maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: nextState })
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to update maintenance mode')
        }

        setIsMaintenance(nextState)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      }
    })
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900/90 via-zinc-900/70 to-zinc-950/90 p-5 backdrop-blur-md shadow-xl">
      {/* Decorative ambient gradient */}
      <div
        className={`absolute -right-10 -top-10 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isMaintenance ? 'bg-amber-500/15' : 'bg-emerald-500/10'
        }`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              isMaintenance
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isMaintenance ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Portal Access Control
              </h3>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  isMaintenance
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isMaintenance ? 'Opening Shortly (Locked)' : 'Live / Public'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isMaintenance
                ? 'Public and team pages are currently hidden and showing "Opening Shortly". Only admins have access.'
                : 'Public and team pages are live and fully visible to everyone.'}
            </p>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#E8A800]/50 disabled:opacity-50 disabled:cursor-not-allowed ${
              isMaintenance
                ? 'bg-amber-500 border-amber-400'
                : 'bg-zinc-800 border-zinc-700'
            }`}
            role="switch"
            aria-checked={isMaintenance}
            title={isMaintenance ? 'Click to open portal publicly' : 'Click to hide portal'}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isMaintenance ? 'translate-x-6' : 'translate-x-0.5'
              } mt-0.5`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
