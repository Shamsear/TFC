"use client"

import { useState } from "react"

interface SeasonalData {
  seasonId: string
  seasonName: string
  currentBudget: number
  finalBudget: number | null
  trophiesWon: number
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
              <p className="text-fluid-3xl font-bold text-neon-blue">
                ${selectedSeason.currentBudget.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-dark-100 p-fluid-md shadow-offset-80">
              <h3 className="mb-2 text-fluid-xs uppercase tracking-wide text-gray-400">
                Final Budget
              </h3>
              <p className="text-fluid-3xl font-bold text-neon-blue">
                {selectedSeason.finalBudget !== null
                  ? `${selectedSeason.finalBudget.toLocaleString()}`
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-lg bg-dark-100 p-fluid-md shadow-offset-80">
              <h3 className="mb-2 text-fluid-xs uppercase tracking-wide text-gray-400">
                Trophies Won
              </h3>
              <p className="text-fluid-3xl font-bold text-neon-blue">
                {selectedSeason.trophiesWon}
              </p>
            </div>
          </div>

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
