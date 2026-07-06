"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { normalizeForSearch } from "@/lib/search-utils"

interface Team {
  id: string
  name: string
  managerName: string
  logoUrl: string
}

interface TeamSelectionFormProps {
  seasonId: string
  allTeams: Team[]
  assignedTeamIds: string[]
}

export default function TeamSelectionForm({
  seasonId,
  allTeams,
  assignedTeamIds,
}: TeamSelectionFormProps) {
  const router = useRouter()
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(assignedTeamIds)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filter teams based on search query
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return allTeams
    
    const query = normalizeForSearch(searchQuery)
    return allTeams.filter(team => 
      normalizeForSearch(team.name).includes(query) ||
      normalizeForSearch(team.managerName).includes(query)
    )
  }, [allTeams, searchQuery])

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    )
    setError(null)
    setSuccessMessage(null)
  }

  const handleSelectAll = () => {
    setSelectedTeamIds(filteredTeams.map(team => team.id))
    setError(null)
    setSuccessMessage(null)
  }

  const handleDeselectAll = () => {
    setSelectedTeamIds([])
    setError(null)
    setSuccessMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedTeamIds.length === 0) {
      setError("Please select at least one team")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/seasons/${seasonId}/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamIds: selectedTeamIds }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign teams")
      }

      setSuccessMessage(`Successfully assigned ${selectedTeamIds.length} teams to the season!`)
      
      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh()
      }, 1500)
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

      {/* Team Grid */}
      <div className="bg-[#0D0D0D]/90 border border-white/5 rounded-2xl p-4 sm:p-6 mb-6 shadow-md backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-black text-white uppercase tracking-tight font-mono">Global Team Registry</h2>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto font-mono">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={filteredTeams.length === 0}
              className="flex-1 sm:flex-none px-4 py-2 bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              disabled={selectedTeamIds.length === 0}
              className="flex-1 sm:flex-none px-4 py-2 bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams or managers..."
              className="w-full pl-12 pr-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/50 transition-all font-mono text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">
              Found {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        {allTeams.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-[#E8A800] mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-wider font-mono text-xs max-w-sm mx-auto">
              No teams available. Please create teams in the Super Admin dashboard first.
            </p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-wider font-mono text-xs mb-2">
              No teams found matching "{searchQuery}"
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[#E8A800] hover:text-[#FFC93A] text-xs font-bold uppercase tracking-wider font-mono transition-colors cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTeams.map((team) => {
              const isSelected = selectedTeamIds.includes(team.id)
              
              return (
                <label
                  key={team.id}
                  className={`
                    relative cursor-pointer rounded-xl p-4 border transition-all
                    ${
                      isSelected
                        ? "border-[#E8A800] bg-[#E8A800]/10 shadow-lg shadow-[#E8A800]/5"
                        : "border-white/5 bg-white/[0.01] hover:border-[#E8A800]/30 hover:bg-white/[0.03]"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleTeamToggle(team.id)}
                    className="sr-only"
                  />
                  
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden ring-4 ring-white/5 flex-shrink-0 bg-black/40 p-1">
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-white text-sm sm:text-base uppercase tracking-tight truncate">{team.name}</div>
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider truncate mt-0.5">
                        {team.managerName}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-[#E8A800] flex-shrink-0">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
          {selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? "s" : ""} selected
        </div>
        <button
          type="submit"
          disabled={isSubmitting || selectedTeamIds.length === 0}
          className="w-full sm:w-auto bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-extrabold px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(232,168,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2"
        >
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
