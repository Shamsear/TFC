"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ImageKitUpload } from "@/components/upload/ImageKitUpload"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import PageLoader from "@/components/ui/PageLoader"
import SearchableSelect from "@/components/ui/SearchableSelect"

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

interface Season {
  id: string
  name: string
  isActive: boolean
}

interface ExistingTeam {
  id: string
  name: string
  managerName: string
  logoUrl: string
}

interface Props {
  backHref: string
  backLabel: string
  teamsViewHref: string
}

export default function CreateTeamPage({ backHref, backLabel, teamsViewHref }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<"select" | "create">("select")
  const [seasons, setSeasons] = useState<Season[]>([])
  const [existingTeams, setExistingTeams] = useState<ExistingTeam[]>([])
  const [assignedTeamIds, setAssignedTeamIds] = useState<Set<string>>(new Set())
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [existingManager, setExistingManager] = useState<{ name: string; teamName: string } | null>(null)
  const [checkingManager, setCheckingManager] = useState(false)
  const managerCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
  const [fetchingLogo, setFetchingLogo] = useState(false)
  const [credentials, setCredentials] = useState<{
    email: string
    password: string
    teamName: string
  } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [seasonsRes, teamsRes] = await Promise.all([
          fetch("/api/seasons"),
          fetch("/api/teams")
        ])

        if (seasonsRes.ok) {
          const sData = await seasonsRes.json()
          setSeasons(sData)
          const activeSeason = sData.find((s: Season) => s.isActive)
          if (activeSeason) {
            setFormData(prev => ({ ...prev, seasonId: activeSeason.id }))
          }
        }

        if (teamsRes.ok) {
          const tData = await teamsRes.json()
          setExistingTeams(tData)
        }
      } catch (err) {
        console.error("Failed to load data:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Fetch assigned teams when season changes
  useEffect(() => {
    if (!formData.seasonId) {
      setAssignedTeamIds(new Set())
      return
    }
    fetch(`/api/seasons/${formData.seasonId}/teams`)
      .then(res => res.ok ? res.json() : [])
      .then(teams => setAssignedTeamIds(new Set(teams.map((t: { id: string }) => t.id))))
      .catch(() => setAssignedTeamIds(new Set()))
  }, [formData.seasonId])

  // Show all teams — assigned teams can be reassigned to a new manager
  const availableTeams = existingTeams

  // Debounced check for existing manager name
  useEffect(() => {
    if (managerCheckRef.current) clearTimeout(managerCheckRef.current)

    const name = formData.managerName.trim()
    if (name.length < 2) {
      setExistingManager(null)
      return
    }

    setCheckingManager(true)
    managerCheckRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/managers/check?name=${encodeURIComponent(name)}`)
        if (res.ok) {
          const data = await res.json()
          setExistingManager(data.exists ? data : null)
        }
      } catch {
        // ignore
      } finally {
        setCheckingManager(false)
      }
    }, 500)

    return () => { if (managerCheckRef.current) clearTimeout(managerCheckRef.current) }
  }, [formData.managerName])

  if (isLoading) return <PageLoader />

  const handleUploadSuccess = (url: string) => {
    setFormData(prev => ({ ...prev, logoUrl: url }))
    setError("")
  }

  const handleUploadError = (error: Error) => {
    setError(error.message)
  }

  const handleFetchLogo = async () => {
    if (!formData.name.trim()) return
    setFetchingLogo(true)
    setError("")
    try {
      const res = await fetch("/api/teams/fetch-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: formData.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch logo")
      setFormData(prev => ({ ...prev, logoUrl: data.logoUrl }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logo")
    } finally {
      setFetchingLogo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (mode === "select") {
      // Assign manager to existing team
      if (!selectedTeamId) {
        setError("Please select a team")
        return
      }
      if (!formData.managerName.trim()) {
        setError("Manager name is required")
        return
      }

      setIsSubmitting(true)
      try {
        const response = await fetch("/api/teams/assign-existing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId: selectedTeamId,
            managerName: formData.managerName.trim(),
            seasonId: formData.seasonId || undefined
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Failed to assign manager")

        const team = existingTeams.find(t => t.id === selectedTeamId)
        setCredentials({
          email: data.credentials.email,
          password: data.credentials.password,
          teamName: team?.name || ""
        })
        setSuccess(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign manager")
      } finally {
        setIsSubmitting(false)
      }
    } else {
      // Create new team
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Failed to create team")

        setCredentials({
          email: data.credentials.email,
          password: data.credentials.password,
          teamName: formData.name
        })
        setSuccess(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create team")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const selectedTeam = existingTeams.find(t => t.id === selectedTeamId)

  return (
    <div className="text-white px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeftIcon />
            {backLabel}
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Add Team Manager
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">
            Assign a manager to an existing team or create a new one
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => { setMode("select"); setError(""); setSuccess(false); setCredentials(null) }}
            className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              mode === "select"
                ? "bg-[#E8A800] text-[#0a0a0a] shadow-lg shadow-[#E8A800]/20"
                : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Select Existing Team
            </div>
          </button>
          <button
            type="button"
            onClick={() => { setMode("create"); setError(""); setSuccess(false); setCredentials(null) }}
            className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              mode === "create"
                ? "bg-[#E8A800] text-[#0a0a0a] shadow-lg shadow-[#E8A800]/20"
                : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create New Team
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8">
          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm sm:text-base">{error}</span>
            </div>
          )}

          {/* Success */}
          {success && credentials && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg sm:rounded-xl mb-6 overflow-hidden">
              <div className="bg-green-500/20 px-4 py-3 border-b border-green-500/30">
                <div className="flex items-center gap-2">
                  <CheckIcon />
                  <span className="text-green-400 font-bold">
                    {mode === "select" ? "Manager Assigned Successfully!" : "Team Created Successfully!"}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-gray-300 text-sm">
                  <span className="font-bold text-white">{credentials.teamName}</span> — Login credentials:
                </p>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email</label>
                  <div className="flex items-center gap-2">
                    <input type="text" value={credentials.email} readOnly
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm" />
                    <button type="button" onClick={() => navigator.clipboard.writeText(credentials.email)}
                      className="px-3 py-2 bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] rounded-lg hover:bg-[#E8A800]/30 transition-all text-sm">
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Password</label>
                  <div className="flex items-center gap-2">
                    <input type="text" value={credentials.password} readOnly
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm" />
                    <button type="button" onClick={() => navigator.clipboard.writeText(credentials.password)}
                      className="px-3 py-2 bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] rounded-lg hover:bg-[#E8A800]/30 transition-all text-sm">
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-xs">
                    <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Save these credentials! They won&apos;t be shown again.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link href={teamsViewHref}
                    className="flex-1 px-4 py-2 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-all text-center text-sm">
                    View All Teams
                  </Link>
                  <button type="button"
                    onClick={() => {
                      setSuccess(false); setCredentials(null)
                      setFormData({ name: "", managerName: "", logoUrl: "", seasonId: "" })
                      setSelectedTeamId("")
                    }}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg font-bold transition-all text-sm">
                    {mode === "select" ? "Assign Another" : "Create Another"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!success && (
            <>
              <div className="space-y-4 sm:space-y-6">
                {/* SELECT EXISTING TEAM MODE */}
                {mode === "select" && (
                  <>
                    <div>
                      <SearchableSelect
                        label="Select Team"
                        value={selectedTeamId}
                        options={[
                          { value: "", label: "Choose a team..." },
                          ...availableTeams.map(t => ({
                            value: t.id,
                            label: t.managerName ? `${t.name} (${t.managerName})` : t.name
                          }))
                        ]}
                        onChange={(val) => setSelectedTeamId(val)}
                        disabled={isSubmitting}
                        enableSearch={true}
                        required={true}
                      />
                      {assignedTeamIds.size > 0 && (
                        <p className="text-gray-500 text-xs mt-2">
                          {assignedTeamIds.size} team{assignedTeamIds.size !== 1 ? "s" : ""} already in this season — selecting one will reassign its manager
                        </p>
                      )}
                    </div>

                    {/* Selected team preview */}
                    {selectedTeam && (
                      <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 p-4 sm:p-6">
                        <div className="flex items-center gap-3 sm:gap-4">
                          {selectedTeam.logoUrl ? (
                            <img src={selectedTeam.logoUrl} alt={selectedTeam.name}
                              className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-lg sm:rounded-xl bg-black/30 p-1 sm:p-2" />
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-black/30 flex items-center justify-center">
                              <span className="text-lg font-black text-gray-500">{selectedTeam.name.slice(0, 2).toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <div className="text-lg sm:text-xl font-black text-white">{selectedTeam.name}</div>
                            {selectedTeam.managerName && (
                              <div className="text-xs sm:text-sm text-gray-400 mt-1">Current: {selectedTeam.managerName}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* CREATE NEW TEAM MODE */}
                {mode === "create" && (
                  <>
                    <div>
                      <label htmlFor="name" className="block text-sm font-bold mb-2 sm:mb-3 text-white">
                        Team Name <span className="text-red-400">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text" id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="flex-1 bg-black/50 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#E8A800]/50 focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-white placeholder-gray-500 text-sm sm:text-base"
                          placeholder="Enter team name"
                          required
                          disabled={isSubmitting}
                        />
                        <button type="button" onClick={handleFetchLogo}
                          disabled={!formData.name.trim() || fetchingLogo || isSubmitting}
                          className="px-3 sm:px-4 py-2 sm:py-3 bg-[#FFB347]/10 border border-[#FFB347]/30 text-[#FFB347] rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold hover:bg-[#FFB347]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap flex items-center gap-2">
                          {fetchingLogo ? <LoadingSpinner size="sm" /> : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                          Fetch Logo
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="logoUpload" className="block text-sm font-bold mb-2 sm:mb-3 text-white">
                        Team Logo <span className="text-red-400">*</span>
                      </label>
                      {formData.logoUrl && (
                        <div className="mb-3 sm:mb-4 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 rounded-lg sm:rounded-xl p-6 sm:p-8">
                          <img src={formData.logoUrl} alt="Logo preview" className="w-32 h-32 sm:w-40 sm:h-40 object-contain" />
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
                  </>
                )}

                {/* MANAGER NAME (both modes) */}
                <div>
                  <label htmlFor="managerName" className="block text-sm font-bold mb-2 sm:mb-3 text-white">
                    Manager Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text" id="managerName"
                    value={formData.managerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, managerName: e.target.value }))}
                    className={`w-full bg-black/50 border rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none transition-all text-white placeholder-gray-500 text-sm sm:text-base ${
                      existingManager
                        ? "border-yellow-500/50 focus:border-yellow-500/70 focus:ring-2 focus:ring-yellow-500/20"
                        : "border-white/10 focus:border-[#E8A800]/50 focus:ring-2 focus:ring-[#E8A800]/20"
                    }`}
                    placeholder="Enter manager name"
                    required
                    disabled={isSubmitting}
                  />
                  {existingManager && (
                    <div className="mt-2 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                      <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="text-xs">
                        <span className="text-yellow-400 font-bold">Manager already exists</span>
                        <span className="text-yellow-400/70"> — linked to </span>
                        <span className="text-white font-bold">{existingManager.teamName}</span>
                        <span className="text-yellow-400/70">. They will be reassigned to the new team.</span>
                      </div>
                    </div>
                  )}
                  {checkingManager && !existingManager && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <LoadingSpinner size="sm" />
                      Checking...
                    </div>
                  )}
                </div>

                {/* SEASON (both modes) */}
                <div>
                  <SearchableSelect
                    label="Assign to Season"
                    value={formData.seasonId}
                    options={[
                      { value: "", label: "No season (assign later)" },
                      ...seasons.map(season => ({
                        value: season.id,
                        label: `${season.name}${season.isActive ? " (Active)" : ""}`
                      }))
                    ]}
                    onChange={(val) => setFormData(prev => ({ ...prev, seasonId: val }))}
                    disabled={isSubmitting}
                    enableSearch={true}
                  />
                  <p className="text-gray-400 text-xs mt-2">
                    Team manager will only see data for assigned seasons
                  </p>
                </div>

                {/* Info Box */}
                <div className="rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-blue-400 font-medium text-sm">
                        {mode === "select" ? "Assign Manager to Existing Team" : "Automatic Credential Generation"}
                      </p>
                      <p className="text-blue-400/80 text-xs mt-1">
                        {mode === "select"
                          ? "The manager will be linked to the existing team. Login credentials will be generated based on the manager name."
                          : "Login credentials will be automatically generated and displayed after team creation. Make sure to save them!"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button type="submit" disabled={isSubmitting || (mode === "create" && !formData.logoUrl) || (mode === "select" && !selectedTeamId)}
                  className="flex-1 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-[#E8A800]/50 text-sm sm:text-base flex items-center justify-center gap-2">
                  {isSubmitting && <LoadingSpinner size="sm" />}
                  {isSubmitting
                    ? (mode === "select" ? "Assigning..." : "Creating...")
                    : (mode === "select" ? "Assign Manager to Team" : "Create Team & Generate Credentials")}
                </button>
                <Link href={backHref}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg sm:rounded-xl font-bold transition-all text-center text-sm sm:text-base">
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
