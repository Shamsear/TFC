'use client'

import { EFootballPlayer } from '@/lib/sqlite-parser'
import { DuplicateInfo } from '@/app/api/import/preview/route'
import { useState, useEffect } from 'react'

interface DuplicateResolverProps {
  player: EFootballPlayer
  duplicate: DuplicateInfo
  resolution: 'skip' | 'replace' | 'add' | string
  onResolve: (resolution: 'skip' | 'replace' | 'add' | string) => void
}

export default function DuplicateResolver({
  player,
  duplicate,
  resolution,
  onResolve
}: DuplicateResolverProps) {
  // For multi-select, resolution will be a comma-separated string of playerIds
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(() => {
    if (duplicate.duplicateType === 'file-vs-file' && duplicate.allFileInstances) {
      if (resolution === 'add-all') {
        return new Set(duplicate.allFileInstances.map(p => p.playerId))
      } else if (resolution && resolution !== 'skip' && resolution !== 'replace' && resolution !== 'add') {
        // Parse comma-separated IDs
        return new Set(resolution.split(','))
      } else {
        // Default to first instance
        return new Set([duplicate.allFileInstances[0].playerId])
      }
    }
    return new Set()
  })

  // Sync local state with resolution prop when it changes (e.g., from bulk actions)
  useEffect(() => {
    if (duplicate.duplicateType === 'file-vs-file' && resolution) {
      if (resolution === 'add-all' && duplicate.allFileInstances) {
        setSelectedPlayerIds(new Set(duplicate.allFileInstances.map(p => p.playerId)))
      } else if (resolution !== 'skip' && resolution !== 'replace' && resolution !== 'add') {
        setSelectedPlayerIds(new Set(resolution.split(',')))
      }
    }
  }, [resolution, duplicate.duplicateType, duplicate.allFileInstances])

  const togglePlayerSelection = (playerId: string) => {
    const newSelection = new Set(selectedPlayerIds)
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId)
    } else {
      newSelection.add(playerId)
    }
    
    // Must have at least one selected
    if (newSelection.size === 0) {
      return
    }
    
    setSelectedPlayerIds(newSelection)
    // Convert Set to comma-separated string
    onResolve(Array.from(newSelection).join(','))
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
      case 'CB': return 'bg-blue-500/20 border-blue-500/30 text-blue-400'
      case 'LB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      case 'RB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      case 'DMF': return 'bg-green-600/20 border-green-600/30 text-green-500'
      case 'CMF': return 'bg-green-500/20 border-green-500/30 text-green-400'
      case 'LMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'RMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'AMF': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
      case 'SS': return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
      case 'LWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'RWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'CF': return 'bg-red-500/20 border-red-500/30 text-red-400'
      default: return 'bg-gray-500/20 border-gray-500/30 text-gray-400'
    }
  }

  const handleSelectInstance = (playerId: string) => {
    togglePlayerSelection(playerId)
  }

  const handleSelectAll = () => {
    if (duplicate.allFileInstances) {
      const allIds = new Set(duplicate.allFileInstances.map(p => p.playerId))
      setSelectedPlayerIds(allIds)
      onResolve(Array.from(allIds).join(','))
    }
  }

  const handleSelectNone = () => {
    if (duplicate.allFileInstances) {
      const firstId = duplicate.allFileInstances[0].playerId
      setSelectedPlayerIds(new Set([firstId]))
      onResolve(firstId)
    }
  }

  const isSamePlayerDifferentTeams = duplicate.duplicateType === 'file-vs-file' && 
    duplicate.allFileInstances &&
    duplicate.allFileInstances.some(p => p.teamName.toLowerCase().includes('free agent')) &&
    duplicate.allFileInstances.some(p => !p.teamName.toLowerCase().includes('free agent'))

  if (duplicate.duplicateType === 'file-vs-file' && duplicate.allFileInstances) {
    return (
      <div className="rounded-2xl bg-yellow-500/5 border-2 border-yellow-500/30 p-4">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-yellow-500/20">
          <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-lg font-black text-yellow-400">
              {isSamePlayerDifferentTeams ? 'Same Player - Multiple Teams' : 'Duplicate in Import File'}
            </h3>
            <p className="text-sm text-gray-400">
              {isSamePlayerDifferentTeams 
                ? `Found ${duplicate.allFileInstances.length} entries for this player (likely same person in different teams)`
                : `Found ${duplicate.allFileInstances.length} players with same name and position (may be different people)`
              }
            </p>
          </div>
        </div>

        {isSamePlayerDifferentTeams && (
          <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-blue-400 mb-1">💡 Recommended Action</div>
                <div className="text-xs text-gray-400">
                  Select the player with a real team (not Free Agent) for more accurate data
                </div>
              </div>
              <button
                onClick={() => {
                  const nonFreeAgent = duplicate.allFileInstances!.find(
                    p => !p.teamName.toLowerCase().includes('free agent')
                  )
                  if (nonFreeAgent) {
                    handleSelectInstance(nonFreeAgent.playerId)
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-all"
              >
                Select Non-Free Agent
              </button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-white">
              Select instances to import ({selectedPlayerIds.size} of {duplicate.allFileInstances.length} selected):
            </div>
            <div className="flex gap-2">
              {selectedPlayerIds.size < duplicate.allFileInstances.length && (
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/30 transition-all"
                >
                  Select All
                </button>
              )}
              {selectedPlayerIds.size > 1 && (
                <button
                  onClick={handleSelectNone}
                  className="px-3 py-1.5 rounded-lg bg-gray-500/20 border border-gray-500/30 text-gray-400 text-xs font-bold hover:bg-gray-500/30 transition-all"
                >
                  Select Only One
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {duplicate.allFileInstances.map((instance, idx) => {
              const isFreeAgent = instance.teamName.toLowerCase().includes('free agent')
              const isSelected = selectedPlayerIds.has(instance.playerId)
              
              return (
                <button
                  key={instance.playerId}
                  onClick={() => togglePlayerSelection(instance.playerId)}
                  className={`p-4 rounded-xl border-2 transition-all text-left relative ${
                    isSelected
                      ? 'bg-[#E8A800]/20 border-[#E8A800] shadow-lg shadow-[#E8A800]/20'
                      : 'bg-black/30 border-white/10 hover:border-white/20'
                  }`}
                >
                  {isFreeAgent && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-gray-500/20 border border-gray-500/30 text-gray-400 text-xs font-bold">
                      FREE AGENT
                    </div>
                  )}
                  
                  {!isFreeAgent && isSamePlayerDifferentTeams && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold">
                      ⭐ RECOMMENDED
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-[#E8A800] bg-[#E8A800]'
                        : 'border-white/30'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-[#0a0a0a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#E8A800]">
                      INSTANCE {idx + 1}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="font-black text-white mb-1">{instance.playerName}</div>
                    <div className={`text-sm mb-1 ${isFreeAgent ? 'text-gray-500' : 'text-cyan-400 font-bold'}`}>
                      {instance.teamName}
                    </div>
                    <div className="text-xs text-gray-400 mb-1">{instance.nationality}</div>
                    <div className="text-xs text-gray-500">ID: {instance.playerId}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Rating</div>
                      <div className="text-lg font-black text-[#E8A800]">{instance.overallRating}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Position</div>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-bold ${getPositionColor(instance.position)}`}>
                        {instance.position}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Speed</div>
                      <div className="font-bold text-white">{instance.speed}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Dribbling</div>
                      <div className="font-bold text-white">{instance.dribbling}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Finishing</div>
                      <div className="font-bold text-white">{instance.finishing}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-black/30 border border-white/10">
          <div className="text-xs text-gray-400">
            {selectedPlayerIds.size === duplicate.allFileInstances.length ? (
              <>
                ✓ All {duplicate.allFileInstances.length} instances will be imported as separate players.
              </>
            ) : selectedPlayerIds.size > 1 ? (
              <>
                ✓ {selectedPlayerIds.size} instances will be imported. {duplicate.allFileInstances.length - selectedPlayerIds.size} will be skipped.
              </>
            ) : (
              <>
                ✓ 1 instance will be imported. {duplicate.allFileInstances.length - 1} will be skipped.
              </>
            )}
          </div>
        </div>

        {!isSamePlayerDifferentTeams && duplicate.allFileInstances.length > 1 && (
          <div className="mt-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-bold text-purple-400 mb-1">Different Players?</div>
                <div className="text-xs text-gray-400">
                  If these are actually different people with the same name, use the checkboxes above to select which ones to import
                </div>
              </div>
            </div>
            {selectedPlayerIds.size < duplicate.allFileInstances.length && (
              <button
                onClick={handleSelectAll}
                className="w-full p-3 rounded-lg border-2 bg-black/30 border-white/10 text-gray-400 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-left">
                    <div className="font-bold mb-1">Import All Instances</div>
                    <div className="text-xs opacity-80">
                      Add all {duplicate.allFileInstances.length} players as separate entries (use only if they are different people)
                    </div>
                  </div>
                  <svg className="w-6 h-6 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </button>
            )}
            {selectedPlayerIds.size === duplicate.allFileInstances.length && (
              <div className="w-full p-3 rounded-lg border-2 bg-purple-500/20 border-purple-500 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold mb-1">✓ All Instances Selected</div>
                    <div className="text-xs opacity-80">
                      All {duplicate.allFileInstances.length} players will be imported as separate entries
                    </div>
                  </div>
                  <svg className="w-6 h-6 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const newPlayerIsFreeAgent = player.teamName.toLowerCase().includes('free agent')
  const hasNonFreeAgentInDB = duplicate.existingPlayers.some(
    p => !p.team.toLowerCase().includes('free agent')
  )

  return (
    <div className="rounded-2xl bg-yellow-500/5 border-2 border-yellow-500/30 p-4">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-yellow-500/20">
        <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3 className="text-lg font-black text-yellow-400">Duplicate Player Detected</h3>
          <p className="text-sm text-gray-400">
            Found {duplicate.existingCount} existing player(s) with same name and position in database
          </p>
        </div>
      </div>

      {newPlayerIsFreeAgent && hasNonFreeAgentInDB && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="text-sm font-bold text-blue-400 mb-1">💡 Recommendation</div>
          <div className="text-xs text-gray-400">
            The new player is a Free Agent, but you already have this player with a real team in the database. 
            Consider <strong>skipping</strong> this entry to keep the better data.
          </div>
        </div>
      )}
      {!newPlayerIsFreeAgent && duplicate.existingPlayers.every(p => p.team.toLowerCase().includes('free agent')) && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-sm font-bold text-emerald-400 mb-1">💡 Recommendation</div>
          <div className="text-xs text-gray-400">
            The new player has a real team, but existing entries are Free Agents. 
            Consider <strong>replacing</strong> to update with better data.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs font-bold text-emerald-400">NEW PLAYER</div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">
              FROM FILE
            </span>
            {newPlayerIsFreeAgent && (
              <span className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 text-xs font-bold">
                FREE AGENT
              </span>
            )}
          </div>

          <div className="mb-3">
            <div className="font-black text-white mb-1">{player.playerName}</div>
            <div className={`text-sm mb-1 ${newPlayerIsFreeAgent ? 'text-gray-500' : 'text-cyan-400 font-bold'}`}>
              {player.teamName}
            </div>
            <div className="text-xs text-gray-400 mb-1">{player.nationality}</div>
            <div className="text-xs text-gray-500">ID: {player.playerId}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="text-xs text-gray-400">Rating</div>
              <div className="text-lg font-black text-emerald-400">{player.overallRating}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Position</div>
              <div className={`inline-block px-2 py-1 rounded text-xs font-bold ${getPositionColor(player.position)}`}>
                {player.position}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs font-bold text-red-400">EXISTING IN DATABASE</div>
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-bold">
              {duplicate.existingCount} FOUND
            </span>
          </div>

          <div className="space-y-2">
            {duplicate.existingPlayers.map((existing, idx) => {
              const isFreeAgent = existing.team.toLowerCase().includes('free agent')
              return (
                <div key={idx} className="flex items-center gap-2 p-2 rounded bg-black/30">
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm">{existing.name}</div>
                    <div className={`text-xs ${isFreeAgent ? 'text-gray-500' : 'text-cyan-400 font-bold'}`}>
                      {existing.team}
                      {isFreeAgent && <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 text-xs">FREE AGENT</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-gray-400">{existing.rating}</div>
                    <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getPositionColor(existing.position)}`}>
                      {existing.position}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-bold text-white mb-3">Choose Action:</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => onResolve('skip')}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              resolution === 'skip'
                ? 'bg-gray-500/20 border-gray-500 text-white'
                : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            <div className="font-bold mb-1">Skip</div>
            <div className="text-xs opacity-80">Keep existing, ignore new</div>
          </button>

          <button
            onClick={() => onResolve('replace')}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              resolution === 'replace'
                ? 'bg-orange-500/20 border-orange-500 text-white'
                : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            <div className="font-bold mb-1">Replace</div>
            <div className="text-xs opacity-80">Update existing with new stats</div>
          </button>

          <button
            onClick={() => onResolve('add')}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              resolution === 'add'
                ? 'bg-emerald-500/20 border-emerald-500 text-white'
                : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            <div className="font-bold mb-1">Add Anyway</div>
            <div className="text-xs opacity-80">Add as separate player</div>
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-black/30 border border-white/10">
        <div className="text-xs text-gray-400">
          {resolution === 'skip' && '✓ This player will be skipped during import'}
          {resolution === 'replace' && '✓ Existing player stats will be updated with new data'}
          {resolution === 'add' && '✓ This player will be added as a new entry (may cause duplicates)'}
        </div>
      </div>
    </div>
  )
}
