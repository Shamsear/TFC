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

export default function SquadBuilderClient({
  seasonId,
  seasonName,
  teamId,
  teamName,
  players,
  savedSquad,
}: SquadBuilderClientProps) {
  const [selectedFormation, setSelectedFormation] = useState<keyof typeof FORMATIONS>(
    savedSquad?.type || "4-3-3"
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
    // If it's the initial load and we have a saved squad for THIS formation, use it
    if (savedSquad && savedSquad.type === selectedFormation && fieldPositions.length === 0) {
      setFieldPositions(savedSquad.positions)
      setSubstitutes(savedSquad.substitutes || [])
    } else if (savedSquad && selectedFormation === "Custom" && savedSquad.type === "Custom") {
      setFieldPositions(savedSquad.positions)
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
            type: selectedFormation,
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-8 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">Squad Builder</span>
            </h1>
            <p className="text-[#7A7367] text-sm mt-0.5">{seasonName} • {teamName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-[#7A7367] uppercase tracking-wider">Starting XI</div>
              <div className="text-lg font-black text-white">{fieldPositions.filter(p => p.playerId).length} <span className="text-[#7A7367] font-normal text-sm">/ 11</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Field View */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-6">
              {/* Formation Selector — pill buttons */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#7A7367] uppercase tracking-widest">Formation</label>
                  <span className="text-sm font-black text-[#E8A800]">{selectedFormation}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(FORMATIONS).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedFormation(f as keyof typeof FORMATIONS)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                        selectedFormation === f
                          ? 'bg-[#E8A800] text-black border-[#E8A800]'
                          : 'bg-white/5 text-[#7A7367] border-white/10 hover:border-[#E8A800]/50 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Mode Banner */}
              {selectedFormation === "Custom" && (
                <div className="mb-4 bg-[#E8A800]/10 border border-[#E8A800]/30 rounded-lg p-3 text-sm text-[#E8A800] flex items-center justify-between">
                  <span><strong>Custom Mode:</strong> Drag players on the pitch to freely position them. Click ✏️ to change roles.</span>
                </div>
              )}

              {/* Football Field */}
              <div ref={pitchRef} className="relative w-full aspect-[2/3] rounded-xl overflow-hidden" style={{ boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 60px rgba(0,0,0,0.3)' }}>
                {/* Grass base */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #1a5c2a 0%, #1e6b30 50%, #1a5c2a 100%)' }} />
                {/* Grass stripes */}
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 40px, transparent 40px, transparent 80px)',
                }} />
                {/* Radial lighting from center */}
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 70%)' }} />
                {/* Pitch border */}
                <div className="absolute inset-[6px] border border-white/25 rounded" />
                {/* Field markings */}
                <div className="absolute inset-0">
                  {/* Top penalty box */}
                  <div className="absolute top-[6px] left-1/2 -translate-x-1/2 border border-white/25" style={{ width: '44%', height: '14%' }} />
                  {/* Top 6-yard box */}
                  <div className="absolute top-[6px] left-1/2 -translate-x-1/2 border border-white/20" style={{ width: '22%', height: '6%' }} />
                  {/* Top penalty spot */}
                  <div className="absolute w-1 h-1 rounded-full bg-white/30" style={{ top: '17%', left: '50%', transform: 'translateX(-50%)' }} />
                  {/* Bottom penalty box */}
                  <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 border border-white/25" style={{ width: '44%', height: '14%' }} />
                  {/* Bottom 6-yard box */}
                  <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 border border-white/20" style={{ width: '22%', height: '6%' }} />
                  {/* Bottom penalty spot */}
                  <div className="absolute w-1 h-1 rounded-full bg-white/30" style={{ bottom: '17%', left: '50%', transform: 'translateX(-50%)' }} />
                  {/* Halfway line */}
                  <div className="absolute top-1/2 left-[6px] right-[6px] h-px bg-white/25" />
                  {/* Centre circle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/25 rounded-full" style={{ width: '22%', aspectRatio: '1' }} />
                  {/* Centre spot */}
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-white/30" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
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
                          // trigger click
                          e.currentTarget.click();
                        }
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer ${
                        isHighlighted ? 'scale-110 z-10' : ''
                      }`}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      {player ? (
                        <div className="relative group w-7 h-[42px] sm:w-16 sm:h-24 md:w-20 md:h-28 -mt-2 sm:-mt-4 transition-transform hover:scale-105">
                          <PlayerCardImage
                            playerCardId={player.playerId}
                            playerName={player.name}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removePlayer(idx)
                            }}
                            className="absolute -top-2 -right-2 w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] sm:text-sm z-10 shadow-lg"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className={`w-6 h-6 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                          isHighlighted && pendingPlayer
                            ? 'border-emerald-400 bg-emerald-900/60 shadow-[0_0_14px_rgba(52,211,153,0.5)] scale-110 cursor-pointer'
                            : isHighlighted
                            ? 'border-[#E8A800] bg-[#E8A800]/20 shadow-[0_0_14px_rgba(232,168,0,0.5)] scale-110 cursor-pointer animate-pulse'
                            : 'border-white/20 bg-black/40 cursor-pointer hover:border-[#E8A800]/60 hover:shadow-[0_0_10px_rgba(232,168,0,0.2)]'
                        }`}>
                          {/* Silhouette */}
                          <svg className={`w-2 h-2 sm:w-4 sm:h-4 mb-0.5 ${
                            isHighlighted && pendingPlayer ? 'text-emerald-400' : isHighlighted ? 'text-[#E8A800]' : 'text-white/20'
                          }`} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                          </svg>
                          <span className={`text-[6px] sm:text-[10px] font-black leading-none ${
                            isHighlighted && pendingPlayer ? 'text-emerald-400' : isHighlighted ? 'text-[#E8A800]' : 'text-white/40'
                          }`}>{pos.position}</span>
                        </div>
                      )}
                      
                      {/* Position Edit Button (Custom Mode) */}
                      {selectedFormation === "Custom" && !player && !pendingPlayer && (
                        <button
                          className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 border border-blue-400 rounded-full flex items-center justify-center shadow-lg z-20 text-[10px] sm:text-xs text-white"
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
                          className="absolute -top-1 left-0 sm:-top-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 border border-blue-400 rounded-full flex items-center justify-center shadow-lg z-20 text-[10px] sm:text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
              <div className="mt-8 bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#D4CCBB] text-sm font-bold uppercase tracking-wider">Substitutes Bench ({substitutes.length}/{Math.max(7, players.length - fieldPositions.filter(p => p.playerId).length)})</h3>
                  <div className="flex items-center gap-3">
                    {availablePlayers.length > 0 && (
                      <button 
                        onClick={() => {
                          const availableIds = availablePlayers.map(p => p.id)
                          setSubstitutes(prev => [...prev, ...availableIds])
                        }}
                        className="text-xs bg-[#E8A800]/20 text-[#E8A800] border border-[#E8A800]/30 hover:bg-[#E8A800]/30 px-3 py-1 rounded transition-colors font-bold"
                      >
                        + Add All Available
                      </button>
                    )}
                    {substitutes.length > 0 && (
                      <span className="text-xs text-[#7A7367] hidden sm:inline">Click on a player to remove</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  {Array.from({ length: Math.max(7, players.length - fieldPositions.filter(p => p.playerId).length) }).map((_, idx) => {
                    const subId = substitutes[idx]
                    const player = subId ? getPlayerById(subId) : null

                    if (player) {
                      return (
                        <div key={`sub-${idx}`} className="relative group w-8 h-[48px] sm:w-16 sm:h-24 md:w-20 md:h-28 transition-transform hover:scale-105 cursor-pointer">
                          <PlayerCardImage
                            playerCardId={player.playerId}
                            playerName={player.name}
                          />
                          <button
                            onClick={() => removeSubstitute(subId)}
                            className="absolute -top-2 -right-2 w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] sm:text-sm z-10 shadow-lg"
                          >
                            ×
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={`sub-empty-${idx}`}
                        className={`w-8 h-[48px] sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                          isSubstituteHighlighted
                            ? 'border-[#E8A800] bg-[#E8A800]/10 shadow-[0_0_14px_rgba(232,168,0,0.3)] animate-pulse cursor-pointer'
                            : 'border-dashed border-white/10 bg-black/20'
                        }`}
                        onClick={() => {
                          if (isSubstituteHighlighted && selectedPlayer) {
                            assignPlayerToBench()
                          } else if (isSubstituteHighlighted && pendingPlayer) {
                            assignPlayerToBench(pendingPlayer.id)
                          }
                        }}
                      >
                        <svg className={`w-3 h-3 sm:w-6 sm:h-6 mb-1 sm:mb-2 ${
                          isSubstituteHighlighted ? 'text-[#E8A800]' : 'text-white/10'
                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className={`text-[6px] sm:text-[10px] font-black tracking-wider ${
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
                disabled={isSaving}
                className="mt-5 w-full px-6 py-3 bg-gradient-to-r from-[#E8A800] to-[#FFC93A] text-black font-black rounded-xl hover:from-[#FFC93A] hover:to-[#E8A800] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(232,168,0,0.3)] hover:shadow-[0_4px_30px_rgba(232,168,0,0.5)]"
              >
                {isSaving ? (
                  <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Save Squad</>
                )}
              </button>
            </div>
          </div>

          {/* Available Players Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-black">Available <span className="text-[#E8A800]">{availablePlayers.length}</span></h2>
                {pendingPlayer && (
                  <button
                    onClick={() => { setPendingPlayer(null); setHighlightedPositions([]); setIsSubstituteHighlighted(false) }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded border border-red-500/30 bg-red-500/10"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7A7367]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800]/50"
                />
              </div>

              {/* Instruction banner */}
              {pendingPlayer ? (
                <div className="mb-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-2.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Now click a <strong>glowing position</strong> or <strong>substitute slot</strong> on the field</span>
                </div>
              ) : (
                <div className="mb-3 flex items-center gap-2 text-xs text-[#E8A800]/80 bg-[#E8A800]/5 border border-[#E8A800]/20 rounded-lg p-2.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Click a player to highlight compatible positions</span>
                </div>
              )}

              <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
                {availablePlayers.length === 0 ? (
                  <p className="text-[#7A7367] text-sm text-center py-8">All players assigned</p>
                ) : (
                  availablePlayers
                    .filter(p => normalizeForSearch(p.name).includes(normalizeForSearch(searchQuery)) || normalizeForSearch(p.position).includes(normalizeForSearch(searchQuery)))
                    .map((player) => {
                    const isPending = pendingPlayer?.id === player.id
                    return (
                      <button
                        key={player.id}
                        onClick={() => selectFromSidebar(player)}
                        className={`w-full text-left rounded-lg p-2.5 border transition-all ${
                          isPending
                            ? 'border-emerald-400 bg-emerald-400/10 ring-1 ring-emerald-400/20'
                            : 'border-white/8 bg-black/20 hover:border-[#E8A800]/40 hover:bg-[#E8A800]/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
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
                            <div className="font-bold text-xs truncate text-white">{player.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#E8A800]/15 text-[#E8A800] border border-[#E8A800]/25">
                                {player.position}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                player.overallRating >= 85 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                : player.overallRating >= 75 ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                                : 'bg-white/5 text-[#7A7367] border-white/10'
                              }`}>{player.overallRating}</span>
                            </div>
                          </div>
                          {isPending && (
                            <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-white">Select Player</h3>
                  {modalPositionLabel && (
                    <p className="text-xs sm:text-sm text-[#D4CCBB] mt-1">
                      Position: <span className="text-[#E8A800] font-bold">{modalPositionLabel}</span>
                      {" "}·{" "}
                      <span className="text-emerald-400">{compatibleCountForModal} compatible</span>
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
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search + Filter Toggle */}
              <div className="p-4 sm:p-6 border-b border-white/10 space-y-3">
                <input
                  type="text"
                  placeholder="Search by name or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]"
                  autoFocus
                />
                {modalPositionLabel && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAllPlayers(false)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        !showAllPlayers
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-white/5 text-[#7A7367] border-white/10 hover:border-white/20'
                      }`}
                    >
                      ✓ Compatible ({compatibleCountForModal})
                    </button>
                    <button
                      onClick={() => setShowAllPlayers(true)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        showAllPlayers
                          ? 'bg-[#E8A800]/20 text-[#E8A800] border-[#E8A800]/40'
                          : 'bg-white/5 text-[#7A7367] border-white/10 hover:border-white/20'
                      }`}
                    >
                      All Players ({availablePlayers.length})
                    </button>
                  </div>
                )}
              </div>

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
                      <p className="text-[#7A7367] text-sm">No compatible players found</p>
                      {!showAllPlayers && modalPositionLabel && (
                        <button
                          onClick={() => setShowAllPlayers(true)}
                          className="mt-3 text-xs text-[#E8A800] hover:underline"
                        >
                          Show all players instead
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
                              // Direct assign: modal opened from a known position slot
                              assignPlayer(selectedPositionIndex, player.id)
                              setShowPlayerModal(false)
                              setSearchQuery("")
                            }
                          }}
                          className={`w-full bg-black/30 border rounded-lg p-3 sm:p-4 hover:bg-[#E8A800]/10 hover:border-[#E8A800]/50 transition-all text-left ${
                            isCompatible
                              ? 'border-emerald-500/40'
                              : 'border-white/10 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                              <Image
                                src={getPhotoUrlFromDb(player.playerId)}
                                alt={player.name}
                                width={56}
                                height={56}
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm sm:text-base truncate text-white">{player.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  isCompatible
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-white/10 text-[#7A7367] border border-white/10'
                                }`}>
                                  {player.position}
                                </span>
                                <span className="text-xs text-[#7A7367]">OVR {player.overallRating}</span>
                                {isCompatible && (
                                  <span className="text-xs text-emerald-400 font-medium">✓ Fits</span>
                                )}
                              </div>
                              <div className="text-xs text-[#7A7367] mt-0.5 truncate">{player.realWorldClub}</div>
                            </div>
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
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border-2 border-emerald-500/50 rounded-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-white mb-2">Squad Saved!</h3>
                <p className="text-[#D4CCBB] text-sm leading-relaxed">
                  Your starting 11 and substitutes have been successfully saved to your team's profile.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-6 py-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-bold transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
      {/* Position Editing Modal */}
      {editingPositionIdx !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm flex flex-col">
            <div className="p-4 sm:p-6 border-b border-white/10">
              <h3 className="text-xl font-black text-white">Select Role</h3>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-4 sm:grid-cols-5 gap-2">
              {["GK", "CB", "LB", "RB", "LWB", "RWB", "DMF", "CMF", "LMF", "RMF", "AMF", "LWF", "RWF", "SS", "CF"].map(pos => (
                <button
                  key={pos}
                  onClick={() => {
                    setFieldPositions(prev => {
                      const newArr = [...prev]
                      newArr[editingPositionIdx] = { ...newArr[editingPositionIdx], position: pos }
                      // Also clear the player in this slot if they are not compatible with the new position
                      const player = getPlayerById(newArr[editingPositionIdx].playerId)
                      if (player && !isPositionCompatible(player.position, pos)) {
                        newArr[editingPositionIdx].playerId = null
                      }
                      return newArr
                    })
                    setEditingPositionIdx(null)
                  }}
                  className={`py-2 border border-white/10 rounded-lg text-xs font-bold transition-all ${
                    fieldPositions[editingPositionIdx]?.position === pos
                      ? 'bg-[#E8A800] text-black'
                      : 'bg-black/30 hover:bg-[#E8A800]/20 hover:border-[#E8A800]/50 text-white hover:text-[#E8A800]'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
            <div className="p-4 sm:p-6 border-t border-white/10">
              <button
                onClick={() => setEditingPositionIdx(null)}
                className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
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
