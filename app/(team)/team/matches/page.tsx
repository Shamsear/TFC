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
      <div className="min-h-screen bg-[#0a0a0a] py-8 relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-lg">
            <h1 className="text-2xl font-black text-white mb-2">No Active Season</h1>
            <p className="text-gray-400 text-sm font-semibold">There is no active season calendar at the moment.</p>
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
      <div className="min-h-screen bg-[#0a0a0a] py-8 relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-lg">
            <h1 className="text-2xl font-black text-white mb-2">Not Participating</h1>
            <p className="text-gray-400 text-sm font-semibold">Your team is not participating in the current season.</p>
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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 relative overflow-hidden">
      {/* Background blurs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 right-20 w-80 h-80 bg-[#E8A800]/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Header Sticky Strip */}
      <div className="border-b border-white/5 bg-white/[0.01] sticky top-0 z-40 backdrop-blur-md mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              <span className="bg-gradient-to-r from-[#E8A800] via-[#FFB347] to-[#E8A800] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(232,168,0,0.15)]">
                {team?.name} Fixtures
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-xs font-bold uppercase tracking-wider mt-1">{activeSeason.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/[0.01] border border-white/10 p-4 sm:p-5 backdrop-blur-md shadow-lg">
            <div className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Played</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.1)]">{pastMatches.length}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/20 p-4 sm:p-5 backdrop-blur-md shadow-lg">
            <div className="text-[10px] sm:text-xs text-emerald-500/70 font-bold uppercase tracking-wider mb-1">Wins</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">{wins}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-[#E8A800]/[0.02] border border-[#E8A800]/20 p-4 sm:p-5 backdrop-blur-md shadow-lg">
            <div className="text-[10px] sm:text-xs text-[#E8A800]/70 font-bold uppercase tracking-wider mb-1">Draws</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#E8A800] drop-shadow-[0_0_8px_rgba(232,168,0,0.2)]">{draws}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-red-500/[0.02] border border-red-500/20 p-4 sm:p-5 backdrop-blur-md shadow-lg">
            <div className="text-[10px] sm:text-xs text-red-500/70 font-bold uppercase tracking-wider mb-1">Losses</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]">{losses}</div>
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
