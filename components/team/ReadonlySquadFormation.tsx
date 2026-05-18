'use client'

import Image from 'next/image'
import { getPhotoUrlFromDb } from '@/lib/image-cdn'
import PlayerCardImage from '@/components/player/PlayerCardImage'

interface Player {
  id: string
  name: string
  photoUrl: string
  position: string
  overallRating: number
  playerId?: string
}

interface ReadonlySquadFormationProps {
  formation: any
  allPlayers: Player[]
}

export default function ReadonlySquadFormation({ formation, allPlayers }: ReadonlySquadFormationProps) {
  if (!formation || !formation.positions || formation.positions.length === 0) {
    return (
      <div className="text-center py-12 bg-black/30 rounded-xl border border-white/10">
        <div className="text-[#7A7367] mb-2">No formation set</div>
        <p className="text-sm text-[#D4CCBB]">This team hasn't saved their starting 11 yet.</p>
      </div>
    )
  }

  const { type, positions, substitutes = [] } = formation

  const getPlayerById = (id: string) => allPlayers.find(p => p.id === id)

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Starting 11</h3>
        <div className="px-3 py-1 bg-black/50 rounded-lg text-[#E8A800] text-sm font-bold border border-white/10">
          Formation: {type || 'Unknown'}
        </div>
      </div>

      <div className="relative w-full max-w-2xl mx-auto aspect-[2/3] bg-gradient-to-b from-green-800 to-green-900 rounded-lg border-4 border-white/20 overflow-hidden">
        {/* Field markings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-16 border-2 border-white/30 border-t-0" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-16 border-2 border-white/30 border-b-0" />
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full" />
        </div>

        {/* Player Positions */}
        {positions.map((pos: any, idx: number) => {
          const player = pos.playerId ? getPlayerById(pos.playerId) : null
          
          return (
            <div
              key={idx}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              {player ? (
                <div className="relative group w-12 h-[68px] sm:w-20 sm:h-28 -mt-2 sm:-mt-4 transition-transform hover:scale-105 hover:z-10 cursor-pointer">
                  <PlayerCardImage
                    playerCardId={player.playerId || player.id}
                    playerName={player.name}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                  <span className="text-[10px] sm:text-xs font-bold text-white/50">{pos.label}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {substitutes && substitutes.length > 0 && (
        <div className="mt-8 bg-black/30 rounded-xl p-4 border border-white/10">
          <h3 className="text-[#D4CCBB] text-sm font-bold mb-4 uppercase tracking-wider">Substitutes Bench ({substitutes.length})</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {substitutes.map((subId: string, idx: number) => {
              const player = getPlayerById(subId)
              if (!player) return null
              return (
                <div key={idx} className="relative group w-12 h-[68px] sm:w-20 sm:h-28 transition-transform hover:scale-105 cursor-pointer">
                  <PlayerCardImage
                    playerCardId={player.playerId || player.id}
                    playerName={player.name}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
