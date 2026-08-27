'use client'

import { NewDuplicateGroup } from '@/app/api/import/preview/route'
import { getPhotoUrlFromDb } from '@/lib/image-cdn'

interface NewDuplicateGroupCardProps {
  group: NewDuplicateGroup
  selectedPlayers: Set<string>
  onTogglePlayer: (playerId: string) => void
}

export default function NewDuplicateGroupCard({
  group,
  selectedPlayers,
  onTogglePlayer
}: NewDuplicateGroupCardProps) {
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
      {/* File Group Header */}
      <div className="p-4 bg-cyan-500/10 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-white">{group.name}</h3>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase">
              New File Duplicate (Not in DB)
            </span>
          </div>
          <span className="text-xs text-gray-400 font-bold">{group.nationality}</span>
        </div>
      </div>

      {/* New Cards List */}
      <div className="p-4 space-y-3 bg-black/20">
        <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
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
                    ? 'bg-cyan-500/10 border-cyan-500'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onTogglePlayer(card.playerId)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 rounded border-2 border-white/20 bg-black/50 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer flex-shrink-0"
                />

                {/* Sub-card Photo Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-black/40 border border-white/10 overflow-hidden relative">
                  <img
                    src={getPhotoUrlFromDb(card.playerId)}
                    alt={card.playerName}
                    onError={(e) => {
                      e.currentTarget.src = '/default-player.png'
                    }}
                    className="w-full h-full object-cover object-center"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-white font-bold truncate">{card.teamName}</span>
                    <span className="text-xs text-cyan-300 font-mono pl-2">ID: {card.playerId}</span>
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
