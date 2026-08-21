"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { normalizeForSearch } from "@/lib/search-utils"
import TeamLogo from "@/components/team/TeamLogo"

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
  teamId: string
  managerName: string
}

interface ManagerAssignment {
  managerId: string
  managerName: string
  teamId: string | null
  isNewTeam: boolean
  newTeamName: string
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
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
        setDropdownSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Team IDs already assigned in this season
  const assignedTeamIds = useMemo(() => assignedPairs.map(p => p.teamId), [assignedPairs])

  // Filter managers based on search
  const filteredManagers = useMemo(() => {
    if (!searchQuery.trim()) return allManagers
    const query = normalizeForSearch(searchQuery)
    return allManagers.filter(m =>
      normalizeForSearch(m.name).includes(query) ||
      m.lastTeam && normalizeForSearch(m.lastTeam.name).includes(query)
    )
  }, [allManagers, searchQuery])

  // Available teams for assignment (not already assigned to another manager this season)
  const getAvailableTeams = (excludeManagerId?: string) => {
    return allTeams.filter(t => {
      // Exclude teams already assigned to OTHER managers this season
      const isAssignedElsewhere = Object.entries(assignments).some(
        ([mgrId, a]) => mgrId !== excludeManagerId && a.teamId === t.id
      )
      return !isAssignedElsewhere
    })
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

  const handleSelectAll = () => {
    const allIds = filteredManagers.map(m => m.id)
    setSelectedManagerIds(allIds)

    const newAssignments: Record<string, ManagerAssignment> = {}
    for (const mgr of filteredManagers) {
      const currentTeam = mgr.lastTeam
      newAssignments[mgr.id] = {
        managerId: mgr.id,
        managerName: mgr.name,
        teamId: currentTeam?.id || null,
        isNewTeam: false,
        newTeamName: '',
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
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/seasons/${seasonId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: selectedManagerIds.map(mgrId => ({
            managerId: mgrId,
            managerName: assignments[mgrId].managerName,
            teamId: assignments[mgrId].isNewTeam ? null : assignments[mgrId].teamId,
            newTeamName: assignments[mgrId].isNewTeam ? assignments[mgrId].newTeamName.trim() : null,
          }))
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign teams")
      }

      setSuccessMessage(`Successfully assigned ${selectedManagerIds.length} managers to ${seasonName}!`)
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

      {/* Manager Selection */}
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

        {/* Manager Grid */}
        {filteredManagers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 font-bold uppercase tracking-wider font-mono text-xs">No managers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredManagers.map((manager) => {
              const isSelected = selectedManagerIds.includes(manager.id)
              const currentTeam = manager.lastTeam
              const assignment = assignments[manager.id]

              return (
                <div key={manager.id} className={`rounded-xl border transition-all ${isSelected ? "border-[#E8A800] bg-[#E8A800]/10 shadow-lg shadow-[#E8A800]/5" : "border-white/5 bg-white/[0.01] hover:border-[#E8A800]/30 hover:bg-white/[0.03]"}`}>
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
                      <div className="relative mb-2" ref={dropdownRef}>
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
                          <div className="absolute z-50 w-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden">
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
                            <div className="max-h-48 overflow-y-auto">
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
                                    <div className="w-6 h-6 flex-shrink-0">
                                      <TeamLogo logoUrl={t.logoUrl} teamName={t.name} size="sm" />
                                    </div>
                                    <span className="text-xs font-bold text-white truncate">{t.name}</span>
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
                        <input type="text" value={assignment.newTeamName}
                          onChange={(e) => handleNewTeamNameChange(manager.id, e.target.value)}
                          placeholder="Enter new team name..."
                          className="w-full mt-2 px-3 py-2.5 bg-white/[0.02] border border-white/10 rounded-lg text-white text-xs font-bold placeholder-gray-500 focus:outline-none focus:border-[#FFB347]/50 transition-all font-mono" />
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
          {selectedManagerIds.length} manager{selectedManagerIds.length !== 1 ? "s" : ""} selected
          {selectedManagerIds.length > 0 && (
            <span className="ml-2 text-[#E8A800]">
              ({Object.values(assignments).filter(a => a.teamId || a.isNewTeam).length} with teams assigned)
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
