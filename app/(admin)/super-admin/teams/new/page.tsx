"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ImageKitUpload } from "@/components/upload/ImageKitUpload"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import PageLoader from "@/components/ui/PageLoader"

// Icon Components
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

interface Season {
  id: string
  name: string
  isActive: boolean
}

export default function CreateTeamPage() {
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [formData, setFormData] = useState({
    name: "",
    managerName: "",
    logoUrl: "",
    seasonId: ""
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [credentials, setCredentials] = useState<{
    email: string
    password: string
    teamName: string
  } | null>(null)

  // Fetch seasons
  useEffect(() => {
    async function fetchSeasons() {
      try {
        const response = await fetch("/api/seasons")
        if (response.ok) {
          const data = await response.json()
          setSeasons(data)
          
          // Set active season as default
          const activeSeason = data.find((s: Season) => s.isActive)
          if (activeSeason) {
            setFormData(prev => ({ ...prev, seasonId: activeSeason.id }))
          }
        }
      } catch (err) {
        console.error("Failed to fetch seasons:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSeasons()
  }, [])

  if (isLoading) {
    return <PageLoader />
  }

  const handleUploadSuccess = (url: string) => {
    setFormData(prev => ({ ...prev, logoUrl: url }))
    setError("")
  }

  const handleUploadError = (error: Error) => {
    setError(error.message)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

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
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create team")
      }

      // Show credentials on page
      setCredentials({
        email: data.credentials.email,
        password: data.credentials.password,
        teamName: formData.name
      })
      setSuccess(true)
      setIsSubmitting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="text-white px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/super-admin/teams"
            className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeftIcon />
            Back to Teams
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Create New Team
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">
            Add a new team and automatically create manager login credentials
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

          {success && credentials && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg sm:rounded-xl mb-6 overflow-hidden">
              {/* Success Header */}
              <div className="bg-green-500/20 px-4 py-3 border-b border-green-500/30">
                <div className="flex items-center gap-2">
                  <CheckIcon />
                  <span className="text-green-400 font-bold">Team Created Successfully!</span>
                </div>
              </div>

              {/* Credentials Display */}
              <div className="p-4 space-y-4">
                <p className="text-gray-300 text-sm">
                  Team <span className="font-bold text-white">{credentials.teamName}</span> has been created. Here are the login credentials:
                </p>

                {/* Email */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={credentials.email}
                      readOnly
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(credentials.email)}
                      className="px-3 py-2 bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] rounded-lg hover:bg-[#E8A800]/30 transition-all text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Password</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={credentials.password}
                      readOnly
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(credentials.password)}
                      className="px-3 py-2 bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] rounded-lg hover:bg-[#E8A800]/30 transition-all text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-xs">
                    ⚠️ Save these credentials! They won't be shown again.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Link
                    href="/super-admin/teams"
                    className="flex-1 px-4 py-2 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-all text-center text-sm"
                  >
                    View All Teams
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setSuccess(false)
                      setCredentials(null)
                      setFormData({ name: "", managerName: "", logoUrl: "", seasonId: "" })
                    }}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg font-bold transition-all text-sm"
                  >
                    Create Another Team
                  </button>
                </div>
              </div>
            </div>
          )}

          {!success && (
            <>
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>

            {/* Season Selection */}
            <div>
              <label htmlFor="seasonId" className="block text-sm font-bold mb-2 sm:mb-3 text-white">
                Assign to Season
              </label>
              <select
                id="seasonId"
                value={formData.seasonId}
                onChange={(e) => setFormData(prev => ({ ...prev, seasonId: e.target.value }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800]/50 focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white text-sm sm:text-base"
                disabled={isSubmitting}
              >
                <option value="">No season (assign later)</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} {season.isActive && "(Active)"}
                  </option>
                ))}
              </select>
              <p className="text-gray-400 text-xs mt-2">
                Team manager will only see data for assigned seasons
              </p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-bold mb-2 sm:mb-3 text-white">
                Team Logo <span className="text-red-400">*</span>
              </label>
              
              {formData.logoUrl && (
                <div className="mb-3 sm:mb-4 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 rounded-lg sm:rounded-xl p-6 sm:p-8">
                  <img
                    src={formData.logoUrl}
                    alt="Logo preview"
                    className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                  />
                </div>
              )}

              <ImageKitUpload
                onSuccess={handleUploadSuccess}
                onError={handleUploadError}
                folder="/turf-cats/teams"
                fileName={`team-logo-${Date.now()}`}
                accept="image/*"
              />
              
              {formData.logoUrl && (
                <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-emerald-400 font-medium">
                  <CheckIcon />
                  Logo uploaded successfully
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-blue-400 font-medium text-sm">
                    Automatic Credential Generation
                  </p>
                  <p className="text-blue-400/80 text-xs mt-1">
                    Login credentials will be automatically generated and displayed after team creation. Make sure to save them!
                  </p>
                </div>
              </div>
            </div>

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
              {isSubmitting ? "Creating..." : "Create Team & Generate Credentials"}
            </button>
            <Link
              href="/super-admin/teams"
              className="px-4 sm:px-6 py-2 sm:py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg sm:rounded-xl font-bold transition-all text-center text-sm sm:text-base"
            >
              Cancel
            </Link>
          </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
