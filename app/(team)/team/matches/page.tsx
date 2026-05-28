import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import TournamentMatches from "@/components/tournaments/TournamentMatches"

export const metadata = {
  title: "Matches | Team Dashboard",
  description: "View team matches",
}

export default async function MatchesPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason, seasonTeam } = await checkTeamSeasonParticipation()

  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  if (!activeSeason || !seasonTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">No Active Season</h1>
            <p className="text-gray-400">There is no active season at the moment.</p>
          </div>
        </div>
      </div>
    )
  }

  // Get current season team
  const currentSeasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: activeSeason.id,
        teamId: session.user.teamId,
      },
    },
  })

  if (!currentSeasonTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">Not Participating</h1>
            <p className="text-gray-400">Your team is not participating in the current season.</p>
          </div>
        </div>
      </div>
    )
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  // Get all matches (upcoming and past) - limit to 100
  const allMatches = await prisma.matches.findMany({
    where: {
      tournament: {
        seasonId: activeSeason.id,
      },
      OR: [
        { homeTeamId: currentSeasonTeam.id },
        { awayTeamId: currentSeasonTeam.id },
      ],
    },
    select: {
      id: true,
      startDate: true,
      matchDate: true,
      status: true,
      homeScore: true,
      awayScore: true,
      round: true,
      homeTeamId: true,
      awayTeamId: true,
      homeTeam: {
        select: {
          id: true,
          teamId: true,
          team: {
            select: {
              id: true,
              name: true,
              logoUrl: true
            }
          }
        }
      },
      awayTeam: {
        select: {
          id: true,
          teamId: true,
          team: {
            select: {
              id: true,
              name: true,
              logoUrl: true
            }
          }
        }
      },
      tournament: {
        select: {
          id: true,
          name: true
        }
      },
    },
    orderBy: {
      matchDate: "asc",
    },
    take: 100 // Limit to last 100 matches
  })

  // Separate upcoming and past matches
  const now = new Date()
  const upcomingMatches = allMatches.filter((m) => new Date(m.matchDate) > now || m.status === "SCHEDULED" || m.status === "LIVE")
  const pastMatches = allMatches.filter((m) => new Date(m.matchDate) <= now && m.status !== "SCHEDULED" && m.status !== "LIVE")

  // Calculate stats
  const wins = pastMatches.filter((m) => {
    if (m.status !== "COMPLETED") return false
    const isHome = m.homeTeamId === currentSeasonTeam.id
    if (isHome) {
      return (m.homeScore || 0) > (m.awayScore || 0)
    } else {
      return (m.awayScore || 0) > (m.homeScore || 0)
    }
  }).length

  const draws = pastMatches.filter((m) => {
    if (m.status !== "COMPLETED") return false
    return m.homeScore === m.awayScore
  }).length

  const losses = pastMatches.filter((m) => {
    if (m.status !== "COMPLETED") return false
    const isHome = m.homeTeamId === currentSeasonTeam.id
    if (isHome) {
      return (m.homeScore || 0) < (m.awayScore || 0)
    } else {
      return (m.awayScore || 0) < (m.homeScore || 0)
    }
  }).length

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              {team?.name} Matches
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">{activeSeason.name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Played</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{pastMatches.length}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Wins</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400">{wins}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Draws</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-yellow-400">{draws}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Losses</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-red-400">{losses}</div>
          </div>
        </div>

        {/* Tournament Matches Component */}
        <div className="mt-8">
          <TournamentMatches 
            matches={allMatches}
            myTeamId={session.user.teamId}
            teamLinkBase="/teams"
          />
        </div>
      </div>
    </div>
  )
}
