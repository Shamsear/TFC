"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ImageKitUpload } from "@/components/upload/ImageKitUpload"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

interface TeamProfileEditFormProps {
  team: {
    id: string
    name: string
    managerName: string
    logoUrl: string
  }
}

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

export default function TeamProfileEditForm({ team }: TeamProfileEditFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: team.name,
    managerName: team.managerName,
    logoUrl: team.logoUrl
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [logoChanged, setLogoChanged] = useState(false)

  const handleUploadSuccess = (url: string) => {
    setFormData(prev => ({ ...prev, logoUrl: url }))
    setLogoChanged(true)
    setError("")
  }

  const handleUploadError = (error: Error) => {
    setError(error.message)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.name || !formData.managerName) {
      setError("Team name and manager name are required")
      return
    }

    if (!formData.logoUrl) {
      setError("Please upload a team logo")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/team/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update profile")
      }

      router.push(`/team/profile`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <Link
          href="/team/profile"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-semibold text-sm cursor-pointer mb-6 transform active:scale-95"
        >
          <ArrowLeftIcon />
          <span>Back to Profile</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 tracking-tight">
          <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
            Edit Profile
          </span>
        </h1>
        <p className="text-[#D4CCBB] text-xs font-bold uppercase tracking-wider">
          Update your team profile details and logo
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#E8A800]/[0.01] rounded-full blur-2xl pointer-events-none" />
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Team Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-bold mb-3 text-white">
              Team Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-black/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#E8A800]/50 focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white placeholder-[#7A7367] font-semibold"
              placeholder="Enter team name"
              required
            />
          </div>

          {/* Manager Name */}
          <div>
            <label htmlFor="managerName" className="block text-sm font-bold mb-3 text-white">
              Manager Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="managerName"
              value={formData.managerName}
              onChange={(e) => setFormData(prev => ({ ...prev, managerName: e.target.value }))}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-black/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#E8A800]/50 focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white placeholder-[#7A7367] font-semibold"
              placeholder="Enter manager name"
              required
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-bold mb-3 text-white">
              Team Logo <span className="text-red-400">*</span>
            </label>
            
            <div className="mb-4">
              <ImageKitUpload
                onSuccess={handleUploadSuccess}
                onError={handleUploadError}
                folder="/turf-cats/teams"
                fileName={`team-logo-${team.id}-${Date.now()}`}
                accept="image/*"
              />
            </div>
            
            {logoChanged && (
              <div className="mb-4 flex items-center gap-2 text-sm text-emerald-400 font-medium">
                <CheckIcon />
                New logo uploaded successfully
              </div>
            )}

            {formData.logoUrl && (
              <div className="flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 rounded-xl p-6">
                <img
                  src={formData.logoUrl}
                  alt="Logo preview"
                  className="w-32 h-32 object-contain"
                />
              </div>
            )}
          </div>

          {/* Preview Card */}
          {formData.name && formData.managerName && formData.logoUrl && (
            <div className="rounded-xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <UsersIcon />
                <div className="text-xs font-bold text-[#E8A800] uppercase tracking-wider">Preview Card</div>
              </div>
              <div className="flex items-center gap-4">
                <img
                  src={formData.logoUrl}
                  alt="Preview"
                  className="w-16 h-16 object-contain rounded-xl bg-black/30 p-2"
                />
                <div>
                  <div className="text-xl font-black text-white">{formData.name}</div>
                  <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                    <UsersIcon />
                    {formData.managerName}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={isSubmitting || !formData.logoUrl}
            className="flex-1 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-[#E8A800]/50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <LoadingSpinner size="sm" />}
            {isSubmitting ? "Saving..." : "Save Profile"}
          </button>
          <Link
            href="/team/profile"
            className="px-6 py-3 bg-white/[0.02] border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl font-bold transition-all text-center cursor-pointer shadow-lg"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
