'use client'

import { useState } from 'react'
import Image from 'next/image'
import SearchableSelect from '@/components/ui/SearchableSelect'

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

interface TransferFixClientProps {
  seasonId: string
  teams: Team[]
}

export default function TransferFixClient({ seasonId, teams }: TransferFixClientProps) {
  const [selectedTeam, setSelectedTeam] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [wrongPlayer, setWrongPlayer] = useState('')
  const [correctPlayerId, setCorrectPlayerId] = useState('')
  const [correctPlayerName, setCorrectPlayerName] = useState('')
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

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
    setWrongPlayer('')
    setCorrectPlayerId('')
    setCorrectPlayerName('')
    setReason('')
    setResult(null)
    loadPlayers(teamId)
  }

  const searchPlayers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/players/search?q=${encodeURIComponent(query)}&seasonId=${seasonId}&limit=10`)
      const data = await response.json()
      
      // Filter out players that are already allocated
      const availablePlayers = data.players.filter((p: any) => !p.currentTeam)
      setSearchResults(availablePlayers)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const selectCorrectPlayer = (player: any) => {
    setCorrectPlayerId(player.id)
    setCorrectPlayerName(player.name)
    setSearchResults([])
  }

  const handleFix = async () => {
    if (!wrongPlayer || !correctPlayerId) return

    setProcessing(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/transfers/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          teamId: selectedTeam,
          wrongPlayerId: wrongPlayer,
          correctPlayerId,
          reason
        })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        // Reload players
        await loadPlayers(selectedTeam)
        setWrongPlayer('')
        setCorrectPlayerId('')
        setCorrectPlayerName('')
        setReason('')
      }
    } catch (error) {
      setResult({ success: false, error: 'Failed to fix transfer' })
    } finally {
      setProcessing(false)
    }
  }

  const selectedWrongPlayer = players.find((p) => p.id === wrongPlayer)

  return (
    <div className="space-y-6">
      {/* Warning */}
      <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <div className="font-bold text-red-400 mb-1">Super Admin Tool</div>
            <div className="text-sm text-gray-300">
              This tool replaces an incorrectly allocated player with the correct one. Use carefully - this action cannot be undone.
            </div>
          </div>
        </div>
      </div>

      {/* Team Selection */}
      <SearchableSelect
        label="Select Team"
        value={selectedTeam}
        options={[
          { value: '', label: 'Choose a team...' },
          ...teams.map((t) => ({ value: t.team.id, label: t.team.name }))
        ]}
        onChange={handleTeamChange}
        enableSearch={true}
        className="rounded-xl bg-white/5 border border-white/10 p-6"
      />

      {/* Wrong Player Selection */}
      {selectedTeam && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <label className="block text-sm font-bold text-white mb-2">Select Wrong Player</label>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading players...</div>
          ) : players.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No players in this team</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setWrongPlayer(player.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg transition-all ${
                    wrongPlayer === player.id
                      ? 'bg-red-500/20 border-2 border-red-500'
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
                      {player.position} {player.positionGroup && `(${player.positionGroup})`} • {player.overallRating} OVR • £{player.soldPrice.toLocaleString()}
                    </div>
                  </div>
                  {wrongPlayer === player.id && (
                    <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Correct Player Search */}
      {wrongPlayer && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <label className="block text-sm font-bold text-white mb-2">Search for Correct Player</label>
          <input
            type="text"
            placeholder="Type player name..."
            onChange={(e) => searchPlayers(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none mb-2"
          />

          {correctPlayerName && (
            <div className="mb-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-sm text-emerald-400 font-bold">Selected: {correctPlayerName}</div>
            </div>
          )}

          {searching && <div className="text-center py-4 text-gray-400">Searching...</div>}

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((player) => (
                <button
                  key={player.id}
                  onClick={() => selectCorrectPlayer(player)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg bg-black/30 border border-white/10 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex-1 text-left">
                    <div className="font-bold text-white">{player.name}</div>
                    <div className="text-sm text-gray-400">
                      {player.position} {player.positionGroup && `(${player.positionGroup})`} • {player.overallRating} OVR
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reason */}
      {wrongPlayer && correctPlayerId && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <label className="block text-sm font-bold text-white mb-2">Reason for Correction</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this correction is needed..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none resize-none"
          />
        </div>
      )}

      {/* Preview */}
      {wrongPlayer && correctPlayerId && selectedWrongPlayer && (
        <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-6">
          <h3 className="text-lg font-bold text-orange-400 mb-4">Preview Changes</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center">
              <div className="text-sm text-gray-400 mb-2">Remove</div>
              <div className="font-bold text-red-400">{selectedWrongPlayer.name}</div>
              <div className="text-xs text-gray-500">
                {selectedWrongPlayer.position} ({selectedWrongPlayer.positionGroup})
              </div>
            </div>
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <div className="flex-1 text-center">
              <div className="text-sm text-gray-400 mb-2">Add</div>
              <div className="font-bold text-emerald-400">{correctPlayerName}</div>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-gray-400">
            Price remains: £{selectedWrongPlayer.soldPrice.toLocaleString()}
          </div>
        </div>
      )}

      {/* Fix Button */}
      {wrongPlayer && correctPlayerId && (
        <button
          onClick={handleFix}
          disabled={processing}
          className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-black text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : 'Fix Transfer'}
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
                {result.success ? 'Transfer Fixed!' : 'Error'}
              </div>
              {result.success ? (
                <div className="text-sm text-gray-300">
                  <div>Team: {result.teamName}</div>
                  <div>Removed: {result.removedPlayer}</div>
                  <div>Added: {result.addedPlayer}</div>
                  <div>Price: £{result.price}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-300">{result.error || 'Operation failed'}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
