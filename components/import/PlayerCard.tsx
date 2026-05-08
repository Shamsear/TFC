'use client'

import { useState } from 'react'
import { EFootballPlayer } from '@/lib/sqlite-parser'

interface PlayerCardProps {
  player: EFootballPlayer
  isSelected: boolean
  onToggle: () => void
  isDuplicate?: boolean
  isChanged?: boolean
}

export default function PlayerCard({
  player,
  isSelected,
  onToggle,
  isDuplicate,
  isChanged
}: PlayerCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
      // Defenders
      case 'CB': return 'bg-blue-500/20 border-blue-500/30 text-blue-400'
      case 'LB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      case 'RB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      // Midfielders
      case 'DMF': return 'bg-green-600/20 border-green-600/30 text-green-500'
      case 'CMF': return 'bg-green-500/20 border-green-500/30 text-green-400'
      case 'LMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'RMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'AMF': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
      // Forwards
      case 'SS': return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
      case 'LWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'RWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'CF': return 'bg-red-500/20 border-red-500/30 text-red-400'
      default: return 'bg-gray-500/20 border-gray-500/30 text-gray-400'
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 85) return 'text-purple-400'
    if (rating >= 80) return 'text-cyan-400'
    if (rating >= 75) return 'text-emerald-400'
    if (rating >= 70) return 'text-yellow-400'
    return 'text-gray-400'
  }

  return (
    <div className={`rounded-2xl border-2 transition-all ${
      isSelected
        ? 'bg-cyan-500/10 border-cyan-500'
        : 'bg-white/5 border-white/10 hover:border-white/20'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <div className="flex-shrink-0 pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              className="w-5 h-5 rounded border-2 border-white/20 bg-black/50 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer"
            />
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-black text-white truncate">
                    {player.playerName}
                  </h3>
                  {isDuplicate && (
                    <span className="px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold">
                      DUPLICATE
                    </span>
                  )}
                  {isChanged && (
                    <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold">
                      CHANGED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>{player.teamName}</span>
                  <span>•</span>
                  <span>{player.nationality}</span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex-shrink-0">
                <div className={`text-3xl font-black ${getRatingColor(player.overallRating)}`}>
                  {player.overallRating}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-lg border font-bold text-sm ${getPositionColor(player.position)}`}>
                {player.position}
              </span>
              {player.starRating && (
                <span className="px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-bold flex items-center gap-1">
                  {Array.from({ length: player.starRating }).map((_, i) => (
                    <span key={i}>⭐</span>
                  ))}
                </span>
              )}
              <span className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-bold">
                {player.playingStyle}
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm">
                ID: {player.playerId}
              </span>
            </div>

            {/* Top Stats Preview */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {player.position === 'GK' ? (
                <>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Reflexes</div>
                    <div className="text-sm font-bold text-white">{player.gkReflexes}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Reach</div>
                    <div className="text-sm font-bold text-white">{player.gkReach}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Catching</div>
                    <div className="text-sm font-bold text-white">{player.gkCatching}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Parrying</div>
                    <div className="text-sm font-bold text-white">{player.gkParrying}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Pace</div>
                    <div className="text-sm font-bold text-white">{player.speed}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Dribbling</div>
                    <div className="text-sm font-bold text-white">{player.dribbling}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Passing</div>
                    <div className="text-sm font-bold text-white">{player.lowPass}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Physical</div>
                    <div className="text-sm font-bold text-white">{player.physicalContact}</div>
                  </div>
                </>
              )}
            </div>

            {/* Toggle Details Button */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              {showDetails ? '▼ Hide Details' : '▶ Show All Stats'}
            </button>
          </div>
        </div>

        {/* Detailed Stats */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Offensive Stats */}
              <div>
                <div className="text-xs font-bold text-cyan-400 mb-2">OFFENSIVE</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Awareness</span>
                    <span className="text-white font-bold">{player.offensiveAwareness}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ball Control</span>
                    <span className="text-white font-bold">{player.ballControl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dribbling</span>
                    <span className="text-white font-bold">{player.dribbling}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tight Possession</span>
                    <span className="text-white font-bold">{player.tightPossession}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Finishing</span>
                    <span className="text-white font-bold">{player.finishing}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Heading</span>
                    <span className="text-white font-bold">{player.heading}</span>
                  </div>
                </div>
              </div>

              {/* Passing Stats */}
              <div>
                <div className="text-xs font-bold text-green-400 mb-2">PASSING</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Low Pass</span>
                    <span className="text-white font-bold">{player.lowPass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Lofted Pass</span>
                    <span className="text-white font-bold">{player.loftedPass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Set Pieces</span>
                    <span className="text-white font-bold">{player.setPieceTaking}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Curl</span>
                    <span className="text-white font-bold">{player.curl}</span>
                  </div>
                </div>
              </div>

              {/* Physical Stats */}
              <div>
                <div className="text-xs font-bold text-orange-400 mb-2">PHYSICAL</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Speed</span>
                    <span className="text-white font-bold">{player.speed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Acceleration</span>
                    <span className="text-white font-bold">{player.acceleration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Kicking Power</span>
                    <span className="text-white font-bold">{player.kickingPower}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Jumping</span>
                    <span className="text-white font-bold">{player.jumping}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Physical Contact</span>
                    <span className="text-white font-bold">{player.physicalContact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Balance</span>
                    <span className="text-white font-bold">{player.balance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stamina</span>
                    <span className="text-white font-bold">{player.stamina}</span>
                  </div>
                </div>
              </div>

              {/* Defensive Stats */}
              <div>
                <div className="text-xs font-bold text-blue-400 mb-2">DEFENSIVE</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Awareness</span>
                    <span className="text-white font-bold">{player.defensiveAwareness}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tackling</span>
                    <span className="text-white font-bold">{player.tackling}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Aggression</span>
                    <span className="text-white font-bold">{player.aggression}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Engagement</span>
                    <span className="text-white font-bold">{player.defensiveEngagement}</span>
                  </div>
                </div>
              </div>

              {/* Goalkeeper Stats (if applicable) */}
              {player.position === 'GK' && (
                <div>
                  <div className="text-xs font-bold text-yellow-400 mb-2">GOALKEEPER</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Awareness</span>
                      <span className="text-white font-bold">{player.gkAwareness}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Catching</span>
                      <span className="text-white font-bold">{player.gkCatching}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Parrying</span>
                      <span className="text-white font-bold">{player.gkParrying}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reflexes</span>
                      <span className="text-white font-bold">{player.gkReflexes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reach</span>
                      <span className="text-white font-bold">{player.gkReach}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
