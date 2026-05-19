'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from "@/components/ui/LoadingSpinner"

interface Season {
  id: string
  name: string
  isActive: boolean
}

interface SubAdminFormProps {
  seasons: Season[]
  createdBy: string
  initialData?: {
    id: string
    name: string
    email: string
    isActive: boolean
    assignedSeasons: string[]
  }
}

export default function SubAdminForm({ seasons, createdBy, initialData }: SubAdminFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    password: '',
    confirmPassword: '',
    isActive: initialData?.isActive ?? true,
    assignedSeasons: initialData?.assignedSeasons || []
  })

  const handleSeasonToggle = (seasonId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedSeasons: prev.assignedSeasons.includes(seasonId)
        ? prev.assignedSeasons.filter(id => id !== seasonId)
        : [...prev.assignedSeasons, seasonId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!initialData && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!initialData && formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    if (formData.assignedSeasons.length === 0) {
      setError('Please assign at least one season')
      setLoading(false)
      return
    }

    try {
      const url = initialData 
        ? `/api/super-admin/sub-admins/${initialData.id}`
        : '/api/super-admin/sub-admins'
      
      const method = initialData ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdBy: initialData ? undefined : createdBy
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save sub-admin')
      }

      router.push('/super-admin/sub-admins')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
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
            <label className="block text-sm font-bold text-[#F5F0E8] mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg text-white focus:border-[#E8A800] focus:outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#F5F0E8] mb-2">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg text-white focus:border-[#E8A800] focus:outline-none"
              placeholder="john@example.com"
              disabled={!!initialData}
            />
            {initialData && (
              <p className="text-xs text-[#7A7367] mt-1">Email cannot be changed</p>
            )}
          </div>

          {!initialData && (
            <>
              <div>
                <label className="block text-sm font-bold text-[#F5F0E8] mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-[#111111] border border-white/10 rounded-lg text-white focus:border-[#E8A800] focus:outline-none"
                    placeholder="Minimum 8 characters"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4CCBB] hover:text-[#E8A800] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#F5F0E8] mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-[#111111] border border-white/10 rounded-lg text-white focus:border-[#E8A800] focus:outline-none"
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4CCBB] hover:text-[#E8A800] transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Season Access */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-6">
        <h2 className="text-xl font-black text-[#F5F0E8] mb-2">Season Access</h2>
        <p className="text-sm text-[#D4CCBB] mb-6">
          Select which seasons this sub-admin can manage
        </p>
        
        <div className="space-y-3">
          {seasons.map((season) => (
            <label
              key={season.id}
              className="flex items-center gap-3 p-4 rounded-lg bg-[#111111] border border-white/10 hover:border-[#E8A800]/30 cursor-pointer transition-all"
            >
              <input
                type="checkbox"
                checked={formData.assignedSeasons.includes(season.id)}
                onChange={() => handleSeasonToggle(season.id)}
                className="w-5 h-5 rounded border-white/20 text-[#E8A800] focus:ring-[#E8A800] focus:ring-offset-0 bg-[#0a0a0a]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#F5F0E8]">{season.name}</span>
                  {season.isActive && (
                    <span className="px-2 py-0.5 rounded-full bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800] text-xs font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Account Status */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-6">
        <h2 className="text-xl font-black text-[#F5F0E8] mb-6">Account Status</h2>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-5 h-5 rounded border-white/20 text-[#E8A800] focus:ring-[#E8A800] focus:ring-offset-0 bg-[#0a0a0a]"
          />
          <div>
            <div className="font-bold text-[#F5F0E8]">Active Account</div>
            <div className="text-sm text-[#D4CCBB]">
              {formData.isActive 
                ? 'This sub-admin can login and manage assigned seasons'
                : 'This sub-admin cannot login (account is disabled)'}
            </div>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? 'Saving...' : initialData ? 'Update Sub-Admin' : 'Create Sub-Admin'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-[#F5F0E8] font-bold rounded-lg transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
