'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PlayerCardImage from '@/components/player/PlayerCardImage'
import PlayerDetailTabs from '@/components/player/PlayerDetailTabs'
import { getPlayerCardById } from '@/lib/image-cdn'

interface PlayerDetailContentProps {
  seasonId: string
  backLink?: string
  basePlayer: {
    id: string
    player_id?: string | null
    name: string
    photoUrl: string | null
  }
  stats: {
    position: string
    realWorldClub: string | null
    overallRating: number | null
    overallAtMaxLevel: number | null
    starRating: number | null
    nationality: string | null
    playingStyle: string | null
    height: number | null
    weight: number | null
    age: number | null
    foot: string | null
    weakFootUsage: string | null
    weakFootAccuracy: string | null
    injuryResistance: string | null
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
    scissorsFeint: string | null
    doubleTouch: string | null
    flipFlap: string | null
    marseilleTurn: string | null
    sombrero: string | null
    chopTurn: string | null
    cutBehindTurn: string | null
    scotchMove: string | null
    soleControl: string | null
    momentumDribbling: string | null
    accelerationBurst: string | null
    magneticFeet: string | null
    headingSkill: string | null
    bulletHeader: string | null
    longRangeCurler: string | null
    blitzCurler: string | null
    chipShotControl: string | null
    knuckleShot: string | null
    dippingShot: string | null
    risingShot: string | null
    longRangeShooting: string | null
    lowScreamer: string | null
    acrobaticFinishing: string | null
    heelTrick: string | null
    firstTimeShot: string | null
    phenomenalFinishing: string | null
    willpower: string | null
    oneTouchPass: string | null
    throughPassing: string | null
    weightedPass: string | null
    pinpointCrossing: string | null
    edgedCrossing: string | null
    outsideCurler: string | null
    rabona: string | null
    noLookPass: string | null
    gameChangingPass: string | null
    visionaryPass: string | null
    phenomenalPass: string | null
    lowLoftedPass: string | null
    gkLowPunt: string | null
    gkHighPunt: string | null
    longThrow: string | null
    gkLongThrow: string | null
    penaltySpecialist: string | null
    gkPenaltySaver: string | null
    gkDirectingDefence: string | null
    gkSpiritRoar: string | null
    gamesmanship: string | null
    manMarking: string | null
    trackBack: string | null
    interception: string | null
    blocker: string | null
    aerialSuperiority: string | null
    slidingTackle: string | null
    longReachTackle: string | null
    fortress: string | null
    acrobaticClearance: string | null
    aerialFort: string | null
    captaincy: string | null
    attackTrigger: string | null
    superSub: string | null
    fightingSpirit: string | null
    trickster: string | null
    mazingRun: string | null
    speedingBullet: string | null
    incisiveRun: string | null
    longBallExpert: string | null
    earlyCross: string | null
    longRanger: string | null
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
  const [showMaxOverall, setShowMaxOverall] = useState(false)
  const isGK = stats.position === 'GK'

  const displayOverall = showMaxOverall ? stats.overallAtMaxLevel : stats.overallRating

  const getStatColor = (value: number | null) => {
    if (value === null) return 'text-gray-500'
    if (value >= 90) return 'text-emerald-400'
    if (value >= 80) return 'text-green-400'
    if (value >= 70) return 'text-yellow-400'
    if (value >= 60) return 'text-orange-400'
    return 'text-red-400'
  }

  const getStatBarColor = (value: number | null) => {
    if (value === null) return 'bg-gray-600'
    if (value >= 90) return 'bg-emerald-500'
    if (value >= 80) return 'bg-green-500'
    if (value >= 70) return 'bg-yellow-500'
    if (value >= 60) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getActiveSkills = () => {
    const allSkills = {
      scissorsFeint: stats.scissorsFeint,
      doubleTouch: stats.doubleTouch,
      flipFlap: stats.flipFlap,
      marseilleTurn: stats.marseilleTurn,
      sombrero: stats.sombrero,
      chopTurn: stats.chopTurn,
      cutBehindTurn: stats.cutBehindTurn,
      scotchMove: stats.scotchMove,
      soleControl: stats.soleControl,
      momentumDribbling: stats.momentumDribbling,
      accelerationBurst: stats.accelerationBurst,
      magneticFeet: stats.magneticFeet,
      headingSkill: stats.headingSkill,
      bulletHeader: stats.bulletHeader,
      longRangeCurler: stats.longRangeCurler,
      blitzCurler: stats.blitzCurler,
      chipShotControl: stats.chipShotControl,
      knuckleShot: stats.knuckleShot,
      dippingShot: stats.dippingShot,
      risingShot: stats.risingShot,
      longRangeShooting: stats.longRangeShooting,
      lowScreamer: stats.lowScreamer,
      acrobaticFinishing: stats.acrobaticFinishing,
      heelTrick: stats.heelTrick,
      firstTimeShot: stats.firstTimeShot,
      phenomenalFinishing: stats.phenomenalFinishing,
      willpower: stats.willpower,
      oneTouchPass: stats.oneTouchPass,
      throughPassing: stats.throughPassing,
      weightedPass: stats.weightedPass,
      pinpointCrossing: stats.pinpointCrossing,
      edgedCrossing: stats.edgedCrossing,
      outsideCurler: stats.outsideCurler,
      rabona: stats.rabona,
      noLookPass: stats.noLookPass,
      gameChangingPass: stats.gameChangingPass,
      visionaryPass: stats.visionaryPass,
      phenomenalPass: stats.phenomenalPass,
      lowLoftedPass: stats.lowLoftedPass,
      gkLowPunt: stats.gkLowPunt,
      gkHighPunt: stats.gkHighPunt,
      longThrow: stats.longThrow,
      gkLongThrow: stats.gkLongThrow,
      penaltySpecialist: stats.penaltySpecialist,
      gkPenaltySaver: stats.gkPenaltySaver,
      gkDirectingDefence: stats.gkDirectingDefence,
      gkSpiritRoar: stats.gkSpiritRoar,
      gamesmanship: stats.gamesmanship,
      manMarking: stats.manMarking,
      trackBack: stats.trackBack,
      interception: stats.interception,
      blocker: stats.blocker,
      aerialSuperiority: stats.aerialSuperiority,
      slidingTackle: stats.slidingTackle,
      longReachTackle: stats.longReachTackle,
      fortress: stats.fortress,
      acrobaticClearance: stats.acrobaticClearance,
      aerialFort: stats.aerialFort,
      captaincy: stats.captaincy,
      attackTrigger: stats.attackTrigger,
      superSub: stats.superSub,
      fightingSpirit: stats.fightingSpirit,
    }
    return Object.entries(allSkills)
      .filter(([_, value]) => value === 'Yes')
      .map(([key]) => key)
  }

  const getActiveAttributes = () => {
    const attributes = {
      trickster: stats.trickster,
      mazingRun: stats.mazingRun,
      speedingBullet: stats.speedingBullet,
      incisiveRun: stats.incisiveRun,
      longBallExpert: stats.longBallExpert,
      earlyCross: stats.earlyCross,
      longRanger: stats.longRanger,
    }
    return Object.entries(attributes)
      .filter(([_, value]) => value === 'Yes')
      .map(([key]) => key)
  }

  const formatSkillName = (camelCase: string) => {
    return camelCase
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  const activeSkills = getActiveSkills()
  const activeAttributes = getActiveAttributes()
  const playerCardId = basePlayer.player_id || basePlayer.id.replace('player-', '').split('-')[0]

  const handleDownloadCard = async () => {
    try {
      const cardUrl = getPlayerCardById(playerCardId)
      const filename = `${basePlayer.name.replace(/\s+/g, '_')}_card.png`
      
      const response = await fetch(cardUrl)
      if (!response.ok) {
        // Try fallback image
        const fallbackUrl = basePlayer.photoUrl || '/players/placeholder.svg'
        const fallbackResponse = await fetch(fallbackUrl)
        if (!fallbackResponse.ok) throw new Error('Failed to fetch image')
        
        const blob = await fallbackResponse.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${basePlayer.name.replace(/\s+/g, '_')}_photo.${fallbackUrl.split('.').pop()}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        return
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
      
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(100)
      }
    } catch (error) {
      console.error('Failed to download card:', error)
      try {
        const cardUrl = getPlayerCardById(playerCardId)
        window.open(cardUrl, '_blank')
      } catch (fallbackError) {
        alert('Download failed. Please try right-clicking the image and selecting "Save image as..."')
      }
    }
  }

  const handleShareCard = async () => {
    try {
      const cardUrl = getPlayerCardById(playerCardId)
      
      // Try to fetch the image as a blob
      const response = await fetch(cardUrl)
      
      if (!response.ok) {
        throw new Error('Card image not found')
      }
      
      // Card image exists, convert to file
      const blob = await response.blob()
      const file = new File([blob], `${basePlayer.name.replace(/\s+/g, '_')}_card.png`, { type: 'image/png' })
      
      // Check if Web Share API supports files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
        })
        
        // Haptic feedback on successful share
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(100)
        }
      } else {
        // Browser doesn't support file sharing
        alert('Your browser does not support image sharing. Please use the download button instead.')
      }
    } catch (error) {
      console.error('Failed to share:', error)
      alert('Unable to share the player card. Please try the download button instead.')
    }
  }
  
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
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
      prompt('Copy this link:', text)
    }
  }

  // Stat component for clean display
  const StatBar = ({ label, value }: { label: string; value: number | null }) => (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-400 mb-1.5 font-medium">{label}</div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full ${getStatBarColor(value)} transition-all duration-300`}
            style={{ width: `${value || 0}%` }}
          />
        </div>
      </div>
      <div className={`text-xl font-bold w-14 text-right ${getStatColor(value)}`}>
        {value || '-'}
      </div>
    </div>
  )


  return (
    <>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Back Button */}
        <div className="border-b border-white/10 bg-[#0f0f0f]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link
              href={backLink || `/sub-admin/${seasonId}/all-players`}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back</span>
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 lg:py-4">
          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Left Sidebar - Player Card */}
            <div className="lg:col-span-3">
              <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-visible">
                <button
                  onClick={() => setIsCardModalOpen(true)}
                  className="relative w-full aspect-[3/4] rounded-xl overflow-hidden shadow-2xl hover:scale-105 transition-transform cursor-pointer mb-4"
                >
                  <PlayerCardImage
                    playerCardId={playerCardId}
                    playerName={basePlayer.name}
                    fallbackUrl={basePlayer.photoUrl || '/players/placeholder.svg'}
                  />
                </button>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleShareCard}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleDownloadCard}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/20 text-[#E8A800] hover:bg-[#E8A800]/20 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-9">
              {/* Player Header */}
              <div className="mb-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-4xl font-black text-white mb-2">{basePlayer.name}</h1>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-3 py-1 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] text-sm font-bold uppercase">
                        {stats.position}
                      </span>
                      {stats.playingStyle && (
                        <span className="px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-medium">
                          {stats.playingStyle}
                        </span>
                      )}
                      {stats.realWorldClub && (
                        <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm font-medium">
                          {stats.realWorldClub}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Overall Rating */}
                  <button
                    onClick={() => setShowMaxOverall(!showMaxOverall)}
                    className="flex flex-col items-center hover:scale-105 transition-transform cursor-pointer"
                    title={showMaxOverall ? 'Click to show current overall' : 'Click to show max overall'}
                  >
                    <div className="text-5xl font-black text-[#E8A800] mb-1">
                      {displayOverall || '-'}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">
                      {showMaxOverall ? 'Max Overall' : 'Overall'}
                    </div>
                  </button>
                </div>

                {/* Player Info */}
                <div className="flex flex-wrap gap-2">
                  {stats.nationality && (
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                      {stats.nationality}
                    </div>
                  )}
                  {stats.height && (
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      {stats.height}cm
                    </div>
                  )}
                  {stats.weight && (
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                      {stats.weight}kg
                    </div>
                  )}
                  {stats.age && (
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {stats.age} years
                    </div>
                  )}
                  {stats.foot && (
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {stats.foot}
                    </div>
                  )}
                  {stats.weakFootUsage && (
                    <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                      Weak Foot: {stats.weakFootUsage}
                    </div>
                  )}
                  {stats.weakFootAccuracy && (
                    <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                      Accuracy: {stats.weakFootAccuracy}
                    </div>
                  )}
                  {stats.injuryResistance && (
                    <div className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {stats.injuryResistance}
                    </div>
                  )}
                </div>
              </div>

              {/* Current Team Banner */}
              {currentTeam && (
                <div className="rounded-xl bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/10 border-2 border-[#E8A800]/30 p-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 border-2 border-[#E8A800]/50">
                      <Image
                        src={currentTeam.logoUrl}
                        alt={currentTeam.name}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-[#E8A800] mb-1 font-bold uppercase tracking-wider">Current Team</div>
                      <div className="text-2xl font-black text-white mb-2">{currentTeam.name}</div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-emerald-400 font-black text-xl">${currentTeam.soldPrice.toLocaleString()}</span>
                        </div>
                        <div className="text-gray-400">•</div>
                        <div className="text-gray-300 font-medium">{season.name}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <PlayerDetailTabs
                transferHistory={transferHistory}
                statsContent={
                  <div className="space-y-6">
                    {/* Attacking Stats */}
                    {!isGK && (
                      <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-white uppercase tracking-wide">Attacking</h3>
                        </div>
                        <div className="space-y-4">
                          <StatBar label="Offensive Awareness" value={stats.offensiveAwareness} />
                          <StatBar label="Ball Control" value={stats.ballControl} />
                          <StatBar label="Dribbling" value={stats.dribbling} />
                          <StatBar label="Tight Possession" value={stats.tightPossession} />
                          <StatBar label="Low Pass" value={stats.lowPass} />
                          <StatBar label="Lofted Pass" value={stats.loftedPass} />
                          <StatBar label="Finishing" value={stats.finishing} />
                          <StatBar label="Heading" value={stats.heading} />
                          <StatBar label="Set Piece Taking" value={stats.setPieceTaking} />
                          <StatBar label="Curl" value={stats.curl} />
                        </div>
                      </div>
                    )}

                    {/* Physical Stats */}
                    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Physical</h3>
                      </div>
                      <div className="space-y-4">
                        <StatBar label="Speed" value={stats.speed} />
                        <StatBar label="Acceleration" value={stats.acceleration} />
                        <StatBar label="Kicking Power" value={stats.kickingPower} />
                        <StatBar label="Jumping" value={stats.jumping} />
                        <StatBar label="Physical Contact" value={stats.physicalContact} />
                        <StatBar label="Balance" value={stats.balance} />
                        <StatBar label="Stamina" value={stats.stamina} />
                      </div>
                    </div>

                    {/* Defensive Stats */}
                    {!isGK && (
                      <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-white uppercase tracking-wide">Defending</h3>
                        </div>
                        <div className="space-y-4">
                          <StatBar label="Defensive Awareness" value={stats.defensiveAwareness} />
                          <StatBar label="Tackling" value={stats.tackling} />
                          <StatBar label="Aggression" value={stats.aggression} />
                          <StatBar label="Defensive Engagement" value={stats.defensiveEngagement} />
                        </div>
                      </div>
                    )}

                    {/* Goalkeeper Stats */}
                    {isGK && (
                      <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-white uppercase tracking-wide">Goalkeeping</h3>
                        </div>
                        <div className="space-y-4">
                          <StatBar label="GK Awareness" value={stats.gkAwareness} />
                          <StatBar label="GK Catching" value={stats.gkCatching} />
                          <StatBar label="GK Parrying" value={stats.gkParrying} />
                          <StatBar label="GK Reflexes" value={stats.gkReflexes} />
                          <StatBar label="GK Reach" value={stats.gkReach} />
                        </div>
                      </div>
                    )}

                    {/* Playing Attributes */}
                    {activeAttributes.length > 0 && (
                      <div className="rounded-xl bg-[#1a1a1a] border-2 border-amber-500/30 p-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-white uppercase tracking-wide">Playing Attributes</h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {activeAttributes.map((attr) => (
                            <div
                              key={attr}
                              className="px-4 py-2.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-2 border-amber-500/40 text-amber-300 text-sm font-bold uppercase tracking-wide"
                            >
                              {formatSkillName(attr)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {activeSkills.length > 0 && (
                      <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-white uppercase tracking-wide">Skills</h3>
                        </div>
                        
                        <div className="space-y-5">
                          {/* Dribbling Skills */}
                          {activeSkills.filter(s => ['scissorsFeint', 'doubleTouch', 'flipFlap', 'marseilleTurn', 'sombrero', 'chopTurn', 'cutBehindTurn', 'scotchMove', 'soleControl', 'momentumDribbling', 'accelerationBurst', 'magneticFeet'].includes(s)).length > 0 && (
                            <div>
                              <div className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                Dribbling
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {activeSkills.filter(s => ['scissorsFeint', 'doubleTouch', 'flipFlap', 'marseilleTurn', 'sombrero', 'chopTurn', 'cutBehindTurn', 'scotchMove', 'soleControl', 'momentumDribbling', 'accelerationBurst', 'magneticFeet'].includes(s)).map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-3 py-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/30 text-orange-300 text-sm font-medium"
                                  >
                                    {formatSkillName(skill)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Heading Skills */}
                          {activeSkills.filter(s => ['headingSkill', 'bulletHeader'].includes(s)).length > 0 && (
                            <div>
                              <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                Heading
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {activeSkills.filter(s => ['headingSkill', 'bulletHeader'].includes(s)).map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-3 py-2 rounded-lg bg-gradient-to-br from-gray-500/20 to-gray-500/10 border border-gray-500/30 text-gray-300 text-sm font-medium"
                                  >
                                    {formatSkillName(skill)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Shooting Skills */}
                          {activeSkills.filter(s => ['longRangeCurler', 'blitzCurler', 'chipShotControl', 'knuckleShot', 'dippingShot', 'risingShot', 'longRangeShooting', 'lowScreamer', 'acrobaticFinishing', 'heelTrick', 'firstTimeShot', 'phenomenalFinishing', 'willpower'].includes(s)).length > 0 && (
                            <div>
                              <div className="text-xs text-red-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                Shooting
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {activeSkills.filter(s => ['longRangeCurler', 'blitzCurler', 'chipShotControl', 'knuckleShot', 'dippingShot', 'risingShot', 'longRangeShooting', 'lowScreamer', 'acrobaticFinishing', 'heelTrick', 'firstTimeShot', 'phenomenalFinishing', 'willpower'].includes(s)).map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-3 py-2 rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/10 border border-red-500/30 text-red-300 text-sm font-medium"
                                  >
                                    {formatSkillName(skill)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Passing Skills */}
                          {activeSkills.filter(s => ['oneTouchPass', 'throughPassing', 'weightedPass', 'pinpointCrossing', 'edgedCrossing', 'outsideCurler', 'rabona', 'noLookPass', 'gameChangingPass', 'visionaryPass', 'phenomenalPass', 'lowLoftedPass'].includes(s)).length > 0 && (
                            <div>
                              <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                Passing
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {activeSkills.filter(s => ['oneTouchPass', 'throughPassing', 'weightedPass', 'pinpointCrossing', 'edgedCrossing', 'outsideCurler', 'rabona', 'noLookPass', 'gameChangingPass', 'visionaryPass', 'phenomenalPass', 'lowLoftedPass'].includes(s)).map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-3 py-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30 text-blue-300 text-sm font-medium"
                                  >
                                    {formatSkillName(skill)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* GK Skills */}
                          {activeSkills.filter(s => ['gkLowPunt', 'gkHighPunt', 'longThrow', 'gkLongThrow', 'penaltySpecialist', 'gkPenaltySaver', 'gkDirectingDefence', 'gkSpiritRoar', 'gamesmanship'].includes(s)).length > 0 && (
                            <div>
                              <div className="text-xs text-yellow-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                                Goalkeeper
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {activeSkills.filter(s => ['gkLowPunt', 'gkHighPunt', 'longThrow', 'gkLongThrow', 'penaltySpecialist', 'gkPenaltySaver', 'gkDirectingDefence', 'gkSpiritRoar', 'gamesmanship'].includes(s)).map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-3 py-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm font-medium"
                                  >
                                    {formatSkillName(skill)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Defensive Skills */}
                          {activeSkills.filter(s => ['manMarking', 'trackBack', 'interception', 'blocker', 'aerialSuperiority', 'slidingTackle', 'longReachTackle', 'fortress', 'acrobaticClearance', 'aerialFort'].includes(s)).length > 0 && (
                            <div>
                              <div className="text-xs text-green-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                Defensive
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {activeSkills.filter(s => ['manMarking', 'trackBack', 'interception', 'blocker', 'aerialSuperiority', 'slidingTackle', 'longReachTackle', 'fortress', 'acrobaticClearance', 'aerialFort'].includes(s)).map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-3 py-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/30 text-green-300 text-sm font-medium"
                                  >
                                    {formatSkillName(skill)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Special Skills */}
                          {activeSkills.filter(s => ['captaincy', 'attackTrigger', 'superSub', 'fightingSpirit'].includes(s)).length > 0 && (
                            <div>
                              <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                Special
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {activeSkills.filter(s => ['captaincy', 'attackTrigger', 'superSub', 'fightingSpirit'].includes(s)).map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-3 py-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium"
                                  >
                                    {formatSkillName(skill)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                }
                currentTeam={currentTeam}
                season={season}
              />
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden">
            {/* Player Name */}
            <div className="text-center mb-4">
              <h1 className="text-3xl font-black text-white mb-2">{basePlayer.name}</h1>
              
              <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                <span className="px-3 py-1 rounded-lg bg-[#E8A800]/20 border border-[#E8A800]/30 text-[#E8A800] text-sm font-bold uppercase">
                  {stats.position}
                </span>
                {stats.playingStyle && (
                  <span className="px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-medium">
                    {stats.playingStyle}
                  </span>
                )}
              </div>
              
              {stats.realWorldClub && (
                <p className="text-purple-400 text-sm font-bold mb-1">{stats.realWorldClub}</p>
              )}
              {stats.nationality && (
                <p className="text-gray-400 text-sm">{stats.nationality}</p>
              )}
            </div>

            {/* Player Card */}
            <div className="flex justify-center mb-4">
              <button
                onClick={() => setIsCardModalOpen(true)}
                className="relative w-56 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl hover:scale-105 transition-transform cursor-pointer"
              >
                <PlayerCardImage
                  playerCardId={playerCardId}
                  playerName={basePlayer.name}
                  fallbackUrl={basePlayer.photoUrl || '/players/placeholder.svg'}
                />
              </button>
            </div>

            {/* Overall Rating - Below Card */}
            <div className="flex justify-center mb-4">
              <button
                onClick={() => setShowMaxOverall(!showMaxOverall)}
                className="flex flex-col items-center hover:scale-105 transition-transform cursor-pointer px-6 py-3 rounded-xl bg-[#E8A800]/10 border-2 border-[#E8A800]/30"
                title={showMaxOverall ? 'Click to show current overall' : 'Click to show max overall'}
              >
                <div className="text-5xl font-black text-[#E8A800] mb-1">
                  {displayOverall || '-'}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                  {showMaxOverall ? 'Max Overall' : 'Overall'}
                </div>
              </button>
            </div>

            {/* Player Info Badges */}
            <div className="mb-4">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {stats.height && (
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs font-medium flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    {stats.height}cm
                  </span>
                )}
                {stats.weight && (
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs font-medium flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                    {stats.weight}kg
                  </span>
                )}
                {stats.age && (
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs font-medium flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {stats.age}
                  </span>
                )}
                {stats.foot && (
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs font-medium flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {stats.foot}
                  </span>
                )}
              </div>
              
              {/* Weak Foot & Injury */}
              {(stats.weakFootUsage || stats.weakFootAccuracy || stats.injuryResistance) && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  {stats.weakFootUsage && (
                    <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                      WF: {stats.weakFootUsage}
                    </span>
                  )}
                  {stats.weakFootAccuracy && (
                    <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                      Acc: {stats.weakFootAccuracy}
                    </span>
                  )}
                  {stats.injuryResistance && (
                    <span className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {stats.injuryResistance}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Current Team Banner */}
            {currentTeam && (
              <div className="rounded-xl bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/10 border-2 border-[#E8A800]/30 p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 border-2 border-[#E8A800]/50">
                    <Image
                      src={currentTeam.logoUrl}
                      alt={currentTeam.name}
                      fill
                      className="object-contain p-1.5"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#E8A800] mb-1 font-bold uppercase tracking-wider">Current Team</div>
                    <div className="text-lg font-black text-white mb-1">{currentTeam.name}</div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-emerald-400 font-black text-base">${currentTeam.soldPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <PlayerDetailTabs
              transferHistory={transferHistory}
              statsContent={
                <div className="space-y-4">
                  {/* Same stats content as desktop but with mobile spacing */}
                  {!isGK && (
                    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-bold text-white uppercase tracking-wide">Attacking</h3>
                      </div>
                      <div className="space-y-3">
                        <StatBar label="Offensive Awareness" value={stats.offensiveAwareness} />
                        <StatBar label="Ball Control" value={stats.ballControl} />
                        <StatBar label="Dribbling" value={stats.dribbling} />
                        <StatBar label="Tight Possession" value={stats.tightPossession} />
                        <StatBar label="Low Pass" value={stats.lowPass} />
                        <StatBar label="Lofted Pass" value={stats.loftedPass} />
                        <StatBar label="Finishing" value={stats.finishing} />
                        <StatBar label="Heading" value={stats.heading} />
                        <StatBar label="Set Piece Taking" value={stats.setPieceTaking} />
                        <StatBar label="Curl" value={stats.curl} />
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-bold text-white uppercase tracking-wide">Physical</h3>
                    </div>
                    <div className="space-y-3">
                      <StatBar label="Speed" value={stats.speed} />
                      <StatBar label="Acceleration" value={stats.acceleration} />
                      <StatBar label="Kicking Power" value={stats.kickingPower} />
                      <StatBar label="Jumping" value={stats.jumping} />
                      <StatBar label="Physical Contact" value={stats.physicalContact} />
                      <StatBar label="Balance" value={stats.balance} />
                      <StatBar label="Stamina" value={stats.stamina} />
                    </div>
                  </div>

                  {!isGK && (
                    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-bold text-white uppercase tracking-wide">Defending</h3>
                      </div>
                      <div className="space-y-3">
                        <StatBar label="Defensive Awareness" value={stats.defensiveAwareness} />
                        <StatBar label="Tackling" value={stats.tackling} />
                        <StatBar label="Aggression" value={stats.aggression} />
                        <StatBar label="Defensive Engagement" value={stats.defensiveEngagement} />
                      </div>
                    </div>
                  )}

                  {isGK && (
                    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-bold text-white uppercase tracking-wide">Goalkeeping</h3>
                      </div>
                      <div className="space-y-3">
                        <StatBar label="GK Awareness" value={stats.gkAwareness} />
                        <StatBar label="GK Catching" value={stats.gkCatching} />
                        <StatBar label="GK Parrying" value={stats.gkParrying} />
                        <StatBar label="GK Reflexes" value={stats.gkReflexes} />
                        <StatBar label="GK Reach" value={stats.gkReach} />
                      </div>
                    </div>
                  )}

                  {activeAttributes.length > 0 && (
                    <div className="rounded-xl bg-[#1a1a1a] border-2 border-amber-500/30 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center">
                          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-bold text-white uppercase tracking-wide">Playing Attributes</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeAttributes.map((attr) => (
                          <div
                            key={attr}
                            className="px-3 py-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-2 border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wide"
                          >
                            {formatSkillName(attr)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSkills.length > 0 && (
                    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-bold text-white uppercase tracking-wide">Skills</h3>
                      </div>
                      <div className="space-y-4">
                        {/* Same skill categories as desktop */}
                        {activeSkills.filter(s => ['scissorsFeint', 'doubleTouch', 'flipFlap', 'marseilleTurn', 'sombrero', 'chopTurn', 'cutBehindTurn', 'scotchMove', 'soleControl', 'momentumDribbling', 'accelerationBurst', 'magneticFeet'].includes(s)).length > 0 && (
                          <div>
                            <div className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                              Dribbling
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {activeSkills.filter(s => ['scissorsFeint', 'doubleTouch', 'flipFlap', 'marseilleTurn', 'sombrero', 'chopTurn', 'cutBehindTurn', 'scotchMove', 'soleControl', 'momentumDribbling', 'accelerationBurst', 'magneticFeet'].includes(s)).map((skill) => (
                                <span key={skill} className="px-2 py-1.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/30 text-orange-300 text-xs font-medium">
                                  {formatSkillName(skill)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Add other skill categories similarly */}
                      </div>
                    </div>
                  )}
                </div>
              }
              currentTeam={currentTeam}
              season={season}
            />
          </div>
        </div>
      </div>

      {/* Card Modal */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full h-full max-w-lg flex flex-col justify-center items-center">
            <button
              onClick={() => setIsCardModalOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/80 border border-white/20 text-white hover:text-[#E8A800] hover:border-[#E8A800]/50 transition-colors z-10 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col items-center gap-4 w-full max-h-full overflow-hidden">
              <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl flex-shrink min-h-0" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <PlayerCardImage
                  playerCardId={playerCardId}
                  playerName={basePlayer.name}
                  fallbackUrl={basePlayer.photoUrl || '/players/placeholder.svg'}
                />
              </div>

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
