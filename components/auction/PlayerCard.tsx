'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export interface PlayerForAuction {
  id: string
  name: string
  photoUrl: string
  position: string
  realWorldClub: string
  overallRating: number
}

interface PlayerCardProps {
  player: PlayerForAuction
  isCurrentBid?: boolean
}

export function PlayerCard({ player, isCurrentBid = false }: PlayerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`relative bg-gradient-to-br from-dark-100 to-zinc-950 rounded-lg p-fluid-md border border-zinc-800 ${
        isCurrentBid ? 'shadow-offset-80' : ''
      }`}
    >
      {/* Player Photo */}
      <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden bg-zinc-800">
        <Image
          src={player.photoUrl}
          alt={player.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={isCurrentBid}
        />
      </div>

      {/* Player Info */}
      <div className="space-y-2">
        <h3 className="text-fluid-2xl font-bold text-white truncate">
          {player.name}
        </h3>
        
        <div className="flex items-center justify-between text-fluid-sm">
          <span className="text-zinc-400">Position</span>
          <span className="text-white font-semibold">{player.position}</span>
        </div>

        <div className="flex items-center justify-between text-fluid-sm">
          <span className="text-zinc-400">Club</span>
          <span className="text-white font-semibold truncate ml-2">{player.realWorldClub}</span>
        </div>

        <div className="flex items-center justify-between text-fluid-sm pt-2 border-t border-zinc-800">
          <span className="text-zinc-400">Overall Rating</span>
          <span className="text-fluid-2xl font-bold text-neon-purple">{player.overallRating}</span>
        </div>
      </div>

      {isCurrentBid && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-neon-purple to-neon-blue text-white text-fluid-xs font-bold px-3 py-1 rounded-full shadow-neon-glow animate-pulse-neon">
          CURRENT BID
        </div>
      )}
    </motion.div>
  )
}
