'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from "@/components/ui/LoadingSpinner"

interface EditTournamentFormProps {
  seasonId: string
  tournament: {
    id: string
    name: string
    description: string | null
    startDate: Date
    endDate: Date | null
    status: string
  }
}

export default function EditTournamentForm({ seasonId, tournament }: EditTournamentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Helper to format Date to YYYY-MM-DD for input fields
  const formatDateForInput = (date: Date | null) => {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    name: tournament.name,
    description: tournament.description || '',
    startDate: formatDateForInput(tournament.startDate),
    endDate: formatDateForInput(tournament.endDate),
    status: tournament.status
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/seasons/${seasonId}/tournaments/${tournament.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tournament')
      }

      router.push(`/sub-admin/${seasonId}/tournaments/${tournament.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold">
          {error}
        </div>
      )}

      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 space-y-4">
        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">Edit Tournament Details</h2>
        <p className="text-sm text-[#7A7367] mb-6">Modify the metadata and schedule for this tournament.</p>

        {/* Tournament Name */}
        <div>
          <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
            Tournament Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base font-bold"
            placeholder="e.g. Champions League Playoffs"
          />
        </div>

        {/* Tournament Description */}
        <div>
          <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base min-h-[100px] resize-y"
            placeholder="Optional tournament description..."
          />
        </div>

        {/* Start & End Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
              Start Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
              End Date
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base font-bold"
            />
          </div>
        </div>

        {/* Tournament Status */}
        <div>
          <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base font-bold cursor-pointer"
          >
            <option value="UPCOMING">UPCOMING</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white/5 border border-white/10 text-white rounded-lg sm:rounded-xl font-bold hover:bg-white/10 transition-all text-sm sm:text-base"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
