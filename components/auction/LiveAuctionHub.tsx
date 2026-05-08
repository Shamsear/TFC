'use client'

import { useState, useEffect } from 'react'
import { PlayerCard, PlayerForAuction } from './PlayerCard'
import { TeamBudgetGrid } from './TeamBudgetGrid'
import { useOptimisticAuction, TeamWithBudget } from '@/hooks/useOptimisticAuction'
import { toast } from '@/lib/toast'

interface LiveAuctionHubProps {
  seasonId: string
  teams: TeamWithBudget[]
  players: PlayerForAuction[]
}

export function LiveAuctionHub({ seasonId, teams: initialTeams, players }: LiveAuctionHubProps) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [selectedTeamId, setSelectedTeamId] = useState<string>()
  const [bidAmount, setBidAmount] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const { teams, processSale, hasPendingUpdates, error, clearError } = useOptimisticAuction(
    seasonId,
    initialTeams
  )

  const currentPlayer = players[currentPlayerIndex]
  const hasMorePlayers = currentPlayerIndex < players.length - 1

  // Show toast when error changes
  useEffect(() => {
    if (error) {
      toast.error(error, { duration: 7000 })
    }
  }, [error])

  const validateBid = (): boolean => {
    setValidationError(null)

    if (!selectedTeamId) {
      setValidationError('Please select a team')
      return false
    }

    if (!bidAmount || bidAmount.trim() === '') {
      setValidationError('Please enter a bid amount')
      return false
    }

    const amount = parseInt(bidAmount, 10)
    
    if (isNaN(amount)) {
      setValidationError('Bid amount must be a valid number')
      return false
    }

    if (amount <= 0) {
      setValidationError('Bid amount must be greater than zero')
      return false
    }

    // Check if team has sufficient budget
    const selectedTeam = teams.find(t => t.id === selectedTeamId)
    if (selectedTeam && amount > selectedTeam.currentBudget) {
      setValidationError(`Insufficient budget. Team has $${selectedTeam.currentBudget.toLocaleString()}`)
      return false
    }

    return true
  }

  const handleConfirmSale = async () => {
    if (!validateBid() || !currentPlayer) {
      return
    }

    const amount = parseInt(bidAmount, 10)

    setIsProcessing(true)
    const success = await processSale(selectedTeamId!, currentPlayer.id, amount)
    setIsProcessing(false)

    if (success) {
      toast.success(`Successfully purchased ${currentPlayer.name} for $${amount.toLocaleString()}`)
      
      // Move to next player
      if (hasMorePlayers) {
        setCurrentPlayerIndex(prev => prev + 1)
      }
      // Reset form
      setSelectedTeamId(undefined)
      setBidAmount('')
      setValidationError(null)
    }
  }

  const handleSkipPlayer = () => {
    if (hasMorePlayers) {
      setCurrentPlayerIndex(prev => prev + 1)
      setSelectedTeamId(undefined)
      setBidAmount('')
      setValidationError(null)
      clearError()
    }
  }

  const handleBidAmountChange = (value: string) => {
    setBidAmount(value)
    setValidationError(null)
  }

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId)
    setValidationError(null)
  }

  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Auction Complete</h2>
          <p className="text-zinc-400">All players have been processed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-fluid-sm md:p-fluid-md lg:p-fluid-lg">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-fluid-3xl md:text-fluid-4xl font-bold text-white mb-2">Live Auction Hub</h1>
          <p className="text-fluid-sm text-zinc-400">
            Player {currentPlayerIndex + 1} of {players.length}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-fluid-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p className="text-red-400 text-fluid-sm">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300 font-semibold text-fluid-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Current Player Card */}
        <div className="max-w-md mx-auto">
          <PlayerCard player={currentPlayer} isCurrentBid={true} />
        </div>

        {/* Bid Controls */}
        <div className="max-w-md mx-auto bg-dark-100 rounded-lg p-fluid-md border border-zinc-800">
          <h2 className="text-fluid-xl font-bold text-white mb-4">Place Bid</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="bidAmount" className="block text-fluid-sm text-zinc-400 mb-2">
                Bid Amount ($)
              </label>
              <input
                id="bidAmount"
                type="number"
                value={bidAmount}
                onChange={(e) => handleBidAmountChange(e.target.value)}
                placeholder="Enter bid amount"
                className={`w-full px-4 py-3 bg-zinc-800 border rounded-lg text-white text-fluid-base placeholder-zinc-500 focus:outline-none transition-all ${
                  validationError 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-zinc-700 focus:border-neon-purple focus:shadow-neon-glow'
                }`}
                disabled={isProcessing || hasPendingUpdates}
              />
              {validationError && (
                <p className="mt-2 text-sm text-red-400">{validationError}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirmSale}
                disabled={isProcessing || hasPendingUpdates}
                className="flex-1 bg-gradient-to-r from-neon-purple to-neon-blue text-white font-semibold py-3 rounded-lg text-fluid-base hover:shadow-neon-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing || hasPendingUpdates ? 'Processing...' : 'Confirm Sale'}
              </button>

              <button
                onClick={handleSkipPlayer}
                disabled={isProcessing || hasPendingUpdates}
                className="sm:px-6 bg-zinc-800 text-white font-semibold py-3 rounded-lg text-fluid-base hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Skip
              </button>
            </div>
          </div>
        </div>

        {/* Team Budget Grid */}
        <div>
          <h2 className="text-fluid-2xl font-bold text-white mb-4">Select Team</h2>
          <TeamBudgetGrid
            teams={teams}
            onTeamSelect={handleTeamSelect}
            selectedTeamId={selectedTeamId}
          />
        </div>
      </div>
    </div>
  )
}
