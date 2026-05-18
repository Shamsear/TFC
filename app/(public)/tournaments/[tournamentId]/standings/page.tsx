import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

async function getTournamentStandingsData(tournamentId: string) {
  try {
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: {
        season: true,
        tournamentTeams: {
          include: {
            seasonTeam: {
              include: {
                team: true
              }
            }
          },
          orderBy: {
            seedPosition: 'asc'
          }
        }
      }
    })

    if (!tournament) return null

    // Get all matches in this tournament
    const matches = await prisma.matches.findMany({
      where: { tournamentId },
      include: {
        homeTeam: {
          include: { team: true }
        },
        awayTeam: {
          include: { team: true }
        }
      }
    })

    // Calculate tournament-specific stats for each team
    const teamsWithStats = tournament.tournamentTeams.map((tournamentTeam) => {
      const teamId = tournamentTeam.teamId
      
      let played = 0
      let wins = 0
      let draws = 0
      let losses = 0
      let goalsFor = 0
      let goalsAgainst = 0

      matches.forEach(match => {
        if (match.status === 'COMPLETED' && match.homeScore !== null && match.awayScore !== null) {
          if (match.homeTeamId === teamId) {
            played++
            goalsFor += match.homeScore
            goalsAgainst += match.awayScore
            if (match.homeScore > match.awayScore) wins++
            else if (match.homeScore === match.awayScore) draws++
            else losses++
          } else if (match.awayTeamId === teamId) {
            played++
            goalsFor += match.awayScore
            goalsAgainst += match.homeScore
            if (match.awayScore > match.homeScore) wins++
            else if (match.awayScore === match.homeScore) draws++
            else losses++
          }
        }
      })

      const points = (wins * 3) + draws
      const goalDifference = goalsFor - goalsAgainst

      return {
        ...tournamentTeam.seasonTeam,
        groupName: tournamentTeam.groupName,
        seedPosition: tournamentTeam.seedPosition,
        played,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference,
        points
      }
    })

    const teams = teamsWithStats.sort((a, b) => {
      // Sort by points, then goal difference, then goals scored
      if (b.points !== a.points) return b.points - a.points
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
      return b.goalsFor - a.goalsFor
    })

    const totalMatches = matches.filter(m => m.status === 'COMPLETED').length
    const totalGoals = matches
      .filter(m => m.status === 'COMPLETED' && m.homeScore !== null && m.awayScore !== null)
      .reduce((sum, m) => sum + m.homeScore! + m.awayScore!, 0)

    return {
      tournament,
      teams,
      stats: { 
        totalTeams: teams.length,
        totalMatches,
        totalGoals
      }
    }
  } catch (error) {
    console.error('Error fetching tournament standings data:', error)
    return null
  }
}

export default async function TournamentStandingsPage({
  params
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = await params
  const data = await getTournamentStandingsData(tournamentId)

  if (!data) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24">
      <PublicHeader />

      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link
            href={`/tournaments/${tournamentId}`}
            className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Tournament
          </Link>

          {/* Header with Stats */}
          <div className="mb-6 sm:mb-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-bold text-[#FFB347] uppercase">{data.tournament.tournamentType}</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-[#F5F0E8] mb-1 sm:mb-2">Standings</h1>
                <p className="text-sm sm:text-base text-[#D4CCBB]">
                  {data.tournament.name} • {data.tournament.season.name}
                </p>
              </div>
              
              {/* Tournament Stats */}
              <div className="flex items-center gap-4 sm:gap-8">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{data.stats.totalTeams}</div>
                  <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Teams</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{data.stats.totalMatches}</div>
                  <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Matches</div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{data.stats.totalGoals}</div>
                  <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Goals</div>
                </div>
              </div>
            </div>
          </div>

          {/* Standings Table */}
          {data.teams.length === 0 ? (
            <div className="text-center py-12 sm:py-16 rounded-xl bg-white/[0.02] border border-white/10">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-[#7A7367] mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-[#F5F0E8] mb-2">No Standings Available</h3>
              <p className="text-sm sm:text-base text-[#D4CCBB]">Standings will appear here once matches are completed</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {data.teams.map((team, index) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.teamId}`}
                  className="group rounded-xl bg-[#111111] border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-[#181818] transition-all cursor-pointer"
                >
                  {/* Position Badge */}
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-black text-sm sm:text-base ${
                      index === 0 ? 'bg-[#E8A800] text-[#0a0a0a]' :
                      index === 1 ? 'bg-[#C0C0C0] text-[#0a0a0a]' :
                      index === 2 ? 'bg-[#CD7F32] text-[#0a0a0a]' :
                      'bg-white/5 text-[#7A7367]'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-black text-[#E8A800]">{team.points}</div>
                      <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase">Points</div>
                    </div>
                  </div>

                  {/* Team Name - Clickable */}
                  <h3 className="text-base sm:text-xl font-black text-[#F5F0E8] mb-3 sm:mb-4 group-hover:text-[#E8A800] transition-colors line-clamp-1">
                    {team.team.name}
                  </h3>

                  {/* Tournament Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-black text-[#F5F0E8]">{team.played}</div>
                      <div className="text-[10px] sm:text-xs text-[#7A7367]">Played</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-black text-emerald-400">{team.wins}</div>
                      <div className="text-[10px] sm:text-xs text-[#7A7367]">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-black text-red-400">{team.losses}</div>
                      <div className="text-[10px] sm:text-xs text-[#7A7367]">Losses</div>
                    </div>
                  </div>

                  {/* Goals Stats */}
                  <div className="flex items-center justify-between mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      <span className="text-xs sm:text-sm text-[#D4CCBB]">GF: <span className="font-bold text-[#F5F0E8]">{team.goalsFor}</span></span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span className="text-xs sm:text-sm text-[#D4CCBB]">GA: <span className="font-bold text-[#F5F0E8]">{team.goalsAgainst}</span></span>
                    </div>
                    <div className={`text-xs sm:text-sm font-bold ${team.goalDifference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {team.goalDifference >= 0 ? '+' : ''}{team.goalDifference}
                    </div>
                  </div>

                  {/* View Link */}
                  <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/10">
                    <span className="text-xs sm:text-sm font-bold text-[#E8A800] group-hover:text-[#FFC93A] transition-colors">
                      View Team Details
                    </span>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#E8A800] group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
