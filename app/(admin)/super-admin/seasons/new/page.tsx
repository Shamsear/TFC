"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Icon Components
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function CreateSeasonPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    startingPurse: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.name || !formData.startingPurse) {
      setError("Season name and starting purse are required")
      return
    }

    const startingPurse = parseInt(formData.startingPurse, 10)
    if (isNaN(startingPurse) || startingPurse <= 0) {
      setError("Starting purse must be a positive number")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/seasons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formData.name,
          startingPurse
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create season")
      }

      router.push("/super-admin/seasons")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create season")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/super-admin/seasons"
            className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeftIcon />
            Back to Seasons
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Create New Season
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">
            Start a new tournament season
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
            {/* Season Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-bold mb-2 sm:mb-3 text-white">
                Season Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800]/50 focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white placeholder-gray-500 text-sm sm:text-base"
                placeholder="e.g., Season 2026, Winter Cup 2026"
                required
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                Choose a unique name for this tournament season
              </p>
            </div>

            {/* Starting Purse */}
            <div>
              <label htmlFor="startingPurse" className="block text-sm font-bold mb-2 sm:mb-3 text-white">
                Starting Purse <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base sm:text-lg">$</span>
                <input
                  type="number"
                  id="startingPurse"
                  value={formData.startingPurse}
                  onChange={(e) => setFormData(prev => ({ ...prev, startingPurse: e.target.value }))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg sm:rounded-xl pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800]/50 focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white placeholder-gray-500 text-sm sm:text-base"
                  placeholder="1000000"
                  min="1"
                  required
                />
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                Initial budget for all teams in this season
              </p>
            </div>

            {/* Preview Card */}
            {formData.name && formData.startingPurse && (
              <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 p-4 sm:p-6">
                <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4">
                  <CalendarIcon />
                  <div className="text-xs sm:text-sm font-bold text-[#E8A800] uppercase tracking-wider">Preview</div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-white">{formData.name}</div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-[#E8A800]">
                    <DollarIcon />
                    <div>
                      <div className="text-xs sm:text-sm text-gray-400">Starting Purse</div>
                      <div className="text-lg sm:text-xl font-black">
                        ${parseInt(formData.startingPurse || "0", 10).toLocaleString()}
                      </div>
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
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-[#E8A800]/50 text-sm sm:text-base"
            >
              {isSubmitting ? "Creating..." : "Create Season"}
            </button>
            <Link
              href="/super-admin/seasons"
              className="px-4 sm:px-6 py-2 sm:py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg sm:rounded-xl font-bold transition-all text-center text-sm sm:text-base"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
