'use client'

import Image from 'next/image'
import { TeamWithBudget } from '@/hooks/useOptimisticAuction'

interface TeamBudgetGridProps {
  teams: TeamWithBudget[]
  onTeamSelect: (teamId: string) => void
  selectedTeamId?: string
}

export function TeamBudgetGrid({ teams, onTeamSelect, selectedTeamId }: TeamBudgetGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-fluid-sm md:gap-fluid-md">
      {teams.map((team) => {
        const isSelected = selectedTeamId === team.id
        const isLowBudget = team.currentBudget < 1000000

        return (
          <button
            key={team.id}
            onClick={() => onTeamSelect(team.id)}
            className={`
              relative p-fluid-sm rounded-lg border-2 transition-all duration-200
              ${isSelected 
                ? 'border-neon-purple bg-neon-purple/10 shadow-offset-80-purple' 
                : 'border-zinc-800 bg-dark-100 hover:border-zinc-700 hover:bg-dark-200'
              }
              ${isLowBudget ? 'opacity-60' : ''}
            `}
          >
            {/* Team Logo */}
            <div className="relative w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden bg-zinc-800">
              <Image
                src={team.logoUrl}
                alt={team.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>

            {/* Team Name */}
            <h3 className="text-white font-semibold text-center mb-2 truncate text-fluid-base">
              {team.name}
            </h3>

            {/* Budget Display */}
            <div className="text-center">
              <div className="text-fluid-xs text-zinc-400 mb-1">Current Budget</div>
              <div className={`text-fluid-lg font-bold ${isLowBudget ? 'text-red-400' : 'text-neon-green'}`}>
                ${team.currentBudget.toLocaleString()}
              </div>
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-neon-purple rounded-full animate-pulse shadow-neon-glow" />
            )}

            {/* Low Budget Warning */}
            {isLowBudget && (
              <div className="absolute -top-2 -left-2 bg-red-500 text-white text-fluid-xs font-bold px-2 py-1 rounded-full">
                LOW
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
