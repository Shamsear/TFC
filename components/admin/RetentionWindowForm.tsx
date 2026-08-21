"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import TeamLogo from "@/components/team/TeamLogo"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

interface SeasonTeam {
  id: string
  name: string
  logoUrl: string
  managerName: string
  hasPreviousSeason: boolean
}

interface WindowData {
  id?: string
  name: string
  startDate: string
  endDate: string
  retentionLimit: number
  bannedTeamIds: string[] | null
  status?: string
}

interface Props {
  seasonId: string
  seasonName: string
  seasonTeams: SeasonTeam[]
  initialData?: WindowData
  isEdit?: boolean
}

export default function RetentionWindowForm({
  seasonId,
  seasonName,
  seasonTeams,
  initialData,
  isEdit = false,
}: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialData?.name || "")
  // Convert UTC ISO string to IST datetime-local format for display
  const utcToISTLocal = (utcStr: string): string => {
    const date = new Date(utcStr)
    // Add IST offset (UTC+5:30) then format as YYYY-MM-DDTHH:MM
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000))
    const y = istDate.getUTCFullYear()
    const m = String(istDate.getUTCMonth() + 1).padStart(2, "0")
    const d = String(istDate.getUTCDate()).padStart(2, "0")
    const h = String(istDate.getUTCHours()).padStart(2, "0")
    const min = String(istDate.getUTCMinutes()).padStart(2, "0")
    return `${y}-${m}-${d}T${h}:${min}`
  }

  const [startDate, setStartDate] = useState(
    initialData?.startDate ? utcToISTLocal(initialData.startDate) : ""
  )
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? utcToISTLocal(initialData.endDate) : ""
  )
  const [retentionLimit, setRetentionLimit] = useState(initialData?.retentionLimit || 3)
  const [bannedTeamIds, setBannedTeamIds] = useState<string[]>(initialData?.bannedTeamIds || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [teamSearch, setTeamSearch] = useState("")

  const filteredTeams = seasonTeams.filter(
    (t) =>
      !teamSearch ||
      t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.managerName.toLowerCase().includes(teamSearch.toLowerCase())
  )

  const toggleBannedTeam = (teamId: string) => {
    setBannedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    )
  }

  // Convert a datetime-local value (treated as IST) to a UTC ISO string
  const istToUTC = (dateTimeLocal: string): string => {
    // dateTimeLocal is in format "YYYY-MM-DDTHH:MM"
    // Treat it as IST (UTC+5:30) and convert to UTC
    const [datePart, timePart] = dateTimeLocal.split("T")
    const [year, month, day] = datePart.split("-").map(Number)
    const [hours, minutes] = timePart.split(":").map(Number)

    // Create a Date in IST by subtracting 5h30m from the entered time
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes) - (5.5 * 60 * 60 * 1000))
    return utcDate.toISOString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name || !startDate || !endDate) {
      setError("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)

    try {
      const url = isEdit
        ? `/api/admin/retention-windows/${initialData?.id}`
        : "/api/admin/retention-windows"

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId,
          name,
          startDate: istToUTC(startDate),
          endDate: istToUTC(endDate),
          retentionLimit,
          bannedTeamIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save window")
      }

      router.push(`/sub-admin/${seasonId}/retention-windows`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Deduplicate banned teams by teamId for the badge display
  const bannedTeamsForDisplay = seasonTeams.filter(
    (t) => bannedTeamIds.includes(t.id)
  )
  // Deduplicate by team id (show each banned team once in the badges)
  const seenBannedIds = new Set<string>()
  const uniqueBannedTeams = bannedTeamsForDisplay.filter((t) => {
    if (seenBannedIds.has(t.id)) return false
    seenBannedIds.add(t.id)
    return true
  })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}/retention-windows`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Windows
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          {isEdit ? "Edit Window" : "Create Window"}
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {isEdit ? "Update retention window settings" : "Set up a new retention window for"} {seasonName}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm font-mono font-bold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-md">
          <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-3">
            Window Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Pre-Season Retention Window"
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/50 text-sm font-mono"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Dates */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-3">
                Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#E8A800]/50 text-sm font-mono"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-3">
                End Date <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#E8A800]/50 text-sm font-mono"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Retention Limit */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-md">
          <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-3">
            Retention Limit (per team) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={retentionLimit}
            onChange={(e) => setRetentionLimit(parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#E8A800]/50 text-sm font-mono"
            required
            disabled={isSubmitting}
          />
          <p className="text-[10px] text-gray-500 font-mono mt-2 uppercase tracking-wider">
            Maximum number of players each team can retain
          </p>
        </div>

        {/* Banned Teams */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-md">
          <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-3">
            Banned Teams <span className="text-gray-600">(Optional)</span>
          </label>

          {/* Search */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Search teams or managers..."
              className="w-full pl-9 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#E8A800]/50 font-mono"
            />
          </div>

          {/* Banned badges */}
          {bannedTeamIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {uniqueBannedTeams.map((team) => (                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleBannedTeam(team.id)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="xs" />
                    <span>{team.name}</span>
                    {team.managerName && (
                      <span className="text-[9px] text-gray-400">({team.managerName})</span>
                    )}
                    {!team.hasPreviousSeason && (
                      <span className="text-[9px] text-yellow-400 font-bold">⚠️</span>
                    )}
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
              ))}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto border border-white/5 rounded-xl">
            {filteredTeams.length === 0 ? (
              <p className="text-sm text-gray-500 font-mono text-center py-4">No teams found</p>
            ) : (
              filteredTeams.map((team) => {
                const isBanned = bannedTeamIds.includes(team.id)
                return (
                  <button
                    key={`${team.id}-${team.managerName}`}
                    type="button"
                    onClick={() => toggleBannedTeam(team.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all text-left border-b border-white/5 last:border-b-0 ${
                      isBanned ? "bg-red-500/10" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                        isBanned
                          ? "bg-red-500 border-red-500"
                          : "border-white/20 bg-black/30"
                      }`}
                    >
                      {isBanned && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-white font-mono block truncate">{team.name}</span>
                      <div className="flex items-center gap-2">
                        {team.managerName && (
                          <span className="text-[9px] text-gray-400 font-mono">{team.managerName}</span>
                        )}
                        <span
                          className={`text-[9px] font-bold font-mono uppercase tracking-wider ${
                            team.hasPreviousSeason
                              ? "text-emerald-400"
                              : "text-yellow-400"
                          }`}
                        >
                          {team.hasPreviousSeason ? "✓ Has previous season" : "⚠ No previous season"}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-2 uppercase tracking-wider">
            Teams marked &quot;No previous season&quot; are not eligible for retention. Banned teams cannot submit retention requests.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Link
            href={`/sub-admin/${seasonId}/retention-windows`}
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-white rounded-xl font-bold transition-all text-sm font-mono text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] rounded-xl font-bold transition-all text-sm font-mono uppercase flex items-center justify-center gap-2"
          >
            {isSubmitting && <LoadingSpinner size="sm" />}
            {isSubmitting ? "Saving..." : isEdit ? "Update Window" : "Create Window"}
          </button>
        </div>
      </form>
    </div>
  )
}
