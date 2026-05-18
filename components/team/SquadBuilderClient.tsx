"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"

interface Player {
  id: string
  playerId: string
  name: string
  position: string
  overallRating: number
  realWorldClub: string
  playingStyle: string | null
}

interface FieldPosition {
  position: string
  playerId: string | null
  x: number // percentage
  y: number // percentage
}

interface SquadBuilderClientProps {
  seasonId: string
  seasonName: string
  teamId: string
  teamName: string
  players: Player[]
  savedSquad: any
}

const FORMATIONS = {
  "4-3-3": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 20, y: 70 },
    { position: "CB", x: 40, y: 75 },
    { position: "CB", x: 60, y: 75 },
    { position: "RB", x: 80, y: 70 },
    { position: "CMF", x: 35, y: 50 },
    { position: "CMF", x: 50, y: 45 },
    { position: "CMF", x: 65, y: 50 },
    { position: "LWF", x: 20, y: 20 },
    { position: "CF", x: 50, y: 15 },
    { position: "RWF", x: 80, y: 20 },
  ],
  "4-4-2": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 20, y: 70 },
    { position: "CB", x: 40, y: 75 },
    { position: "CB", x: 60, y: 75 },
    { position: "RB", x: 80, y: 70 },
    { position: "LMF", x: 20, y: 45 },
    { position: "CMF", x: 40, y: 50 },
    { position: "CMF", x: 60, y: 50 },
    { position: "RMF", x: 80, y: 45 },
    { position: "CF", x: 40, y: 15 },
    { position: "CF", x: 60, y: 15 },
  ],
  "3-5-2": [
    { position: "GK", x: 50, y: 90 },
    { position: "CB", x: 30, y: 75 },
    { position: "CB", x: 50, y: 78 },
    { position: "CB", x: 70, y: 75 },
    { position: "LMF", x: 15, y: 50 },
    { position: "CMF", x: 35, y: 50 },
    { position: "CMF", x: 50, y: 45 },
    { position: "CMF", x: 65, y: 50 },
    { position: "RMF", x: 85, y: 50 },
    { position: "CF", x: 40, y: 15 },
    { position: "CF", x: 60, y: 15 },
  ],
  "4-2-3-1": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 20, y: 70 },
    { position: "CB", x: 40, y: 75 },
    { position: "CB", x: 60, y: 75 },
    { position: "RB", x: 80, y: 70 },
    { position: "DMF", x: 40, y: 55 },
    { position: "DMF", x: 60, y: 55 },
    { position: "LMF", x: 20, y: 35 },
    { position: "AMF", x: 50, y: 30 },
    { position: "RMF", x: 80, y: 35 },
    { position: "CF", x: 50, y: 12 },
  ],
  "4-1-2-1-2": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 20, y: 70 },
    { position: "CB", x: 40, y: 75 },
    { position: "CB", x: 60, y: 75 },
    { position: "RB", x: 80, y: 70 },
    { position: "DMF", x: 50, y: 58 },
    { position: "CMF", x: 35, y: 45 },
    { position: "CMF", x: 65, y: 45 },
    { position: "AMF", x: 50, y: 28 },
    { position: "CF", x: 35, y: 12 },
    { position: "CF", x: 65, y: 12 },
  ],
  "3-4-3": [
    { position: "GK", x: 50, y: 90 },
    { position: "CB", x: 30, y: 75 },
    { position: "CB", x: 50, y: 78 },
    { position: "CB", x: 70, y: 75 },
    { position: "LMF", x: 20, y: 50 },
    { position: "CMF", x: 40, y: 50 },
    { position: "CMF", x: 60, y: 50 },
    { position: "RMF", x: 80, y: 50 },
    { position: "LWF", x: 20, y: 18 },
    { position: "CF", x: 50, y: 12 },
    { position: "RWF", x: 80, y: 18 },
  ],
  "5-3-2": [
    { position: "GK", x: 50, y: 90 },
    { position: "LWB", x: 15, y: 70 },
    { position: "CB", x: 32, y: 75 },
    { position: "CB", x: 50, y: 78 },
    { position: "CB", x: 68, y: 75 },
    { position: "RWB", x: 85, y: 70 },
    { position: "CMF", x: 35, y: 48 },
    { position: "CMF", x: 50, y: 43 },
    { position: "CMF", x: 65, y: 48 },
    { position: "CF", x: 40, y: 15 },
    { position: "CF", x: 60, y: 15 },
  ],
  "4-3-1-2": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 20, y: 70 },
    { position: "CB", x: 40, y: 75 },
    { position: "CB", x: 60, y: 75 },
    { position: "RB", x: 80, y: 70 },
    { position: "CMF", x: 35, y: 52 },
    { position: "CMF", x: 50, y: 48 },
    { position: "CMF", x: 65, y: 52 },
    { position: "AMF", x: 50, y: 28 },
    { position: "CF", x: 40, y: 12 },
    { position: "CF", x: 60, y: 12 },
  ],
}

export default function SquadBuilderClient({
  seasonId,
  seasonName,
  teamId,
  teamName,
  players,
  savedSquad,
}: SquadBuilderClientProps) {
  const [selectedFormation, setSelectedFormation] = useState<keyof typeof FORMATIONS>("4-3-3")
  const [fieldPositions, setFieldPositions] = useState<FieldPosition[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [selectedPositionIndex, setSelectedPositionIndex] = useState<number | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [highlightedPositions, setHighlightedPositions] = useState<number[]>([])

  useEffect(() => {
    // Initialize field positions based on formation
    const positions = FORMATIONS[selectedFormation].map((pos) => ({
      ...pos,
      playerId: null,
    }))
    setFieldPositions(positions)
  }, [selectedFormation])

  const openPlayerModal = (positionIndex: number) => {
    setSelectedPositionIndex(positionIndex)
    setShowPlayerModal(true)
    setSearchQuery("")
    setSelectedPlayer(null)
    setHighlightedPositions([])
  }

  const selectPlayerForHighlight = (player: Player) => {
    setSelectedPlayer(player)
    // Highlight compatible positions based on player's position
    const compatible = fieldPositions
      .map((pos, idx) => {
        if (pos.playerId) return -1 // Already occupied
        return isPositionCompatible(player.position, pos.position) ? idx : -1
      })
      .filter(idx => idx !== -1)
    setHighlightedPositions(compatible)
  }

  const isPositionCompatible = (playerPos: string, fieldPos: string): boolean => {
    // Define position compatibility
    const compatibility: Record<string, string[]> = {
      "GK": ["GK"],
      "CB": ["CB", "LB", "RB"],
      "LB": ["LB", "LWB", "CB"],
      "RB": ["RB", "RWB", "CB"],
      "LWB": ["LWB", "LB", "LMF"],
      "RWB": ["RWB", "RB", "RMF"],
      "DMF": ["DMF", "CMF", "CB"],
      "CMF": ["CMF", "DMF", "AMF", "LMF", "RMF"],
      "AMF": ["AMF", "CMF", "LWF", "RWF", "CF"],
      "LMF": ["LMF", "LWF", "CMF", "LWB"],
      "RMF": ["RMF", "RWF", "CMF", "RWB"],
      "LWF": ["LWF", "LMF", "CF", "AMF"],
      "RWF": ["RWF", "RMF", "CF", "AMF"],
      "CF": ["CF", "LWF", "RWF", "AMF"],
      "SS": ["SS", "CF", "AMF"],
    }

    return compatibility[playerPos]?.includes(fieldPos) || false
  }

  const assignPlayerToPosition = (positionIndex: number) => {
    if (!selectedPlayer) return
    
    setFieldPositions((prev) =>
      prev.map((pos, idx) =>
        idx === positionIndex ? { ...pos, playerId: selectedPlayer.id } : pos
      )
    )
    setShowPlayerModal(false)
    setSelectedPlayer(null)
    setHighlightedPositions([])
    setSearchQuery("")
  }

  const assignPlayer = (positionIndex: number, playerId: string) => {
    setFieldPositions((prev) =>
      prev.map((pos, idx) =>
        idx === positionIndex ? { ...pos, playerId } : pos
      )
    )
  }

  const removePlayer = (positionIndex: number) => {
    setFieldPositions((prev) =>
      prev.map((pos, idx) =>
        idx === positionIndex ? { ...pos, playerId: null } : pos
      )
    )
  }

  const saveSquad = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/team/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId,
          formation: {
            type: selectedFormation,
            positions: fieldPositions,
          },
        }),
      })

      if (response.ok) {
        alert("Squad saved successfully!")
      }
    } catch (error) {
      console.error("Error saving squad:", error)
      alert("Failed to save squad")
    } finally {
      setIsSaving(false)
    }
  }

  const getPlayerById = (playerId: string | null) => {
    if (!playerId) return null
    return players.find((p) => p.id === playerId)
  }

  const availablePlayers = players.filter(
    (player) => !fieldPositions.some((pos) => pos.playerId === player.id)
  )

  const filteredPlayers = availablePlayers.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.position.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Squad Builder
            </span>
          </h1>
          <p className="text-[#D4CCBB]">{seasonName} • {teamName}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Field View */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              {/* Formation Selector */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-white mb-2">
                  Formation
                </label>
                <select
                  value={selectedFormation}
                  onChange={(e) =>
                    setSelectedFormation(e.target.value as keyof typeof FORMATIONS)
                  }
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white"
                >
                  {Object.keys(FORMATIONS).map((formation) => (
                    <option key={formation} value={formation}>
                      {formation}
                    </option>
                  ))}
                </select>
              </div>

              {/* Football Field */}
              <div className="relative w-full aspect-[2/3] bg-gradient-to-b from-green-800 to-green-900 rounded-lg border-4 border-white/20 overflow-hidden">
                {/* Field markings */}
                <div className="absolute inset-0">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-16 border-2 border-white/30 border-t-0" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-16 border-2 border-white/30 border-b-0" />
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full" />
                </div>

                {/* Player Positions */}
                {fieldPositions.map((pos, idx) => {
                  const player = getPlayerById(pos.playerId)
                  const isHighlighted = highlightedPositions.includes(idx)
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (selectedPlayer && isHighlighted) {
                          assignPlayerToPosition(idx)
                        } else if (!player) {
                          openPlayerModal(idx)
                        }
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all ${
                        isHighlighted ? 'scale-110 z-10' : ''
                      }`}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      {player ? (
                        <div className="relative group">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-[#E8A800] bg-black/80 overflow-hidden">
                            <Image
                              src={getPlayerPhotoUrl(player.playerId)}
                              alt={player.name}
                              width={64}
                              height={64}
                              className="object-cover"
                            />
                          </div>
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] sm:text-xs font-bold bg-black/80 px-1 sm:px-2 py-0.5 sm:py-1 rounded">
                            {player.name.split(" ").pop()}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removePlayer(idx)
                            }}
                            className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs sm:text-sm"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-dashed ${
                          isHighlighted 
                            ? 'border-[#E8A800] bg-[#E8A800]/20 animate-pulse' 
                            : 'border-white/30 bg-black/50'
                        } flex items-center justify-center cursor-pointer hover:border-[#E8A800]/50 hover:bg-[#E8A800]/10 transition-all`}>
                          <span className={`text-[10px] sm:text-xs ${isHighlighted ? 'text-[#E8A800] font-bold' : 'text-white/50'}`}>
                            {pos.position}
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Save Button */}
              <button
                onClick={saveSquad}
                disabled={isSaving}
                className="mt-6 w-full px-6 py-3 bg-[#E8A800] text-black font-bold rounded-lg hover:bg-[#FFC93A] transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Squad"}
              </button>
            </div>
          </div>

          {/* Available Players */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Available Players</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {availablePlayers.length === 0 ? (
                  <p className="text-[#7A7367] text-sm text-center py-8">
                    All players assigned
                  </p>
                ) : (
                  availablePlayers.map((player) => (
                    <div
                      key={player.id}
                      className="bg-black/30 border border-white/10 rounded-lg p-3 hover:border-[#E8A800]/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                          <Image
                            src={getPlayerPhotoUrl(player.playerId)}
                            alt={player.name}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{player.name}</div>
                          <div className="text-xs text-[#7A7367]">
                            {player.position} • {player.overallRating}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              assignPlayer(parseInt(e.target.value), player.id)
                            }
                          }}
                          className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                          defaultValue=""
                        >
                          <option value="">Assign to position...</option>
                          {fieldPositions.map((pos, idx) => (
                            <option
                              key={idx}
                              value={idx}
                              disabled={pos.playerId !== null}
                            >
                              {pos.position} {pos.playerId ? "(occupied)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Player Selection Modal */}
        {showPlayerModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-white">Select Player</h3>
                  <p className="text-xs sm:text-sm text-[#D4CCBB] mt-1">
                    {selectedPositionIndex !== null && `Position: ${fieldPositions[selectedPositionIndex].position}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPlayerModal(false)
                    setSelectedPlayer(null)
                    setHighlightedPositions([])
                    setSearchQuery("")
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 sm:p-6 border-b border-white/10">
                <input
                  type="text"
                  placeholder="Search players by name or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]"
                  autoFocus
                />
              </div>

              {/* Instructions */}
              {!selectedPlayer && (
                <div className="px-4 sm:px-6 pt-4 pb-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-[#E8A800] bg-[#E8A800]/10 border border-[#E8A800]/30 rounded-lg p-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Click a player to see available positions highlighted on the field</span>
                  </div>
                </div>
              )}

              {selectedPlayer && (
                <div className="px-4 sm:px-6 pt-4 pb-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Click a highlighted position on the field to assign {selectedPlayer.name}</span>
                  </div>
                </div>
              )}

              {/* Player List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-2">
                  {filteredPlayers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#7A7367] mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-[#7A7367] text-sm">No players found</p>
                    </div>
                  ) : (
                    filteredPlayers.map((player) => {
                      const isSelected = selectedPlayer?.id === player.id
                      const isCompatible = selectedPositionIndex !== null && 
                        isPositionCompatible(player.position, fieldPositions[selectedPositionIndex].position)
                      
                      return (
                        <button
                          key={player.id}
                          onClick={() => selectPlayerForHighlight(player)}
                          className={`w-full bg-black/30 border rounded-lg p-3 sm:p-4 hover:border-[#E8A800]/50 transition-all text-left ${
                            isSelected 
                              ? 'border-[#E8A800] bg-[#E8A800]/10' 
                              : isCompatible 
                                ? 'border-emerald-500/30' 
                                : 'border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                              <Image
                                src={getPlayerPhotoUrl(player.playerId)}
                                alt={player.name}
                                width={64}
                                height={64}
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm sm:text-base truncate text-white">{player.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  isCompatible 
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                  {player.position}
                                </span>
                                <span className="text-xs text-[#7A7367]">OVR {player.overallRating}</span>
                                {isCompatible && (
                                  <span className="text-xs text-emerald-400">✓ Compatible</span>
                                )}
                              </div>
                              <div className="text-xs text-[#7A7367] mt-1 truncate">{player.realWorldClub}</div>
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 rounded-full bg-[#E8A800] flex items-center justify-center">
                                  <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowPlayerModal(false)
                    setSelectedPlayer(null)
                    setHighlightedPositions([])
                    setSearchQuery("")
                  }}
                  className="w-full px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
