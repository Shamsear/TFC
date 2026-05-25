'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface Round {
  id: string
  roundNumber: number
  roundType: string
  position: string | null
  position_group: string | null
  status: string
  durationSeconds: number
  startTime: Date | null
  endTime: Date | null
  maxBidsPerTeam: number | null
  basePrice: number | null
  finalizationMode: string
  season: {
    id: string
    name: string
    seasonNumber: number
  }
  teamRoundBids: any[]
  bulkRoundSelections?: any[]
  tiebreakers: any[]
  _count: {
    teamRoundBids: number
    tiebreakers: number
    bulkRoundSelections?: number
  }
}

interface Team {
  id: string
  name: string
  logoUrl: string | null
}

interface AuctionResult {
  id: string
  soldPrice: number
  acquisitionType?: string | null
  acquisitionNotes?: string | null
  basePlayer: {
    id: string
    name: string
    photoUrl: string
    seasonalPlayerStats: Array<{
      position: string
      overallRating: number
      nationality: string | null
    }>
  }
  team: {
    id: string
    name: string
    logoUrl: string | null
  }
}

interface BulkConflict {
  tiebreakerId: number
  basePlayerId: string
  playerName: string
  photoUrl: string
  position: string
  overallRating: number
  basePrice: number
  status: string
  teams: Array<{
    id: string
    name: string
    logoUrl: string
    participantStatus: string
  }>
  createdAt: Date
}

interface TeamBidDetails {
  teamId: string
  teamName: string
  teamLogo: string | null
  submitted: boolean
  bidCount: number
  totalSpent: number
  bids: Array<{
    playerId: string
    playerName: string
    photoUrl: string
    amount: number
    position: string
    overallRating: number
    won: boolean
    acquisitionType: string | null
    acquisitionNotes: string | null
  }>
}

interface RoundDetailClientProps {
  round: Round
  teams: Team[]
  auctionResults: AuctionResult[] | null
  previewAllocations?: any[] // Preview allocations from finalization state
  bulkConflicts?: BulkConflict[] | null
  teamBidsWithDetails?: TeamBidDetails[]
  bulkSelectionsWithDetails?: any[]
  teamSquadSizes?: Record<string, number> // Map of teamId to current squad size
}

export default function RoundDetailClient({ round, teams, auctionResults, previewAllocations, bulkConflicts, teamBidsWithDetails, bulkSelectionsWithDetails, teamSquadSizes }: RoundDetailClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [extendHours, setExtendHours] = useState(0)
  const [extendMinutes, setExtendMinutes] = useState(30)
  const [extending, setExtending] = useState(false)
  const [showReduceModal, setShowReduceModal] = useState(false)
  const [reduceHours, setReduceHours] = useState(0)
  const [reduceMinutes, setReduceMinutes] = useState(30)
  const [reducing, setReducing] = useState(false)
  const [previewResults, setPreviewResults] = useState<any>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [isPolling, setIsPolling] = useState(true)
  const [localEndTime, setLocalEndTime] = useState<string | null>(round.endTime ? new Date(round.endTime).toISOString() : null)
  const [localStatus, setLocalStatus] = useState<string>(round.status)
  const [showEditSettings, setShowEditSettings] = useState(false)
  const [editingSettings, setEditingSettings] = useState(false)
  const [editForm, setEditForm] = useState({
    maxBidsPerTeam: round.maxBidsPerTeam || 0,
    basePrice: round.basePrice || 0,
    finalizationMode: round.finalizationMode
  })
  const [autoFinalizationTriggered, setAutoFinalizationTriggered] = useState(false)
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [liveTiebreakers, setLiveTiebreakers] = useState<any[]>(round.tiebreakers || [])
  const [liveTeamBids, setLiveTeamBids] = useState<any[]>(round.teamRoundBids || [])
  const [liveBulkSelections, setLiveBulkSelections] = useState<any[]>(round.bulkRoundSelections || [])
  const [showSubmitBidModal, setShowSubmitBidModal] = useState(false)
  const [selectedTiebreaker, setSelectedTiebreaker] = useState<any>(null)
  const [selectedTeamForBid, setSelectedTeamForBid] = useState<any>(null)
  const [adminBidAmount, setAdminBidAmount] = useState(0)
  const [submittingAdminBid, setSubmittingAdminBid] = useState(false)
  const [spinningTiebreaker, setSpinningTiebreaker] = useState<string | null>(null)
  const [showSpinModal, setShowSpinModal] = useState(false)
  const [spinResult, setSpinResult] = useState<any>(null)
  const [showLogModal, setShowLogModal] = useState(false)
  const [finalizationLogs, setFinalizationLogs] = useState<string[]>([])
  const [isStreamingLogs, setIsStreamingLogs] = useState(false)
  const [previousStatus, setPreviousStatus] = useState<string>(round.status)
  const [finalizationInProgress, setFinalizationInProgress] = useState(false)

  const submittedTeamsList = teams.filter(t => {
    if (round.roundType === 'bulk') {
      const selection = liveBulkSelections?.find((b: any) => b.teamId === t.id)
      return selection?.submitted === true
    }
    const bid = liveTeamBids?.find((b: any) => b.teamId === t.id)
    return bid?.submitted === true
  })

  const inProgressTeamsList = teams.map(t => {
    if (round.roundType === 'bulk') {
      const selection = liveBulkSelections?.find((b: any) => b.teamId === t.id)
      let count = 0
      if (selection?.selectedPlayers) {
        try {
          const parsed = JSON.parse(selection.selectedPlayers)
          count = parsed.players?.length || 0
        } catch (e) {}
      }
      return { team: t, bid: selection, bidCount: count }
    }
    const bid = liveTeamBids?.find((b: any) => b.teamId === t.id)
    return { team: t, bid, bidCount: bid?.bidCount || 0 }
  }).filter(item => item.bid && !item.bid.submitted)

  const notStartedTeamsList = teams.filter(t => {
    if (round.roundType === 'bulk') {
      const selection = liveBulkSelections?.find((b: any) => b.teamId === t.id)
      return !selection
    }
    const bid = liveTeamBids?.find((b: any) => b.teamId === t.id)
    return !bid
  })

  const handleCopyWhatsApp = () => {
    let text = `*TFC Round ${round.roundNumber} - Submission Status*\n\n`
    
    if (round.roundType === 'bulk') {
      // Bulk round format with slot information
      // Sort submitted teams alphabetically
      const sortedSubmitted = [...submittedTeamsList].sort((a, b) => a.name.localeCompare(b.name))
      // Sort non-submitted teams alphabetically
      const sortedInProgress = [...inProgressTeamsList].sort((a, b) => a.team.name.localeCompare(b.team.name))
      const sortedNotStarted = [...notStartedTeamsList].sort((a, b) => a.name.localeCompare(b.name))
      
      text += `*Submitted (${sortedSubmitted.length}):*\n`
      if (sortedSubmitted.length > 0) {
        sortedSubmitted.forEach(t => {
          const selection = liveBulkSelections?.find((s: any) => s.teamId === t.id)
          let selectedCount = 0
          if (selection?.selectedPlayers) {
            try {
              const parsed = JSON.parse(selection.selectedPlayers)
              selectedCount = parsed.players?.length || 0
            } catch (e) {}
          }
          const currentSquadSize = teamSquadSizes?.[t.id] || 0
          const maxSquadSize = 25
          const remainingSlots = Math.max(0, maxSquadSize - currentSquadSize)
          text += `- ${t.name}: ${selectedCount}/${remainingSlots}\n`
        })
      } else {
        text += '- None\n'
      }
      
      text += `\n*Not Submitted (${sortedInProgress.length + sortedNotStarted.length}):*\n`
      if (sortedInProgress.length > 0 || sortedNotStarted.length > 0) {
        sortedInProgress.forEach(item => {
          const currentSquadSize = teamSquadSizes?.[item.team.id] || 0
          const maxSquadSize = 25
          const remainingSlots = Math.max(0, maxSquadSize - currentSquadSize)
          text += `- ${item.team.name}: ${item.bidCount}/${remainingSlots}\n`
        })
        sortedNotStarted.forEach(t => {
          const currentSquadSize = teamSquadSizes?.[t.id] || 0
          const maxSquadSize = 25
          const remainingSlots = Math.max(0, maxSquadSize - currentSquadSize)
          text += `- ${t.name}: 0/${remainingSlots}\n`
        })
      } else {
        text += '- None'
      }
    } else {
      // Normal round format - also sort alphabetically
      const sortedSubmitted = [...submittedTeamsList].sort((a, b) => a.name.localeCompare(b.name))
      const sortedInProgress = [...inProgressTeamsList].sort((a, b) => a.team.name.localeCompare(b.team.name))
      const sortedNotStarted = [...notStartedTeamsList].sort((a, b) => a.name.localeCompare(b.name))
      
      text += `*Submitted (${sortedSubmitted.length}):*\n`
      text += `${sortedSubmitted.length > 0 ? sortedSubmitted.map(t => `- ${t.name}`).join('\n') : '- None'}\n\n`
      text += `*Not Submitted (${sortedInProgress.length + sortedNotStarted.length}):*\n`
      if (sortedInProgress.length > 0 || sortedNotStarted.length > 0) {
        const combined = [
          ...sortedInProgress.map(item => `- ${item.team.name} (${item.bidCount} bids)`),
          ...sortedNotStarted.map(t => `- ${t.name}`)
        ]
        text += combined.join('\n')
      } else {
        text += '- None'
      }
    }
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(err => {
      console.error('Failed to copy text: ', err)
    })
  }

  // Set mounted state on client side only to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Auto-open log modal when status changes from active
  useEffect(() => {
    // Check if status changed from 'active' to something else
    if (previousStatus === 'active' && localStatus !== 'active' && localStatus !== previousStatus) {
      console.log(`Status changed from ${previousStatus} to ${localStatus} - opening log modal`)
      setShowLogModal(true)
      setFinalizationLogs([`Round status changed from ${previousStatus.toUpperCase()} to ${localStatus.toUpperCase()}`])
      
      // Fetch finalization logs if available
      fetch(`/api/admin/rounds/${round.id}/logs`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.logs && data.logs.length > 0) {
            setFinalizationLogs(data.logs)
          }
        })
        .catch(err => {
          console.error('Failed to fetch logs:', err)
        })
    }
    
    // Update previous status
    if (localStatus !== previousStatus) {
      setPreviousStatus(localStatus)
    }
  }, [localStatus, previousStatus, round.id])

  // Live polling - refresh data every 3 seconds for active/pending rounds
  useEffect(() => {
    // Don't poll if finalization is in progress to avoid conflicts
    if (finalizationInProgress) {
      return
    }

    // Only poll for rounds that are active or have pending actions, OR if there's a mismatch between client and server status
    const shouldPoll = isPolling && (
      localStatus === 'active' || 
      localStatus === 'pending_finalization' ||
      localStatus === 'tiebreaker_pending' ||
      localStatus === 'finalizing' ||
      round.status !== localStatus
    )

    if (!shouldPoll) return

    const fetchLiveData = async () => {
      try {
        const response = await fetch(`/api/admin/rounds/${round.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.round) {
            setLocalEndTime(data.round.endTime ? new Date(data.round.endTime).toISOString() : null)
            
            // Update tiebreakers live so the section reflects latest submission statuses
            if (data.round.tiebreakers) {
              setLiveTiebreakers(prev => {
                // Merge: keep SSR-only fields (seasonalPlayerStats) but update submitted status
                return data.round.tiebreakers.map((fresh: any) => {
                  const existing = prev.find((t: any) => t.id === fresh.id)
                  return existing
                    ? { ...existing, ...fresh, teamTiebreakerBids: fresh.teamTiebreakerBids ?? existing.teamTiebreakerBids }
                    : fresh
                })
              })
            }
            
            if (data.round.teamRoundBids) {
              setLiveTeamBids(data.round.teamRoundBids)
            }
            if (data.round.bulkRoundSelections) {
              setLiveBulkSelections(data.round.bulkRoundSelections)
            }
            
            // If the status changed drastically, force a full page reload to fetch new completed results/tiebreakers
            if (data.round.status !== localStatus) {
              // Don't reload when transitioning TO tiebreaker_pending (let polling handle updates)
              // But DO reload when transitioning FROM tiebreaker_pending to completed/finalized
              if (data.round.status === 'tiebreaker_pending') {
                // Just update local status, don't reload
                setLocalStatus(data.round.status)
                return
              }
              
              if (['completed', 'finalizing', 'preview_finalized'].includes(data.round.status)) {
                window.location.reload()
                return
              }
            }
            
            setLocalStatus(data.round.status)
          }
        }
      } catch (error) {
        console.error('Failed to fetch live round data:', error)
      }
      // Don't call router.refresh() during polling - it causes full page reloads
      // The state updates above are sufficient for live updates
    }

    // Poll every 3 seconds for real-time updates
    const interval = setInterval(fetchLiveData, 3000)
    return () => clearInterval(interval)
  }, [isPolling, localStatus, round.id, round.status, finalizationInProgress])

  // Calculate time remaining for active rounds
  useEffect(() => {
    if (localStatus === 'active' && localEndTime) {
      const calculateTimeRemaining = () => {
        const now = Date.now()
        const end = new Date(localEndTime).getTime()
        const remaining = Math.max(0, end - now)
        setTimeRemaining(remaining)
        
        // Auto-trigger finalization when timer expires (only once)
        if (remaining === 0 && !autoFinalizationTriggered && !finalizationInProgress) {
          setAutoFinalizationTriggered(true)
          setFinalizationInProgress(true)
          
          // Trigger finalization based on mode
          if (round.finalizationMode === 'auto') {
            // Auto mode: trigger finalization with streaming logs
            console.log('Timer expired - triggering auto finalization with logs')
            
            // Open log modal
            setShowLogModal(true)
            setFinalizationLogs(['⏰ Timer expired - Starting auto-finalization...'])
            setIsStreamingLogs(true)
            
            // Call finalization API with streaming
            fetch(`/api/admin/rounds/${round.id}/finalize-stream`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ force: true })
            }).then(async response => {
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                setFinalizationLogs(prev => [...prev, `❌ Error: ${errorData.error || 'Unknown error'}`])
                setIsStreamingLogs(false)
                setFinalizationInProgress(false)
                return
              }

              // Read the SSE stream
              const reader = response.body?.getReader()
              const decoder = new TextDecoder()

              if (reader) {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break

                  const chunk = decoder.decode(value)
                  const lines = chunk.split('\n')

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      try {
                        const data = JSON.parse(line.slice(6))
                        
                        if (data.type === 'log') {
                          setFinalizationLogs(prev => [...prev, `[${data.level.toUpperCase()}] ${data.message}`])
                        } else if (data.type === 'complete') {
                          setIsStreamingLogs(false)
                          if (data.success) {
                            setFinalizationLogs(prev => [...prev, '\n✅ Auto-finalization completed successfully!'])
                            setTimeout(() => {
                              window.location.reload()
                            }, 3000)
                          } else {
                            setFinalizationLogs(prev => [...prev, `\n❌ Auto-finalization failed: ${data.error}`])
                            setFinalizationInProgress(false)
                          }
                        }
                      } catch (e) {
                        console.error('Failed to parse SSE data:', e)
                      }
                    }
                  }
                }
              }
            }).catch(error => {
              console.error('Auto-finalization error:', error)
              setFinalizationLogs(prev => [...prev, `\n❌ Error: ${error.message}`])
              setIsStreamingLogs(false)
              setFinalizationInProgress(false)
              setTimeout(() => router.refresh(), 2000)
            })
          } else {
            // Manual mode: just refresh to update status to expired_pending_finalization
            console.log('Timer expired - refreshing for manual finalization')
            setFinalizationInProgress(false)
            router.refresh()
          }
        }
      }

      // Calculate immediately
      calculateTimeRemaining()

      // Update every second
      const interval = setInterval(calculateTimeRemaining, 1000)

      return () => clearInterval(interval)
    }
  }, [localStatus, localEndTime, round.finalizationMode, round.id, autoFinalizationTriggered, finalizationInProgress, router])

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const handleStartRound = async () => {
    if (!confirm('Are you sure you want to start this round? Teams will be able to place bids.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/start`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start round')
      }

      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFinalizeRound = async () => {
    if (!confirm('Are you sure you want to finalize this round? This will process all bids and cannot be undone.')) {
      return
    }

    if (finalizationInProgress) {
      alert('Finalization is already in progress. Please wait...')
      return
    }

    setLoading(true)
    setError('')
    setShowLogModal(true)
    setFinalizationLogs([])
    setIsStreamingLogs(true)
    setFinalizationInProgress(true)

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/finalize-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to finalize round')
      }

      // Read the SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'log') {
                  setFinalizationLogs(prev => [...prev, `[${data.level.toUpperCase()}] ${data.message}`])
                } else if (data.type === 'complete') {
                  setIsStreamingLogs(false)
                  if (data.success) {
                    setFinalizationLogs(prev => [...prev, '\n✅ Finalization completed successfully!'])
                    setTimeout(() => {
                      window.location.reload()
                    }, 2000)
                  } else {
                    setFinalizationLogs(prev => [...prev, `\n❌ Finalization failed: ${data.error}`])
                    setError(data.error)
                    setFinalizationInProgress(false)
                  }
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e)
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message)
      setFinalizationLogs(prev => [...prev, `\n❌ Error: ${err.message}`])
      setIsStreamingLogs(false)
      setFinalizationInProgress(false)
    } finally {
      setLoading(false)
    }
  }

  const handleStopRound = async () => {
    if (!confirm('Are you sure you want to stop this round early? This will end the round immediately and allow finalization.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force: true })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to stop round')
      }

      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewResults = async () => {
    if (!confirm('Start preview finalization? This will create real tiebreakers that teams must resolve, but results will stay hidden until you make them public.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preview: true, force: true })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start preview finalization')
      }

      const data = await response.json()
      
      if (data.tieDetected) {
        alert(`Tiebreakers created! Teams must submit bids before you can see final results.\n\nTiebreakers: ${data.tiebreakers?.length || 0}`)
      }

      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFinalizeFromPreview = async () => {
    if (!confirm('Apply results and make them public? This will finalize the round and teams will see the allocations.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to finalize round')
      }

      setShowPreviewModal(false)
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMakePublic = async () => {
    if (!confirm('Make results public? Teams will be able to see the final allocations.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/make-public`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to make results public')
      }

      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportToExcel = async () => {
    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/export`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to export results')
      }

      // Get the blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Round_${round.roundNumber}_Results.xlsx`
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleExtendTime = async () => {
    if (extendHours === 0 && extendMinutes === 0) {
      setError('Please add at least 1 minute')
      return
    }

    setExtending(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hours: extendHours,
          minutes: extendMinutes
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to extend round time')
      }

      setShowExtendModal(false)
      setExtendHours(0)
      setExtendMinutes(30)
      
      // Update local state immediately
      const getRes = await fetch(`/api/admin/rounds/${round.id}`)
      if (getRes.ok) {
        const data = await getRes.json()
        if (data.success && data.round) {
          setLocalEndTime(data.round.endTime ? new Date(data.round.endTime).toISOString() : null)
          setLocalStatus(data.round.status)
        }
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExtending(false)
    }
  }

  const handleReduceTime = async () => {
    if (reduceHours === 0 && reduceMinutes === 0) {
      setError('Please reduce at least 1 minute')
      return
    }

    // Calculate total minutes to reduce
    const totalMinutesToReduce = (reduceHours * 60) + reduceMinutes

    // Check if we have enough time remaining
    if (timeRemaining !== null) {
      const remainingMinutes = Math.floor(timeRemaining / 60000)
      if (totalMinutesToReduce >= remainingMinutes) {
        setError(`Cannot reduce by ${totalMinutesToReduce} minutes. Only ${remainingMinutes} minutes remaining.`)
        return
      }
    }

    setReducing(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/rounds/${round.id}/reduce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hours: reduceHours,
          minutes: reduceMinutes
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reduce round time')
      }

      setShowReduceModal(false)
      setReduceHours(0)
      setReduceMinutes(30)
      
      // Update local state immediately
      const getRes = await fetch(`/api/admin/rounds/${round.id}`)
      if (getRes.ok) {
        const data = await getRes.json()
        if (data.success && data.round) {
          setLocalEndTime(data.round.endTime ? new Date(data.round.endTime).toISOString() : null)
          setLocalStatus(data.round.status)
        }
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setReducing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
      case 'active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
      case 'completed': return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
    }
  }

  const submittedBids = round.roundType === 'bulk'
    ? (liveBulkSelections?.filter((bid: any) => bid.submitted).length || 0)
    : (liveTeamBids?.filter((bid: any) => bid.submitted).length || 0)
  const totalTeams = teams.length

  // Format duration in hours and minutes
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  }

  // Format date and time
  const formatDateTime = (date: Date | null) => {
    if (!date) return 'Not started'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatAcquisitionType = (type: string) => {
    switch (type) {
      case 'bid_won':
        return 'Bid Won'
      case 'auto_assigned':
        return 'Auto Assigned'
      case 'tiebreaker_won':
        return 'Tiebreaker Won'
      default:
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }
  }

  const handleAdminSubmitBid = async () => {
    if (!selectedTiebreaker || !selectedTeamForBid) return

    if (!confirm(`Submit bid of £${adminBidAmount.toLocaleString()} for ${selectedTeamForBid.name}? This cannot be changed.`)) {
      return
    }

    setSubmittingAdminBid(true)
    setError('')

    try {
      if (adminBidAmount <= selectedTiebreaker.originalAmount) {
        throw new Error(`Bid must be higher than £${selectedTiebreaker.originalAmount.toLocaleString()}`)
      }

      const response = await fetch(`/api/admin/tiebreakers/${selectedTiebreaker.id}/submit-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId: selectedTeamForBid.id,
          newBidAmount: adminBidAmount 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit bid')
      }

      const data = await response.json()
      
      setShowSubmitBidModal(false)
      setSelectedTiebreaker(null)
      setSelectedTeamForBid(null)
      setAdminBidAmount(0)
      
      // Refresh the page to show updated status
      window.location.reload()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSubmittingAdminBid(false)
    }
  }

  const openSubmitBidModal = (tiebreaker: any, teamBid: any, team: any) => {
    setSelectedTiebreaker(tiebreaker)
    setSelectedTeamForBid(team)
    setAdminBidAmount(tiebreaker.originalAmount + 1)
    setShowSubmitBidModal(true)
  }

  const handleSpinResolve = async (tiebreaker: any) => {
    if (!confirm(`Spin and resolve this tiebreaker randomly?\n\n• Winner will pay £${tiebreaker.originalAmount + 2}\n• Loser(s) will pay £${tiebreaker.originalAmount + 1}\n\nThis action cannot be undone!`)) {
      return
    }

    setSpinningTiebreaker(tiebreaker.id)
    setError('')

    try {
      const response = await fetch(`/api/admin/tiebreakers/${tiebreaker.id}/spin-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to spin and resolve')
      }

      const data = await response.json()
      
      // Show result modal
      setSpinResult(data)
      setShowSpinModal(true)
      
      // Refresh after a delay to show the result
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } catch (error: any) {
      setError(error.message)
      setSpinningTiebreaker(null)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href={`/sub-admin/${round.season.id}/auction`}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Rounds
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Round {round.roundNumber}
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-sm sm:text-base">
              {round.season.name} • {round.position || 'All Positions'}{round.position_group && round.position_group.toLowerCase() !== 'all' ? ` (${round.position_group.toUpperCase()})` : ''} • {round.roundType === 'normal' ? 'Normal Round' : 'Bulk Round'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            {isPolling && (round.status === 'active' || round.status === 'pending_finalization' || round.status === 'tiebreaker_pending' || round.status === 'finalizing') && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-medium text-emerald-300">Live</span>
              </div>
            )}
            <button
              onClick={() => setIsPolling(!isPolling)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-medium text-[#D4CCBB]"
              title={isPolling ? 'Pause live updates' : 'Resume live updates'}
            >
              {isPolling ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
            <div className={`px-4 py-2 rounded-lg border font-bold text-sm ${getStatusColor(round.status)}`}>
              {round.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Live Timer for Active Rounds */}
        {round.status === 'active' && timeRemaining !== null && (
          <div className="mt-4 rounded-xl bg-gradient-to-r from-[#E8A800]/20 to-[#FFB347]/20 border-2 border-[#E8A800]/50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E8A800] flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-[#D4CCBB] mb-1">Time Remaining</div>
                  <div className={`text-2xl sm:text-3xl font-black ${timeRemaining < 3600000 ? 'text-red-400' : 'text-[#FFB347]'}`}>
                    {isMounted ? formatTimeRemaining(timeRemaining) : '--:--:--'}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t border-[#E8A800]/20 pt-3 sm:border-t-0 sm:pt-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowExtendModal(true)}
                    className="px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 font-bold text-sm transition-all"
                  >
                    + Add Time
                  </button>
                  <button
                    onClick={() => setShowReduceModal(true)}
                    className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 font-bold text-sm transition-all"
                  >
                    − Reduce Time
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#D4CCBB] mb-1">Ends At</div>
                  <div className="text-sm font-bold text-white">
                    {formatDateTime(localEndTime ? new Date(localEndTime) : null)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <div className="text-sm text-gray-400 mb-2">Submissions Status</div>
          <div className="text-3xl font-black text-white mb-2">{submittedTeamsList.length}/{totalTeams}</div>
          <div className="flex flex-col gap-1.5 text-xs">
            <span className="text-emerald-400 font-bold">✓ {submittedTeamsList.length} Submitted</span>
            <span className="text-yellow-400 font-bold">⏳ {inProgressTeamsList.length} In Progress</span>
            <span className="text-gray-400 font-bold">💤 {notStartedTeamsList.length} Not Started</span>
          </div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <div className="text-sm text-gray-400 mb-2">Tiebreakers</div>
          <div className="text-3xl font-black text-[#FFB347]">{round._count.tiebreakers}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <div className="text-sm text-gray-400 mb-2">Duration</div>
          <div className="text-3xl font-black text-[#E8A800]">{formatDuration(round.durationSeconds)}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <div className="text-sm text-gray-400 mb-2">Base Price</div>
          <div className="text-3xl font-black text-emerald-400">
            ${(round.basePrice || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          </div>
        </div>
      </div>

      {/* Edit Round Settings */}
      {(round.status === 'draft' || round.status === 'active') && (
        <div className="mb-8">
          <button
            onClick={() => setShowEditSettings(!showEditSettings)}
            className="w-full flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-white">Edit Round Settings</h3>
                <p className="text-xs text-[#D4CCBB]">
                  Modify bids limit, base price, and finalization mode
                </p>
              </div>
            </div>
            <svg 
              className={`w-5 h-5 text-[#D4CCBB] transition-transform ${showEditSettings ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showEditSettings && (
            <div className="mt-4 rounded-lg bg-white/5 border border-white/10 p-6">
              <form onSubmit={async (e) => {
                e.preventDefault()
                
                if (!confirm('Are you sure you want to update these settings?')) {
                  return
                }

                setEditingSettings(true)
                setError('')

                try {
                  const response = await fetch(`/api/admin/rounds/${round.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editForm)
                  })

                  if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.error || 'Failed to update settings')
                  }

                  setShowEditSettings(false)
                  router.refresh()
                } catch (err: any) {
                  setError(err.message)
                } finally {
                  setEditingSettings(false)
                }
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                      Max Bids Per Team
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.maxBidsPerTeam}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        maxBidsPerTeam: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E8A800]"
                      placeholder="0 = unlimited"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      0 = unlimited bids
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                      Base Price (£)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.basePrice}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        basePrice: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E8A800]"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <SearchableSelect
                      label="Finalization Mode"
                      value={editForm.finalizationMode}
                      options={[
                        { value: 'auto', label: 'Auto (Immediate)' },
                        { value: 'manual', label: 'Manual (Preview First)' }
                      ]}
                      onChange={(value) => setEditForm(prev => ({
                        ...prev,
                        finalizationMode: value
                      }))}
                      enableSearch={false}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {editForm.finalizationMode === 'auto' 
                        ? 'Results finalize automatically when timer ends'
                        : 'Preview results before making them public'}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditSettings(false)
                      setEditForm({
                        maxBidsPerTeam: round.maxBidsPerTeam || 0,
                        basePrice: round.basePrice || 0,
                        finalizationMode: round.finalizationMode
                      })
                    }}
                    disabled={editingSettings}
                    className="flex-1 px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editingSettings}
                    className="flex-1 px-6 py-3 rounded-lg bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-bold transition-all disabled:opacity-50"
                  >
                    {editingSettings ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Finalization Mode Info */}
      {round.finalizationMode === 'manual' && ['draft', 'active'].includes(round.status) && (
        <div className="rounded-xl bg-blue-500/10 border-2 border-blue-500/30 p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-blue-300">Manual Preview Mode</h3>
              <p className="text-sm text-blue-200">
                When the timer ends, you'll be able to preview results before making them public
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline - Show when round is active or completed */}
      {(round.status === 'active' || round.status === 'completed') && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-8">
          <h2 className="text-xl font-black text-white mb-4">Round Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-2">Start Time</div>
              <div className="text-lg font-bold text-emerald-400">{formatDateTime(round.startTime)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-2">End Time</div>
              <div className="text-lg font-bold text-[#FFB347]">{formatDateTime(localEndTime ? new Date(localEndTime) : null)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-8">
        <h2 className="text-xl font-black text-white mb-4">Round Actions</h2>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
          {/* View Team Bids - Available for all statuses */}
          <Link
            href={`/sub-admin/${round.season.id}/auction/rounds/${round.id}/bids`}
            className="w-full sm:w-auto text-center justify-center px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-[#E8A800]/50 text-white font-bold transition-all"
          >
            👁️ View Team Bids
          </Link>
          
          {round.status === 'draft' && (
            <button
              onClick={handleStartRound}
              disabled={loading}
              className="w-full sm:w-auto text-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Round'}
            </button>
          )}
          {round.status === 'active' && (
            <>
              <button
                onClick={handlePreviewResults}
                disabled={loading}
                className="w-full sm:w-auto text-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Start Preview Finalization'}
              </button>
              <button
                onClick={handleStopRound}
                disabled={loading}
                className="w-full sm:w-auto text-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Stopping...' : 'Stop & Finalize Now'}
              </button>
            </>
          )}
          {(round.status === 'expired_pending_finalization' || round.status === 'pending_finalization') && (
            <>
              {round.finalizationMode === 'manual' ? (
                <button
                  onClick={handlePreviewResults}
                  disabled={loading}
                  className="w-full sm:w-auto text-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold transition-all disabled:opacity-50"
                >
                  {loading ? 'Starting...' : 'Preview Results'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleFinalizeRound}
                    disabled={loading}
                    className="w-full sm:w-auto text-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-bold transition-all disabled:opacity-50"
                  >
                    {loading ? 'Finalizing...' : 'Finalize Round'}
                  </button>
                  {finalizationLogs.length > 0 && (
                    <button
                      onClick={() => setShowLogModal(true)}
                      className="w-full sm:w-auto text-center justify-center px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-blue-500/50 text-white font-bold transition-all"
                    >
                      📋 View Logs
                    </button>
                  )}
                </>
              )}
            </>
          )}
          {round.status === 'tiebreaker_pending' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
              <div className="text-purple-400 font-bold text-sm sm:text-base">
                ⏳ Waiting for tiebreaker resolution...
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Force re-finalize? Use this only if all tiebreaker bids are submitted but the round is stuck.')) return
                  setLoading(true)
                  try {
                    const res = await fetch(`/api/admin/rounds/${round.id}/finalize`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ force: true })
                    })
                    const data = await res.json()
                    if (data.success) {
                      setLocalStatus(data.tieDetected ? 'tiebreaker_pending' : (data.previewMode ? 'preview_finalized' : 'completed'))
                      alert(data.message || 'Re-finalization triggered successfully.')
                    } else {
                      alert(`Error: ${data.error}`)
                    }
                  } catch (e) {
                    alert('Failed to contact server.')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="w-full sm:w-auto text-center justify-center px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 transition-all text-sm font-bold disabled:opacity-50"
              >
                {loading ? 'Processing...' : '🔄 Force Re-finalize'}
              </button>
            </div>
          )}
          {round.status === 'finalizing' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
              <div className="text-blue-400 font-bold text-sm sm:text-base">
                ⏳ Finalization in progress...
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Force finalize? Use this only if the finalization process is stuck.')) return
                  setLoading(true)
                  try {
                    const res = await fetch(`/api/admin/rounds/${round.id}/finalize`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ force: true })
                    })
                    const data = await res.json()
                    if (data.success) {
                      setLocalStatus(data.tieDetected ? 'tiebreaker_pending' : (data.previewMode ? 'preview_finalized' : 'completed'))
                      alert(data.message || 'Finalization triggered successfully.')
                      window.location.reload()
                    } else {
                      alert(`Error: ${data.error}`)
                    }
                  } catch (e) {
                    alert('Failed to contact server.')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="w-full sm:w-auto text-center justify-center px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 transition-all text-sm font-bold disabled:opacity-50"
              >
                {loading ? 'Processing...' : '🔄 Force Finalize'}
              </button>
            </div>
          )}
          {round.status === 'preview_finalized' && (
            <>
              <div className="w-full sm:flex-1 text-blue-400 font-bold text-center sm:text-left text-sm sm:text-base">
                👁️ Preview Mode - Results hidden from teams
              </div>
              <button
                onClick={handleExportToExcel}
                className="w-full sm:w-auto text-center justify-center px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-emerald-500/50 text-white font-bold transition-all"
              >
                📊 Export to Excel
              </button>
              <button
                onClick={handleMakePublic}
                disabled={loading}
                className="w-full sm:w-auto text-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Publishing...' : 'Make Results Public'}
              </button>
            </>
          )}
          {round.status === 'completed' && (
            <>
              <div className="w-full sm:flex-1 text-emerald-400 font-bold text-center sm:text-left text-sm sm:text-base">
                ✓ Round completed
              </div>
              <button
                onClick={handleExportToExcel}
                className="w-full sm:w-auto text-center justify-center px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-emerald-500/50 text-white font-bold transition-all"
              >
                📊 Export to Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Tiebreakers - Show when tiebreaker_pending */}
      {localStatus === 'tiebreaker_pending' && liveTiebreakers && liveTiebreakers.length > 0 && (
        <div className="rounded-xl bg-purple-500/10 border-2 border-purple-500/30 p-4 sm:p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-purple-300">Active Tiebreakers</h2>
              <p className="text-sm text-purple-200">Teams must submit new bids to resolve ties</p>
            </div>
          </div>
          <div className="space-y-4">
            {liveTiebreakers
              .filter((tb: any) => tb.status === 'active')
              .map((tiebreaker: any) => {
                const player = tiebreaker.basePlayer
                const playerStats = player?.seasonalPlayerStats?.[0]
                const submittedBids = tiebreaker.teamTiebreakerBids?.filter((bid: any) => bid.submitted).length || 0
                const totalBids = tiebreaker.teamTiebreakerBids?.length || 0
                
                return (
                  <div key={tiebreaker.id} className="rounded-lg bg-black/30 border border-purple-500/20 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                          {player?.photoUrl ? (
                            <img
                              src={player.photoUrl}
                              alt={player?.name || ''}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.removeAttribute('hidden')
                              }}
                            />
                          ) : null}
                          <svg {...{ hidden: true }} className="w-full h-full p-2 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-black text-white text-lg truncate">{player?.name || 'Unknown Player'}</span>
                            {playerStats && (
                              <div className="flex gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 flex-shrink-0">
                                  {playerStats.position}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold flex-shrink-0">
                                  OVR {playerStats.overallRating}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            Original bid: £{tiebreaker.originalAmount.toLocaleString()} • {tiebreaker.tiedTeamsCount} teams tied
                          </div>
                        </div>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto flex flex-col gap-2">
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                          submittedBids === totalBids 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {submittedBids}/{totalBids} Submitted
                        </div>
                        <button
                          onClick={() => handleSpinResolve(tiebreaker)}
                          disabled={spinningTiebreaker === tiebreaker.id}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {spinningTiebreaker === tiebreaker.id ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Spinning...
                            </>
                          ) : (
                            <>
                              🎰 Spin & Resolve
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Team bid status */}
                    <div className="space-y-2 mt-3 pt-3 border-t border-purple-500/20">
                      <div className="text-xs text-gray-400 mb-2">Team Bid Status:</div>
                      {tiebreaker.teamTiebreakerBids?.map((bid: any) => {
                        const team = teams.find(t => t.id === bid.teamId)
                        return (
                          <div key={bid.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-2 rounded bg-black/20 gap-2">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              {team?.logoUrl && (
                                <img src={team.logoUrl} alt={team.name} className="w-6 h-6 rounded" />
                              )}
                              <span className="text-sm font-bold text-white truncate">{team?.name || bid.teamId}</span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                              <span className="text-xs text-gray-400">
                                Old: £{bid.oldBidAmount.toLocaleString()}
                              </span>
                              {bid.submitted ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex-shrink-0">
                                  ✓ Submitted
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs font-bold border border-gray-500/30 flex-shrink-0">
                                    Pending
                                  </span>
                                  <button
                                    onClick={() => openSubmitBidModal(tiebreaker, bid, team)}
                                    className="px-3 py-1 rounded-lg bg-[#E8A800] hover:bg-[#E8A800]/90 text-black text-xs font-bold transition-all"
                                  >
                                    Submit Bid
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Bulk Round Conflicts - Show when tiebreaker_pending for bulk rounds */}
      {round.status === 'tiebreaker_pending' && round.roundType === 'bulk' && bulkConflicts && bulkConflicts.length > 0 && (
        <div className="rounded-xl bg-orange-500/10 border-2 border-orange-500/30 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-orange-300">Bulk Tiebreakers</h2>
              <p className="text-sm text-orange-200">
                {bulkConflicts.filter(c => c.status === 'pending').length} pending • 
                {bulkConflicts.filter(c => c.status === 'active').length} active • 
                {bulkConflicts.filter(c => c.status === 'completed').length} completed
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bulkConflicts.map((conflict) => {
              const isPending = conflict.status === 'pending'
              const isActive = conflict.status === 'active'
              const isCompleted = conflict.status === 'completed'
              
              return (
                <div key={conflict.tiebreakerId} className={`rounded-lg border p-4 ${
                  isPending ? 'bg-yellow-500/5 border-yellow-500/20' :
                  isActive ? 'bg-purple-500/5 border-purple-500/20' :
                  'bg-emerald-500/5 border-emerald-500/20'
                }`}>
                  <div className="flex items-start gap-3 mb-3">
                    <img 
                      src={conflict.photoUrl} 
                      alt={conflict.playerName} 
                      className="w-16 h-16 rounded-lg object-cover bg-white/5"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-player.png'
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-black text-white text-lg mb-1">{conflict.playerName}</div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                          isPending ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                          isActive ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {conflict.status.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-xs font-bold border border-orange-500/30">
                          {conflict.position}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold">
                          OVR {conflict.overallRating}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Base Price: £{conflict.basePrice} • {conflict.teams.length} teams
                      </div>
                    </div>
                  </div>
                  
                  {/* Participating teams */}
                  <div className="space-y-2 mb-3 pt-3 border-t border-white/10">
                    <div className="text-xs text-gray-400 mb-2">Participating Teams:</div>
                    {conflict.teams.map(team => (
                      <div key={team.id} className="flex items-center gap-2 p-2 rounded bg-black/20">
                        {team.logoUrl && (
                          <img src={team.logoUrl} alt={team.name} className="w-6 h-6 rounded" />
                        )}
                        <span className="text-sm font-bold text-white flex-1">{team.name}</span>
                        {team.participantStatus !== 'active' && (
                          <span className="text-xs text-gray-400">({team.participantStatus})</span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Action buttons */}
                  {isPending && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Start tiebreaker for ${conflict.playerName}? Teams will be able to bid.`)) return
                        
                        setLoading(true)
                        setError('')
                        
                        try {
                          const response = await fetch(`/api/admin/bulk-tiebreakers/${conflict.tiebreakerId}/start`, {
                            method: 'POST'
                          })
                          
                          if (!response.ok) {
                            const error = await response.json()
                            throw new Error(error.error || 'Failed to start tiebreaker')
                          }
                          
                          router.refresh()
                        } catch (err: any) {
                          setError(err.message)
                        } finally {
                          setLoading(false)
                        }
                      }}
                      disabled={loading}
                      className="w-full px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all disabled:opacity-50"
                    >
                      {loading ? 'Starting...' : '▶ Start Tiebreaker'}
                    </button>
                  )}
                  
                  {(isActive || isCompleted) && (
                    <a
                      href={`/sub-admin/${round.season.id}/auction/bulk-tiebreakers/${conflict.tiebreakerId}`}
                      className="block w-full px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-all text-center font-medium"
                    >
                      {isActive ? '👁 Monitor Tiebreaker' : '✓ View Results'}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Preview Results - Show for preview_finalized rounds (admin only) */}
      {round.status === 'preview_finalized' && previewAllocations && previewAllocations.length > 0 && (
        <div className="rounded-xl bg-blue-500/10 border-2 border-blue-500/30 p-4 sm:p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-blue-300">Preview Results (Admin Only)</h2>
              <p className="text-sm text-blue-200">These results are NOT visible to teams yet</p>
            </div>
          </div>
          <div className="space-y-3">
            {previewAllocations.map((alloc: any, idx: number) => {
              const team = teams.find(t => t.id === alloc.teamId)
              return (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-black/30 border border-blue-500/20 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-black text-white text-lg truncate">{alloc.playerName}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30 flex-shrink-0">
                        {formatAcquisitionType(alloc.acquisitionType)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {team?.logoUrl && (
                        <img src={team.logoUrl} alt={team.name} className="w-5 h-5 rounded" />
                      )}
                      <span className="text-sm text-gray-400 truncate">{team?.name || alloc.teamId}</span>
                    </div>
                    {alloc.acquisitionNotes && (
                      <div className="text-xs text-gray-500 mt-1">{alloc.acquisitionNotes}</div>
                    )}
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <div className="text-2xl font-black text-emerald-400">
                      £{alloc.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Auction Results - Player-wise with all bids */}
      {round.status === 'completed' && auctionResults && auctionResults.length > 0 && teamBidsWithDetails && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Auction Results</h2>
              <p className="text-sm text-[#D4CCBB]">{auctionResults.length} players sold • Click to see all bids</p>
            </div>
          </div>
          <div className="space-y-3">
            {auctionResults.map((result) => {
              const playerStats = result.basePlayer.seasonalPlayerStats[0]
              const isExpanded = expandedTeams.has(`player-${result.basePlayer.id}`)
              
              // Get all bids made on this player from all teams
              const allBidsOnPlayer = teamBidsWithDetails
                .flatMap(teamBid => 
                  teamBid.bids
                    .filter(bid => bid.playerId === result.basePlayer.id)
                    .map(bid => ({
                      ...bid,
                      teamId: teamBid.teamId,
                      teamName: teamBid.teamName,
                      teamLogo: teamBid.teamLogo
                    }))
                )
                .sort((a, b) => b.amount - a.amount) // Sort by bid amount descending
              
              return (
                <div key={result.id} className="rounded-lg bg-black/30 border border-white/10 overflow-hidden">
                  {/* Player Header - Clickable to expand/collapse */}
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedTeams)
                      const key = `player-${result.basePlayer.id}`
                      if (isExpanded) {
                        newExpanded.delete(key)
                      } else {
                        newExpanded.add(key)
                      }
                      setExpandedTeams(newExpanded)
                    }}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 hover:bg-white/5 transition-colors gap-3"
                  >
                    {/* Player Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      {result.basePlayer.photoUrl && (
                        <img 
                          src={result.basePlayer.photoUrl} 
                          alt={result.basePlayer.name} 
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover bg-white/5 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-player.png'
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <span className="font-black text-white text-sm sm:text-base truncate">{result.basePlayer.name}</span>
                          {playerStats && (
                            <>
                              <span className="px-2 py-0.5 rounded bg-[#E8A800]/20 text-[#E8A800] text-xs font-bold border border-[#E8A800]/30 flex-shrink-0">
                                {playerStats.position}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold flex-shrink-0">
                                OVR {playerStats.overallRating}
                              </span>
                            </>
                          )}
                          {result.acquisitionType && (
                            <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 border ${
                              result.acquisitionType === 'auto_assigned' 
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : result.acquisitionType === 'tiebreaker_won'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}>
                              {formatAcquisitionType(result.acquisitionType)}
                            </span>
                          )}
                        </div>
                        {result.acquisitionNotes && (
                          <div className="text-xs text-gray-500 mb-1">{result.acquisitionNotes}</div>
                        )}
                        {playerStats?.nationality && (
                          <div className="text-xs text-gray-400 truncate">{playerStats.nationality}</div>
                        )}
                      </div>
                    </div>

                    {/* Team and Price - Side by side on mobile, separate on desktop */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 flex-shrink-0">
                      {/* Team Info */}
                      <div className="flex items-center gap-2 min-w-0">
                        {result.team.logoUrl && (
                          <img 
                            src={result.team.logoUrl} 
                            alt={result.team.name} 
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs text-gray-400 hidden sm:block">Sold To</div>
                          <span className="font-bold text-white text-xs sm:text-sm truncate block">{result.team.name}</span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-gray-400 hidden sm:block mb-1">Price</div>
                        <div className="text-lg sm:text-xl font-black text-emerald-400">
                          £{result.soldPrice.toLocaleString()}
                        </div>
                      </div>

                      {/* Expand/Collapse Icon */}
                      {allBidsOnPlayer.length > 0 && (
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Expanded Bids List - Show all bids made on this player */}
                  {isExpanded && allBidsOnPlayer.length > 0 && (
                    <div className="border-t border-white/10 p-4 space-y-2 bg-black/20">
                      <div className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">
                        All Bids on {result.basePlayer.name} ({allBidsOnPlayer.length})
                      </div>
                      {allBidsOnPlayer.map((bid, idx) => (
                        <div 
                          key={idx} 
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-3 ${
                            bid.won 
                              ? 'bg-emerald-500/10 border-emerald-500/30' 
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {bid.teamLogo && (
                              <img 
                                src={bid.teamLogo} 
                                alt={bid.teamName} 
                                className="w-8 h-8 rounded flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className={`font-bold truncate ${bid.won ? 'text-emerald-300' : 'text-white'}`}>
                                {bid.teamName}
                              </div>
                              {bid.won && (
                                <div className="text-xs text-emerald-300 mt-0.5">
                                  ✓ Won • {formatAcquisitionType(bid.acquisitionType || 'bid_won')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0">
                            <div className={`text-lg font-bold ${bid.won ? 'text-emerald-400' : 'text-gray-400'}`}>
                              £{bid.amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Team Bids Status - Enhanced for Completed Rounds */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-black text-white">Team Bid Status</h2>
          <button
            onClick={handleCopyWhatsApp}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
              copied 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/30 text-[#25D366]'
            }`}
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {copied ? 'Copied!' : 'Copy Status to WhatsApp'}
          </button>
        </div>
        <div className="space-y-2">
          {round.status === 'completed' && teamBidsWithDetails ? (
            // Enhanced view for completed rounds with detailed bids
            teamBidsWithDetails.map(teamBid => {
              const isExpanded = expandedTeams.has(teamBid.teamId)
              const wonBids = teamBid.bids.filter(b => b.won)
              const lostBids = teamBid.bids.filter(b => !b.won)
              
              return (
                <div key={teamBid.teamId} className="rounded-lg bg-black/30 border border-white/10 overflow-hidden">
                  {/* Team Header - Clickable to expand/collapse */}
                  <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white/5 transition-colors gap-3">
                    <div 
                      onClick={() => {
                        const newExpanded = new Set(expandedTeams)
                        if (isExpanded) {
                          newExpanded.delete(teamBid.teamId)
                        } else {
                          newExpanded.add(teamBid.teamId)
                        }
                        setExpandedTeams(newExpanded)
                      }}
                      className="flex items-center gap-3 w-full sm:w-auto text-left cursor-pointer flex-1"
                    >
                      {teamBid.teamLogo && (
                        <img src={teamBid.teamLogo} alt={teamBid.teamName} className="w-8 h-8 rounded" />
                      )}
                      <span className="font-bold text-white truncate">{teamBid.teamName}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <div className="flex items-center gap-3">
                        {wonBids.length > 0 && (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/30 flex-shrink-0">
                            ✓ {wonBids.length} Won
                          </span>
                        )}
                        <span className="text-sm text-gray-400 flex-shrink-0">{teamBid.bidCount} bids</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const bidsText = teamBid.bids
                              .map(bid => `${bid.playerName} (${bid.position}, ${bid.overallRating} OVR) - £${bid.amount.toLocaleString()}${bid.won ? ' ✓ WON' : ''}`)
                              .join('\n')
                            const fullText = `${teamBid.teamName} - Bids:\n\n${bidsText}\n\nTotal Spent: £${teamBid.totalSpent.toLocaleString()}`
                            navigator.clipboard.writeText(fullText)
                            // Show feedback
                            const btn = e.currentTarget
                            const originalHTML = btn.innerHTML
                            btn.innerHTML = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>'
                            setTimeout(() => {
                              btn.innerHTML = originalHTML
                            }, 1500)
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex-shrink-0"
                          title="Copy bids to clipboard"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedTeams)
                          if (isExpanded) {
                            newExpanded.delete(teamBid.teamId)
                          } else {
                            newExpanded.add(teamBid.teamId)
                          }
                          setExpandedTeams(newExpanded)
                        }}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Bids List */}
                  {isExpanded && (
                    <div className="border-t border-white/10 p-4 space-y-2 bg-black/20">
                      {/* Won/Auto-Allocated Players First */}
                      {wonBids.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wide">
                            ✓ Player Acquired
                          </div>
                          {wonBids.map((bid, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-emerald-500/10 border-2 border-emerald-500/30 mb-2 gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <img 
                                  src={bid.photoUrl} 
                                  alt={bid.playerName} 
                                  className="w-12 h-12 rounded-lg object-cover bg-white/5 flex-shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder-player.png'
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="font-bold text-white truncate">{bid.playerName}</span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex-shrink-0">
                                      {bid.position}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold flex-shrink-0">
                                      {bid.overallRating}
                                    </span>
                                  </div>
                                  {bid.acquisitionType && (
                                    <div className="text-xs text-emerald-300">
                                      {formatAcquisitionType(bid.acquisitionType)}
                                      {bid.acquisitionNotes && ` • ${bid.acquisitionNotes}`}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-left sm:text-right flex-shrink-0 ml-0 sm:ml-3">
                                <div className="text-xl font-black text-emerald-400">
                                  £{bid.amount.toLocaleString()}
                                </div>
                                <div className="text-xs text-emerald-300 font-bold">
                                  {bid.acquisitionType === 'auto_assigned' ? 'AUTO' : 'WON'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* All Bids Placed */}
                      {teamBid.bids.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                            All Bids Placed ({teamBid.bids.length})
                          </div>
                          {teamBid.bids.map((bid, idx) => (
                            <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border mb-2 gap-3 ${
                              bid.won 
                                ? 'bg-emerald-500/5 border-emerald-500/20' 
                                : 'bg-white/5 border-white/10'
                            }`}>
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <img 
                                  src={bid.photoUrl} 
                                  alt={bid.playerName} 
                                  className="w-10 h-10 rounded-lg object-cover bg-white/5 flex-shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder-player.png'
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className={`font-bold truncate ${bid.won ? 'text-emerald-300' : 'text-white'}`}>
                                      {bid.playerName}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold border flex-shrink-0 ${
                                      bid.won 
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                    }`}>
                                      {bid.position}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold flex-shrink-0">
                                      {bid.overallRating}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-left sm:text-right flex-shrink-0 ml-0 sm:ml-3">
                                <div className={`text-lg font-bold ${bid.won ? 'text-emerald-400' : 'text-gray-400'}`}>
                                  £{bid.amount.toLocaleString()}
                                </div>
                                {bid.won && (
                                  <div className="text-xs text-emerald-300">✓ Won</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No Bids Message */}
                      {teamBid.bids.length === 0 && wonBids.length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          No bids placed
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show message if team didn't submit */}
                  {!teamBid.submitted && (
                    <div className="border-t border-white/10 p-3 bg-yellow-500/5">
                      <div className="flex items-center gap-2 text-yellow-400 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Team did not submit bids for this round</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            // Simple view for non-completed rounds - Sort teams: submitted first (alphabetically), then non-submitted (alphabetically)
            (() => {
              // Create sorted team list
              const sortedTeams = [...teams].sort((a, b) => {
                let aSubmitted = false
                let bSubmitted = false
                
                if (round.roundType === 'bulk') {
                  const aSelection = liveBulkSelections.find((s: any) => s.teamId === a.id)
                  const bSelection = liveBulkSelections.find((s: any) => s.teamId === b.id)
                  aSubmitted = aSelection?.submitted || false
                  bSubmitted = bSelection?.submitted || false
                } else {
                  const aBid = liveTeamBids.find((bid: any) => bid.teamId === a.id)
                  const bBid = liveTeamBids.find((bid: any) => bid.teamId === b.id)
                  aSubmitted = aBid?.submitted || false
                  bSubmitted = bBid?.submitted || false
                }
                
                // Sort: submitted first, then by name alphabetically
                if (aSubmitted && !bSubmitted) return -1
                if (!aSubmitted && bSubmitted) return 1
                return a.name.localeCompare(b.name)
              })
              
              return sortedTeams.map(team => {
              if (round.roundType === 'bulk') {
                const selection = liveBulkSelections.find((s: any) => s.teamId === team.id)
                let selectedCount = 0
                if (selection?.selectedPlayers) {
                  try {
                    const parsed = JSON.parse(selection.selectedPlayers)
                    selectedCount = parsed.players?.length || 0
                  } catch (e) {}
                }
                
                // Calculate remaining slots
                const currentSquadSize = teamSquadSizes?.[team.id] || 0
                const maxSquadSize = 25 // Default max squad size
                const remainingSlots = Math.max(0, maxSquadSize - currentSquadSize)
                
                return (
                  <div key={team.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-black/30 border border-white/10 gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto text-left">
                      {team.logoUrl && (
                        <img src={team.logoUrl} alt={team.name} className="w-8 h-8 rounded" />
                      )}
                      <span className="font-bold text-white truncate">{team.name}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      {selection ? (
                        <div className="flex items-center gap-3 w-full justify-between sm:justify-end">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-cyan-400 font-bold">{selectedCount}/{remainingSlots}</span>
                            <span className="text-xs text-gray-500">({selectedCount} selected, {remainingSlots} slots)</span>
                          </div>
                          {selection.submitted ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/30 flex-shrink-0">
                              Submitted
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-bold border border-yellow-500/30 flex-shrink-0">
                              In Progress
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-cyan-400 font-bold">0/{remainingSlots}</span>
                            <span className="text-xs text-gray-500">({remainingSlots} slots available)</span>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm font-bold border border-gray-500/30 flex-shrink-0">
                            Not Started
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              const teamBid = liveTeamBids.find((bid: any) => bid.teamId === team.id)
              return (
                <div key={team.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-black/30 border border-white/10 gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto text-left">
                    {team.logoUrl && (
                      <img src={team.logoUrl} alt={team.name} className="w-8 h-8 rounded" />
                    )}
                    <span className="font-bold text-white truncate">{team.name}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    {teamBid ? (
                      <div className="flex items-center gap-3 w-full justify-between sm:justify-end">
                        <span className="text-sm text-gray-400">{teamBid.bidCount} bids</span>
                        {teamBid.submitted ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/30 flex-shrink-0">
                            Submitted
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-bold border border-yellow-500/30 flex-shrink-0">
                            In Progress
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-end w-full">
                        <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm font-bold border border-gray-500/30 flex-shrink-0">
                          Not Started
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
            })() // Close the sorting IIFE
          )}
        </div>
      </div>

      {/* Bulk Round Team Selections - Show for tiebreaker_pending or expired_pending_finalization */}
      {round.roundType === 'bulk' && (round.status === 'tiebreaker_pending' || round.status === 'expired_pending_finalization') && bulkSelectionsWithDetails && bulkSelectionsWithDetails.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-8">
          <h3 className="text-xl font-black text-white mb-4">Team Selections</h3>
          <div className="space-y-2">
            {bulkSelectionsWithDetails.map(teamSelection => {
              const isExpanded = expandedTeams.has(teamSelection.teamId)
              
              return (
                <div key={teamSelection.teamId} className="rounded-lg bg-black/30 border border-white/10 overflow-hidden">
                  {/* Team Header */}
                  <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white/5 transition-colors gap-3">
                    <div 
                      onClick={() => {
                        const newExpanded = new Set(expandedTeams)
                        if (isExpanded) {
                          newExpanded.delete(teamSelection.teamId)
                        } else {
                          newExpanded.add(teamSelection.teamId)
                        }
                        setExpandedTeams(newExpanded)
                      }}
                      className="flex items-center gap-3 w-full sm:w-auto text-left cursor-pointer flex-1"
                    >
                      {teamSelection.teamLogo && (
                        <img src={teamSelection.teamLogo} alt={teamSelection.teamName} className="w-8 h-8 rounded" />
                      )}
                      <span className="font-bold text-white truncate">{teamSelection.teamName}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <div className="flex items-center gap-3">
                        {teamSelection.submitted && teamSelection.selections.length > 0 && (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/30 flex-shrink-0">
                            ✓ {teamSelection.selections.length} Selected
                          </span>
                        )}
                        {teamSelection.selections.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const selectionsText = teamSelection.selections
                                .map((sel: any) => `${sel.priority}. ${sel.playerName} (${sel.position}, ${sel.overallRating} OVR)`)
                                .join('\n')
                              const fullText = `${teamSelection.teamName} - Selections:\n\n${selectionsText}`
                              navigator.clipboard.writeText(fullText)
                              // Show feedback
                              const btn = e.currentTarget
                              const originalHTML = btn.innerHTML
                              btn.innerHTML = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>'
                              setTimeout(() => {
                                btn.innerHTML = originalHTML
                              }, 1500)
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex-shrink-0"
                            title="Copy selections to clipboard"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {teamSelection.selections.length > 0 && (
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedTeams)
                            if (isExpanded) {
                              newExpanded.delete(teamSelection.teamId)
                            } else {
                              newExpanded.add(teamSelection.teamId)
                            }
                            setExpandedTeams(newExpanded)
                          }}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          <svg 
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Selections List */}
                  {isExpanded && teamSelection.selections.length > 0 && (
                    <div className="border-t border-white/10 p-4 space-y-2 bg-black/20">
                      <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                        Selected Players (Priority Order)
                      </div>
                      {teamSelection.selections.map((selection: any, idx: number) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#E8A800]/20 border border-[#E8A800]/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-[#E8A800]">{selection.priority}</span>
                            </div>
                            <img 
                              src={selection.photoUrl} 
                              alt={selection.playerName} 
                              className="w-10 h-10 rounded-lg object-cover bg-white/5 flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-player.png'
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-bold text-white truncate">{selection.playerName}</span>
                                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex-shrink-0">
                                  {selection.position}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold flex-shrink-0">
                                  {selection.overallRating}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show message if team didn't submit */}
                  {!teamSelection.submitted && (
                    <div className="border-t border-white/10 p-3 bg-yellow-500/5">
                      <div className="flex items-center gap-2 text-yellow-400 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Team did not submit selections for this round</span>
                      </div>
                    </div>
                  )}

                  {/* Show message if team submitted but no selections */}
                  {teamSelection.submitted && teamSelection.selections.length === 0 && (
                    <div className="border-t border-white/10 p-3 bg-gray-500/5">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <span>Team submitted with no selections</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Extend Time Modal */}
      {/* Extend Time Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-black text-white mb-4">Extend Round Time</h3>
            <p className="text-[#D4CCBB] text-sm mb-6">
              Add extra time to this round. The end time will be updated immediately.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Hours</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={extendHours}
                  onChange={(e) => setExtendHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-lg focus:outline-none focus:border-[#E8A800]/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={extendMinutes}
                  onChange={(e) => setExtendMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-lg focus:outline-none focus:border-[#E8A800]/50"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExtendModal(false)
                  setError('')
                }}
                disabled={extending}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendTime}
                disabled={extending || (extendHours === 0 && extendMinutes === 0)}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-black font-bold transition-all disabled:opacity-50"
              >
                {extending ? 'Extending...' : 'Extend Time'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reduce Time Modal */}
      {showReduceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-black text-white mb-4">Reduce Round Time</h3>
            <p className="text-[#D4CCBB] text-sm mb-6">
              Reduce the remaining time of this round. The end time will be updated immediately.
            </p>

            {timeRemaining !== null && (
              <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="text-sm text-blue-300">
                  <strong>Current time remaining:</strong> {formatTimeRemaining(timeRemaining)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Hours</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={reduceHours}
                  onChange={(e) => setReduceHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-lg focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={reduceMinutes}
                  onChange={(e) => setReduceMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-lg focus:outline-none focus:border-red-500/50"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReduceModal(false)
                  setError('')
                }}
                disabled={reducing}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReduceTime}
                disabled={reducing || (reduceHours === 0 && reduceMinutes === 0)}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold transition-all disabled:opacity-50"
              >
                {reducing ? 'Reducing...' : 'Reduce Time'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Results Modal */}
      {showPreviewModal && previewResults && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-white">Preview Results</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {previewResults.tieDetected && previewResults.ties && (
              <div className="mb-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <h4 className="text-lg font-bold text-purple-300 mb-2">⚠️ Tiebreakers Required</h4>
                <p className="text-sm text-[#D4CCBB] mb-4">
                  The following players have tied bids. Tiebreakers will be created when you finalize.
                </p>
                <div className="space-y-2">
                  {previewResults.ties.map((tie: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-black/30 border border-purple-500/20">
                      <div className="font-bold text-white">{tie.playerName}</div>
                      <div className="text-sm text-gray-400">
                        Amount: £{tie.amount.toLocaleString()} • Teams: {tie.tiedTeams.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewResults.allocations && previewResults.allocations.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-white mb-4">Allocations ({previewResults.allocations.length})</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {previewResults.allocations.map((alloc: any, idx: number) => {
                    const team = teams.find(t => t.id === alloc.teamId)
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                        <div>
                          <div className="font-bold text-white">{alloc.playerName}</div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            {team?.logoUrl && (
                              <img src={team.logoUrl} alt={team.name} className="w-4 h-4 rounded" />
                            )}
                            <span>{team?.name || alloc.teamId}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-emerald-400">
                            £{alloc.amount.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">{formatAcquisitionType(alloc.acquisitionType)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {previewResults.conflicts && previewResults.conflicts.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <h4 className="text-lg font-bold text-orange-300 mb-2">⚠️ Conflicts (Bulk Round)</h4>
                <p className="text-sm text-[#D4CCBB] mb-4">
                  Multiple teams bid on these players. Create bulk tiebreakers to resolve.
                </p>
                <div className="space-y-2">
                  {previewResults.conflicts.map((conflict: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-black/30 border border-orange-500/20">
                      <div className="font-bold text-white">{conflict.playerName}</div>
                      <div className="text-sm text-gray-400">
                        Teams: {conflict.teamIds.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPreviewModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all disabled:opacity-50"
              >
                Close Preview
              </button>
              <button
                onClick={handleFinalizeFromPreview}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-black font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Finalizing...' : 'Finalize & Make Public'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin Result Modal */}
      {showSpinModal && spinResult && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 border-2 border-purple-500/50 rounded-2xl max-w-lg w-full p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center animate-bounce">
                <span className="text-4xl">🎰</span>
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Tiebreaker Resolved!</h2>
              <p className="text-purple-200 text-sm">The wheel has spoken...</p>
            </div>

            <div className="mb-6 p-6 rounded-xl bg-black/40 border border-purple-500/30">
              <div className="mb-4">
                <div className="text-sm text-purple-300 mb-1">Winner</div>
                <div className="text-2xl font-black text-yellow-400 mb-2">
                  🏆 {spinResult.winnerName}
                </div>
                <div className="text-lg text-white">
                  {spinResult.playerName}
                </div>
              </div>
              <div className="pt-4 border-t border-purple-500/30">
                <div className="text-sm text-purple-300 mb-1">Winning Bid</div>
                <div className="text-3xl font-black text-emerald-400">
                  £{spinResult.winningBid.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-sm text-purple-200 mb-4">
              {spinResult.message}
            </div>

            <div className="text-xs text-purple-300">
              Refreshing page in 3 seconds...
            </div>
          </div>
        </div>
      )}

      {/* Submit Bid Modal */}
      {showSubmitBidModal && selectedTiebreaker && selectedTeamForBid && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Submit Bid for {selectedTeamForBid.name}</h3>
              <button
                onClick={() => {
                  setShowSubmitBidModal(false)
                  setSelectedTiebreaker(null)
                  setSelectedTeamForBid(null)
                  setAdminBidAmount(0)
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="text-sm text-purple-200 mb-2">
                <strong>Player:</strong> {selectedTiebreaker.basePlayer?.name || 'Unknown'}
              </div>
              <div className="text-sm text-purple-200">
                <strong>Original Bid:</strong> £{selectedTiebreaker.originalAmount.toLocaleString()}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                New Bid Amount (must be higher than £{selectedTiebreaker.originalAmount.toLocaleString()})
              </label>
              <input
                type="number"
                value={adminBidAmount}
                onChange={(e) => setAdminBidAmount(parseInt(e.target.value) || 0)}
                min={selectedTiebreaker.originalAmount + 1}
                step={1}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-xl font-bold focus:outline-none focus:border-[#E8A800]"
              />
              
              {/* Quick Increment Buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setAdminBidAmount(prev => prev + 5)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-[#E8A800]/50 transition-all font-medium text-sm"
                >
                  +£5
                </button>
                <button
                  onClick={() => setAdminBidAmount(prev => prev + 10)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-[#E8A800]/50 transition-all font-medium text-sm"
                >
                  +£10
                </button>
                <button
                  onClick={() => setAdminBidAmount(prev => prev + 50)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-[#E8A800]/50 transition-all font-medium text-sm"
                >
                  +£50
                </button>
              </div>
              
              <p className="text-xs text-[#7A7367] mt-2">
                Minimum: £{(selectedTiebreaker.originalAmount + 1).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSubmitBidModal(false)
                  setSelectedTiebreaker(null)
                  setSelectedTeamForBid(null)
                  setAdminBidAmount(0)
                }}
                disabled={submittingAdminBid}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminSubmitBid}
                disabled={submittingAdminBid || adminBidAmount <= selectedTiebreaker.originalAmount}
                className="flex-1 px-6 py-3 rounded-lg bg-[#E8A800] hover:bg-[#E8A800]/90 text-black font-bold transition-all disabled:opacity-50"
              >
                {submittingAdminBid ? 'Submitting...' : `Submit £${adminBidAmount.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalization Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isStreamingLogs 
                    ? 'bg-blue-500/20 border border-blue-500/30' 
                    : 'bg-emerald-500/20 border border-emerald-500/30'
                }`}>
                  {isStreamingLogs ? (
                    <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Finalization Log</h3>
                  <p className="text-sm text-gray-400">
                    {isStreamingLogs ? 'Processing...' : 'Completed'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isStreamingLogs) {
                    setShowLogModal(false)
                    setFinalizationLogs([])
                  }
                }}
                disabled={isStreamingLogs}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={isStreamingLogs ? 'Please wait for finalization to complete' : 'Close'}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Log Content */}
            <div className="flex-1 overflow-y-auto p-6 font-mono text-sm">
              <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                {finalizationLogs.length === 0 ? (
                  <div className="text-gray-400 text-center py-8">
                    Waiting for logs...
                  </div>
                ) : (
                  <div className="space-y-1">
                    {finalizationLogs.map((log, idx) => {
                      const isError = log.includes('[ERROR]') || log.includes('❌')
                      const isSuccess = log.includes('[SUCCESS]') || log.includes('✅')
                      const isWarning = log.includes('[WARNING]') || log.includes('⚠️')
                      
                      return (
                        <div 
                          key={idx} 
                          className={`${
                            isError ? 'text-red-400' :
                            isSuccess ? 'text-emerald-400' :
                            isWarning ? 'text-yellow-400' :
                            'text-gray-300'
                          }`}
                        >
                          {log}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {finalizationLogs.length} log entries
                </div>
                <button
                  onClick={() => {
                    if (!isStreamingLogs) {
                      setShowLogModal(false)
                      setFinalizationLogs([])
                    }
                  }}
                  disabled={isStreamingLogs}
                  className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStreamingLogs ? 'Processing...' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
