import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canEditTeam, checkTeamSeasonParticipation } from "@/lib/team-auth"
import Image from "next/image"
import Link from "next/link"
import TeamLogo from "@/components/team/TeamLogo"
import PushToggle from "@/components/notifications/PushToggle"

export const metadata = {
  title: "Team Profile | Turf Cats",
  description: "Team profile and information",
}

export default async function TeamProfilePage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is participating in active season
  const { isParticipating } = await checkTeamSeasonParticipation()
  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  // Fetch team info with minimal nested data
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
    select: {
      id: true,
      name: true,
      managerName: true,
      logoUrl: true,
      createdAt: true,
      seasonTeams: {
        select: {
          id: true,
          currentBudget: true,
          trophiesWon: true,
          season: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          }
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  if (!team) {
    redirect("/auth/signin")
  }

  // Check if user can edit this team
  const canEdit = await canEditTeam(team.id)

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
  })

  // Get current season team data
  const currentSeasonTeam = activeSeason
    ? await prisma.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: activeSeason.id,
            teamId: team.id,
          },
        },
      })
    : null

  // Get team statistics
  const totalSeasons = team.seasonTeams.length
  const totalTrophies = team.seasonTeams.reduce(
    (sum, st) => sum + st.trophiesWon,
    0
  )

  // Get match statistics for current season (limit to last 50 matches)
  const matchStats = currentSeasonTeam
    ? await prisma.matches.findMany({
        where: {
          OR: [
            { homeTeamId: currentSeasonTeam.id },
            { awayTeamId: currentSeasonTeam.id },
          ],
          status: "COMPLETED",
        },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
        },
        take: 50 // Limit to last 50 matches
      })
    : []

  // Calculate win/draw/loss
  let wins = 0
  let draws = 0
  let losses = 0

  matchStats.forEach((match) => {
    if (match.homeScore === null || match.awayScore === null) return

    const isHome = match.homeTeamId === currentSeasonTeam?.id
    const teamScore = isHome ? match.homeScore : match.awayScore
    const opponentScore = isHome ? match.awayScore : match.homeScore

    if (teamScore > opponentScore) wins++
    else if (teamScore === opponentScore) draws++
    else losses++
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-16 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10">
        {/* Back Button Header */}
        <Link
          href="/team"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-semibold text-sm cursor-pointer mb-6 transform active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 tracking-tight">
            <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
              Team Profile
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-xs font-bold uppercase tracking-wider">
            View and manage your team information
          </p>
        </div>

        {/* Team Information Card */}
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.01] rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 relative z-10">
            {/* Team Logo */}
            <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="xl" />

            {/* Team Details */}
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 mb-3">
                {team.name}
              </h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Manager:</span>
                  <span className="text-[#D4CCBB] font-bold">
                    {team.managerName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Team ID:</span>
                  <span className="text-amber-400 font-mono text-sm">{team.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Member Since:</span>
                  <span className="text-[#D4CCBB] font-bold">
                    {new Date(team.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            {canEdit && (
              <div className="relative z-10">
                <Link
                  href="/team/profile/edit"
                  className="group relative inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFD573] text-[#0a0a0a] rounded-xl font-extrabold text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-[#E8A800]/10 hover:shadow-[#E8A800]/25 cursor-pointer"
                >
                  Edit Profile
                </Link>
              </div>
            )}
          </div>

          {/* Current Season Info */}
          {activeSeason && currentSeasonTeam && (
            <div className="border-t border-white/5 pt-6 relative z-10">
              <h3 className="text-lg sm:text-xl font-black text-white mb-4">
                Current Season: {activeSeason.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="relative rounded-xl bg-white/[0.01] border border-white/5 p-4 overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/[0.02] rounded-full blur-xl pointer-events-none" />
                  <div className="text-gray-500 text-xs sm:text-sm mb-1 font-bold uppercase tracking-wider">Budget</div>
                  <div className="text-emerald-400 text-lg sm:text-xl font-black">
                    £{currentSeasonTeam.currentBudget.toLocaleString()}
                  </div>
                </div>
                <div className="relative rounded-xl bg-white/[0.01] border border-white/5 p-4 overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/[0.02] rounded-full blur-xl pointer-events-none" />
                  <div className="text-gray-500 text-xs sm:text-sm mb-1 font-bold uppercase tracking-wider">Trophies</div>
                  <div className="text-[#E8A800] text-lg sm:text-xl font-black">
                    {currentSeasonTeam.trophiesWon}
                  </div>
                </div>
                <div className="relative rounded-xl bg-white/[0.01] border border-white/5 p-4 overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/[0.02] rounded-full blur-xl pointer-events-none" />
                  <div className="text-gray-500 text-xs sm:text-sm mb-1 font-bold uppercase tracking-wider">Matches</div>
                  <div className="text-cyan-400 text-lg sm:text-xl font-black">
                    {wins + draws + losses}
                  </div>
                </div>
                <div className="relative rounded-xl bg-white/[0.01] border border-white/5 p-4 overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/[0.02] rounded-full blur-xl pointer-events-none" />
                  <div className="text-gray-500 text-xs sm:text-sm mb-1 font-bold uppercase tracking-wider">Win Rate</div>
                  <div className="text-indigo-400 text-lg sm:text-xl font-black">
                    {wins + draws + losses > 0
                      ? `${Math.round((wins / (wins + draws + losses)) * 100)}%`
                      : "0%"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Team History */}
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.01] rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-xl sm:text-2xl font-black text-white mb-6 relative z-10">Team History</h3>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 relative z-10">
            <div className="text-center p-3 rounded-xl bg-white/[0.01] border border-white/5">
              <div className="text-2xl sm:text-3xl font-black text-[#E8A800] mb-1">
                {totalSeasons}
              </div>
              <div className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider">Seasons Played</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.01] border border-white/5">
              <div className="text-2xl sm:text-3xl font-black text-[#E8A800] mb-1">
                {totalTrophies}
              </div>
              <div className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider">Total Trophies</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.01] border border-white/5">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mb-1">
                {wins}
              </div>
              <div className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider">Wins (Current)</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.01] border border-white/5">
              <div className="text-2xl sm:text-3xl font-black text-red-400 mb-1">
                {losses}
              </div>
              <div className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider">Losses (Current)</div>
            </div>
          </div>

          {/* Season Participation */}
          <div className="relative z-10">
            <h4 className="text-lg font-black text-white mb-4">
              Season Participation
            </h4>
            {team.seasonTeams.length > 0 ? (
              <div className="space-y-3">
                {team.seasonTeams.map((st) => (
                  <div
                    key={st.id}
                    className="rounded-xl bg-white/[0.01] border border-white/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-white font-bold">
                          {st.season.name}
                        </div>
                        <div className="text-sm font-medium mt-0.5">
                          {st.season.isActive ? (
                            <span className="text-emerald-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active</span>
                          ) : (
                            <span className="text-gray-500">Completed</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Budget</div>
                        <div className="text-emerald-400 font-black text-sm">
                          £{st.currentBudget.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Trophies</div>
                        <div className="text-[#E8A800] font-black text-sm">
                          {st.trophiesWon}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#7A7367]">
                No season participation yet
              </div>
            )}
          </div>
        </div>

        {/* Push Notification Controls */}
        <div className="mb-6 sm:mb-8">
          <PushToggle />
        </div>
        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <Link
            href="/team/squad"
            className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-[#E8A800]/[0.03] transition-colors" />
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#E8A800]/20 transition-colors shadow-lg">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-[#E8A800] uppercase tracking-wider transition-colors">View Squad</div>
          </Link>
          <Link
            href="/team/matches"
            className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-[#E8A800]/[0.03] transition-colors" />
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#E8A800]/20 transition-colors shadow-lg">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-[#E8A800] uppercase tracking-wider transition-colors">Matches</div>
          </Link>
          <Link
            href="/team/tournaments"
            className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-[#E8A800]/[0.03] transition-colors" />
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#E8A800]/20 transition-colors shadow-lg">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
              </svg>
            </div>
            <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-[#E8A800] uppercase tracking-wider transition-colors">Tournaments</div>
          </Link>
          <Link
            href="/team/finances"
            className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 text-center group"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A800]/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-[#E8A800]/[0.03] transition-colors" />
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#E8A800]/20 transition-colors shadow-lg">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-white font-extrabold text-xs sm:text-sm group-hover:text-[#E8A800] uppercase tracking-wider transition-colors">Finances</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
