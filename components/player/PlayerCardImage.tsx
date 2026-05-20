'use client'

import Image from 'next/image'
import { useState } from 'react'
import { getPlayerCardById } from '@/lib/image-cdn'

interface PlayerCardImageProps {
  playerCardId: string
  playerName: string
  fallbackUrl?: string
}

export default function PlayerCardImage({ playerCardId, playerName, fallbackUrl }: PlayerCardImageProps) {
  const [imgSrc, setImgSrc] = useState(getPlayerCardById(playerCardId))

  return (
    <Image
      src={imgSrc}
      alt={playerName}
      fill
      className="object-contain"
      priority
      unoptimized
      onError={() => {
        setImgSrc(fallbackUrl || '/default-player-card.png')
      }}
    />
  )
}
