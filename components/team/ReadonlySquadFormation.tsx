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
  
  const benchCapacity = Math.max(7, allPlayers.length - positions.filter((p: any) => p.playerId).length)

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Starting 11</h3>
        <div className="px-3 py-1 bg-black/50 rounded-lg text-[#E8A800] text-sm font-bold border border-white/10">
          Formation: {type || 'Unknown'}
        </div>
      </div>

      <div className="relative w-full max-w-2xl mx-auto aspect-[2/3] rounded-xl overflow-hidden" style={{ boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 60px rgba(0,0,0,0.3)' }}>
        {/* Grass base */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #1a5c2a 0%, #1e6b30 50%, #1a5c2a 100%)' }} />
        {/* Grass stripes */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 40px, transparent 40px, transparent 80px)',
        }} />
        {/* Radial lighting from center */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 70%)' }} />
        {/* Pitch border */}
        <div className="absolute inset-[6px] border border-white/25 rounded" />
        {/* Field markings */}
        <div className="absolute inset-0">
          {/* Top penalty box */}
          <div className="absolute top-[6px] left-1/2 -translate-x-1/2 border border-white/25" style={{ width: '44%', height: '14%' }} />
          {/* Top 6-yard box */}
          <div className="absolute top-[6px] left-1/2 -translate-x-1/2 border border-white/20" style={{ width: '22%', height: '6%' }} />
          {/* Top penalty spot */}
          <div className="absolute w-1 h-1 rounded-full bg-white/30" style={{ top: '17%', left: '50%', transform: 'translateX(-50%)' }} />
          {/* Bottom penalty box */}
          <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 border border-white/25" style={{ width: '44%', height: '14%' }} />
          {/* Bottom 6-yard box */}
          <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 border border-white/20" style={{ width: '22%', height: '6%' }} />
          {/* Bottom penalty spot */}
          <div className="absolute w-1 h-1 rounded-full bg-white/30" style={{ bottom: '17%', left: '50%', transform: 'translateX(-50%)' }} />
          {/* Halfway line */}
          <div className="absolute top-1/2 left-[6px] right-[6px] h-px bg-white/25" />
          {/* Centre circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/25 rounded-full" style={{ width: '22%', aspectRatio: '1' }} />
          {/* Centre spot */}
          <div className="absolute w-1.5 h-1.5 rounded-full bg-white/30" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
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
                <div className="relative group w-7 h-[42px] sm:w-16 sm:h-24 md:w-20 md:h-28 -mt-2 sm:-mt-4 transition-transform hover:scale-105">
                  <PlayerCardImage
                    playerCardId={player.playerId || player.id}
                    playerName={player.name}
                  />
                </div>
              ) : (
                <div className="w-6 h-6 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all border-white/20 bg-black/40">
                  <svg className="w-2 h-2 sm:w-4 sm:h-4 mb-0.5 text-white/20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                  <span className="text-[6px] sm:text-[10px] font-black leading-none text-white/40">{pos.position || pos.label}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Substitutes Bench */}
      <div className="mt-8 bg-black/30 rounded-xl p-4 border border-white/10 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#D4CCBB] text-sm font-bold uppercase tracking-wider">Substitutes Bench ({substitutes.length}/{benchCapacity})</h3>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4 justify-center">
          {Array.from({ length: benchCapacity }).map((_, idx) => {
            const subId = substitutes[idx]
            const player = subId ? getPlayerById(subId) : null

            if (player) {
              return (
                <div key={`sub-${idx}`} className="relative group w-8 h-[48px] sm:w-16 sm:h-24 md:w-20 md:h-28 transition-transform hover:scale-105">
                  <PlayerCardImage
                    playerCardId={player.playerId || player.id}
                    playerName={player.name}
                  />
                </div>
              )
            }

            return (
              <div key={`sub-empty-${idx}`} className="w-8 h-[48px] sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center bg-black/20">
                <svg className="w-3 h-3 sm:w-6 sm:h-6 text-white/10 mb-1 sm:mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-[6px] sm:text-[10px] text-white/20 font-black tracking-wider">BENCH</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
