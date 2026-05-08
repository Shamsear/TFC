"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface Player {
  id: string
  name: string
  photoUrl: string
  position: string
  overallRating: number
  soldPrice: number
}

interface TeamWithPlayers {
  teamId: string
  teamName: string
  teamLogoUrl: string
  players: Player[]
}

interface RetentionModuleProps {
  seasonId: string
  previousSeasonId: string
  teamsWithPlayers: TeamWithPlayers[]
  maxRetentionsPerTeam: number
  existingRetentions: Array<{ basePlayerId: string; teamId: string }>
}

export default function RetentionModule({
  seasonId,
  previousSeasonId,
  teamsWithPlayers,
  maxRetentionsPerTeam,
  existingRetentions,
}: RetentionModuleProps) {
  const router = useRouter()
  
  // Initialize with existing retentions
  const initialSelections = new Map<string, Set<string>>()
  for (const retention of existingRetentions) {
    if (!initialSelections.has(retention.teamId)) {
      initialSelections.set(retention.teamId, new Set())
    }
    initialSelections.get(retention.teamId)!.add(retention.basePlayerId)
  }

  const [selectedPlayers, setSelectedPlayers] = useState<Map<string, Set<string>>>(initialSelections)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handlePlayerToggle = (teamId: string, playerId: string) => {
    setSelectedPlayers(prev => {
      const newMap = new Map(prev)
      
      if (!newMap.has(teamId)) {
        newMap.set(teamId, new Set())
      }
      
      const teamSelections = new Set(newMap.get(teamId))
      
      if (teamSelections.has(playerId)) {
        teamSelections.delete(playerId)
      } else {
        // Check if adding this player would exceed the limit
        if (teamSelections.size >= maxRetentionsPerTeam) {
          setError(`Maximum ${maxRetentionsPerTeam} retentions allowed per team`)
          return prev
        }
        teamSelections.add(playerId)
      }
      
      newMap.set(teamId, teamSelections)
      setError(null)
      return newMap
    })
  }

  const getTotalSelected = () => {
    let total = 0
    selectedPlayers.forEach(teamSet => {
      total += teamSet.size
    })
    return total
  }

  const getTeamSelectionCount = (teamId: string) => {
    return selectedPlayers.get(teamId)?.size || 0
  }

  const isPlayerSelected = (teamId: string, playerId: string) => {
    return selectedPlayers.get(teamId)?.has(playerId) || false
  }

  const handleSubmit = async () => {
    setShowConfirmDialog(false)
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    // Build retentions array
    const retentions: Array<{ basePlayerId: string; teamId: string }> = []
    
    selectedPlayers.forEach((playerIds, teamId) => {
      playerIds.forEach(playerId => {
        retentions.push({ basePlayerId: playerId, teamId })
      })
    })

    try {
      const response = await fetch(`/api/seasons/${seasonId}/retention`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          retentions,
          maxRetentionsPerTeam,
          previousSeasonId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to process retention")
      }

      setSuccessMessage(`Successfully retained ${retentions.length} players for the new season!`)
      
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

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
      case 'CB': return 'bg-blue-500/20 border-blue-500/30 text-blue-400'
      case 'LB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      case 'RB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      case 'DMF': return 'bg-green-600/20 border-green-600/30 text-green-500'
      case 'CMF': return 'bg-green-500/20 border-green-500/30 text-green-400'
      case 'LMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'RMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'AMF': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
      case 'SS': return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
      case 'LWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'RWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'CF': return 'bg-red-500/20 border-red-500/30 text-red-400'
      default: return 'bg-gray-500/20 border-gray-500/30 text-gray-400'
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    }
    return `${(amount / 1000).toFixed(0)}K`
  }

  return (
    <div>
      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 mb-6">
          <p className="text-emerald-400 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Teams with Players */}
      {teamsWithPlayers.length === 0 ? (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4">
            <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="text-lg sm:text-xl font-black text-white mb-2">No Players Available</div>
          <p className="text-[#D4CCBB] text-sm sm:text-base">
            There are no players from the previous season to retain.
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {teamsWithPlayers.map((team) => {
            const selectionCount = getTeamSelectionCount(team.teamId)
            const isAtLimit = selectionCount >= maxRetentionsPerTeam

            return (
              <div key={team.teamId} className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                {/* Team Header */}
                <div className="bg-black/30 p-4 sm:p-6 border-b border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 ring-2 ring-white/10">
                        <Image
                          src={team.teamLogoUrl}
                          alt={team.teamName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-white">{team.teamName}</h3>
                        <p className="text-xs sm:text-sm text-[#7A7367]">
                          {team.players.length} players available
                        </p>
                      </div>
                    </div>
                    <div className="text-center sm:text-right">
                      <div className={`text-2xl sm:text-3xl font-black ${isAtLimit ? "text-red-400" : "text-[#E8A800]"}`}>
                        {selectionCount} / {maxRetentionsPerTeam}
                      </div>
                      <div className="text-xs sm:text-sm text-[#7A7367]">Selected</div>
                    </div>
                  </div>
                </div>

                {/* Players Grid */}
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {team.players.map((player) => {
                      const isSelected = isPlayerSelected(team.teamId, player.id)
                      const canSelect = !isAtLimit || isSelected

                      return (
                        <label
                          key={player.id}
                          className={`
                            relative cursor-pointer rounded-xl p-3 sm:p-4 border-2 transition-all
                            ${
                              isSelected
                                ? "border-[#E8A800] bg-[#E8A800]/10"
                                : canSelect
                                ? "border-white/10 bg-black/30 hover:border-white/20"
                                : "border-white/5 bg-black/20 opacity-50 cursor-not-allowed"
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handlePlayerToggle(team.teamId, player.id)}
                            disabled={!canSelect}
                            className="sr-only"
                          />
                          
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                              <Image
                                src={player.photoUrl}
                                alt={player.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-white text-sm sm:text-base truncate">{player.name}</div>
                              <div className="flex items-center gap-2 mt-1 mb-2">
                                <span className={`px-2 py-0.5 rounded-lg border text-xs font-bold ${getPositionColor(player.position)}`}>
                                  {player.position}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] text-xs font-bold">
                                  {player.overallRating} OVR
                                </span>
                              </div>
                              <div className="text-xs text-[#FFB347] font-bold">
                                {formatCurrency(player.soldPrice)}
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
                                    strokeWidth={2}
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
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Submit Button */}
      {teamsWithPlayers.length > 0 && (
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <div>
            <div className="text-lg sm:text-xl font-black text-white">
              Total Selected: {getTotalSelected()} players
            </div>
            <div className="text-xs sm:text-sm text-[#7A7367] mt-1">
              Review your selections before finalizing retention
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isSubmitting || getTotalSelected() === 0}
            className="w-full sm:w-auto bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-[#0a0a0a] font-bold px-6 sm:px-8 py-3 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : 'Finalize Retention'}
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl max-w-md w-full p-6">
            <h3 className="text-xl sm:text-2xl font-black text-white mb-4">Confirm Retention</h3>
            <p className="text-[#D4CCBB] text-sm sm:text-base mb-6">
              You are about to retain {getTotalSelected()} players for the new season. 
              This action will assign these players to their respective teams before the auction begins.
            </p>
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all text-sm sm:text-base"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
