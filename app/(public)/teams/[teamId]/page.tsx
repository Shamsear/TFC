import { notFound } from "next/navigation"
import { TeamDetailView } from "@/components/team/TeamDetailView"

interface TeamDetailPageProps {
  params: Promise<{
    teamId: string
  }>
}

interface AllTimeStats {
  totalTrophies: number
  highestSigning: number
  seasonsParticipated: number
}

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

interface TeamDetailResponse {
  id: string
  name: string
  managerName: string
  logoUrl: string
  createdAt: string
  updatedAt: string
  allTimeStats: AllTimeStats
  seasonalData: SeasonalData[]
  transferHistory: TransferHistoryItem[]
}

async function getTeamDetails(teamId: string): Promise<TeamDetailResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/teams/${teamId}`, {
      cache: "no-store"
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch (error) {
    console.error("Error fetching team details:", error)
    return null
  }
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { teamId } = await params
  const teamData = await getTeamDetails(teamId)

  if (!teamData) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 pb-8">
        {/* Team Header */}
        <div className="mb-8 flex flex-col items-center gap-6 md:flex-row md:items-start">
          <div className="relative h-32 w-32 overflow-hidden rounded-lg shadow-[0_0_80px_rgba(0,255,255,0.3)]">
            <img
              src={teamData.logoUrl}
              alt={`${teamData.name} logo`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="text-center md:text-left">
            <h1 className="mb-2 text-4xl font-bold">{teamData.name}</h1>
            <p className="text-xl text-gray-400">Manager: {teamData.managerName}</p>
          </div>
        </div>

        {/* All-Time Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-gray-900 p-6 shadow-[0_0_80px_rgba(255,0,255,0.2)]">
            <h3 className="mb-2 text-sm uppercase tracking-wide text-gray-400">
              Total Trophies
            </h3>
            <p className="text-4xl font-bold text-cyan-400">
              {teamData.allTimeStats.totalTrophies}
            </p>
          </div>
          <div className="rounded-lg bg-gray-900 p-6 shadow-[0_0_80px_rgba(255,0,255,0.2)]">
            <h3 className="mb-2 text-sm uppercase tracking-wide text-gray-400">
              Highest Signing
            </h3>
            <p className="text-4xl font-bold text-cyan-400">
              ${teamData.allTimeStats.highestSigning.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-gray-900 p-6 shadow-[0_0_80px_rgba(255,0,255,0.2)]">
            <h3 className="mb-2 text-sm uppercase tracking-wide text-gray-400">
              Seasons Participated
            </h3>
            <p className="text-4xl font-bold text-cyan-400">
              {teamData.allTimeStats.seasonsParticipated}
            </p>
          </div>
        </div>

        {/* Season-by-Season View */}
        <TeamDetailView
          teamId={teamData.id}
          seasonalData={teamData.seasonalData}
          transferHistory={teamData.transferHistory}
        />
      </div>
    </div>
  )
}
