'use client'

import { useState } from 'react'

export interface TeamWithBudget {
  id: string
  name: string
  logoUrl: string
  currentBudget: number
}

interface AuctionResponse {
  success: boolean
  updatedBudget: number
  message: string
  error?: string
}

export function useOptimisticAuction(seasonId: string, initialTeams: TeamWithBudget[]) {
  const [teams, setTeams] = useState<TeamWithBudget[]>(initialTeams)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, number>>(new Map())
  const [error, setError] = useState<string | null>(null)

  const processSale = async (
    teamId: string,
    basePlayerId: string,
    amount: number
  ): Promise<boolean> => {
    // Clear any previous errors
    setError(null)

    // 1. Optimistic update
    const updateId = crypto.randomUUID()
    setOptimisticUpdates(prev => new Map(prev).set(updateId, amount))
    setTeams(prev => prev.map(team => 
      team.id === teamId 
        ? { ...team, currentBudget: team.currentBudget - amount }
        : team
    ))

    try {
      // 2. Server mutation
      const response = await fetch(`/api/seasons/${seasonId}/auction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ teamId, basePlayerId, amount })
      })

      const result: AuctionResponse = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Sale failed')
      }

      // 3. Confirm optimistic update
      setOptimisticUpdates(prev => {
        const next = new Map(prev)
        next.delete(updateId)
        return next
      })

      return true
    } catch (err) {
      // 4. Revert on failure
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      
      setOptimisticUpdates(prev => {
        const next = new Map(prev)
        next.delete(updateId)
        return next
      })
      
      setTeams(prev => prev.map(team => 
        team.id === teamId 
          ? { ...team, currentBudget: team.currentBudget + amount }
          : team
      ))

      return false
    }
  }

  const clearError = () => setError(null)

  return { 
    teams, 
    processSale, 
    hasPendingUpdates: optimisticUpdates.size > 0,
    error,
    clearError
  }
}
