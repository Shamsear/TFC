"use client"

import { useState } from "react"

interface SeasonalData {
  seasonId: string
  seasonName: string
  currentBudget: number
  finalBudget: number | null
  trophiesWon: number
  played?: number
  won?: number
  drawn?: number
  lost?: number
  goalsFor?: number
  goalsAgainst?: number
  goalDiff?: number
  points?: number
}

interface TransferHistoryItem {
  id: string
  playerId: string
  playerName: string
  seasonId: string
  seasonName: string
  soldPrice: number
  createdAt: string
}

interface TeamDetailViewProps {
  teamId: string
  seasonalData: SeasonalData[]
  transferHistory: TransferHistoryItem[]
}

export function TeamDetailView({
  teamId,
  seasonalData,
  transferHistory,
}: TeamDetailViewProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(
    seasonalData.length > 0 ? seasonalData[0].seasonId : null
  )

  const selectedSeason = seasonalData.find((s) => s.seasonId === selectedSeasonId)
  const seasonRoster = transferHistory.filter((t) => t.seasonId === selectedSeasonId)

  if (seasonalData.length === 0) {
    return (
      <div className="rounded-lg bg-dark-100 p-fluid-lg text-center">
        <p className="text-gray-400 text-fluid-base">No season data available for this team.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Season Selector */}
      <div>
        <h2 className="mb-4 text-fluid-2xl font-bold">Season-by-Season View</h2>
        <div className="flex flex-wrap gap-fluid-xs">
          {seasonalData.map((season) => (
            <button
              key={season.seasonId}
              onClick={() => setSelectedSeasonId(season.seasonId)}
              className={`rounded-lg px-4 py-2 font-medium text-fluid-sm transition-all ${
                selectedSeasonId === season.seasonId
                  ? "bg-neon-blue text-black shadow-neon-glow"
                  : "bg-dark-100 text-gray-300 hover:bg-dark-200"
              }`}
            >
              {season.seasonName}
            </button>
          ))}
        </div>
      </div>

      {selectedSeason && (
        <>
          {/* Season Performance Metrics */}
          <div className="grid grid-cols-1 gap-fluid-sm md:grid-cols-3">
            <div className="rounded-lg bg-dark-100 p-fluid-md shadow-offset-80">
              <h3 className="mb-2 text-fluid-xs uppercase tracking-wide text-gray-400">
                Current Budget
              </h3>
              <p className="text-fluid-3xl font-bold text-[#E8A800]">
                £{selectedSeason.currentBudget.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-dark-100 p-fluid-md shadow-offset-80">
              <h3 className="mb-2 text-fluid-xs uppercase tracking-wide text-gray-400">
                Final Budget
              </h3>
              <p className="text-fluid-3xl font-bold text-[#E8A800]">
                {selectedSeason.finalBudget !== null
                  ? `£${selectedSeason.finalBudget.toLocaleString()}`
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-lg bg-dark-100 p-fluid-md shadow-offset-80">
              <h3 className="mb-2 text-fluid-xs uppercase tracking-wide text-gray-400">
                Trophies Won
              </h3>
              <p className="text-fluid-3xl font-bold text-[#E8A800]">
                {selectedSeason.trophiesWon}
              </p>
            </div>
          </div>

          {/* Season Standings / Stats Grid */}
          {selectedSeason.played !== undefined && selectedSeason.played > 0 && (
            <div className="rounded-lg bg-dark-100 p-fluid-md shadow-offset-80 mt-6">
              <h3 className="mb-4 text-fluid-lg font-bold text-white">Season Overall Standings</h3>
              <div className="grid grid-cols-4 gap-2 text-center sm:grid-cols-8">
                <div className="bg-white/5 rounded-lg p-2.5">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Played</div>
                  <div className="font-bold text-white text-lg">{selectedSeason.played}</div>
                </div>
                <div className="bg-emerald-500/10 rounded-lg p-2.5 border border-emerald-500/10">
                  <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Won</div>
                  <div className="font-bold text-emerald-400 text-lg">{selectedSeason.won}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2.5">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Drawn</div>
                  <div className="font-bold text-white text-lg">{selectedSeason.drawn}</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-2.5 border border-red-500/10">
                  <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Lost</div>
                  <div className="font-bold text-red-400 text-lg">{selectedSeason.lost}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2.5">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">GF</div>
                  <div className="font-bold text-white text-lg">{selectedSeason.goalsFor}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2.5">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">GA</div>
                  <div className="font-bold text-white text-lg">{selectedSeason.goalsAgainst}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2.5">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">GD</div>
                  <div className="font-bold text-white text-lg">
                    {selectedSeason.goalDiff !== undefined && selectedSeason.goalDiff > 0 ? `+${selectedSeason.goalDiff}` : selectedSeason.goalDiff}
                  </div>
                </div>
                <div className="bg-cyan-500/10 rounded-lg p-2.5 border border-cyan-500/10">
                  <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-1">Points</div>
                  <div className="font-bold text-cyan-400 text-lg">{selectedSeason.points}</div>
                </div>
              </div>
            </div>
          )}

          {/* Season Roster */}
          <div>
            <h3 className="mb-4 text-fluid-xl font-bold">Season Roster</h3>
            {seasonRoster.length > 0 ? (
              <div className="grid grid-cols-1 gap-fluid-sm md:grid-cols-2 lg:grid-cols-3">
                {seasonRoster.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="rounded-lg bg-dark-100 p-fluid-sm shadow-offset-80-pink transition-all hover:shadow-neon-glow-pink"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-fluid-lg font-semibold">{transfer.playerName}</h4>
                      <span className="rounded bg-neon-blue px-2 py-1 text-fluid-xs font-bold text-black">
                        ${transfer.soldPrice.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-fluid-sm text-gray-400">
                      Acquired: {new Date(transfer.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-dark-100 p-fluid-lg text-center">
                <p className="text-gray-400 text-fluid-base">No players acquired in this season.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
