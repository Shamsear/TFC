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
  xp: number
  level: number
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
          <div className="text-center md:text-left flex flex-col gap-2">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
              <h1 className="text-4xl font-bold">{teamData.name}</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 w-fit">
                Lvl {teamData.level}
              </span>
            </div>
            <p className="text-xl text-gray-400">Manager: {teamData.managerName}</p>
            <div className="mt-2 flex justify-center md:justify-start">
              <a
                href={`/teams/${teamData.id}/achievements`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-sm font-semibold hover:from-cyan-400 hover:to-purple-500 transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
              >
                <svg className="w-4 h-4 text-white shrink-0 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25c0-1.657-1.343-3-3-3H15m-6 0H7.5c-1.657 0-3 1.343-3 3 0 2.222 1.385 4.099 3.32 4.792a6.002 6.002 0 0010.36 0c1.935-.693 3.32-2.57 3.32-4.792z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25v2.25M9 21.75h6" />
                </svg>
                View Achievements Showcase
              </a>
            </div>
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
