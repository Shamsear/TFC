'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PlayerCardImage from '@/components/player/PlayerCardImage'
import PlayerDetailTabs from '@/components/player/PlayerDetailTabs'

interface PlayerDetailContentProps {
  seasonId: string
  backLink?: string
  basePlayer: {
    id: string
    name: string
    photoUrl: string | null
  }
  stats: {
    position: string
    realWorldClub: string | null
    overallRating: number | null
    starRating: number | null
    nationality: string | null
    playingStyle: string | null
    offensiveAwareness: number | null
    ballControl: number | null
    dribbling: number | null
    tightPossession: number | null
    lowPass: number | null
    loftedPass: number | null
    finishing: number | null
    heading: number | null
    setPieceTaking: number | null
    curl: number | null
    speed: number | null
    acceleration: number | null
    kickingPower: number | null
    jumping: number | null
    physicalContact: number | null
    balance: number | null
    stamina: number | null
    defensiveAwareness: number | null
    tackling: number | null
    aggression: number | null
    defensiveEngagement: number | null
    gkAwareness: number | null
    gkCatching: number | null
    gkParrying: number | null
    gkReflexes: number | null
    gkReach: number | null
  }
  currentTeam: {
    id: string
    name: string
    logoUrl: string
    soldPrice: number
  } | null
  transferHistory: Array<{
    id: string
    seasonName: string
    teamName: string
    teamLogo: string
    soldPrice: number
    createdAt: Date
  }>
  season: {
    id: string
    name: string
  }
}

export default function PlayerDetailContent({
  seasonId,
  backLink,
  basePlayer,
  stats,
  currentTeam,
  transferHistory,
  season,
}: PlayerDetailContentProps) {
  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const isGK = stats.position === 'GK'

  // Get stat color based on value
  const getStatColor = (value: number | null) => {
    if (value === null) return 'text-gray-600'
    if (value >= 90) return 'text-[#00ff88]'
    if (value >= 80) return 'text-[#4ade80]'
    if (value >= 70) return 'text-[#fbbf24]'
    if (value >= 60) return 'text-[#fb923c]'
    return 'text-[#ef4444]'
  }

  // Extract player ID from base player ID
  const playerCardId = basePlayer.id.replace('player-', '').split('-')[0]

  const handleDownloadCard = async () => {
    try {
      // Try to download the local player card first
      const localCardUrl = `/player_cards/${playerCardId}.png`
      
      let imageUrl = localCardUrl
      let filename = `${basePlayer.name.replace(/\s+/g, '_')}_card.png`
      
      try {
        // Test if local card exists
        const testResponse = await fetch(localCardUrl, { method: 'HEAD' })
        if (!testResponse.ok) {
          // Fallback to player photo
          imageUrl = basePlayer.photoUrl || '/players/placeholder.svg'
          filename = `${basePlayer.name.replace(/\s+/g, '_')}_photo.${imageUrl.split('.').pop()}`
        }
      } catch {
        // Fallback to player photo
        imageUrl = basePlayer.photoUrl || '/players/placeholder.svg'
        filename = `${basePlayer.name.replace(/\s+/g, '_')}_photo.${imageUrl.split('.').pop()}`
      }
      
      // Download the image
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch image')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      // Show success message
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(100)
      }
      
    } catch (error) {
      console.error('Failed to download card:', error)
      
      // Fallback: Open image in new tab
      try {
        const imageUrl = `/player_cards/${playerCardId}.png`
        window.open(imageUrl, '_blank')
      } catch (fallbackError) {
        alert('Download failed. Please try right-clicking the image and selecting "Save image as..."')
      }
    }
  }

  const handleShareCard = async () => {
    const cardUrl = `${window.location.origin}/player_cards/${playerCardId}.png`
    const playerUrl = `${window.location.origin}/players/${basePlayer.id}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${basePlayer.name} - Player Card`,
          text: `Check out ${basePlayer.name}'s player card! ${stats.position} • ${stats.overallRating} OVR`,
          url: playerUrl,
        })
      } catch (error) {
        console.error('Failed to share:', error)
        // Fallback to clipboard
        handleCopyToClipboard(playerUrl)
      }
    } else {
      // Fallback: Copy to clipboard
      handleCopyToClipboard(playerUrl)
    }
  }
  
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Show temporary success message
      const button = document.activeElement as HTMLButtonElement
      if (button) {
        const originalText = button.textContent
        button.textContent = 'Copied!'
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
      // Final fallback
      prompt('Copy this link:', text)
    }
  }

  const statsContent = (
    <div className="space-y-4 lg:space-y-6">
      {/* Attacking Stats */}
      {!isGK && (
        <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 p-4 lg:p-6">
          <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-5">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <h3 className="text-base lg:text-xl font-black text-white uppercase tracking-wide">Attacking</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
            {[
              { label: 'Off. Awareness', value: stats.offensiveAwareness },
              { label: 'Ball Control', value: stats.ballControl },
              { label: 'Dribbling', value: stats.dribbling },
              { label: 'Tight Possession', value: stats.tightPossession },
              { label: 'Low Pass', value: stats.lowPass },
              { label: 'Lofted Pass', value: stats.loftedPass },
              { label: 'Finishing', value: stats.finishing },
              { label: 'Heading', value: stats.heading },
              { label: 'Set Pieces', value: stats.setPieceTaking },
              { label: 'Curl', value: stats.curl },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-black/30 p-2 lg:p-3 text-center">
                <div className={`text-lg lg:text-2xl font-black mb-1 ${getStatColor(stat.value)}`}>
                  {stat.value || '-'}
                </div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Physical Stats */}
      <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 p-4 lg:p-6">
        <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-5">
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 lg:w-5 lg:h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
            </svg>
          </div>
          <h3 className="text-base lg:text-xl font-black text-white uppercase tracking-wide">Physical</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-2 lg:gap-3">
          {[
            { label: 'Speed', value: stats.speed },
            { label: 'Acceleration', value: stats.acceleration },
            { label: 'Kicking Power', value: stats.kickingPower },
            { label: 'Jumping', value: stats.jumping },
            { label: 'Physical', value: stats.physicalContact },
            { label: 'Balance', value: stats.balance },
            { label: 'Stamina', value: stats.stamina },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-black/30 p-2 lg:p-3 text-center">
              <div className={`text-lg lg:text-2xl font-black mb-1 ${getStatColor(stat.value)}`}>
                {stat.value || '-'}
              </div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Defensive Stats */}
      {!isGK && (
        <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 p-4 lg:p-6">
          <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-5">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
              </svg>
            </div>
            <h3 className="text-base lg:text-xl font-black text-white uppercase tracking-wide">Defending</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
            {[
              { label: 'Def. Awareness', value: stats.defensiveAwareness },
              { label: 'Tackling', value: stats.tackling },
              { label: 'Aggression', value: stats.aggression },
              { label: 'Def. Engagement', value: stats.defensiveEngagement },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-black/30 p-2 lg:p-3 text-center">
                <div className={`text-lg lg:text-2xl font-black mb-1 ${getStatColor(stat.value)}`}>
                  {stat.value || '-'}
                </div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goalkeeper Stats */}
      {isGK && (
        <div className="rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 p-4 lg:p-6">
          <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-5">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <h3 className="text-base lg:text-xl font-black text-white uppercase tracking-wide">Goalkeeping</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
            {[
              { label: 'GK Awareness', value: stats.gkAwareness },
              { label: 'GK Catching', value: stats.gkCatching },
              { label: 'GK Parrying', value: stats.gkParrying },
              { label: 'GK Reflexes', value: stats.gkReflexes },
              { label: 'GK Reach', value: stats.gkReach },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-black/30 p-2 lg:p-3 text-center">
                <div className={`text-lg lg:text-2xl font-black mb-1 ${getStatColor(stat.value)}`}>
                  {stat.value || '-'}
                </div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {/* Back Button */}
          <Link
            href={backLink || `/sub-admin/${seasonId}/all-players`}
            className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] mb-4 sm:mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to All Players
          </Link>

          {/* Mobile Layout */}
          <div className="lg:hidden">
            {/* Player Header - Centered */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-black text-white mb-1">
                {basePlayer.name}
              </h1>
              <p className="text-[#E8A800] text-sm font-bold uppercase tracking-wider">
                {stats.playingStyle || 'Creative Playmaker'}
              </p>
              <p className="text-purple-400 text-sm mt-1 font-bold">
                {stats.realWorldClub}
              </p>
              {stats.nationality && (
                <p className="text-gray-400 text-sm mt-1">
                  {stats.nationality}
                </p>
              )}
            </div>

            {/* Quick Overview - Team Info */}
            {/* Removed - now shown in Overview tab */}

            {/* Player Card - Centered & Clickable */}
            <div className="flex justify-center mb-6">
              <button
                onClick={() => setIsCardModalOpen(true)}
                className="relative w-48 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl hover:scale-105 transition-transform cursor-pointer"
              >
                <PlayerCardImage
                  playerCardId={playerCardId}
                  playerName={basePlayer.name}
                  fallbackUrl={basePlayer.photoUrl || '/players/placeholder.svg'}
                />
              </button>
            </div>

            {/* Team Assignment - Removed duplicate, now in overview */}

            <PlayerDetailTabs
              transferHistory={transferHistory}
              statsContent={statsContent}
              currentTeam={currentTeam}
              season={season}
            />
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:block">
            {/* Player Info Header - Centered at Top */}
            <div className="text-center mb-8">
              <h1 className="text-5xl font-black text-white mb-4">
                {basePlayer.name}
              </h1>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="px-6 py-2 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] text-sm font-bold uppercase tracking-wider">
                  {stats.playingStyle || 'Creative Playmaker'}
                </div>
                <div className="px-6 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-bold">
                  {stats.realWorldClub}
                </div>
                {stats.nationality && (
                  <div className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm font-bold">
                    {stats.nationality}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Overview - Team Info Banner */}
            {/* Removed - now shown in Overview tab */}

            {/* Two Column Layout */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Player Card */}
              <div className="col-span-4">
                {/* Player Card - Clickable */}
                <button
                  onClick={() => setIsCardModalOpen(true)}
                  className="relative w-full aspect-[3/4] rounded-xl overflow-hidden shadow-2xl mb-6 hover:scale-105 transition-transform cursor-pointer"
                >
                  <PlayerCardImage
                    playerCardId={playerCardId}
                    playerName={basePlayer.name}
                    fallbackUrl={basePlayer.photoUrl || '/players/placeholder.svg'}
                  />
                </button>
                
                {/* Team Assignment - Removed duplicate, now in overview banner */}
              </div>

              {/* Right Column - Stats */}
              <div className="col-span-8">
                <PlayerDetailTabs
                  transferHistory={transferHistory}
                  statsContent={statsContent}
                  currentTeam={currentTeam}
                  season={season}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Modal */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full h-full max-w-lg flex flex-col justify-center items-center">
            {/* Close Button */}
            <button
              onClick={() => setIsCardModalOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/80 border border-white/20 text-white hover:text-[#E8A800] hover:border-[#E8A800]/50 transition-colors z-10 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Content - Constrained to viewport */}
            <div className="flex flex-col items-center gap-4 w-full max-h-full overflow-hidden">
              {/* Player Card - Dynamically sized to fit screen */}
              <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl flex-shrink min-h-0" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <PlayerCardImage
                  playerCardId={playerCardId}
                  playerName={basePlayer.name}
                  fallbackUrl={basePlayer.photoUrl || '/players/placeholder.svg'}
                />
              </div>

              {/* Action Buttons - Always at bottom */}
              <div className="flex gap-2 sm:gap-3 justify-center flex-wrap px-4 flex-shrink-0">
                <button
                  onClick={handleShareCard}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs sm:text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="hidden sm:inline">Share</span>
                </button>
                <button
                  onClick={handleDownloadCard}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] hover:bg-[#E8A800]/30 transition-colors text-xs sm:text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={() => setIsCardModalOpen(false)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gray-500/20 border border-gray-500/30 text-gray-400 hover:bg-gray-500/30 transition-colors text-xs sm:text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
