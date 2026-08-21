"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { normalizeForSearch } from "@/lib/search-utils"
import TeamLogo from "@/components/team/TeamLogo"
import { ImageKitUpload } from "@/components/upload/ImageKitUpload"

interface Manager {
  id: string
  name: string
  photoUrl: string | null
  lastTeam: { id: string; name: string; logoUrl: string } | null
}

interface Team {
  id: string
  name: string
  managerName: string
  logoUrl: string
  managerLinks: {
    manager: { name: string }
  }[]
}

interface AssignedPair {
  seasonTeamId: string
  teamId: string
  teamName: string
  teamLogoUrl: string
  managerName: string
  managerId: string | null
  currentBudget: number
}

interface ManagerAssignment {
  managerId: string
  managerName: string
  teamId: string | null
  isNewTeam: boolean
  newTeamName: string
  newTeamLogoUrl: string
}

interface TeamSelectionFormProps {
  seasonId: string
  seasonName: string
  allManagers: Manager[]
  allTeams: Team[]
  assignedPairs: AssignedPair[]
  startingPurse: number
}

export default function TeamSelectionForm({
  seasonId,
  seasonName,
  allManagers,
  allTeams,
  assignedPairs,
  startingPurse,
}: TeamSelectionFormProps) {
  const router = useRouter()
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([])
  const [assignments, setAssignments] = useState<Record<string, ManagerAssignment>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dropdownSearch, setDropdownSearch] = useState("")
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null)
  const [fetchingLogoManagerId, setFetchingLogoManagerId] = useState<string | null>(null)

  // Handle click outside dropdown (works across all manager cards)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as HTMLElement).closest('[data-dropdown-area]')) {
        setOpenDropdown(null)
        setDropdownSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openDropdown])

  // Team IDs already assigned in this season
  const assignedTeamIds = useMemo(() => assignedPairs.map(p => p.teamId), [assignedPairs])
  // Manager names already assigned in this season
  const assignedManagerNames = useMemo(() => assignedPairs.map(p => p.managerName?.toLowerCase()), [assignedPairs])

  // Managers who are already assigned to this season
  const assignedManagers = useMemo(() => {
    return allManagers.filter(m => assignedManagerNames.includes(m.name.toLowerCase()))
  }, [allManagers, assignedManagerNames])

  // Managers NOT yet assigned (available for selection)
  const unassignedManagers = useMemo(() => {
    return allManagers.filter(m => !assignedManagerNames.includes(m.name.toLowerCase()))
  }, [allManagers, assignedManagerNames])

  // Filter unassigned managers based on search
  const filteredUnassignedManagers = useMemo(() => {
    if (!searchQuery.trim()) return unassignedManagers
    const query = normalizeForSearch(searchQuery)
    return unassignedManagers.filter(m =>
      normalizeForSearch(m.name).includes(query) ||
      m.lastTeam && normalizeForSearch(m.lastTeam.name).includes(query)
    )
  }, [unassignedManagers, searchQuery])

  // Available teams for assignment (not already assigned to another manager in the current form selections)
  const getAvailableTeams = (excludeManagerId?: string) => {
    return allTeams.filter(t => {
      // Exclude teams already picked by OTHER new managers in the current form
      const isAssignedElsewhere = Object.entries(assignments).some(
        ([mgrId, a]) => mgrId !== excludeManagerId && a.teamId === t.id
      )
      return !isAssignedElsewhere
    })
  }

  // --- Remove an already-assigned team from the season ---
  const handleRemoveTeam = async (pair: AssignedPair) => {
    setRemovingTeamId(pair.teamId)
    setError(null)

    try {
      // Re-submit all assignments EXCEPT the one being removed
      const remainingAssignments = assignedPairs
        .filter(p => p.teamId !== pair.teamId)
        .map(p => ({
          managerId: p.managerId || allManagers.find(m => m.name.toLowerCase() === p.managerName?.toLowerCase())?.id || '',
          managerName: p.managerName,
          teamId: p.teamId,
          newTeamName: null,
          newTeamLogoUrl: null,
        }))

      const response = await fetch(`/api/seasons/${seasonId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: remainingAssignments }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove team")
      }

      setSuccessMessage(`Removed ${pair.teamName} (${pair.managerName}) from ${seasonName}`)
      setTimeout(() => router.refresh(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setRemovingTeamId(null)
    }
  }

  const handleManagerToggle = (managerId: string) => {
    setSelectedManagerIds(prev => {
      const next = prev.includes(managerId)
        ? prev.filter(id => id !== managerId)
        : [...prev, managerId]

      // Initialize assignment for newly selected managers
      if (!prev.includes(managerId)) {
        const manager = allManagers.find(m => m.id === managerId)
        const currentTeam = manager?.lastTeam
        setAssignments(prevAssignments => ({
          ...prevAssignments,
          [managerId]: {
            managerId,
            managerName: manager?.name || '',
            teamId: currentTeam?.id || null,
            isNewTeam: false,
            newTeamName: '',
            newTeamLogoUrl: '',
          }
        }))
      } else {
        // Remove assignment when deselecting
        setAssignments(prevAssignments => {
          const next2 = { ...prevAssignments }
          delete next2[managerId]
          return next2
        })
      }

      return next
    })
    setError(null)
    setSuccessMessage(null)
  }

  const handleTeamChange = (managerId: string, teamId: string | null) => {
    setAssignments(prev => ({
      ...prev,
      [managerId]: {
        ...prev[managerId],
        teamId,
        isNewTeam: false,
        newTeamName: '',
      }
    }))
  }

  const handleNewTeamToggle = (managerId: string) => {
    setAssignments(prev => ({
      ...prev,
      [managerId]: {
        ...prev[managerId],
        isNewTeam: !prev[managerId].isNewTeam,
        teamId: null,
        newTeamName: '',
        newTeamLogoUrl: '',
      }
    }))
  }

  const handleNewTeamNameChange = (managerId: string, name: string) => {
    setAssignments(prev => ({
      ...prev,
      [managerId]: {
        ...prev[managerId],
        newTeamName: name,
      }
    }))
  }

  const handleNewTeamLogoChange = (managerId: string, url: string) => {
    setAssignments(prev => ({
      ...prev,
      [managerId]: {
        ...prev[managerId],
        newTeamLogoUrl: url,
      }
    }))
  }

  const handleFetchLogo = async (managerId: string) => {
    const teamName = assignments[managerId]?.newTeamName?.trim()
    if (!teamName) return

    setFetchingLogoManagerId(managerId)
    try {
      const res = await fetch('/api/teams/fetch-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch logo')
      handleNewTeamLogoChange(managerId, data.logoUrl)
    } catch (err) {
      console.error('Fetch logo error:', err)
    } finally {
      setFetchingLogoManagerId(null)
    }
  }

  const handleSelectAll = () => {
    const allIds = filteredUnassignedManagers.map(m => m.id)
    setSelectedManagerIds(allIds)

    const newAssignments: Record<string, ManagerAssignment> = {}
    for (const mgr of filteredUnassignedManagers) {
      const currentTeam = mgr.lastTeam
      newAssignments[mgr.id] = {
        managerId: mgr.id,
        managerName: mgr.name,
        teamId: currentTeam?.id || null,
        isNewTeam: false,
        newTeamName: '',
        newTeamLogoUrl: '',
      }
    }
    setAssignments(newAssignments)
    setError(null)
    setSuccessMessage(null)
  }

  const handleDeselectAll = () => {
    setSelectedManagerIds([])
    setAssignments({})
    setError(null)
    setSuccessMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedManagerIds.length === 0) {
      setError("Please select at least one manager")
      return
    }

    // Validate all assignments have a team
    for (const mgrId of selectedManagerIds) {
      const assignment = assignments[mgrId]
      if (!assignment) {
        setError(`Missing assignment for a manager`)
        return
      }
      if (!assignment.isNewTeam && !assignment.teamId) {
        setError(`Please select a team for ${assignment.managerName}`)
        return
      }
      if (assignment.isNewTeam && !assignment.newTeamName.trim()) {
        setError(`Please enter a team name for ${assignment.managerName}`)
        return
      }
      if (assignment.isNewTeam && !assignment.newTeamLogoUrl) {
        setError(`Please upload a logo for ${assignment.managerName}'s new team`)
        return
      }
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Include both newly selected AND already-assigned managers
      const newAssignments = selectedManagerIds.map(mgrId => ({
        managerId: mgrId,
        managerName: assignments[mgrId].managerName,
        teamId: assignments[mgrId].isNewTeam ? null : assignments[mgrId].teamId,
        newTeamName: assignments[mgrId].isNewTeam ? assignments[mgrId].newTeamName.trim() : null,
        newTeamLogoUrl: assignments[mgrId].isNewTeam ? assignments[mgrId].newTeamLogoUrl : null,
      }))

      const existingAssignments = assignedPairs
        .filter(p => p.managerId) // only include if we have a valid managerId
        .map(p => ({
          managerId: p.managerId!,
          managerName: p.managerName,
          teamId: p.teamId,
          newTeamName: null,
          newTeamLogoUrl: null,
        }))

      // Merge: existing + new (new overrides if same managerId)
      const managerIdSet = new Set(newAssignments.map(a => a.managerId))
      // Also drop existing assignments for teams being taken over by new managers
      const newTeamIds = new Set(newAssignments.filter(a => a.teamId).map(a => a.teamId))
      const mergedExisting = existingAssignments.filter(a =>
        !managerIdSet.has(a.managerId) && !newTeamIds.has(a.teamId)
      )
      const allAssignments = [...mergedExisting, ...newAssignments]

      const response = await fetch(`/api/seasons/${seasonId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: allAssignments
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign teams")
      }

      const totalAssigned = allAssignments.length
      setSuccessMessage(`Successfully assigned ${totalAssigned} managers to ${seasonName}!`)
      setTimeout(() => router.refresh(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-xs font-bold uppercase tracking-wider font-mono">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-6">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider font-mono">{successMessage}</p>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION: Currently Assigned Teams            */}
      {/* ============================================ */}
      {assignedPairs.length > 0 && (
        <div className="bg-[#0D0D0D]/90 border border-emerald-500/10 rounded-2xl p-4 sm:p-6 mb-6 shadow-md">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight font-mono">
                Assigned Teams
                <span className="ml-2 text-emerald-400 text-sm">{assignedPairs.length}</span>
              </h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1">
                Teams currently participating in {seasonName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {assignedPairs.map((pair) => {
              const manager = assignedManagers.find(m => m.name.toLowerCase() === pair.managerName?.toLowerCase())
              const isRemoving = removingTeamId === pair.teamId

              return (
                <div
                  key={pair.teamId}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 p-0.5 flex-shrink-0 flex items-center justify-center">
                      {pair.teamLogoUrl ? (
                        <img src={pair.teamLogoUrl} alt={pair.teamName} className="w-full h-full object-contain rounded-lg" />
                      ) : (
                        <span className="text-sm font-black text-gray-500">{pair.teamName.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-white text-sm uppercase tracking-tight truncate">{pair.teamName}</div>
                      <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider truncate mt-0.5">
                        {pair.managerName}
                      </div>
                      {pair.currentBudget > 0 && (
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          ${pair.currentBudget.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveTeam(pair)}
                    disabled={isRemoving || isSubmitting}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono cursor-pointer"
                  >
                    {isRemoving ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Remove from Season</span>
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION: Select New Managers                 */}
      {/* ============================================ */}
      <div className="bg-[#0D0D0D]/90 border border-white/5 rounded-2xl p-4 sm:p-6 mb-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight font-mono">Select Managers</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1">
              Choose which managers participate in this season
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto font-mono">
            <button type="button" onClick={handleSelectAll}
              className="flex-1 sm:flex-none px-4 py-2 bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider">
              Select All
            </button>
            <button type="button" onClick={handleDeselectAll}
              className="flex-1 sm:flex-none px-4 py-2 bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider">
              Deselect All
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search managers or teams..."
              className="w-full pl-12 pr-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono text-sm" />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Manager Grid (unassigned only) */}
        {filteredUnassignedManagers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 font-bold uppercase tracking-wider font-mono text-xs">
              {unassignedManagers.length === 0 ? "All managers are already assigned" : "No managers found"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredUnassignedManagers.map((manager) => {
              const isSelected = selectedManagerIds.includes(manager.id)
              const currentTeam = manager.lastTeam
              const assignment = assignments[manager.id]

              return (
                <div key={manager.id} className={`rounded-xl border transition-all ${isSelected ? "border-[#E8A800] bg-[#E8A800]/10 shadow-lg shadow-[#E8A800]/5 relative z-10" : "border-white/5 bg-white/[0.01] hover:border-[#E8A800]/30 hover:bg-white/[0.03]"}`}>
                  {/* Manager Header - Clickable to select/deselect */}
                  <label className="cursor-pointer block p-4">
                    <input type="checkbox" checked={isSelected} onChange={() => handleManagerToggle(manager.id)} className="sr-only" />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 p-0.5 flex-shrink-0 flex items-center justify-center">
                        {manager.photoUrl ? (
                          <img src={manager.photoUrl} alt={manager.name} className="w-full h-full object-contain rounded-lg" />
                        ) : (
                          <span className="text-sm font-black text-gray-500">{manager.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-white text-sm uppercase tracking-tight truncate">{manager.name}</div>
                        {currentTeam && (
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate mt-0.5">
                            Current: {currentTeam.name}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="text-[#E8A800] flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Team Assignment - Expanded when selected */}
                  {isSelected && assignment && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-3" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest mb-2 font-mono">
                        Assign Team for {seasonName}
                      </div>

                      {/* Option: Use current team */}
                      {currentTeam && (
                        <button type="button" onClick={() => handleTeamChange(manager.id, currentTeam.id)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg border mb-2 transition-all text-left ${assignment.teamId === currentTeam.id && !assignment.isNewTeam ? "border-[#E8A800]/50 bg-[#E8A800]/5" : "border-white/5 bg-white/[0.02] hover:border-white/10"}`}>
                          <TeamLogo logoUrl={currentTeam.logoUrl} teamName={currentTeam.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{currentTeam.name}</div>
                            <div className="text-[9px] text-gray-500 font-mono">Current Team</div>
                          </div>
                          {assignment.teamId === currentTeam.id && !assignment.isNewTeam && (
                            <svg className="w-4 h-4 text-[#E8A800] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )}

                      {/* Option: Select different team - Custom searchable dropdown */}
                      <div className="relative mb-2" data-dropdown-area="true">
                        <button
                          type="button"
                          onClick={() => {
                            if (!assignment.isNewTeam) {
                              setOpenDropdown(openDropdown === manager.id ? null : manager.id)
                              setDropdownSearch("")
                            }
                          }}
                          disabled={assignment.isNewTeam}
                          className="w-full px-3 py-2.5 bg-white/[0.02] border border-white/10 rounded-lg text-white text-xs font-bold appearance-none cursor-pointer disabled:opacity-40 focus:outline-none focus:border-[#E8A800]/50 font-mono text-left flex items-center justify-between"
                        >
                          <span className="truncate">
                            {assignment.teamId && !assignment.isNewTeam
                              ? allTeams.find(t => t.id === assignment.teamId)?.name || "Choose different team..."
                              : "Choose different team..."
                            }
                          </span>
                          <svg className="w-4 h-4 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {openDropdown === manager.id && !assignment.isNewTeam && (
                          <div className="absolute left-0 right-0 z-[100] mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                            <div className="p-2 border-b border-white/5">
                              <input
                                type="text"
                                value={dropdownSearch}
                                onChange={(e) => setDropdownSearch(e.target.value)}
                                placeholder="Search teams..."
                                className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#E8A800]/50 font-mono"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto scrollbar-thin">
                              {getAvailableTeams(manager.id)
                                .filter(t => t.id !== currentTeam?.id)
                                .filter(t => !dropdownSearch || t.name.toLowerCase().includes(dropdownSearch.toLowerCase()))
                                .map(t => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                      handleTeamChange(manager.id, t.id)
                                      setOpenDropdown(null)
                                      setDropdownSearch("")
                                    }}
                                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/[0.05] transition-colors text-left"
                                  >
                                    <div className="w-6 h-6 flex-shrink-0 rounded-md overflow-hidden bg-black/40 p-0.5">
                                      {t.logoUrl ? (
                                        <img src={t.logoUrl} alt={t.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                      ) : (
                                        <span className="text-[8px] font-bold text-gray-500 flex items-center justify-center h-full">{t.name.slice(0, 2).toUpperCase()}</span>
                                      )}
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-200 truncate">{t.name}</span>
                                  </button>
                                ))}
                              {getAvailableTeams(manager.id)
                                .filter(t => t.id !== currentTeam?.id)
                                .filter(t => !dropdownSearch || t.name.toLowerCase().includes(dropdownSearch.toLowerCase())).length === 0 && (
                                <div className="px-3 py-4 text-center text-xs text-gray-500 font-mono">No teams found</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Option: Create new team */}
                      <button type="button" onClick={() => handleNewTeamToggle(manager.id)}
                        className={`w-full flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left ${assignment.isNewTeam ? "border-[#FFB347]/50 bg-[#FFB347]/5" : "border-dashed border-white/10 hover:border-[#FFB347]/30 bg-white/[0.01]"}`}>
                        <div className="w-8 h-8 rounded-lg bg-[#FFB347]/10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <div className="text-xs font-bold text-[#FFB347]">Create New Team</div>
                      </button>

                      {assignment.isNewTeam && (
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-2">
                            <input type="text" value={assignment.newTeamName}
                              onChange={(e) => handleNewTeamNameChange(manager.id, e.target.value)}
                              placeholder="Enter new team name..."
                              className="flex-1 px-3 py-2.5 bg-white/[0.02] border border-white/10 rounded-lg text-white text-xs font-bold placeholder-gray-500 focus:outline-none focus:border-[#FFB347]/50 transition-all font-mono" />
                            <button
                              type="button"
                              onClick={() => handleFetchLogo(manager.id)}
                              disabled={!assignment.newTeamName?.trim() || fetchingLogoManagerId === manager.id}
                              className="px-3 py-2.5 bg-[#FFB347]/10 border border-[#FFB347]/30 text-[#FFB347] rounded-lg text-xs font-bold hover:bg-[#FFB347]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                            >
                              {fetchingLogoManagerId === manager.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              )}
                              Fetch Logo
                            </button>
                          </div>

                          {/* Logo preview */}
                          {assignment.newTeamLogoUrl && (
                            <div className="flex items-center gap-2 p-2 bg-white/[0.02] border border-white/10 rounded-lg">
                              <img src={assignment.newTeamLogoUrl} alt="Logo preview" className="w-8 h-8 object-contain rounded" />
                              <span className="text-[10px] text-emerald-400 font-bold">Logo fetched</span>
                            </div>
                          )}

                          {/* Manual upload fallback */}
                          {!assignment.newTeamLogoUrl && (
                            <ImageKitUpload
                              onSuccess={(url) => handleNewTeamLogoChange(manager.id, url)}
                              onError={(err) => console.error('Logo upload error:', err)}
                              folder="/turf-cats/teams"
                              fileName={`team-logo-${Date.now()}`}
                              accept="image/*"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
          {assignedPairs.length + selectedManagerIds.length} total managers
          {selectedManagerIds.length > 0 && (
            <span className="ml-2 text-[#E8A800]">
              ({assignedPairs.length} existing + {selectedManagerIds.length} new)
            </span>
          )}
        </div>
        <button type="submit"
          disabled={isSubmitting || selectedManagerIds.length === 0}
          className="w-full sm:w-auto bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-extrabold px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(232,168,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2">
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Assigning Teams...</span>
            </>
          ) : (
            "Assign Teams to Season"
          )}
        </button>
      </div>
    </form>
  )
}
