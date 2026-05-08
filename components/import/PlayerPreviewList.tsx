'use client'

import { useState } from 'react'
import { PreviewResponse } from '@/app/api/import/preview/route'
import PlayerCard from './PlayerCard'
import ChangeComparisonCard from './ChangeComparisonCard'
import DuplicateResolver from './DuplicateResolver'

interface PlayerPreviewListProps {
  preview: PreviewResponse
  selectedPlayers: Set<string>
  duplicateResolutions: Record<string, 'skip' | 'replace' | 'add' | string>
  onTogglePlayer: (playerId: string) => void
  onToggleAll: () => void
  onResolveDuplicate: (playerId: string, resolution: 'skip' | 'replace' | 'add' | string) => void
  onBatchResolveDuplicates?: (resolutions: Record<string, 'skip' | 'replace' | 'add' | string>) => void
  onNext: () => void
  onBack: () => void
}

type Tab = 'new' | 'changed' | 'unchanged' | 'duplicates' | 'all'
type DuplicateSubTab = 'all' | 'same-player-same-pos' | 'same-player-diff-pos' | 'different-players' | 'multi-instance' | 'db-duplicates'

export default function PlayerPreviewList({
  preview,
  selectedPlayers,
  duplicateResolutions,
  onTogglePlayer,
  onToggleAll,
  onResolveDuplicate,
  onBatchResolveDuplicates,
  onNext,
  onBack
}: PlayerPreviewListProps) {
  const [activeTab, setActiveTab] = useState<Tab>(
    preview.mode === 'update' ? 'changed' : 'new'
  )
  const [duplicateSubTab, setDuplicateSubTab] = useState<DuplicateSubTab>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const itemsPerPage = 20

  // Calculate actual selected count based on duplicate resolutions
  const getActualSelectedCount = () => {
    let count = 0
    
    // Count regular selected players (non-duplicates)
    for (const playerId of selectedPlayers) {
      const duplicateInfo = preview.duplicates.find(d => d.playerId === playerId)
      
      if (!duplicateInfo) {
        // Regular player (not a duplicate)
        count += 1
      }
    }
    
    // Count ALL duplicate resolutions (duplicates don't use checkboxes)
    for (const duplicate of preview.duplicates) {
      const resolution = duplicateResolutions[duplicate.playerId]
      
      if (duplicate.duplicateType === 'file-vs-file' && duplicate.allFileInstances) {
        // For file-vs-file duplicates, count based on resolution
        if (resolution) {
          if (resolution === 'skip') {
            // Skip means 0 players imported
            count += 0
          } else if (resolution.includes(',')) {
            // Comma-separated IDs means multiple instances selected
            count += resolution.split(',').length
          } else {
            // Single ID selected
            count += 1
          }
        } else {
          // No resolution yet - default to first instance (1 player)
          count += 1
        }
      } else if (duplicate.duplicateType === 'file-vs-db') {
        // For file-vs-db duplicates, check resolution
        if (resolution === 'skip') {
          // Skip means 0 players imported
          count += 0
        } else if (resolution === 'replace' || resolution === 'add') {
          // Replace or add means 1 player
          count += 1
        } else {
          // No resolution yet - default to skip (0 players)
          count += 0
        }
      }
    }
    
    return count
  }

  const actualSelectedCount = getActualSelectedCount()

  // Calculate dynamic stats based on mutually exclusive categories
  const getDynamicStats = () => {
    // Categorize duplicates with correct priority order
    
    // Priority 1: Database duplicates
    const dbDups = preview.duplicates.filter(d => d.duplicateType === 'file-vs-db')
    const dbDuplicateIds = new Set(dbDups.map(d => d.playerId))
    
    // Priority 2: 3+ instances
    const multiInstance = preview.duplicates.filter(d => {
      if (d.duplicateType !== 'file-vs-file' || !d.allFileInstances) return false
      if (dbDuplicateIds.has(d.playerId)) return false
      return d.allFileInstances.length >= 3
    })
    const multiInstanceIds = new Set(multiInstance.map(d => d.playerId))
    
    // Priority 3: Same player, different positions
    const samePlayerDiffPos = preview.duplicates.filter(d => {
      if (d.duplicateType !== 'file-vs-file' || !d.allFileInstances) return false
      if (dbDuplicateIds.has(d.playerId)) return false
      if (multiInstanceIds.has(d.playerId)) return false
      
      const nationalities = new Set(
        d.allFileInstances
          .map(p => p.nationality?.toLowerCase().trim())
          .filter(n => n && n !== '')
      )
      
      const positions = new Set(d.allFileInstances.map(p => p.position))
      
      return nationalities.size <= 1 && positions.size > 1
    })
    const samePlayerDiffPosIds = new Set(samePlayerDiffPos.map(d => d.playerId))
    
    // Priority 4: Different players
    const differentPlayers = preview.duplicates.filter(d => {
      if (d.duplicateType !== 'file-vs-file' || !d.allFileInstances) return false
      if (dbDuplicateIds.has(d.playerId)) return false
      if (multiInstanceIds.has(d.playerId)) return false
      if (samePlayerDiffPosIds.has(d.playerId)) return false
      
      const nationalities = new Set(
        d.allFileInstances
          .map(p => p.nationality?.toLowerCase().trim())
          .filter(n => n && n !== '')
      )
      
      return nationalities.size > 1
    })
    const differentPlayersIds = new Set(differentPlayers.map(d => d.playerId))
    
    // Priority 5 (LOWEST): Same player, same position
    const samePlayerSamePos = preview.duplicates.filter(d => {
      if (d.duplicateType !== 'file-vs-file' || !d.allFileInstances) return false
      if (dbDuplicateIds.has(d.playerId)) return false
      if (multiInstanceIds.has(d.playerId)) return false
      if (samePlayerDiffPosIds.has(d.playerId)) return false
      if (differentPlayersIds.has(d.playerId)) return false
      
      const nationalities = new Set(
        d.allFileInstances
          .map(p => p.nationality?.toLowerCase().trim())
          .filter(n => n && n !== '')
      )
      
      const positions = new Set(d.allFileInstances.map(p => p.position))
      
      return nationalities.size <= 1 && positions.size === 1
    })
    
    // Total unique duplicates (mutually exclusive)
    const totalDuplicates = dbDups.length + multiInstance.length + samePlayerDiffPos.length + 
                           differentPlayers.length + samePlayerSamePos.length
    
    // Calculate total duplicate INSTANCES (not just groups)
    let totalDuplicateInstances = 0
    for (const dup of [...dbDups, ...multiInstance, ...samePlayerDiffPos, ...differentPlayers, ...samePlayerSamePos]) {
      if (dup.duplicateType === 'file-vs-file' && dup.allFileInstances) {
        // For file-vs-file, count all instances in the group
        totalDuplicateInstances += dup.allFileInstances.length
      } else {
        // For file-vs-db, count as 1
        totalDuplicateInstances += 1
      }
    }
    
    // Calculate actual new players (excluding duplicates)
    const duplicatePlayerIds = new Set(preview.duplicates.map(d => d.playerId))
    const actualNewPlayers = preview.newPlayers.filter(p => !duplicatePlayerIds.has(p.playerId))
    
    // Total unique players = new + changed + unchanged + duplicates (representatives only)
    const totalUniquePlayers = actualNewPlayers.length + preview.changedPlayers.length + 
                              preview.unchangedPlayers.length + totalDuplicates
    
    return {
      total: preview.stats.total, // Raw count from file (all instances)
      totalUnique: totalUniquePlayers, // Unique players (excluding duplicate instances)
      new: actualNewPlayers.length,
      changed: preview.stats.changed,
      unchanged: preview.stats.unchanged,
      duplicates: totalDuplicates, // Number of duplicate groups
      duplicateInstances: totalDuplicateInstances // Total duplicate instances
    }
  }
  
  const dynamicStats = getDynamicStats()

  // Calculate selected duplicate instances based on resolutions
  const getSelectedDuplicateCount = () => {
    let count = 0
    
    for (const duplicate of preview.duplicates) {
      const resolution = duplicateResolutions[duplicate.playerId]
      
      if (duplicate.duplicateType === 'file-vs-file' && duplicate.allFileInstances) {
        // For file-vs-file duplicates, count based on resolution
        if (resolution) {
          if (resolution === 'skip') {
            count += 0
          } else if (resolution.includes(',')) {
            // Comma-separated IDs means multiple instances selected
            count += resolution.split(',').length
          } else {
            // Single ID selected
            count += 1
          }
        } else {
          // No resolution yet - default to first instance (1 player)
          count += 1
        }
      } else if (duplicate.duplicateType === 'file-vs-db') {
        // For file-vs-db duplicates, check resolution
        if (resolution === 'skip') {
          count += 0
        } else if (resolution === 'replace' || resolution === 'add') {
          count += 1
        } else {
          // No resolution yet - default to skip (0 players)
          count += 0
        }
      }
    }
    
    return count
  }
  
  const selectedDuplicateCount = getSelectedDuplicateCount()

  // Categorize duplicates into mutually exclusive groups with correct priority
  
  // Priority 1: Database duplicates (file vs existing database) - highest priority
  const dbDuplicates = preview.duplicates.filter(d => d.duplicateType === 'file-vs-db')
  const dbDuplicateIds = new Set(dbDuplicates.map(d => d.playerId))
  
  // Priority 2: Duplicates with 3+ instances (for faster processing)
  const multiInstanceDuplicates = preview.duplicates.filter(d => {
    if (d.duplicateType !== 'file-vs-file' || !d.allFileInstances) return false
    if (dbDuplicateIds.has(d.playerId)) return false
    
    return d.allFileInstances.length >= 3
  })
  const multiInstanceIds = new Set(multiInstanceDuplicates.map(d => d.playerId))
  
  // Priority 3: Same player, different positions (same name + same nationality but different positions)
  const samePlayerDifferentPosition = preview.duplicates.filter(d => {
    if (d.duplicateType !== 'file-vs-file' || !d.allFileInstances) return false
    if (dbDuplicateIds.has(d.playerId)) return false
    if (multiInstanceIds.has(d.playerId)) return false
    
    const nationalities = new Set(
      d.allFileInstances
        .map(p => p.nationality?.toLowerCase().trim())
        .filter(n => n && n !== '')
    )
    
    const positions = new Set(d.allFileInstances.map(p => p.position))
    
    // Same nationality BUT different positions
    return nationalities.size <= 1 && positions.size > 1
  })
  const samePlayerDiffPosIds = new Set(samePlayerDifferentPosition.map(d => d.playerId))
  
  // Priority 4: Different players (same name + different nationalities)
  const differentPlayersDuplicates = preview.duplicates.filter(d => {
    if (d.duplicateType !== 'file-vs-file' || !d.allFileInstances) return false
    if (dbDuplicateIds.has(d.playerId)) return false
    if (multiInstanceIds.has(d.playerId)) return false
    if (samePlayerDiffPosIds.has(d.playerId)) return false
    
    const nationalities = new Set(
      d.allFileInstances
        .map(p => p.nationality?.toLowerCase().trim())
        .filter(n => n && n !== '')
    )
    
    // Different nationalities = different players
    return nationalities.size > 1
  })
  const differentPlayersIds = new Set(differentPlayersDuplicates.map(d => d.playerId))
  
  // Priority 5 (LOWEST): Same player, same position, same nationality - LAST PRIORITY
  const samePlayerSamePosition = preview.duplicates.filter(d => {
    if (d.duplicateType !== 'file-vs-file' || !d.allFileInstances) return false
    if (dbDuplicateIds.has(d.playerId)) return false
    if (multiInstanceIds.has(d.playerId)) return false
    if (samePlayerDiffPosIds.has(d.playerId)) return false
    if (differentPlayersIds.has(d.playerId)) return false
    
    const nationalities = new Set(
      d.allFileInstances
        .map(p => p.nationality?.toLowerCase().trim())
        .filter(n => n && n !== '')
    )
    
    const positions = new Set(d.allFileInstances.map(p => p.position))
    
    // Same nationality AND same position
    return nationalities.size <= 1 && positions.size === 1
  })

    // Get players for current tab
    const getTabPlayers = () => {
      switch (activeTab) {
        case 'new':
          return preview.newPlayers
        case 'changed':
          return preview.changedPlayers.map(c => c.newStats)
        case 'unchanged':
          return preview.unchangedPlayers
        case 'duplicates':
          // Filter duplicates based on sub-tab
          let duplicatesToShow = preview.duplicates
          
          if (duplicateSubTab === 'same-player-same-pos') {
            duplicatesToShow = samePlayerSamePosition
          } else if (duplicateSubTab === 'same-player-diff-pos') {
            duplicatesToShow = samePlayerDifferentPosition
          } else if (duplicateSubTab === 'different-players') {
            duplicatesToShow = differentPlayersDuplicates
          } else if (duplicateSubTab === 'multi-instance') {
            duplicatesToShow = multiInstanceDuplicates
          } else if (duplicateSubTab === 'db-duplicates') {
            duplicatesToShow = dbDuplicates
          }
          
          // For duplicates tab, show only the representative (first) player from each duplicate group
          return duplicatesToShow.map(d => 
            preview.players.find(p => p.playerId === d.playerId)!
          ).filter(Boolean)
        case 'all':
        default:
          return preview.players
      }
    }

  // Filter players
  const filteredPlayers = getTabPlayers().filter(player => {
    const matchesSearch = player.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.teamName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPosition = positionFilter === 'all' || player.position === positionFilter
    return matchesSearch && matchesPosition
  })

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + itemsPerPage)

  // Get change info for a player
  const getChangeInfo = (playerId: string) => {
    return preview.changedPlayers.find(c => c.playerId === playerId)
  }

  // Get duplicate info for a player
  const getDuplicateInfo = (playerId: string) => {
    return preview.duplicates.find(d => d.playerId === playerId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Preview Import</h2>
            <p className="text-gray-400">
              Review and select players to import. {actualSelectedCount} of {dynamicStats.total} selected
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleAll}
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all font-bold text-sm"
            >
              {selectedPlayers.size === preview.players.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* Bulk Actions for Duplicates */}
        {preview.duplicates.length > 0 && activeTab === 'duplicates' && (
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-blue-400 mb-1">⚡ Bulk Actions</div>
                <div className="text-xs text-gray-400">
                  Apply actions to multiple duplicates at once
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (!onBatchResolveDuplicates) return
                  
                  // Build batch of resolutions - only for same-player duplicates
                  const newResolutions: Record<string, string> = {}
                  const targetDuplicates = duplicateSubTab === 'all' 
                    ? [...samePlayerSamePosition, ...samePlayerDifferentPosition]
                    : duplicateSubTab === 'same-player-same-pos'
                    ? samePlayerSamePosition
                    : duplicateSubTab === 'same-player-diff-pos'
                    ? samePlayerDifferentPosition
                    : duplicateSubTab === 'multi-instance'
                    ? multiInstanceDuplicates.filter(d => {
                        // Only same player duplicates from multi-instance
                        if (!d.allFileInstances) return false
                        const nationalities = new Set(
                          d.allFileInstances.map(p => p.nationality?.toLowerCase().trim()).filter(n => n && n !== '')
                        )
                        return nationalities.size <= 1
                      })
                    : []
                  
                  targetDuplicates.forEach(d => {
                    if (d.duplicateType === 'file-vs-file' && d.allFileInstances) {
                      // Select non-free agent instance
                      const nonFreeAgent = d.allFileInstances.find(
                        p => !p.teamName.toLowerCase().includes('free agent')
                      )
                      if (nonFreeAgent) {
                        newResolutions[d.playerId] = nonFreeAgent.playerId
                      }
                    }
                  })
                  onBatchResolveDuplicates(newResolutions)
                }}
                disabled={duplicateSubTab === 'different-players' || duplicateSubTab === 'db-duplicates'}
                className="px-4 py-3 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="mb-1">Select All Non-Free Agents</div>
                <div className="text-xs opacity-80 font-normal">
                  {duplicateSubTab === 'same-player-same-pos' || duplicateSubTab === 'same-player-diff-pos' || duplicateSubTab === 'all' || duplicateSubTab === 'multi-instance'
                    ? `For same player duplicates, choose the one with a real team`
                    : 'Only available for same player duplicates'
                  }
                </div>
              </button>
              <button
                onClick={() => {
                  if (!onBatchResolveDuplicates) return
                  
                  // Build batch of resolutions - only for db duplicates
                  const newResolutions: Record<string, string> = {}
                  const targetDuplicates = duplicateSubTab === 'all' 
                    ? dbDuplicates 
                    : duplicateSubTab === 'db-duplicates'
                    ? dbDuplicates
                    : []
                  
                  targetDuplicates.forEach(d => {
                    if (d.duplicateType === 'file-vs-db') {
                      newResolutions[d.playerId] = 'skip'
                    }
                  })
                  onBatchResolveDuplicates(newResolutions)
                }}
                disabled={duplicateSubTab === 'same-player-same-pos' || duplicateSubTab === 'same-player-diff-pos' || duplicateSubTab === 'different-players' || duplicateSubTab === 'multi-instance'}
                className="px-4 py-3 bg-gray-500/20 border border-gray-500/30 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-all font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="mb-1">Skip All DB Duplicates</div>
                <div className="text-xs opacity-80 font-normal">
                  {duplicateSubTab === 'db-duplicates' || duplicateSubTab === 'all'
                    ? `Skip ${duplicateSubTab === 'all' ? dbDuplicates.length : 'all'} database duplicates`
                    : 'Only available for database duplicates'
                  }
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="rounded-xl bg-black/30 border border-white/5 p-4">
            <div className="text-2xl font-black text-white">{dynamicStats.total}</div>
            <div className="text-xs text-gray-400">Total Records</div>
          </div>
          <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4">
            <div className="text-2xl font-black text-cyan-400">{dynamicStats.totalUnique}</div>
            <div className="text-xs text-gray-400">Unique Players</div>
          </div>
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
            <div className="text-2xl font-black text-emerald-400">{dynamicStats.new}</div>
            <div className="text-xs text-gray-400">New Players</div>
          </div>
          <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4">
            <div className="text-2xl font-black text-orange-400">{dynamicStats.changed}</div>
            <div className="text-xs text-gray-400">Changed</div>
          </div>
          <div className="rounded-xl bg-gray-500/10 border border-gray-500/20 p-4">
            <div className="text-2xl font-black text-gray-400">{dynamicStats.unchanged}</div>
            <div className="text-xs text-gray-400">Unchanged</div>
          </div>
          <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4">
            <div className="text-2xl font-black text-yellow-400">{selectedDuplicateCount} / {dynamicStats.duplicateInstances}</div>
            <div className="text-xs text-gray-400">Duplicates Selected</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === 'all'
              ? 'bg-cyan-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          All ({preview.players.length})
        </button>
        <button
          onClick={() => { setActiveTab('new'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === 'new'
              ? 'bg-emerald-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          New ({dynamicStats.new})
        </button>
        {preview.mode === 'update' && (
          <button
            onClick={() => { setActiveTab('changed'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'changed'
                ? 'bg-orange-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Changed ({dynamicStats.changed})
          </button>
        )}
        <button
          onClick={() => { setActiveTab('unchanged'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === 'unchanged'
              ? 'bg-gray-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Unchanged ({dynamicStats.unchanged})
        </button>
        {dynamicStats.duplicates > 0 && (
          <button
            onClick={() => { setActiveTab('duplicates'); setDuplicateSubTab('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'duplicates'
                ? 'bg-yellow-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Duplicates ({dynamicStats.duplicates})
          </button>
        )}
      </div>

      {/* Duplicate Sub-Tabs */}
      {activeTab === 'duplicates' && preview.stats.duplicates > 0 && (
        <div className="flex gap-2 overflow-x-auto pl-4">
          <button
            onClick={() => { setDuplicateSubTab('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              duplicateSubTab === 'all'
                ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            All ({samePlayerSamePosition.length + samePlayerDifferentPosition.length + differentPlayersDuplicates.length + multiInstanceDuplicates.length + dbDuplicates.length})
          </button>
          <button
            onClick={() => { setDuplicateSubTab('same-player-same-pos'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              duplicateSubTab === 'same-player-same-pos'
                ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            Same Player - Same Position ({samePlayerSamePosition.length})
          </button>
          <button
            onClick={() => { setDuplicateSubTab('same-player-diff-pos'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              duplicateSubTab === 'same-player-diff-pos'
                ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            Same Player - Different Position ({samePlayerDifferentPosition.length})
          </button>
          <button
            onClick={() => { setDuplicateSubTab('different-players'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              duplicateSubTab === 'different-players'
                ? 'bg-purple-500/20 border-2 border-purple-500 text-purple-400'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            Different Players ({differentPlayersDuplicates.length})
          </button>
          <button
            onClick={() => { setDuplicateSubTab('multi-instance'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              duplicateSubTab === 'multi-instance'
                ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            3+ Instances ({multiInstanceDuplicates.length})
          </button>
          <button
            onClick={() => { setDuplicateSubTab('db-duplicates'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              duplicateSubTab === 'db-duplicates'
                ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            Already in Database ({dbDuplicates.length})
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by player name or team..."
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Position Filter */}
          <div>
            <select
              value={positionFilter}
              onChange={(e) => { setPositionFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Positions</option>
              <option value="GK">Goalkeeper (GK)</option>
              <optgroup label="Defenders">
                <option value="CB">Center Back (CB)</option>
                <option value="LB">Left Back (LB)</option>
                <option value="RB">Right Back (RB)</option>
              </optgroup>
              <optgroup label="Midfielders">
                <option value="DMF">Defensive Midfielder (DMF)</option>
                <option value="CMF">Central Midfielder (CMF)</option>
                <option value="LMF">Left Midfielder (LMF)</option>
                <option value="RMF">Right Midfielder (RMF)</option>
                <option value="AMF">Attacking Midfielder (AMF)</option>
              </optgroup>
              <optgroup label="Forwards">
                <option value="SS">Second Striker (SS)</option>
                <option value="LWF">Left Wing Forward (LWF)</option>
                <option value="RWF">Right Wing Forward (RWF)</option>
                <option value="CF">Center Forward (CF)</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Player List */}
      <div className="space-y-4">
        {paginatedPlayers.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-12 text-center">
            <div className="text-gray-400">No players found matching your filters</div>
          </div>
        ) : (
          paginatedPlayers.map((player) => {
            const changeInfo = getChangeInfo(player.playerId)
            const duplicateInfo = getDuplicateInfo(player.playerId)

            if (activeTab === 'changed' && changeInfo) {
              return (
                <ChangeComparisonCard
                  key={player.playerId}
                  change={changeInfo}
                  isSelected={selectedPlayers.has(player.playerId)}
                  onToggle={() => onTogglePlayer(player.playerId)}
                />
              )
            }

            if (activeTab === 'duplicates' && duplicateInfo) {
              return (
                <DuplicateResolver
                  key={player.playerId}
                  player={player}
                  duplicate={duplicateInfo}
                  resolution={duplicateResolutions[player.playerId]}
                  onResolve={(resolution) => onResolveDuplicate(player.playerId, resolution)}
                />
              )
            }

            return (
              <PlayerCard
                key={player.playerId}
                player={player}
                isSelected={selectedPlayers.has(player.playerId)}
                onToggle={() => onTogglePlayer(player.playerId)}
                isDuplicate={!!duplicateInfo}
                isChanged={!!changeInfo}
              />
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-bold transition-all ${
                    currentPage === pageNum
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
          >
            Next
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={selectedPlayers.size === 0}
          className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all"
        >
          Continue with {actualSelectedCount} Players
        </button>
      </div>
    </div>
  )
}
