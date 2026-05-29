"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { getPhotoUrlFromDb } from "@/lib/image-cdn"
import PlayerCardImage from "@/components/player/PlayerCardImage"
import { normalizeForSearch } from "@/lib/search-utils"

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
  "4-1-4-1": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 15, y: 70 },
    { position: "CB", x: 35, y: 75 },
    { position: "CB", x: 65, y: 75 },
    { position: "RB", x: 85, y: 70 },
    { position: "DMF", x: 50, y: 60 },
    { position: "LMF", x: 15, y: 40 },
    { position: "CMF", x: 35, y: 40 },
    { position: "CMF", x: 65, y: 40 },
    { position: "RMF", x: 85, y: 40 },
    { position: "CF", x: 50, y: 15 },
  ],
  "3-2-4-1": [
    { position: "GK", x: 50, y: 90 },
    { position: "CB", x: 25, y: 75 },
    { position: "CB", x: 50, y: 78 },
    { position: "CB", x: 75, y: 75 },
    { position: "DMF", x: 35, y: 58 },
    { position: "DMF", x: 65, y: 58 },
    { position: "LMF", x: 15, y: 35 },
    { position: "AMF", x: 35, y: 35 },
    { position: "AMF", x: 65, y: 35 },
    { position: "RMF", x: 85, y: 35 },
    { position: "CF", x: 50, y: 12 },
  ],
  "4-2-2-2": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 15, y: 70 },
    { position: "CB", x: 35, y: 75 },
    { position: "CB", x: 65, y: 75 },
    { position: "RB", x: 85, y: 70 },
    { position: "DMF", x: 35, y: 55 },
    { position: "DMF", x: 65, y: 55 },
    { position: "AMF", x: 25, y: 35 },
    { position: "AMF", x: 75, y: 35 },
    { position: "CF", x: 35, y: 15 },
    { position: "CF", x: 65, y: 15 },
  ],
  "4-2-4": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 15, y: 70 },
    { position: "CB", x: 35, y: 75 },
    { position: "CB", x: 65, y: 75 },
    { position: "RB", x: 85, y: 70 },
    { position: "CMF", x: 35, y: 45 },
    { position: "CMF", x: 65, y: 45 },
    { position: "LWF", x: 15, y: 20 },
    { position: "CF", x: 35, y: 15 },
    { position: "CF", x: 65, y: 15 },
    { position: "RWF", x: 85, y: 20 },
  ],
  "5-2-3": [
    { position: "GK", x: 50, y: 90 },
    { position: "LWB", x: 15, y: 70 },
    { position: "CB", x: 32, y: 75 },
    { position: "CB", x: 50, y: 78 },
    { position: "CB", x: 68, y: 75 },
    { position: "RWB", x: 85, y: 70 },
    { position: "CMF", x: 35, y: 45 },
    { position: "CMF", x: 65, y: 45 },
    { position: "LWF", x: 20, y: 20 },
    { position: "CF", x: 50, y: 15 },
    { position: "RWF", x: 80, y: 20 },
  ],
  "Custom": [
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
}

const getPositionFromCoordinates = (x: number, y: number): string => {
  if (y > 85) return "GK";
  if (y > 65) {
    if (x < 28) return y < 73 ? "LWB" : "LB";
    if (x > 72) return y < 73 ? "RWB" : "RB";
    return "CB";
  }
  if (y >= 55) {
    if (x < 28) return "LMF";
    if (x > 72) return "RMF";
    return "DMF";
  }
  if (y >= 38) {
    if (x < 28) return "LMF";
    if (x > 72) return "RMF";
    return "CMF";
  }
  if (y >= 25) {
    if (x < 28) return "LMF";
    if (x > 72) return "RMF";
    if (x < 40 || x > 60) return y < 30 ? "SS" : "AMF";
    return "AMF";
  }
  // < 25
  if (x < 30) return "LWF";
  if (x > 70) return "RWF";
  if (y >= 18) return "SS";
  return "CF";
}

const getCustomFormationString = (positions: FieldPosition[]) => {
  const bands = [0, 0, 0, 0, 0];
  positions.forEach(p => {
    if (p.position === "GK" || p.y > 85) return;
    if (p.y > 65) bands[0]++; // Defenders
    else if (p.y > 52) bands[1]++; // DMF
    else if (p.y > 38) bands[2]++; // CMF/Wide
    else if (p.y > 25) bands[3]++; // AMF
    else bands[4]++; // Fwd
  });
  
  const scheme = bands.filter(b => b > 0).join("-");
  return scheme || "Custom";
}

const generateCustomPositions = (scheme: string, currentPositions: FieldPosition[]): FieldPosition[] => {
  const parts = scheme.split('-').map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0);
  const sum = parts.reduce((a, b) => a + b, 0);
  
  if (sum !== 10) return currentPositions;
  
  const newPositions: FieldPosition[] = [];
  
  // 1. Keep GK
  newPositions.push({
    position: "GK",
    x: 50,
    y: 90,
    playerId: currentPositions[0]?.playerId || null
  });
  
  // 2. Generate outfield
  let playerIdx = 1;
  const numBands = parts.length;
  
  parts.forEach((count, bandIdx) => {
    // Determine Y for this band
    const y = numBands === 1 ? 45 : 75 - (bandIdx * (60 / (numBands - 1)));
    
    for (let i = 0; i < count; i++) {
      let x = 50;
      if (count === 2) x = [35, 65][i];
      else if (count === 3) x = [20, 50, 80][i];
      else if (count === 4) x = [15, 38, 62, 85][i];
      else if (count === 5) x = [15, 32.5, 50, 67.5, 85][i];
      else if (count > 5) x = 15 + (i * (70 / (count - 1)));
      
      const posString = getPositionFromCoordinates(x, y);
      
      newPositions.push({
        position: posString,
        x,
        y,
        playerId: currentPositions[playerIdx]?.playerId || null
      });
      
      playerIdx++;
    }
  });
  
  return newPositions;
}

export default function SquadBuilderClient({
  seasonId,
  seasonName,
  teamId,
  teamName,
  players,
  savedSquad,
}: SquadBuilderClientProps) {
  const [selectedFormation, setSelectedFormation] = useState<keyof typeof FORMATIONS>(
    savedSquad?.type?.startsWith("Custom") ? "Custom" : (savedSquad?.type || "4-3-3")
  )
  const [customFormationName, setCustomFormationName] = useState<string>(
    savedSquad?.type?.startsWith("Custom (") ? savedSquad.type.replace("Custom (", "").replace(")", "") : ""
  )
  const [fieldPositions, setFieldPositions] = useState<FieldPosition[]>([])
  const [substitutes, setSubstitutes] = useState<string[]>(
    savedSquad?.substitutes || []
  )
  const [isSaving, setIsSaving] = useState(false)
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [selectedPositionIndex, setSelectedPositionIndex] = useState<number | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [highlightedPositions, setHighlightedPositions] = useState<number[]>([])
  // Player-first selection: click player in sidebar → glow compatible positions
  const [pendingPlayer, setPendingPlayer] = useState<Player | null>(null)
  // Modal: toggle to show all players vs position-compatible only
  const [showAllPlayers, setShowAllPlayers] = useState(false)
  const [isSubstituteHighlighted, setIsSubstituteHighlighted] = useState(false)

  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const pitchRef = useRef<HTMLDivElement>(null)
  const [draggingNode, setDraggingNode] = useState<number | null>(null)
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null)
  const [hasDragged, setHasDragged] = useState(false)
  const [editingPositionIdx, setEditingPositionIdx] = useState<number | null>(null)

  useEffect(() => {
    // Helper to clean up players that are no longer in the team (released/swapped)
    const cleanupPositions = (positions: FieldPosition[]) => {
      return positions.map(pos => ({
        ...pos,
        playerId: pos.playerId && players.some(p => p.id === pos.playerId) ? pos.playerId : null
      }))
    }
    const cleanupSubstitutes = (subs: string[]) => {
      return subs.filter(subId => players.some(p => p.id === subId))
    }

    // If it's the initial load and we have a saved squad for THIS formation, use it
    if (savedSquad && savedSquad.type.startsWith(selectedFormation) && fieldPositions.length === 0) {
      setFieldPositions(cleanupPositions(savedSquad.positions))
      setSubstitutes(cleanupSubstitutes(savedSquad.substitutes || []))
    } else if (savedSquad && selectedFormation === "Custom" && savedSquad.type.startsWith("Custom")) {
      setFieldPositions(cleanupPositions(savedSquad.positions))
    } else {
      // Initialize field positions based on formation
      const positions = FORMATIONS[selectedFormation].map((pos) => ({
        ...pos,
        playerId: null,
      }))
      setFieldPositions(positions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormation])

  const openPlayerModal = (positionIndex: number) => {
    setSelectedPositionIndex(positionIndex)
    setShowPlayerModal(true)
    setSearchQuery("")
    setSelectedPlayer(null)
    setHighlightedPositions([])
    setShowAllPlayers(false)
    // clear sidebar selection when modal opens
    setPendingPlayer(null)
    setIsSubstituteHighlighted(false)
  }

  // Sidebar-first flow: select player → compatible positions glow
  const selectFromSidebar = (player: Player) => {
    if (pendingPlayer?.id === player.id) {
      // deselect
      setPendingPlayer(null)
      setHighlightedPositions([])
      setIsSubstituteHighlighted(false)
      return
    }

    // Check if the starting 11 is full
    const isSquadFull = fieldPositions.every((p) => p.playerId !== null)
    if (isSquadFull) {
      // Directly add to substitutes bench
      if (!substitutes.includes(player.id)) {
        setSubstitutes((prev) => [...prev, player.id])
      }
      return
    }

    setPendingPlayer(player)
    setIsSubstituteHighlighted(true) // Bench is always compatible for pending players
    
    // Highlight compatible positions
    const compatible = fieldPositions
      .map((pos, idx) => {
        if (pos.playerId) return -1 // Already occupied
        return isPositionCompatible(player.position, pos.position) ? idx : -1
      })
      .filter((idx) => idx !== -1)
      
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

  const assignPlayerToBench = (playerId?: string) => {
    const id = playerId ?? selectedPlayer?.id
    if (!id) return
    if (!substitutes.includes(id)) {
      setSubstitutes((prev) => [...prev, id])
    }
    setPendingPlayer(null)
    setHighlightedPositions([])
    setIsSubstituteHighlighted(false)
    setSelectedPlayer(null)
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

  const removeSubstitute = (playerId: string) => {
    setSubstitutes((prev) => prev.filter((id) => id !== playerId))
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
            type: selectedFormation === "Custom" 
              ? `Custom (${customFormationName.trim() || getCustomFormationString(fieldPositions)})`
              : selectedFormation,
            positions: fieldPositions,
            substitutes,
          },
        }),
      })

      if (response.ok) {
        setShowSuccessModal(true)
      } else {
        const data = await response.json()
        alert(`Failed to save squad: ${data.error || "Unknown error"}`)
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
    (p) => !fieldPositions.some((pos) => pos.playerId === p.id) && !substitutes.includes(p.id)
  )

  // In modal: when a position is selected and showAllPlayers is false, show compatible players first (sorted), incompatible hidden
  const modalPositionLabel = selectedPositionIndex !== null ? fieldPositions[selectedPositionIndex]?.position : null

  const filteredPlayers = availablePlayers
    .filter(player => {
      const matchesSearch =
        normalizeForSearch(player.name).includes(normalizeForSearch(searchQuery)) ||
        normalizeForSearch(player.position).includes(normalizeForSearch(searchQuery))
      if (!matchesSearch) return false
      if (showPlayerModal && modalPositionLabel && !showAllPlayers) {
        return isPositionCompatible(player.position, modalPositionLabel)
      }
      return true
    })
    .sort((a, b) => {
      if (modalPositionLabel) {
    const aC = isPositionCompatible(a.position, modalPositionLabel) ? 0 : 1
        const bC = isPositionCompatible(b.position, modalPositionLabel) ? 0 : 1
        if (aC !== bC) return aC - bC
      }
      return b.overallRating - a.overallRating
    })

  const compatibleCountForModal = modalPositionLabel
    ? availablePlayers.filter(p => isPositionCompatible(p.position, modalPositionLabel)).length
    : 0

  const customFormationSum = customFormationName
    .split('-')
    .map(n => parseInt(n))
    .filter(n => !isNaN(n))
    .reduce((a, b) => a + b, 0);

  const isCustomFormationValid = selectedFormation !== "Custom" || customFormationName === "" || customFormationSum === 10;

  return (
    <div className="min-h-screen bg-[#070708] text-white py-8 pt-24 relative overflow-hidden">
      {/* Background spotlights */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-[#E8A800]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(232,168,0,0.15)]">Squad Builder</span>
            </h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1.5 font-mono">
              {seasonName} <span className="text-gray-600">•</span> {teamName}
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-lg">
            <div className="text-right">
              <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">Starting XI Lineup</div>
              <div className="text-xl font-black text-white mt-0.5">
                {fieldPositions.filter(p => p.playerId).length} <span className="text-gray-500 text-sm font-normal">/ 11</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Field View */}
          <div className="lg:col-span-2">
            <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-3xl p-4 sm:p-8 shadow-2xl relative backdrop-blur-2xl">
              {/* Formation Selector — pill buttons */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest font-mono">Formation Setup</label>
                  <span className="text-xs font-black text-[#E8A800] px-3 py-1 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/20 font-mono shadow-[0_0_15px_rgba(232,168,0,0.1)]">
                    {selectedFormation === "Custom" 
                      ? `Custom (${customFormationName.trim() || getCustomFormationString(fieldPositions)})` 
                      : selectedFormation}
                  </span>
                </div>
                
                {selectedFormation === "Custom" && (
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder={`e.g. ${getCustomFormationString(fieldPositions)}`}
                      value={customFormationName}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
                        const formatted = digits.split('').join('-');
                        setCustomFormationName(formatted);

                        const parts = formatted.split('-').map(n => parseInt(n)).filter(n => !isNaN(n));
                        const sum = parts.reduce((a, b) => a + b, 0);

                        if (sum === 10) {
                           const newPositions = generateCustomPositions(formatted, fieldPositions);
                           setFieldPositions(newPositions);
                        }
                      }}
                      className={`w-full bg-black/40 border ${!isCustomFormationValid ? 'border-red-500/40 focus:border-red-500' : 'border-white/5 focus:border-[#E8A800]/40'} rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none transition-all font-mono`}
                      maxLength={9}
                    />
                    {!isCustomFormationValid && (
                      <div className="text-red-400 text-[10px] mt-2 font-bold flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Invalid Scheme: Sum must equal 10 (currently {customFormationSum})
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-1.5 p-1 bg-black/40 border border-white/5 rounded-2xl max-h-44 overflow-y-auto">
                  {Object.keys(FORMATIONS).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedFormation(f as keyof typeof FORMATIONS)}
                      className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                        selectedFormation === f
                          ? 'bg-[#E8A800] text-black border-[#E8A800] shadow-[0_0_15px_rgba(232,168,0,0.35)] scale-[1.03]'
                          : 'bg-white/[0.01] text-gray-500 border-transparent hover:border-white/10 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Mode Banner */}
              {selectedFormation === "Custom" && (
                <div className="mb-5 bg-[#E8A800]/5 border border-[#E8A800]/20 rounded-2xl p-4 text-xs text-[#E8A800]/90 flex items-center gap-3 shadow-[0_0_15px_rgba(232,168,0,0.05)]">
                  <svg className="w-5 h-5 text-[#E8A800] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span><strong>Custom Slate Enabled:</strong> Drag player capsules on the pitch to build personalized layouts. Click ✏️ to customize positional roles.</span>
                </div>
              )}

              {/* Football Field Pitch */}
              <div 
                ref={pitchRef} 
                className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden border border-emerald-500/20" 
                style={{ 
                  boxShadow: '0 15px 50px -10px rgba(0,0,0,0.9), inset 0 0 80px rgba(0,0,0,0.6)', 
                  background: 'radial-gradient(circle at center, #0f271a 0%, #07130d 65%, #030805 100%)' 
                }}
              >
                {/* Tech Tactical Mesh */}
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(rgba(16,185,129,0.08) 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                }} />
                
                {/* Inner Glow Center Spotlight */}
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />
                
                {/* Pitch Outlines */}
                <div className="absolute inset-[8px] border border-emerald-500/25 rounded-xl shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]" />
                
                {/* Field markings with neon emerald lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top penalty box */}
                  <div className="absolute top-[8px] left-1/2 -translate-x-1/2 border border-emerald-500/20" style={{ width: '44%', height: '14%' }} />
                  {/* Top 6-yard box */}
                  <div className="absolute top-[8px] left-1/2 -translate-x-1/2 border border-emerald-500/15" style={{ width: '22%', height: '6%' }} />
                  {/* Top penalty spot */}
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/40" style={{ top: '17%', left: '50%', transform: 'translateX(-50%)' }} />
                  
                  {/* Bottom penalty box */}
                  <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 border border-emerald-500/20" style={{ width: '44%', height: '14%' }} />
                  {/* Bottom 6-yard box */}
                  <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 border border-emerald-500/15" style={{ width: '22%', height: '6%' }} />
                  {/* Bottom penalty spot */}
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/40" style={{ bottom: '17%', left: '50%', transform: 'translateX(-50%)' }} />
                  
                  {/* Halfway line */}
                  <div className="absolute top-1/2 left-[8px] right-[8px] h-px bg-emerald-500/25" />
                  {/* Centre circle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-emerald-500/25 rounded-full" style={{ width: '24%', aspectRatio: '1' }} />
                  {/* Centre spot */}
                  <div className="absolute w-2 h-2 rounded-full bg-emerald-400/40" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
                </div>

                {/* Player Positions */}
                {fieldPositions.map((pos, idx) => {
                  const player = getPlayerById(pos.playerId)
                  const isHighlighted = highlightedPositions.includes(idx)
                  
                  return (
                    <div
                      key={idx}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(e) => {
                        if (selectedFormation !== 'Custom') return
                        e.stopPropagation()
                        e.currentTarget.setPointerCapture(e.pointerId)
                        setDraggingNode(idx)
                        setDragStartPos({ x: e.clientX, y: e.clientY })
                        setHasDragged(false)
                      }}
                      onPointerMove={(e) => {
                        if (draggingNode !== idx || !pitchRef.current) return
                        if (dragStartPos) {
                          const dx = e.clientX - dragStartPos.x
                          const dy = e.clientY - dragStartPos.y
                          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                            setHasDragged(true)
                          }
                        }
                        const rect = pitchRef.current.getBoundingClientRect()
                        let x = ((e.clientX - rect.left) / rect.width) * 100
                        let y = ((e.clientY - rect.top) / rect.height) * 100
                        x = Math.max(0, Math.min(100, x))
                        y = Math.max(0, Math.min(100, y))
                        setFieldPositions(prev => {
                          const newArr = [...prev]
                          newArr[idx] = { ...newArr[idx], x, y }
                          if (selectedFormation === 'Custom') {
                            newArr[idx].position = getPositionFromCoordinates(x, y)
                          }
                          return newArr
                        })
                      }}
                      onPointerUp={(e) => {
                        if (draggingNode === idx) {
                          e.currentTarget.releasePointerCapture(e.pointerId)
                          setDraggingNode(null)
                        }
                      }}
                      onClick={(e) => {
                        if (hasDragged) {
                          setHasDragged(false)
                          return
                        }
                        if (pendingPlayer && isHighlighted) {
                          // Sidebar-first flow: assign pending player to this glowing position
                          assignPlayer(idx, pendingPlayer.id)
                          setPendingPlayer(null)
                          setHighlightedPositions([])
                          setIsSubstituteHighlighted(false)
                        } else if (selectedPlayer && isHighlighted) {
                          assignPlayerToPosition(idx)
                        } else if (!player && !pendingPlayer) {
                          openPlayerModal(idx)
                        } else if (pendingPlayer && !isHighlighted && !player) {
                          // clicked non-compatible empty slot while pending — cancel pending
                          setPendingPlayer(null)
                          setHighlightedPositions([])
                          setIsSubstituteHighlighted(false)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.currentTarget.click();
                        }
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 cursor-pointer ${
                        isHighlighted ? 'scale-110 z-10' : ''
                      }`}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      {player ? (
                        <div className="relative group w-14 h-[84px] sm:w-20 sm:h-[120px] -mt-4 sm:-mt-8 transition-all hover:scale-105 hover:z-20 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                          <PlayerCardImage
                            playerCardId={player.playerId}
                            playerName={player.name}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removePlayer(idx)
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 bg-red-600 hover:bg-red-500 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] sm:text-xs z-10 shadow-lg border border-red-500/30"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className={`w-8 h-8 sm:w-14 sm:h-14 rounded-full border flex flex-col items-center justify-center transition-all ${
                          isHighlighted && pendingPlayer
                            ? 'border-emerald-400 bg-emerald-950/70 shadow-[0_0_15px_rgba(52,211,153,0.6)] scale-110 cursor-pointer animate-[pulse_1.5s_infinite]'
                            : isHighlighted
                            ? 'border-[#E8A800] bg-[#E8A800]/25 shadow-[0_0_15px_rgba(232,168,0,0.6)] scale-110 cursor-pointer animate-[pulse_1.5s_infinite]'
                            : 'border-white/10 bg-black/50 backdrop-blur-md cursor-pointer hover:border-[#E8A800]/40 hover:bg-[#E8A800]/10 hover:shadow-[0_0_10px_rgba(232,168,0,0.15)]'
                        }`}>
                          {/* Silhouette svg */}
                          <svg className={`w-2.5 h-2.5 sm:w-5 sm:h-5 mb-0.5 transition-colors ${
                            isHighlighted && pendingPlayer ? 'text-emerald-400' : isHighlighted ? 'text-[#E8A800]' : 'text-white/20'
                          }`} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                          </svg>
                          <span className={`text-[6px] sm:text-[9px] font-black leading-none uppercase tracking-wide font-mono ${
                            isHighlighted && pendingPlayer ? 'text-emerald-400' : isHighlighted ? 'text-[#E8A800]' : 'text-white/40'
                          }`}>{pos.position}</span>
                        </div>
                      )}
                      
                      {/* Position Edit Button (Custom Mode) */}
                      {selectedFormation === "Custom" && !player && !pendingPlayer && (
                        <button
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 hover:bg-blue-500 border border-blue-400/40 rounded-full flex items-center justify-center shadow-lg z-20 text-[10px] sm:text-xs text-white transition-all scale-90 hover:scale-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingPositionIdx(idx)
                          }}
                        >
                          ✏️
                        </button>
                      )}
                      {selectedFormation === "Custom" && player && (
                        <button
                          className="absolute -top-1.5 left-0 w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 hover:bg-blue-500 border border-blue-400/40 rounded-full flex items-center justify-center shadow-lg z-20 text-[10px] sm:text-xs text-white opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingPositionIdx(idx)
                          }}
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Substitutes Bench */}
              <div className="mt-8 bg-black/35 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)] animate-pulse" />
                    <h3 className="text-gray-300 text-xs font-black uppercase tracking-wider font-mono">
                      Substitutes Bench ({substitutes.length}/{Math.max(7, players.length - fieldPositions.filter(p => p.playerId).length)})
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {availablePlayers.length > 0 && (
                      <button 
                        onClick={() => {
                          const availableIds = availablePlayers.map(p => p.id)
                          setSubstitutes(prev => [...prev, ...availableIds])
                        }}
                        className="text-[10px] bg-[#E8A800]/10 text-[#E8A800] border border-[#E8A800]/20 hover:bg-[#E8A800]/25 px-2.5 py-1.5 rounded-lg transition-all font-black uppercase tracking-wider cursor-pointer"
                      >
                        + Add All Available
                      </button>
                    )}
                    {substitutes.length > 0 && (
                      <span className="text-[10px] text-gray-500 font-extrabold uppercase font-mono tracking-wider hidden sm:inline">Click × to remove</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 justify-items-center">
                  {Array.from({ length: Math.max(7, players.length - fieldPositions.filter(p => p.playerId).length) }).map((_, idx) => {
                    const subId = substitutes[idx]
                    const player = subId ? getPlayerById(subId) : null

                    if (player) {
                      return (
                        <div key={`sub-${idx}`} className="relative group w-12 h-[72px] sm:w-16 sm:h-[96px] transition-all hover:scale-105 cursor-pointer filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                          <PlayerCardImage
                            playerCardId={player.playerId}
                            playerName={player.name}
                          />
                          <button
                            onClick={() => removeSubstitute(subId)}
                            className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 bg-red-600 hover:bg-red-500 border border-red-500/30 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] z-10 shadow-lg"
                          >
                            ×
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={`sub-empty-${idx}`}
                        className={`w-12 h-[72px] sm:w-16 sm:h-[96px] rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isSubstituteHighlighted
                            ? 'border-[#E8A800] bg-[#E8A800]/10 shadow-[0_0_15px_rgba(232,168,0,0.25)] animate-[pulse_1.5s_infinite] cursor-pointer'
                            : 'border-dashed border-white/5 bg-black/30'
                        }`}
                        onClick={() => {
                          if (isSubstituteHighlighted && selectedPlayer) {
                            assignPlayerToBench()
                          } else if (isSubstituteHighlighted && pendingPlayer) {
                            assignPlayerToBench(pendingPlayer.id)
                          }
                        }}
                      >
                        <svg className={`w-3.5 h-3.5 mb-1.5 ${
                          isSubstituteHighlighted ? 'text-[#E8A800]' : 'text-white/10'
                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className={`text-[6px] sm:text-[9px] font-black tracking-widest font-mono ${
                          isSubstituteHighlighted ? 'text-[#E8A800]' : 'text-white/20'
                        }`}>
                          BENCH
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={saveSquad}
                disabled={isSaving || !isCustomFormationValid}
                className={`mt-6 w-full px-6 py-4 bg-gradient-to-r font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider ${
                  isSaving || !isCustomFormationValid
                    ? 'from-gray-800 to-gray-900 border border-white/5 text-gray-600 cursor-not-allowed opacity-50'
                    : 'from-[#E8A800] via-[#FFD066] to-[#FFB347] text-black hover:brightness-110 shadow-[0_0_30px_rgba(232,168,0,0.25)] hover:shadow-[0_0_40px_rgba(232,168,0,0.45)] hover:scale-[1.01] active:scale-95'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> 
                    <span>Saving Layout...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg> 
                    <span>Commit Starting Roster</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Available Players Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-3xl p-4 sm:p-6 lg:sticky lg:top-28 backdrop-blur-2xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-gray-300 font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8A800]" />
                  Unassigned roster ({availablePlayers.length})
                </h2>
                {pendingPlayer && (
                  <button
                    onClick={() => { setPendingPlayer(null); setHighlightedPositions([]); setIsSubstituteHighlighted(false) }}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg border border-red-500/20 bg-red-500/10 font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, position..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-black/40 border border-white/5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
                />
              </div>

              {/* Instruction banner */}
              {pendingPlayer ? (
                <div className="mb-4 flex items-center gap-2.5 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-3 shadow-[0_0_15px_rgba(16,185,129,0.02)]">
                  <svg className="w-4 h-4 shrink-0 text-emerald-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="leading-tight font-medium">Click any <strong>glowing green zone</strong> or **bench slot** on the pitch to assign {pendingPlayer.name}.</span>
                </div>
              ) : (
                <div className="mb-4 flex items-center gap-2.5 text-xs text-[#E8A800] bg-[#E8A800]/5 border border-[#E8A800]/15 rounded-2xl p-3 shadow-[0_0_15px_rgba(232,168,0,0.02)]">
                  <svg className="w-4 h-4 shrink-0 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="leading-tight font-medium">Click a player to see compatible starting field positions.</span>
                </div>
              )}

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {availablePlayers.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl bg-black/20">
                    <p className="text-gray-600 text-xs font-bold uppercase font-mono tracking-wider">Roster Completed</p>
                    <p className="text-[10px] text-gray-700 mt-1">All players are assigned to positions.</p>
                  </div>
                ) : (
                  availablePlayers
                    .filter(p => normalizeForSearch(p.name).includes(normalizeForSearch(searchQuery)) || normalizeForSearch(p.position).includes(normalizeForSearch(searchQuery)))
                    .map((player) => {
                    const isPending = pendingPlayer?.id === player.id
                    return (
                      <button
                        key={player.id}
                        onClick={() => selectFromSidebar(player)}
                        className={`w-full text-left rounded-xl p-3 border transition-all duration-300 cursor-pointer ${
                          isPending
                            ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'border-white/5 bg-black/30 hover:border-[#E8A800]/40 hover:bg-[#E8A800]/5 hover:scale-[1.01]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/5">
                            <Image
                              src={getPhotoUrlFromDb(player.playerId)}
                              alt={player.name}
                              width={44}
                              height={44}
                              unoptimized={true}
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-xs truncate text-white leading-tight">{player.name}</div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-[#E8A800]/10 text-[#E8A800] border border-[#E8A800]/20 font-mono tracking-wider">
                                {player.position}
                              </span>
                              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border font-mono ${
                                player.overallRating >= 85 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : player.overallRating >= 75 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-white/5 text-gray-500 border-white/5'
                              }`}>OVR {player.overallRating}</span>
                            </div>
                          </div>
                          {isPending ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                              <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <svg className="w-4 h-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Player Selection Modal */}
        {showPlayerModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#0c0c0e]/95 border border-white/5 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.01]">
                <div>
                  <h3 className="text-xl font-black text-white">Roster Selection</h3>
                  {modalPositionLabel && (
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Target Role: <span className="text-[#E8A800] font-black">{modalPositionLabel}</span>
                      {" "}<span className="text-gray-600">•</span>{" "}
                      <span className="text-emerald-400 font-bold">{compatibleCountForModal} fits available</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowPlayerModal(false)
                    setSelectedPlayer(null)
                    setHighlightedPositions([])
                    setSearchQuery("")
                  }}
                  className="text-gray-500 hover:text-white transition-colors p-2 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search + Filter Toggle */}
              <div className="p-6 border-b border-white/5 bg-white/[0.005] space-y-4">
                <input
                  type="text"
                  placeholder="Filter by player name or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E8A800]/30 transition-all text-xs font-mono"
                  autoFocus
                />
                {modalPositionLabel && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAllPlayers(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                        !showAllPlayers
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                          : 'bg-white/[0.01] text-gray-500 border-transparent hover:border-white/10 hover:text-white'
                      }`}
                    >
                      ✓ Compatible Role Fits ({compatibleCountForModal})
                    </button>
                    <button
                      onClick={() => setShowAllPlayers(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                        showAllPlayers
                          ? 'bg-[#E8A800]/10 text-[#E8A800] border-[#E8A800]/30 shadow-[0_0_15px_rgba(232,168,0,0.05)]'
                          : 'bg-white/[0.01] text-gray-500 border-transparent hover:border-white/10 hover:text-white'
                      }`}
                    >
                      All Available Players ({availablePlayers.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Player List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-2">
                {filteredPlayers.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl bg-black/20">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-gray-600 mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider font-mono">No matching players</p>
                    {!showAllPlayers && modalPositionLabel && (
                      <button
                        onClick={() => setShowAllPlayers(true)}
                        className="mt-3 text-xs text-[#E8A800] font-black uppercase tracking-wider hover:brightness-110 cursor-pointer"
                      >
                        Browse all squad players
                      </button>
                    )}
                  </div>
                ) : (
                  filteredPlayers.map((player) => {
                    const isCompatible = modalPositionLabel
                      ? isPositionCompatible(player.position, modalPositionLabel)
                      : true

                    return (
                      <button
                        key={player.id}
                        onClick={() => {
                          if (selectedPositionIndex !== null) {
                            assignPlayer(selectedPositionIndex, player.id)
                            setShowPlayerModal(false)
                            setSearchQuery("")
                          }
                        }}
                        className={`w-full bg-black/30 border rounded-xl p-3 hover:bg-[#E8A800]/5 hover:border-[#E8A800]/40 transition-all text-left flex items-center justify-between cursor-pointer ${
                          isCompatible
                            ? 'border-emerald-500/20'
                            : 'border-white/5 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/5">
                            <Image
                              src={getPhotoUrlFromDb(player.playerId)}
                              alt={player.name}
                              width={56}
                              height={56}
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-sm text-white leading-tight">{player.name}</div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono tracking-wider ${
                                isCompatible
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-white/5 text-gray-500 border border-white/5'
                              }`}>
                                {player.position}
                              </span>
                              <span className="text-[9px] text-gray-500 font-extrabold uppercase font-mono tracking-wider">OVR {player.overallRating}</span>
                              {isCompatible && (
                                <span className="text-[9px] text-emerald-400 font-black uppercase font-mono tracking-wider">✓ Active fit</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-600 mt-1 font-mono truncate">{player.realWorldClub}</div>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                <button
                  onClick={() => {
                    setShowPlayerModal(false)
                    setSelectedPlayer(null)
                    setHighlightedPositions([])
                    setSearchQuery("")
                  }}
                  className="w-full px-6 py-3 rounded-xl bg-white/[0.02] border border-white/5 text-white hover:bg-white/[0.06] transition-all font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0c0c0e]/95 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-200 shadow-2xl relative overflow-hidden">
            {/* Spot blur */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-start gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-white">Squad Locked!</h3>
                <p className="text-gray-400 text-xs leading-relaxed mt-2 font-medium">
                  Your tactical starting 11 lineup configurations and substitutes bench logs have been securely committed to the TFC mainframe database.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-6 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:scale-[1.01]"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Position Role Customizing Modal */}
      {editingPositionIdx !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0c0c0e]/95 border border-white/5 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.01]">
              <h3 className="text-lg font-black text-white">Select Tactical Role</h3>
            </div>
            <div className="p-6 grid grid-cols-3 gap-2 bg-white/[0.002]">
              {["GK", "CB", "LB", "RB", "LWB", "RWB", "DMF", "CMF", "LMF", "RMF", "AMF", "LWF", "RWF", "SS", "CF"].map(pos => (
                <button
                  key={pos}
                  onClick={() => {
                    setFieldPositions(prev => {
                      const newArr = [...prev]
                      newArr[editingPositionIdx] = { ...newArr[editingPositionIdx], position: pos }
                      const player = getPlayerById(newArr[editingPositionIdx].playerId)
                      if (player && !isPositionCompatible(player.position, pos)) {
                        newArr[editingPositionIdx].playerId = null
                      }
                      return newArr
                    })
                    setEditingPositionIdx(null)
                  }}
                  className={`py-2.5 border rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-mono ${
                    fieldPositions[editingPositionIdx]?.position === pos
                      ? 'bg-[#E8A800] text-black border-[#E8A800] shadow-[0_0_12px_rgba(232,168,0,0.3)]'
                      : 'bg-black/40 border-white/5 hover:bg-[#E8A800]/10 hover:border-[#E8A800]/40 text-gray-400 hover:text-white'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
            <div className="p-6 border-t border-white/5 bg-white/[0.01]">
              <button
                onClick={() => setEditingPositionIdx(null)}
                className="w-full py-3 rounded-xl bg-white/[0.02] border border-white/5 text-white font-black text-xs uppercase tracking-wider hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
