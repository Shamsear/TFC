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

  console.log('🖼️ PlayerCardImage component:', {
    playerCardId,
    playerName,
    imgSrc,
    fallbackUrl
  });

  return (
    <Image
      src={imgSrc}
      alt={playerName}
      fill
      className="object-contain"
      priority
      onError={() => {
        console.log('❌ Player card failed to load, using fallback:', {
          failedSrc: imgSrc,
          fallbackUrl
        });
        setImgSrc(fallbackUrl || '/default-player-card.png')
      }}
    />
  )
}
