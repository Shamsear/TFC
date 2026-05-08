'use client'

import { useState } from 'react'
import { PlayerChange } from '@/app/api/import/preview/route'

interface ChangeComparisonCardProps {
  change: PlayerChange
  isSelected: boolean
  onToggle: () => void
}

export default function ChangeComparisonCard({
  change,
  isSelected,
  onToggle
}: ChangeComparisonCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
      // Defenders
      case 'CB': return 'bg-blue-500/20 border-blue-500/30 text-blue-400'
      case 'LB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      case 'RB': return 'bg-blue-400/20 border-blue-400/30 text-blue-300'
      // Midfielders
      case 'DMF': return 'bg-green-600/20 border-green-600/30 text-green-500'
      case 'CMF': return 'bg-green-500/20 border-green-500/30 text-green-400'
      case 'LMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'RMF': return 'bg-green-400/20 border-green-400/30 text-green-300'
      case 'AMF': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
      // Forwards
      case 'SS': return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
      case 'LWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'RWF': return 'bg-red-400/20 border-red-400/30 text-red-300'
      case 'CF': return 'bg-red-500/20 border-red-500/30 text-red-400'
      default: return 'bg-gray-500/20 border-gray-500/30 text-gray-400'
    }
  }

  const isFieldChanged = (field: keyof typeof change.oldStats) => {
    return change.changedFields.includes(field as string)
  }

  const StatRow = ({ label, oldValue, newValue, field }: { 
    label: string
    oldValue: any
    newValue: any
    field: string
  }) => {
    const changed = change.changedFields.includes(field)
    return (
      <div className={`flex justify-between py-1 px-2 rounded ${changed ? 'bg-orange-500/10' : ''}`}>
        <span className="text-gray-400 text-sm">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${changed ? 'text-red-400 line-through' : 'text-gray-500'}`}>
            {oldValue}
          </span>
          <span className="text-gray-600">→</span>
          <span className={`text-sm font-bold ${changed ? 'text-emerald-400' : 'text-white'}`}>
            {newValue}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border-2 transition-all ${
      isSelected
        ? 'bg-orange-500/10 border-orange-500'
        : 'bg-white/5 border-white/10 hover:border-white/20'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              className="w-5 h-5 rounded border-2 border-white/20 bg-black/50 checked:bg-orange-500 checked:border-orange-500 cursor-pointer"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-black text-white">{change.newStats.playerName}</h3>
              <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold">
                {change.changedFields.length} CHANGES
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{change.newStats.teamName}</span>
              <span>•</span>
              <span>{change.newStats.nationality}</span>
            </div>
          </div>
        </div>

        {/* Quick Comparison */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Old Stats */}
          <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
            <div className="text-xs font-bold text-red-400 mb-2">CURRENT</div>
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-1 rounded-lg border font-bold text-xs ${getPositionColor(change.oldStats.position)}`}>
                {change.oldStats.position}
              </span>
              <div className="text-2xl font-black text-gray-400">{change.oldStats.overallRating}</div>
            </div>
            <div className="text-xs text-gray-500">{change.oldStats.playingStyle}</div>
          </div>

          {/* New Stats */}
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
            <div className="text-xs font-bold text-emerald-400 mb-2">NEW</div>
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-1 rounded-lg border font-bold text-xs ${getPositionColor(change.newStats.position)}`}>
                {change.newStats.position}
              </span>
              <div className="text-2xl font-black text-emerald-400">{change.newStats.overallRating}</div>
            </div>
            <div className="text-xs text-emerald-400">{change.newStats.playingStyle}</div>
          </div>
        </div>

        {/* Changed Fields Summary */}
        <div className="mb-4">
          <div className="text-xs font-bold text-orange-400 mb-2">CHANGED FIELDS</div>
          <div className="flex flex-wrap gap-2">
            {change.changedFields.map(field => (
              <span
                key={field}
                className="px-2 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium"
              >
                {field.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Toggle Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors"
        >
          {showDetails ? '▼ Hide Detailed Comparison' : '▶ Show Detailed Comparison'}
        </button>

        {/* Detailed Comparison */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div>
                <div className="text-xs font-bold text-cyan-400 mb-2">BASIC INFO</div>
                <div className="space-y-1">
                  <StatRow label="Overall Rating" oldValue={change.oldStats.overallRating} newValue={change.newStats.overallRating} field="overallRating" />
                  <StatRow label="Position" oldValue={change.oldStats.position} newValue={change.newStats.position} field="position" />
                  <StatRow label="Playing Style" oldValue={change.oldStats.playingStyle} newValue={change.newStats.playingStyle} field="playingStyle" />
                  <StatRow label="Team" oldValue={change.oldStats.teamName} newValue={change.newStats.teamName} field="teamName" />
                  <StatRow label="Nationality" oldValue={change.oldStats.nationality} newValue={change.newStats.nationality} field="nationality" />
                </div>
              </div>

              {/* Offensive Stats */}
              <div>
                <div className="text-xs font-bold text-cyan-400 mb-2">OFFENSIVE</div>
                <div className="space-y-1">
                  <StatRow label="Awareness" oldValue={change.oldStats.offensiveAwareness} newValue={change.newStats.offensiveAwareness} field="offensiveAwareness" />
                  <StatRow label="Ball Control" oldValue={change.oldStats.ballControl} newValue={change.newStats.ballControl} field="ballControl" />
                  <StatRow label="Dribbling" oldValue={change.oldStats.dribbling} newValue={change.newStats.dribbling} field="dribbling" />
                  <StatRow label="Tight Possession" oldValue={change.oldStats.tightPossession} newValue={change.newStats.tightPossession} field="tightPossession" />
                  <StatRow label="Finishing" oldValue={change.oldStats.finishing} newValue={change.newStats.finishing} field="finishing" />
                  <StatRow label="Heading" oldValue={change.oldStats.heading} newValue={change.newStats.heading} field="heading" />
                </div>
              </div>

              {/* Passing Stats */}
              <div>
                <div className="text-xs font-bold text-green-400 mb-2">PASSING</div>
                <div className="space-y-1">
                  <StatRow label="Low Pass" oldValue={change.oldStats.lowPass} newValue={change.newStats.lowPass} field="lowPass" />
                  <StatRow label="Lofted Pass" oldValue={change.oldStats.loftedPass} newValue={change.newStats.loftedPass} field="loftedPass" />
                  <StatRow label="Set Pieces" oldValue={change.oldStats.setPieceTaking} newValue={change.newStats.setPieceTaking} field="setPieceTaking" />
                  <StatRow label="Curl" oldValue={change.oldStats.curl} newValue={change.newStats.curl} field="curl" />
                </div>
              </div>

              {/* Physical Stats */}
              <div>
                <div className="text-xs font-bold text-orange-400 mb-2">PHYSICAL</div>
                <div className="space-y-1">
                  <StatRow label="Speed" oldValue={change.oldStats.speed} newValue={change.newStats.speed} field="speed" />
                  <StatRow label="Acceleration" oldValue={change.oldStats.acceleration} newValue={change.newStats.acceleration} field="acceleration" />
                  <StatRow label="Kicking Power" oldValue={change.oldStats.kickingPower} newValue={change.newStats.kickingPower} field="kickingPower" />
                  <StatRow label="Jumping" oldValue={change.oldStats.jumping} newValue={change.newStats.jumping} field="jumping" />
                  <StatRow label="Physical Contact" oldValue={change.oldStats.physicalContact} newValue={change.newStats.physicalContact} field="physicalContact" />
                  <StatRow label="Balance" oldValue={change.oldStats.balance} newValue={change.newStats.balance} field="balance" />
                  <StatRow label="Stamina" oldValue={change.oldStats.stamina} newValue={change.newStats.stamina} field="stamina" />
                </div>
              </div>

              {/* Defensive Stats */}
              <div>
                <div className="text-xs font-bold text-blue-400 mb-2">DEFENSIVE</div>
                <div className="space-y-1">
                  <StatRow label="Awareness" oldValue={change.oldStats.defensiveAwareness} newValue={change.newStats.defensiveAwareness} field="defensiveAwareness" />
                  <StatRow label="Tackling" oldValue={change.oldStats.tackling} newValue={change.newStats.tackling} field="tackling" />
                  <StatRow label="Aggression" oldValue={change.oldStats.aggression} newValue={change.newStats.aggression} field="aggression" />
                  <StatRow label="Engagement" oldValue={change.oldStats.defensiveEngagement} newValue={change.newStats.defensiveEngagement} field="defensiveEngagement" />
                </div>
              </div>

              {/* Goalkeeper Stats */}
              {change.newStats.position === 'GK' && (
                <div>
                  <div className="text-xs font-bold text-yellow-400 mb-2">GOALKEEPER</div>
                  <div className="space-y-1">
                    <StatRow label="Awareness" oldValue={change.oldStats.gkAwareness} newValue={change.newStats.gkAwareness} field="gkAwareness" />
                    <StatRow label="Catching" oldValue={change.oldStats.gkCatching} newValue={change.newStats.gkCatching} field="gkCatching" />
                    <StatRow label="Parrying" oldValue={change.oldStats.gkParrying} newValue={change.newStats.gkParrying} field="gkParrying" />
                    <StatRow label="Reflexes" oldValue={change.oldStats.gkReflexes} newValue={change.newStats.gkReflexes} field="gkReflexes" />
                    <StatRow label="Reach" oldValue={change.oldStats.gkReach} newValue={change.newStats.gkReach} field="gkReach" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
