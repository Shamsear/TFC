'use client'

import { NameDuplicateGroup } from '@/app/api/import/preview/route'
import { getPlayerCardById } from '@/lib/image-cdn'

interface NameDuplicateGroupCardProps {
  group: NameDuplicateGroup
  selectedPlayers: Set<string>
  onTogglePlayer: (playerId: string) => void
}

export default function NameDuplicateGroupCard({
  group,
  selectedPlayers,
  onTogglePlayer
}: NameDuplicateGroupCardProps) {
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

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Existing Database Player Header */}
      <div className="p-4 bg-amber-500/10 border-b border-white/5 flex items-center gap-4">
        {/* Database Player Card Avatar */}
        <div className="flex-shrink-0 w-12 h-16 rounded bg-black/40 border border-white/10 overflow-hidden relative">
          <img
            src={getPlayerCardById(group.existingPlayer.playerId)}
            alt={group.existingPlayer.name}
            onError={(e) => {
              e.currentTarget.src = '/default-player-card.png'
            }}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">{group.existingPlayer.name}</h3>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase">
                Same Name & Nation Match
              </span>
            </div>
            <span className="text-xs text-gray-400 font-mono">Existing ID: {group.existingPlayer.playerId || 'None'}</span>
          </div>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
          <div>
            <span className="text-gray-500 mr-1.5">Database Team:</span>
            <span className="font-bold">{group.existingPlayer.team}</span>
          </div>
          <span>•</span>
          <div>
            <span className="text-gray-500 mr-1.5">Rating/Pos:</span>
            <span className="flex inline-flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getPositionColor(group.existingPlayer.position)}`}>
                {group.existingPlayer.position}
              </span>
              <span className="font-bold text-white">{group.existingPlayer.rating}</span>
            </span>
          </div>
          <span>•</span>
          <div>
            <span className="text-gray-500 mr-1.5">Nationality:</span>
            <span>{group.existingPlayer.nationality}</span>
          </div>
          <span>•</span>
          <div>
            <span className="text-gray-500 mr-1.5">Card Type:</span>
            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-500/20 border border-amber-500/30 text-amber-400 uppercase">
              {group.existingPlayer.featured || 'Standard'}
            </span>
          </div>
        </div>
      </div>
    </div>

      {/* New Cards List */}
      <div className="p-4 space-y-3 bg-black/20">
        <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
          NEW UPLOADED CARDS ({group.newCards.length})
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {group.newCards.map(card => {
            const isSelected = selectedPlayers.has(card.playerId)
            return (
              <div
                key={card.playerId}
                onClick={() => onTogglePlayer(card.playerId)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onTogglePlayer(card.playerId)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 rounded border-2 border-white/20 bg-black/50 checked:bg-amber-500 checked:border-amber-500 cursor-pointer flex-shrink-0"
                />

                {/* Sub-card Card Avatar */}
                <div className="flex-shrink-0 w-10 h-14 rounded bg-black/40 border border-white/10 overflow-hidden relative">
                  <img
                    src={getPlayerCardById(card.playerId)}
                    alt={card.playerName}
                    onError={(e) => {
                      e.currentTarget.src = '/default-player-card.png'
                    }}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-white font-bold truncate">{card.teamName}</span>
                    <span className="text-xs text-amber-300 font-mono pl-2">ID: {card.playerId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getPositionColor(card.position)}`}>
                      {card.position}
                    </span>
                    <span className="text-sm text-gray-400">Rating: <strong className="text-white">{card.overallRating}</strong></span>
                    {card.featured && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-purple-500/20 border border-purple-500/30 text-purple-400 uppercase">
                        {card.featured}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 italic truncate">{card.playingStyle}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
