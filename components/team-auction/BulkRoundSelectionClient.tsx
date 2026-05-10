'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Player {
  id: string
  name: string
  photoUrl: string
  position: string
  overall: number
  nationality: string
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
}

interface Selection {
  playerId: string
  priority: number
  submitted: boolean
  player: {
    id: string
    name: string
    photoUrl: string
    position: string
    overall: number
  }
}

interface Round {
  id: string
  roundNumber: number
  position: string | null
  roundType: string
  status: string
  startTime: Date | null
  endTime: Date | null
  maxBidsPerTeam: number | null
  basePrice: number | null
  seasonId: string
}

interface Season {
  id: string
  name: string
}

interface Team {
  id: string
  name: string
  logoUrl: string
  budget: number
}

interface BulkRoundSelectionClientProps {
  round: Round
  season: Season
  team: Team
  players: Player[]
  initialSelections: Selection[]
}

export default function BulkRoundSelectionClient({
  round,
  season,
  team,
  players,
  initialSelections
}: BulkRoundSelectionClientProps) {
  const router = useRouter()
  const [selections, setSelections] = useState<string[]>(
    initialSelections
      .sort((a, b) => a.priority - b.priority)
      .map(s => s.playerId)
  )
  const [submitted, setSubmitted] = useState(initialSelections.some(s => s.submitted))
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useSta(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [timeRemaining, setTimeRemaining] = useState('')

  // Calculate time remaining
  useEffect(() => {
    if (round.status !== 'active' || !round.endTime) return

    const updateTimer = () => {
      const now = new Date()
      const end = new Date(round.endTime!)
      const diff = end.getTime() - now.getTime()

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s`)
        } else {
          setTimeRemaining(`${seconds}s`)
        }
      } else {
        setTimeRemaining('Expired')
        router.refresh()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [round.status, round.endTime, router])

  const handleToggleSelection = (playerId: string) => {
    setSelections(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId)
      } else {
        if (round.maxBidsPerTeam && prev.length >= round.maxBidsPerTeam) {
          alert(`Maximum ${round.maxBidsPerTeam} selections allowed`)
          return prev
        }
        return [...prev, playerId]
      }
    })
  }

  const handleReorder = (playerId: string, direction: 'up' | 'down') => {
    const index = selections.indexOf(playerId)
    if (index === -1) return

    const newSelections = [...selections]
    if (direction === 'up' && index > 0) {
      [newSelections[index], newSelections[index - 1]] = [newSelection