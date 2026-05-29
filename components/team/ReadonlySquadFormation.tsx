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
  const isDefaultEmpty = !formation || !formation.positions || formation.positions.length === 0

  const activeFormation = !isDefaultEmpty ? formation : {
    type: '4-3-3',
    positions: [
      { position: "GK", x: 50, y: 90 },
      { position: "LB", x: 20, y: 70 },
      { position: "CB", x: 40, y: 75 },
      { position: "CB", x: 60, y: 75 },
      { position: "RB", x: 80, y: 70 },
      { position: "CMF", x: 35, y: 50 },
      { position: "CMF", x: 50, y: 45 },
      { position: "CMF", x: 65, y: 50 },
      { position: "LWF", x: 20, y: 20 },
      { position: "CF", x: 50, y: 15 },
      { position: "RWF", x: 80, y: 20 },
    ],
    substitutes: []
  }

  const { type, positions, substitutes = [] } = activeFormation
  
  const getPlayerById = (id: string) => allPlayers.find(p => p.id === id)
  
  const benchCapacity = Math.max(7, allPlayers.length - positions.filter((p: any) => p.playerId).length)

  return (
    <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-3xl p-4 sm:p-8 shadow-2xl relative backdrop-blur-2xl">
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-xl font-black text-white tracking-tight">Starting 11</h3>
        <div className="px-3 py-1 bg-black/50 rounded-lg text-[#E8A800] text-sm font-bold border border-white/10 font-mono shadow-[0_0_15px_rgba(232,168,0,0.1)]">
          {isDefaultEmpty ? 'Formation: Not Set' : `Formation: ${type}`}
        </div>
      </div>

      <div
        className="relative w-full max-w-2xl mx-auto aspect-[2/3] rounded-2xl overflow-hidden border border-emerald-500/20"
        style={{
          boxShadow: '0 15px 50px -10px rgba(0,0,0,0.9), inset 0 0 80px rgba(0,0,0,0.6)',
          background: 'radial-gradient(circle at center, #0f271a 0%, #07130d 65%, #030805 100%)',
        }}
      >
        {/* Tech Tactical Mesh */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(16,185,129,0.08) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Inner Glow Center Spotlight */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(16,185,129,0.12) 0%, transparent 70%)' }}
        />

        {/* Pitch Outlines */}
        <div className="absolute inset-[8px] border border-emerald-500/25 rounded-xl shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]" />

        {/* Field markings with neon emerald lines */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top penalty box */}
          <div className="absolute top-[8px] left-1/2 -translate-x-1/2 border border-emerald-500/20" style={{ width: '44%', height: '14%' }} />
          {/* Top 6-yard box */}
          <div className="absolute top-[8px] left-1/2 -translate-x-1/2 border border-emerald-500/15" style={{ width: '22%', height: '6%' }} />
          {/* Top penalty spot */}
          <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/40" style={{ top: '17%', left: '50%', transform: 'translateX(-50%)' }} />
          
          {/* Bottom penalty box */}
          <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 border border-emerald-500/20" style={{ width: '44%', height: '14%' }} />
          {/* Bottom 6-yard box */}
          <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 border border-emerald-500/15" style={{ width: '22%', height: '6%' }} />
          {/* Bottom penalty spot */}
          <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/40" style={{ bottom: '17%', left: '50%', transform: 'translateX(-50%)' }} />
          
          {/* Halfway line */}
          <div className="absolute top-1/2 left-[8px] right-[8px] h-px bg-emerald-500/25" />
          {/* Centre circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-emerald-500/25 rounded-full" style={{ width: '24%', aspectRatio: '1' }} />
          {/* Centre spot */}
          <div className="absolute w-2 h-2 rounded-full bg-emerald-400/40" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
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
                <div className="relative group w-14 h-[84px] sm:w-20 sm:h-[120px] -mt-4 sm:-mt-8 transition-transform hover:scale-105 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  <PlayerCardImage
                    playerCardId={player.playerId || player.id}
                    playerName={player.name}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 sm:w-14 sm:h-14 rounded-full border border-white/10 bg-black/50 backdrop-blur-md flex flex-col items-center justify-center transition-all hover:border-[#E8A800]/40 hover:bg-[#E8A800]/10 hover:shadow-[0_0_10px_rgba(232,168,0,0.15)]">
                  <svg className="w-2.5 h-2.5 sm:w-5 sm:h-5 mb-0.5 text-white/20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                  <span className="text-[6px] sm:text-[9px] font-black leading-none uppercase tracking-wide font-mono text-white/40">{pos.position || pos.label}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Substitutes Bench */}
      <div className="mt-8 bg-black/35 rounded-2xl p-5 border border-white/5 relative overflow-hidden max-w-2xl mx-auto">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)] animate-pulse" />
            <h3 className="text-gray-300 text-xs font-black uppercase tracking-wider font-mono">Substitutes Bench ({substitutes.length}/{benchCapacity})</h3>
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 justify-items-center">
          {Array.from({ length: benchCapacity }).map((_, idx) => {
            const subId = substitutes[idx]
            const player = subId ? getPlayerById(subId) : null

            if (player) {
              return (
                <div key={`sub-${idx}`} className="relative group w-12 h-[72px] sm:w-16 sm:h-[96px] transition-all hover:scale-105 cursor-pointer filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                  <PlayerCardImage
                    playerCardId={player.playerId || player.id}
                    playerName={player.name}
                  />
                </div>
              )
            }

            return (
              <div key={`sub-empty-${idx}`} className="w-12 h-[72px] sm:w-16 sm:h-[96px] rounded-xl border border-dashed border-white/5 bg-black/30 flex flex-col items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white/10 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-[6px] sm:text-[9px] text-white/20 font-black tracking-widest font-mono">BENCH</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
