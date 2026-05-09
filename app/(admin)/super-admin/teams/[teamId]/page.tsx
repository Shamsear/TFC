import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

interface TeamDetailPageProps {
  params: Promise<{
    teamId: string
  }>
}

// Icon Components
const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)

async function getTeamData(teamId: string) {
  const team = await prisma.teams.findUnique({
    where: { id: teamId },
    include: {
      seasonTeams: {
        include: {
          season: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      transferHistory: {
        include: {
          basePlayer: {
            include: {
              seasonalPlayerStats: true
            }
          },
          season: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  if (!team) {
    return null
  }

  // Calculate stats
  const totalSeasons = team.seasonTeams.length
  const totalTransfers = team.transferHistory.length
  const totalSpent = team.transferHistory.reduce((sum, t) => sum + t.soldPrice, 0)
  const totalTrophies = team.seasonTeams.reduce((sum, st) => sum + st.trophiesWon, 0)

  return {
    team,
    stats: {
      totalSeasons,
      totalTransfers,
      totalSpent,
      totalTrophies
    }
  }
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const session = await auth()

  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  const { teamId } = await params
  const teamData = await getTeamData(teamId)

  if (!teamData) {
    notFound()
  }

  const { team, stats } = teamData

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `₹${(amount / 1000000).toFixed(1)}M`
    }
    return `₹${(amount / 1000).toFixed(0)}K`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link
          href="/super-admin/teams"
          className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Teams
        </Link>

        {/* Team Header */}
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Team Logo */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden bg-gray-800 flex-shrink-0 ring-4 ring-white/10">
              {team.logoUrl ? (
                <Image
                  src={team.logoUrl}
                  alt={team.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20">
                  <span className="text-4xl font-black text-white">
                    {team.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Team Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2">
                {team.name}
              </h1>
              <p className="text-[#D4CCBB] text-lg mb-4">
                Manager: {team.managerName}
              </p>

              {/* Edit Button */}
              <Link
                href={`/super-admin/teams/${team.id}/edit`}
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all hover:scale-105 shadow-lg hover:shadow-[#E8A800]/50 text-sm sm:text-base"
              >
                <EditIcon />
                Edit Team
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrophyIcon />
              <div className="text-xs sm:text-sm text-[#7A7367]">Seasons</div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#E8A800]">
              {stats.totalSeasons}
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="text-xs sm:text-sm text-[#7A7367]">Transfers</div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#FFB347]">
              {stats.totalTransfers}
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs sm:text-sm text-[#7A7367]">Total Spent</div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#FFC93A]">
              {formatCurrency(stats.totalSpent)}
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrophyIcon />
              <div className="text-xs sm:text-sm text-[#7A7367]">Trophies</div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-400">
              {stats.totalTrophies}
            </div>
          </div>
        </div>

        {/* Season History */}
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">Season History</h2>
          
          {team.seasonTeams.length === 0 ? (
            <div className="text-center py-8 text-[#7A7367]">
              No season participation yet
            </div>
          ) : (
            <div className="space-y-4">
              {team.seasonTeams.map((st) => (
                <div
                  key={st.id}
                  className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                        {st.season.name}
                      </h3>
                      <div className="text-sm text-[#7A7367]">
                        Starting Purse: {formatCurrency(st.season.startingPurse)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-xs text-[#7A7367] mb-1">Current Budget</div>
                        <div className="text-lg font-bold text-[#E8A800]">
                          {formatCurrency(st.currentBudget)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-[#7A7367] mb-1">Final Budget</div>
                        <div className="text-lg font-bold text-[#FFB347]">
                          {st.finalBudget ? formatCurrency(st.finalBudget) : 'N/A'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-[#7A7367] mb-1">Trophies</div>
                        <div className="text-lg font-bold text-emerald-400">
                          {st.trophiesWon}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transfer History */}
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">Transfer History</h2>
          
          {team.transferHistory.length === 0 ? (
            <div className="text-center py-8 text-[#7A7367]">
              No transfers yet
            </div>
          ) : (
            <div className="space-y-3">
              {team.transferHistory.map((transfer) => {
                const playerStats = transfer.basePlayer.seasonalPlayerStats.find(
                  s => s.seasonId === transfer.seasonId
                )
                
                return (
                  <div
                    key={transfer.id}
                    className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-[#E8A800]/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {transfer.basePlayer.id && (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                            <Image
                              src={getPlayerPhotoUrl(`${transfer.basePlayer.id}.webp`)}
                              alt={transfer.basePlayer.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white">{transfer.basePlayer.name}</div>
                          <div className="text-xs text-[#7A7367]">
                            {playerStats?.position || 'N/A'} • {transfer.season.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-[#E8A800]">
                          {formatCurrency(transfer.soldPrice)}
                        </div>
                        <div className="text-xs text-[#7A7367]">
                          {new Date(transfer.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
