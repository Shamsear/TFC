"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ImageKitUpload } from "@/components/upload/ImageKitUpload"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import TeamColorPicker from "./TeamColorPicker"

interface TeamEditFormProps {
  team: {
    id: string
    name: string
    managerName: string
    logoUrl: string
    primaryColor?: string
  }
}

// Icon Components
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

export default function TeamEditForm({ team }: TeamEditFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: team.name,
    managerName: team.managerName,
    logoUrl: team.logoUrl,
    primaryColor: (team as any).primaryColor || '#00e5ff'
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
      const response = await fetch(`/api/teams/${team.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update team")
      }

      router.push(`/super-admin/teams/${team.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update team")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Page Title */}
      <div className="mb-6 sm:mb-8">
        <Link
          href={`/super-admin/teams/${team.id}`}
          className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] text-sm font-medium mb-4 transition-colors"
        >
          <ArrowLeftIcon />
          Back to Team Details
        </Link>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 sm:mb-3">
          <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
            Edit Team
          </span>
        </h1>
        <p className="text-[#D4CCBB] text-sm sm:text-base">
          Update team information
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm sm:text-base">{error}</span>
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          {/* Team Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-bold mb-2 sm:mb-3 text-white">
              Team Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-black/50 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800]/50 focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white placeholder-gray-500 text-sm sm:text-base"
              placeholder="Enter team name"
              required
            />
          </div>

          {/* Manager Name */}
          <div>
            <label htmlFor="managerName" className="block text-sm font-bold mb-2 sm:mb-3 text-white">
              Manager Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="managerName"
              value={formData.managerName}
              onChange={(e) => setFormData(prev => ({ ...prev, managerName: e.target.value }))}
              className="w-full bg-black/50 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800]/50 focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white placeholder-gray-500 text-sm sm:text-base"
              placeholder="Enter manager name"
              required
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-bold mb-2 sm:mb-3 text-white">
              Team Logo <span className="text-red-400">*</span>
            </label>
            
            <div className="mb-3 sm:mb-4">
              <ImageKitUpload
                onSuccess={handleUploadSuccess}
                onError={handleUploadError}
                folder="/turf-cats/teams"
                fileName={`team-logo-${team.id}-${Date.now()}`}
                accept="image/*"
              />
            </div>
            
            {logoChanged && (
              <div className="mb-3 sm:mb-4 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-emerald-400 font-medium">
                <CheckIcon />
                New logo uploaded successfully
              </div>
            )}

            {formData.logoUrl && (
              <div className="flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 rounded-lg sm:rounded-xl p-6 sm:p-8">
                <img
                  src={formData.logoUrl}
                  alt="Logo preview"
                  className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                />
              </div>
            )}
          </div>

          {/* Team Color Picker */}
          {formData.logoUrl && (
            <TeamColorPicker
              logoUrl={formData.logoUrl}
              currentColor={formData.primaryColor}
              onColorSelect={(color) => setFormData(prev => ({ ...prev, primaryColor: color }))}
            />
          )}

          {/* Preview Card */}
          {formData.name && formData.managerName && formData.logoUrl && (
            <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 p-4 sm:p-6">
              <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4">
                <UsersIcon />
                <div className="text-xs sm:text-sm font-bold text-[#E8A800] uppercase tracking-wider">Preview</div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <img
                  src={formData.logoUrl}
                  alt="Preview"
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-lg sm:rounded-xl bg-black/30 p-1 sm:p-2"
                />
                <div>
                  <div className="text-lg sm:text-xl font-black text-white">{formData.name}</div>
                  <div className="text-xs sm:text-sm text-gray-400 flex items-center gap-1 sm:gap-2 mt-1">
                    <UsersIcon />
                    {formData.managerName}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="submit"
            disabled={isSubmitting || !formData.logoUrl}
            className="flex-1 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-[#E8A800]/50 text-sm sm:text-base flex items-center justify-center gap-2"
          >
            {isSubmitting && <LoadingSpinner size="sm" />}
            {isSubmitting ? "Updating..." : "Update Team"}
          </button>
          <Link
            href={`/super-admin/teams/${team.id}`}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg sm:rounded-xl font-bold transition-all text-center text-sm sm:text-base"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}
