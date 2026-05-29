import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TeamLogo from '@/components/team/TeamLogo'

async function getTournamentTeamsData(tournamentId: string) {
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
    console.error('Error fetching tournament teams data:', error)
    return null
  }
}

export default async function TournamentTeamsPage({
  params
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = await params
  const data = await getTournamentTeamsData(tournamentId)

  if (!data) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-16 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Back Button */}
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] transition-colors mb-6 font-bold text-xs uppercase tracking-wider"
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Tournament
        </Link>

        {/* Header with Stats */}
        <div className="mb-8 border-b border-white/5 pb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  🏆 {data.tournament.tournamentType}
                </span>
                <span className="text-[10px] font-black text-gray-500 uppercase">
                  {data.tournament.season.name}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                  Tournament Standings
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 font-semibold mt-1 uppercase tracking-wider">
                {data.tournament.name} • CURRENT STANDINGS AND STAGED PERFORMANCES
              </p>
            </div>
            
            {/* Tournament Stats */}
            <div className="flex items-center gap-6 sm:gap-10">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">{data.stats.totalTeams}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Teams</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">{data.stats.totalMatches}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Matches</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">{data.stats.totalGoals}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold font-sans">Goals</div>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Standings Table Grid */}
        {data.teams.length === 0 ? (
          <div className="rounded-3xl bg-white/[0.01] border border-white/5 p-12 text-center backdrop-blur-xl relative overflow-hidden">
            <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-black text-white mb-1">No Teams Found</h3>
            <p className="text-gray-400 text-xs uppercase tracking-wider">Teams will appear here once matches are scheduled</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {data.teams.map((team, index) => (
              <Link
                key={team.id}
                href={`/teams/${team.teamId}`}
                className="relative block rounded-2xl bg-[#0d0d0d]/40 backdrop-blur-xl border border-white/5 p-5 hover:border-amber-500/30 hover:bg-white/[0.01] hover:shadow-[0_0_30px_rgba(232,168,0,0.05)] transition-all duration-300 group cursor-pointer overflow-hidden shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-transparent pointer-events-none" />

                {/* Position Badge Overlay */}
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm ${
                    index === 0 ? 'bg-[#E8A800] text-[#0a0a0a] shadow-[0_0_15px_rgba(232,168,0,0.3)]' :
                    index === 1 ? 'bg-[#C0C0C0] text-[#0a0a0a] shadow-[0_0_15px_rgba(192,192,192,0.3)]' :
                    index === 2 ? 'bg-[#CD7F32] text-[#0a0a0a] shadow-[0_0_15px_rgba(205,127,50,0.3)]' :
                    'bg-white/5 border border-white/10 text-gray-500'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-black text-[#E8A800] font-mono">{team.points}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Points</div>
                  </div>
                </div>

                {/* Team Name Header */}
                <div className="mb-4 relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 p-1 flex-shrink-0 shadow-lg ring-2 ring-white/5 group-hover:ring-amber-500/20 transition-all flex items-center justify-center">
                    <TeamLogo logoUrl={team.team.logoUrl} teamName={team.team.name} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-black text-white group-hover:text-[#FFB347] transition-colors truncate">
                      {team.team.name}
                    </h3>
                  </div>
                </div>

                {/* Tournament Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
                  <div className="rounded-xl bg-black/40 border border-white/5 p-2 text-center">
                    <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider mb-0.5">Played</div>
                    <div className="text-sm font-black text-white font-mono">{team.played}</div>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/5 p-2 text-center">
                    <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider mb-0.5 font-sans">Wins</div>
                    <div className="text-sm font-black text-emerald-400 font-mono">{team.wins}</div>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/5 p-2 text-center">
                    <div className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider mb-0.5">Losses</div>
                    <div className="text-sm font-black text-red-400 font-mono">{team.losses}</div>
                  </div>
                </div>

                {/* Goals Stats */}
                <div className="flex items-center justify-between mb-4 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs relative z-10">
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">GF: <span className="font-black text-white font-mono">{team.goalsFor}</span></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">GA: <span className="font-black text-white font-mono">{team.goalsAgainst}</span></span>
                  </div>
                  <div className={`text-[10px] font-black font-mono ${team.goalDifference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {team.goalDifference >= 0 ? '+' : ''}{team.goalDifference} GD
                  </div>
                </div>

                {/* View Link */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 relative z-10">
                  <span className="text-xs font-bold text-[#E8A800] group-hover:text-[#FFC93A] transition-colors uppercase tracking-wider">
                    View Squad
                  </span>
                  <svg className="w-4 h-4 text-[#E8A800] group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
