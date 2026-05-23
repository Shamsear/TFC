'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Team {
  team: {
    id: string
    name: string
    logoUrl: string
  }
}

interface Player {
  id: string
  name: string
  photoUrl: string | null
  position: string
  positionGroup: string | null
  overallRating: number
  soldPrice: number
}

interface PlayerManagementClientProps {
  seasonId: string
  teams: Team[]
}

export default function PlayerManagementClient({ seasonId, teams }: PlayerManagementClientProps) {
  const [activeTab, setActiveTab] = useState<'transfer' | 'release'>('transfer')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [destinationTeam, setDestinationTeam] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const loadPlayers = async (teamId: string) => {
    if (!teamId) {
      setPlayers([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/teams/players?seasonId=${seasonId}&teamId=${teamId}`)
      const data = await response.json()
      setPlayers(data.players || [])
    } catch (error) {
      console.error('Failed to load players:', error)
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }

  const handleTeamChange = (teamId: string) => {
    setSelectedTeam(teamId)
    setSelectedPlayers(new Set())
    setResult(null)
    loadPlayers(teamId)
  }

  const togglePlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      newSelected.add(playerId)
    }
    setSelectedPlayers(newSelected)
  }

  const handleTransfer = async () => {
    if (selectedPlayers.size === 0 || !destinationTeam) return

    setProcessing(true)
    setResult(null)

    try {
      const transfers = Array.from(selectedPlayers).map(playerId => ({
        playerId,
        fromTeamId: selectedTeam,
        toTeamId: destinationTeam,
        notes
      }))

      const response = await fetch('/api/admin/players/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, transfers })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        // Reload players
        await loadPlayers(selectedTeam)
        setSelectedPlayers(new Set())
        setDestinationTeam('')
        setNotes('')
      }
    } catch (error) {
      setResult({ success: false, error: 'Failed to transfer players' })
    } finally {
      setProcessing(false)
    }
  }

  const handleRelease = async () => {
    if (selectedPlayers.size === 0) return

    setProcessing(true)
    setResult(null)

    try {
      const releases = Array.from(selectedPlayers).map(playerId => ({
        playerId,
        teamId: selectedTeam,
        notes
      }))

      const response = await fetch('/api/admin/players/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, releases })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        // Reload players
        await loadPlayers(selectedTeam)
        setSelectedPlayers(new Set())
        setNotes('')
      }
    } catch (error) {
      setResult({ success: false, error: 'Failed to release players' })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('transfer')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'transfer'
              ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a]'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
          }`}
        >
          Transfer Players
        </button>
        <button
          onClick={() => setActiveTab('release')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'release'
              ? 'bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a]'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
          }`}
        >
          Release Players
        </button>
      </div>

      {/* Team Selection */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <label className="block text-sm font-bold text-white mb-2">Select Team</label>
        <select
          value={selectedTeam}
          onChange={(e) => handleTeamChange(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none"
        >
          <option value="">Choose a team...</option>
          {teams.map((t) => (
            <option key={t.team.id} value={t.team.id}>
              {t.team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Players List */}
      {selectedTeam && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <h3 className="text-xl font-black text-white mb-4">
            Select Players ({selectedPlayers.size} selected)
          </h3>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading players...</div>
          ) : players.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No players in this team</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg transition-all ${
                    selectedPlayers.has(player.id)
                      ? 'bg-[#E8A800]/20 border-2 border-[#E8A800]'
                      : 'bg-black/30 border border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                    {player.photoUrl && (
                      <Image
                        src={player.photoUrl}
                        alt={player.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-white">{player.name}</div>
                    <div className="text-sm text-gray-400">
                      {player.position} • {player.overallRating} OVR • £{player.soldPrice.toLocaleString()}
                    </div>
                  </div>
                  {selectedPlayers.has(player.id) && (
                    <svg className="w-6 h-6 text-[#E8A800]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transfer Destination */}
      {activeTab === 'transfer' && selectedPlayers.size > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <label className="block text-sm font-bold text-white mb-2">Destination Team</label>
          <select
            value={destinationTeam}
            onChange={(e) => setDestinationTeam(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none"
          >
            <option value="">Choose destination...</option>
            {teams
              .filter((t) => t.team.id !== selectedTeam)
              .map((t) => (
                <option key={t.team.id} value={t.team.id}>
                  {t.team.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Notes */}
      {selectedPlayers.size > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <label className="block text-sm font-bold text-white mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a reason or note..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none resize-none"
          />
        </div>
      )}

      {/* Action Button */}
      {selectedPlayers.size > 0 && (
        <button
          onClick={activeTab === 'transfer' ? handleTransfer : handleRelease}
          disabled={processing || (activeTab === 'transfer' && !destinationTeam)}
          className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-black text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing
            ? 'Processing...'
            : activeTab === 'transfer'
            ? `Transfer ${selectedPlayers.size} Player(s)`
            : `Release ${selectedPlayers.size} Player(s)`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div
          className={`rounded-xl border p-6 ${
            result.success
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <svg className="w-6 h-6 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <div className="flex-1">
              <div className={`font-bold mb-1 ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.success ? 'Success!' : 'Error'}
              </div>
              <div className="text-sm text-gray-300">
                {result.success
                  ? activeTab === 'transfer'
                    ? `Successfully transferred ${result.transferred} player(s)`
                    : `Successfully released ${result.released} player(s)`
                  : result.error || 'Operation failed'}
              </div>
              {result.details?.errors?.length > 0 && (
                <div className="mt-2 text-sm text-red-400">
                  {result.details.errors.map((err: any, idx: number) => (
                    <div key={idx}>• {err.playerName || err.playerId}: {err.error}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
