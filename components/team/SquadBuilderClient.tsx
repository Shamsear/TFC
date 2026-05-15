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

  useEffect(() => {
    // Initialize field positions based on formation
    const positions = FORMATIONS[selectedFormation].map((pos) => ({
      ...pos,
      playerId: null,
    }))
    setFieldPositions(positions)
  }, [selectedFormation])

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
                  return (
                    <div
                      key={idx}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      {player ? (
                        <div className="relative group">
                          <div className="w-16 h-16 rounded-full border-2 border-[#E8A800] bg-black/80 overflow-hidden">
                            <Image
                              src={getPlayerPhotoUrl(player.playerId)}
                              alt={player.name}
                              width={64}
                              height={64}
                              className="object-cover"
                            />
                          </div>
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold bg-black/80 px-2 py-1 rounded">
                            {player.name.split(" ").pop()}
                          </div>
                          <button
                            onClick={() => removePlayer(idx)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 bg-black/50 flex items-center justify-center">
                          <span className="text-xs text-white/50">{pos.position}</span>
                        </div>
                      )}
                    </div>
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
      </div>
    </div>
  )
}
