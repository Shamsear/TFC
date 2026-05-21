'use client'

import { useState, useEffect } from 'react'

interface TeamLogoProps {
  logoUrl?: string | null
  teamName: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export default function TeamLogo({ logoUrl, teamName, size = 'md' }: TeamLogoProps) {
  const [imageError, setImageError] = useState(!logoUrl)
  
  useEffect(() => {
    setImageError(!logoUrl)
  }, [logoUrl])
  
  const sizeClasses = {
    xs: 'w-8 h-8 rounded-lg',
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-12 h-12 sm:w-14 sm:h-14 rounded-xl',
    lg: 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl',
    xl: 'w-24 h-24 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl'
  }
  
  const initialsSize = {
    xs: 'text-[10px]',
    sm: 'text-sm',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-4xl sm:text-5xl'
  }

  const paddingClasses = {
    xs: 'p-0.5',
    sm: 'p-1',
    md: 'p-1',
    lg: 'p-2',
    xl: 'p-2'
  }

  return (
    <div className={`relative ${sizeClasses[size]} overflow-hidden ring-2 ring-[#E8A800]/20 flex-shrink-0 bg-transparent`}>
      {logoUrl && !imageError ? (
        <img
          src={logoUrl}
          alt={teamName}
          className={`w-full h-full object-contain ${paddingClasses[size]}`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full bg-[#E8A800]/10 flex items-center justify-center border border-[#E8A800]/20">
          <span className={`${initialsSize[size]} font-black text-[#E8A800]`}>
            {teamName.substring(0, 2).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}

