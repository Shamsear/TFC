'use client'

import Image from 'next/image'
import { useState } from 'react'

interface PlayerCardImageProps {
  playerCardId: string
  playerName: string
  fallbackUrl: string
}

export default function PlayerCardImage({ playerCardId, playerName, fallbackUrl }: PlayerCardImageProps) {
  const [imgSrc, setImgSrc] = useState(`/player_cards/${playerCardId}.png`)

  return (
    <Image
      src={imgSrc}
      alt={playerName}
      fill
      className="object-contain"
      priority
      onError={() => {
        setImgSrc(fallbackUrl)
      }}
    />
  )
}
