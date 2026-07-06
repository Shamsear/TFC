'use client'

import { useState } from 'react'
import Link from 'next/link'
import PlayerCardImage from '@/components/player/PlayerCardImage'
import PlayerDetailTabs from '@/components/player/PlayerDetailTabs'
import PositionGroupBadge from '@/components/player/PositionGroupBadge'
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
    position_group?: string | null
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
    status: string
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
  const StatBar = ({ label, value }: { label: string; value: number | null }) => {
    const getStatBarGradient = (val: number | null) => {
      if (val === null) return 'from-gray-600 to-gray-500 shadow-none'
      if (val >= 90) return 'from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
      if (val >= 80) return 'from-green-500 to-emerald-400'
      if (val >= 70) return 'from-[#E8A800] to-yellow-400'
      if (val >= 60) return 'from-orange-500 to-amber-400'
      return 'from-red-500 to-orange-400'
    }

    return (
      <div className="flex items-center gap-4 bg-white/[0.01] hover:bg-white/[0.03] p-2.5 rounded-xl border border-white/5 transition-all duration-200">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">{label}</div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full bg-gradient-to-r ${getStatBarGradient(value)} transition-all duration-500`}
              style={{ width: `${value || 0}%` }}
            />
          </div>
        </div>
        <div className={`text-xl font-black w-12 text-right ${getStatColor(value)}`}>
          {value || '-'}
        </div>
      </div>
    )
  }


  return (
    <>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Back Button Header */}
        <div className="border-b border-white/5 bg-[#0D0D0D]/95 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
            <Link
              href={backLink || `/sub-admin/${seasonId}/all-players`}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Players
            </Link>
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">Player profile</div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 lg:py-4">
          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8 mt-6">
            {/* Left Sidebar - Player Card */}
            <div className="lg:col-span-3">
              <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-visible">
                <div className="absolute -inset-1 bg-gradient-to-tr from-[#E8A800]/20 via-transparent to-emerald-500/20 rounded-2xl blur-xl opacity-50 pointer-events-none" />
                <button
                  onClick={() => setIsCardModalOpen(true)}
                  className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-2xl hover:scale-[1.03] hover:border-[#E8A800]/40 hover:shadow-[0_12px_36px_rgba(0,0,0,0.6)] transition-all duration-300 cursor-pointer mb-4 group/card"
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
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:scale-105 active:scale-95 transition-all text-sm font-bold shadow-[0_0_12px_rgba(59,130,246,0.05)] cursor-pointer"
                    title="Share Card"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleDownloadCard}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 text-[#E8A800] hover:bg-[#E8A800]/20 hover:scale-105 active:scale-95 transition-all text-sm font-bold shadow-[0_0_12px_rgba(232,168,0,0.05)] cursor-pointer"
                    title="Download Card"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
 
            {/* Main Content */}
            <div className="lg:col-span-9">
              {/* Player Header */}
              <div className="mb-6 rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 backdrop-blur-xl relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.01] rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-extrabold text-white mb-3 uppercase font-mono tracking-tight group-hover:text-[#E8A800] transition-colors">{basePlayer.name}</h1>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {(() => {
                        const getPositionColor = (pos: string) => {
                          const p = pos.toUpperCase()
                          if (p === 'GK') return 'border-[#E8A800]/30 bg-[#E8A800]/10 text-[#E8A800]'
                          if (['CB', 'LB', 'RB'].includes(p)) return 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                          if (['DMF', 'CMF', 'LMF', 'RMF', 'AMF'].includes(p)) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          if (['SS', 'LWF', 'RWF', 'CF'].includes(p)) return 'border-red-500/30 bg-red-500/10 text-red-400'
                          return 'border-gray-500/30 bg-gray-500/10 text-gray-400'
                        }
                        return (
                          <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black tracking-wider uppercase font-mono ${getPositionColor(stats.position)}`}>
                            {stats.position}
                          </span>
                        )
                      })()}
                      <PositionGroupBadge position={stats.position} group={stats.position_group} size="md" />
                      {stats.playingStyle && (
                        <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-400 text-[10px] font-black uppercase tracking-wider font-mono">
                          {stats.playingStyle}
                        </span>
                      )}
                      {stats.realWorldClub && (
                        <span className="px-2 py-0.5 rounded-lg bg-white/[0.01] border border-white/5 text-gray-400 text-[10px] font-black uppercase tracking-wider font-mono">
                          {stats.realWorldClub}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Overall Rating Circular Dial */}
                  <button
                    onClick={() => setShowMaxOverall(!showMaxOverall)}
                    className="flex flex-col items-center hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer p-4 rounded-2xl bg-white/[0.01] border border-[#E8A800]/25 hover:border-[#E8A800]/50 shadow-2xl relative overflow-hidden group/dial min-w-[90px]"
                    title={showMaxOverall ? 'Click to show current overall' : 'Click to show max overall'}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#E8A800]/10 to-transparent opacity-0 group-hover/dial:opacity-100 transition-opacity" />
                    <div className="text-4xl font-black bg-gradient-to-r from-[#E8A800] via-[#FFB347] to-[#E8A800] bg-clip-text text-transparent mb-1 drop-shadow-[0_0_8px_rgba(232,168,0,0.3)] select-none font-mono">
                      {displayOverall || '-'}
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-black font-mono select-none group-hover/dial:text-[#E8A800] transition-colors">
                      {showMaxOverall ? 'Max OVR' : 'Overall'}
                    </div>
                  </button>
                </div>
 
                {/* Player Info Row */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 font-mono text-[10px]">
                  {stats.nationality && (
                    <div className="px-2 py-0.5 rounded-lg bg-white/[0.01] border border-white/5 text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="text-gray-600 font-extrabold">NAT:</span>
                      <span className="text-white">{stats.nationality}</span>
                    </div>
                  )}
                  {stats.height && (
                    <div className="px-2 py-0.5 rounded-lg bg-white/[0.01] border border-white/5 text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="text-gray-600 font-extrabold">HT:</span>
                      <span className="text-white">{stats.height}cm</span>
                    </div>
                  )}
                  {stats.weight && (
                    <div className="px-2 py-0.5 rounded-lg bg-white/[0.01] border border-white/5 text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="text-gray-600 font-extrabold">WT:</span>
                      <span className="text-white">{stats.weight}kg</span>
                    </div>
                  )}
                  {stats.age && (
                    <div className="px-2 py-0.5 rounded-lg bg-white/[0.01] border border-white/5 text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="text-gray-600 font-extrabold">AGE:</span>
                      <span className="text-white">{stats.age} yrs</span>
                    </div>
                  )}
                  {stats.foot && (
                    <div className="px-2 py-0.5 rounded-lg bg-white/[0.01] border border-white/5 text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="text-gray-600 font-extrabold">FOOT:</span>
                      <span className="text-white">{stats.foot}</span>
                    </div>
                  )}
                  {stats.weakFootUsage && (
                    <div className="px-2 py-0.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-400 font-bold uppercase tracking-wider">
                      WF: {stats.weakFootUsage}
                    </div>
                  )}
                  {stats.weakFootAccuracy && (
                    <div className="px-2 py-0.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-400 font-bold uppercase tracking-wider">
                      WF ACC: {stats.weakFootAccuracy}
                    </div>
                  )}
                  {stats.injuryResistance && (
                    <div className="px-2 py-0.5 rounded-lg bg-green-500/5 border border-green-500/15 text-green-400 font-bold uppercase tracking-wider">
                      INJ RES: {stats.injuryResistance}
                    </div>
                  )}
                </div>
              </div>
 
              {/* Current Team Banner */}
              {currentTeam && (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-white/[0.01] to-[#E8A800]/10 border border-[#E8A800]/30 p-6 mb-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-[#E8A800]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-[#E8A800]/30 shadow-[0_0_15px_rgba(232,168,0,0.1)] group-hover:scale-105 transition-transform duration-300">
                      <img
                        src={currentTeam.logoUrl}
                        alt={currentTeam.name}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-[#E8A800] mb-1 font-black uppercase tracking-widest">Franchise Assignment</div>
                      <div className="text-2xl font-black text-white mb-2">{currentTeam.name}</div>
                      <div className="flex items-center gap-3 flex-wrap text-sm">
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                          <span className="text-emerald-500 font-black">Acquired:</span>
                          <span className="text-emerald-400 font-black text-base">£{currentTeam.soldPrice.toLocaleString()}</span>
                        </div>
                        <div className="text-gray-600">•</div>
                        <div className="text-gray-400 font-bold uppercase tracking-wider">{season.name}</div>
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
                      <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Attacking</h3>
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
                    <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Physical</h3>
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
                      <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Defending</h3>
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
                      <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Goalkeeping</h3>
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
                      <div className="rounded-3xl bg-[#0D0D0D]/90 border border-[#E8A800]/30 p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#E8A800]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Playing Attributes</h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {activeAttributes.map((attr) => (
                            <div
                              key={attr}
                              className="px-4 py-2.5 rounded-xl bg-white/[0.01] border border-[#E8A800]/30 text-amber-300 text-sm font-bold uppercase tracking-wider shadow-[0_4px_12px_rgba(232,168,0,0.05)] hover:border-[#E8A800]/50 hover:bg-[#E8A800]/5 hover:scale-105 transition-all duration-300 cursor-default"
                            >
                              {formatSkillName(attr)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {activeSkills.length > 0 && (
                      <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-6 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Skills</h3>
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
                                    className="px-3 py-2 rounded-xl bg-white/[0.01] border border-orange-500/20 text-orange-300 hover:border-orange-500/40 hover:bg-orange-500/5 text-sm font-semibold transition-all hover:scale-105 duration-200"
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
                                    className="px-3 py-2 rounded-xl bg-white/[0.01] border border-gray-500/20 text-gray-300 hover:border-gray-500/40 hover:bg-white/5 text-sm font-semibold transition-all hover:scale-105 duration-200"
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
                                    className="px-3 py-2 rounded-xl bg-white/[0.01] border border-red-500/20 text-red-300 hover:border-red-500/40 hover:bg-red-500/5 text-sm font-semibold transition-all hover:scale-105 duration-200"
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
                                    className="px-3 py-2 rounded-xl bg-white/[0.01] border border-blue-500/20 text-blue-300 hover:border-blue-500/40 hover:bg-blue-500/5 text-sm font-semibold transition-all hover:scale-105 duration-200"
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
                                    className="px-3 py-2 rounded-xl bg-white/[0.01] border border-yellow-500/20 text-yellow-300 hover:border-yellow-500/40 hover:bg-yellow-500/5 text-sm font-semibold transition-all hover:scale-105 duration-200"
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
                                    className="px-3 py-2 rounded-xl bg-white/[0.01] border border-green-500/20 text-green-300 hover:border-green-500/40 hover:bg-green-500/5 text-sm font-semibold transition-all hover:scale-105 duration-200"
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
                                    className="px-3 py-2 rounded-xl bg-white/[0.01] border border-amber-500/20 text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/5 text-sm font-semibold transition-all hover:scale-105 duration-200"
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
              />
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden">
            {/* Player Name */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-extrabold text-white uppercase font-mono tracking-tight mb-2">{basePlayer.name}</h1>
              
              <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                <span className="px-2 py-0.5 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/25 text-[#E8A800] text-[10px] font-black uppercase font-mono">
                  {stats.position}
                </span>
                {stats.playingStyle && (
                  <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-400 text-[10px] font-black uppercase font-mono">
                    {stats.playingStyle}
                  </span>
                )}
              </div>
              
              {stats.realWorldClub && (
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mb-1">{stats.realWorldClub}</p>
              )}
              {stats.nationality && (
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">{stats.nationality}</p>
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
            <div className="mb-4 font-mono text-[10px]">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {stats.height && (
                  <span className="px-2 py-0.5 rounded-lg bg-white/[0.01] border border-white/5 text-white font-bold flex items-center gap-1 uppercase">
                    <span className="text-gray-600 font-extrabold">HT:</span>
                    {stats.height}cm
                  </span>
                )}
                {stats.weight && (
                  <span className="px-2 py-0.5 rounded-lg bg-white/[0.01] border border-white/5 text-white font-bold flex items-center gap-1 uppercase">
                    <span className="text-gray-600 font-extrabold">WT:</span>
                    {stats.weight}kg
                  </span>
                )}
                {stats.age && (
                  <span className="px-2 py-0.5 rounded-lg bg-white/[0.01] border border-white/5 text-white font-bold flex items-center gap-1 uppercase">
                    <span className="text-gray-600 font-extrabold">AGE:</span>
                    {stats.age} yrs
                  </span>
                )}
                {stats.foot && (
                  <span className="px-2 py-0.5 rounded-lg bg-white/[0.01] border border-white/5 text-white font-bold flex items-center gap-1 uppercase">
                    <span className="text-gray-600 font-extrabold">FOOT:</span>
                    {stats.foot}
                  </span>
                )}
              </div>
              
              {/* Weak Foot & Injury */}
              {(stats.weakFootUsage || stats.weakFootAccuracy || stats.injuryResistance) && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  {stats.weakFootUsage && (
                    <span className="px-2 py-0.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-400 font-bold uppercase tracking-wider">
                      WF: {stats.weakFootUsage}
                    </span>
                  )}
                  {stats.weakFootAccuracy && (
                    <span className="px-2 py-0.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-400 font-bold uppercase tracking-wider">
                      WF ACC: {stats.weakFootAccuracy}
                    </span>
                  )}
                  {stats.injuryResistance && (
                    <span className="px-2 py-0.5 rounded-lg bg-green-500/5 border border-green-500/15 text-green-400 font-bold uppercase tracking-wider">
                      INJ RES: {stats.injuryResistance}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Current Team Banner */}
            {currentTeam && (
              <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-white/[0.01] to-[#E8A800]/10 border border-[#E8A800]/20 p-4 mb-6 backdrop-blur-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 border border-[#E8A800]/30">
                    <img
                      src={currentTeam.logoUrl}
                      alt={currentTeam.name}
                      className="w-full h-full object-contain p-1.5"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-[#E8A800] mb-0.5 font-black uppercase tracking-wider">Current Team</div>
                    <div className="text-base font-black text-white mb-0.5 truncate">{currentTeam.name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold text-xs">Acquired:</span>
                      <span className="text-emerald-400 font-black text-sm">£{currentTeam.soldPrice.toLocaleString()}</span>
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
                    <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-4 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Attacking</h3>
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

                  <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-4 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Physical</h3>
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
                    <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-4 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Defending</h3>
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
                    <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-4 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Goalkeeping</h3>
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
                    <div className="rounded-3xl bg-[#0D0D0D]/90 border border-[#E8A800]/30 p-4 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-[#E8A800]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                        <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Playing Attributes</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeAttributes.map((attr) => (
                          <div
                            key={attr}
                            className="px-3 py-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wide"
                          >
                            {formatSkillName(attr)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSkills.length > 0 && (
                    <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-4 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        </div>
                        <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Skills</h3>
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
