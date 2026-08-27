'use client'

import { NameDuplicateInfo } from '@/app/api/import/preview/route'

interface NameDuplicateCardProps {
  duplicate: NameDuplicateInfo
  isSelected: boolean
  onToggle: () => void
}

export default function NameDuplicateCard({
  duplicate,
  isSelected,
  onToggle
}: NameDuplicateCardProps) {
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
    <div 
      className={`rounded-2xl border-2 transition-all cursor-pointer ${
        isSelected
          ? 'bg-amber-500/10 border-amber-500'
          : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
      onClick={onToggle}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded border-2 border-white/20 bg-black/50 checked:bg-amber-500 checked:border-amber-500 cursor-pointer"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-black text-white">{duplicate.player.playerName}</h3>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase">
                Same Name & Nation Match
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
              <span>{duplicate.player.nationality}</span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/30 border border-white/5 rounded-xl p-4">
          {/* Database Player */}
          <div className="border-r border-white/5 pr-4 last:border-r-0">
            <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">EXISTING IN DATABASE</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Player ID:</span>
                <span className="text-white font-mono">{duplicate.existingPlayer.playerId || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Team:</span>
                <span className="text-white font-bold">{duplicate.existingPlayer.team}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rating/Pos:</span>
                <span className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getPositionColor(duplicate.existingPlayer.position)}`}>
                    {duplicate.existingPlayer.position}
                  </span>
                  <span className="text-white font-bold">{duplicate.existingPlayer.rating}</span>
                </span>
              </div>
            </div>
          </div>

          {/* New Uploaded Player */}
          <div className="pl-4 sm:pl-0">
            <div className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wider">NEW UPLOADED CARD</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Player ID:</span>
                <span className="text-amber-300 font-mono font-bold">{duplicate.player.playerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Team:</span>
                <span className="text-white font-bold">{duplicate.player.teamName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rating/Pos:</span>
                <span className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getPositionColor(duplicate.player.position)}`}>
                    {duplicate.player.position}
                  </span>
                  <span className="text-white font-bold">{duplicate.player.overallRating}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
