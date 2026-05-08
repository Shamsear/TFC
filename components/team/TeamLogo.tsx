'use client'

import { useState } from 'react'

interface TeamLogoProps {
  logoUrl: string
  teamName: string
  size?: 'sm' | 'md' | 'lg'
}

export default function TeamLogo({ logoUrl, teamName, size = 'md' }: TeamLogoProps) {
  const [imageError, setImageError] = useState(false)
  
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12 sm:w-14 sm:h-14',
    lg: 'w-16 h-16 sm:w-20 sm:h-20'
  }
  
  const initialsSize = {
    sm: 'text-sm',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl sm:text-3xl'
  }

  return (
    <div className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden ring-2 ring-[#E8A800]/20 flex-shrink-0`}>
      {!imageError ? (
        <img
          src={logoUrl}
          alt={teamName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full bg-[#E8A800]/10 flex items-center justify-center">
          <span className={`${initialsSize[size]} font-black text-[#E8A800]`}>
            {teamName.substring(0, 2).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}
