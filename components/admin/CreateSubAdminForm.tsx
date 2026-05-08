'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Season {
  id: string
  name: string
}

interface CreateSubAdminFormProps {
  seasons: Season[]
  creatorId: string
}

export default function CreateSubAdminForm({ seasons, creatorId }: CreateSubAdminFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    assignedSeasons: [] as string[]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/sub-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdBy: creatorId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sub-admin')
      }

      router.push('/super-admin/sub-admins')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleSeason = (seasonId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedSeasons: prev.assignedSeasons.includes(seasonId)
        ? prev.assignedSeasons.filter(id => id !== seasonId)
        : [...prev.assignedSeasons, seasonId]
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-6">
        <h2 className="text-xl font-black text-[#F5F0E8] mb-6">Basic Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#D4CCBB] mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg text-[#F5F0E8] focus:border-[#E8A800] focus:outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#D4CCBB] mb-2">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg text-[#F5F0E8] focus:border-[#E8A800] focus:outline-none"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#D4CCBB] mb-2">
              Password *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg text-[#F5F0E8] focus:border-[#E8A800] focus:outline-none"
              placeholder="Minimum 8 characters"
            />
            <p className="text-xs text-[#7A7367] mt-1">
              Password must be at least 8 characters long
            </p>
          </div>
        </div>
      </div>

      {/* Season Permissions */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-6">
        <h2 className="text-xl font-black text-[#F5F0E8] mb-2">Season Permissions</h2>
        <p className="text-sm text-[#7A7367] mb-6">
          Select which seasons this sub-admin can manage
        </p>
        
        <div className="space-y-3">
          {seasons.length === 0 ? (
            <p className="text-[#7A7367] text-sm">No seasons available</p>
          ) : (
            seasons.map((season) => (
              <label
                key={season.id}
                className="flex items-center gap-3 p-4 rounded-lg bg-[#111111] border border-white/10 hover:border-[#E8A800]/30 cursor-pointer transition-all"
              >
                <input
                  type="checkbox"
                  checked={formData.assignedSeasons.includes(season.id)}
                  onChange={() => toggleSeason(season.id)}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#E8A800] focus:ring-[#E8A800] focus:ring-offset-0"
                />
                <span className="text-[#F5F0E8] font-bold">{season.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Sub-Admin'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-[#D4CCBB] font-bold rounded-lg transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
