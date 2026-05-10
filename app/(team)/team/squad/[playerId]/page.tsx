import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getPlayerPhotoUrl, getPlayerCardUrl } from "@/lib/image-cdn"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"

export async function generateMetadata({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const player = await prisma.base_players.findUnique({
    where: { id: playerId },
  })

  return {
    title: `${player?.name || "Player"} | Squad`,
    description: `View ${player?.name || "player"} details`,
  }
}

export default async function PlayerDetailsPage({ params }: { params: Promise<{ playerId: string }> }) {
  const session = await auth()
  const { playerId } = await params

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason } = await checkTeamSeasonParticipation()

  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  if (!activeSeason) {
    redirect("/team/squad")
  }

  // Get player info
  const player = await prisma.base_players.findUnique({
    where: { id: playerId },
    include: {
      seasonalPlayerStats: {
        where: {
          seasonId: activeSeason.id,
        },
      },
      transferHistory: {
        where: {
          seasonId: activeSeason.id,
        },
        include: {
          team: true,
        },
      },
    },
  })

  if (!player) {
    notFound()
  }

  const stats = player.seasonalPlayerStats[0]
  const transfer = player.transferHistory[0]

  // Check if this player belongs to the team
  const belongsToTeam = transfer?.teamId === session.user.teamId

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Link
            href="/team/squad"
            className="inline-flex items-center gap-2 text-[#7A7367] hover:text-[#E8A800] transition-colors mb-3 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Squad
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Player Details
            </span>
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

        {/* Player Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Player Card */}
          <div className="lg:col-span-1">
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 mb-4">
                <img
                  src={getPlayerCardUrl(player.player_id || player.id)}
                  alt={player.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = getPlayerPhotoUrl(player.player_id || player.id)
                  }}
                />
              </div>
              {belongsToTeam && transfer && (
                <div className="rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/30 p-4">
                  <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Purchase Price</div>
                  <div className="text-xl sm:text-2xl font-black text-[#E8A800]">
                    ${transfer.soldPrice.toLocaleString()}
                  </div>
                  <div className="text-xs text-[#7A7367] mt-2 font-medium">
                    Acquired: {new Date(transfer.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Player Info */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Basic Info */}
            <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">{player.name}</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {stats?.position && (
                  <div>
                    <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Position</div>
                    <div className="text-white font-black text-base sm:text-lg">{stats.position}</div>
                  </div>
                )}
                {stats?.overallRating && (
                  <div>
                    <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Overall</div>
                    <div className="text-[#E8A800] font-black text-base sm:text-lg">{stats.overallRating}</div>
                  </div>
                )}
                {stats?.realWorldClub && (
                  <div>
                    <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Club</div>
                    <div className="text-white font-black text-base sm:text-lg">{stats.realWorldClub}</div>
                  </div>
                )}
                {stats?.star_rating && (
                  <div>
                    <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Stars</div>
                    <div className="text-[#E8A800] text-base sm:text-lg font-bold">
                      {"⭐".repeat(stats.star_rating)}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
                  {stats.nationality && (
                    <div>
                      <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Nationality</div>
                      <div className="text-[#D4CCBB] font-bold">{stats.nationality}</div>
                    </div>
                  )}
                  {stats.age && (
                    <div>
                      <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Age</div>
                      <div className="text-[#D4CCBB] font-bold">{stats.age}</div>
                    </div>
                  )}
                  {stats.height && (
                    <div>
                      <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Height</div>
                      <div className="text-[#D4CCBB] font-bold">{stats.height} cm</div>
                    </div>
                  )}
                  {stats.foot && (
                    <div>
                      <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Foot</div>
                      <div className="text-[#D4CCBB] font-bold">{stats.foot}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Team Status */}
            {transfer && (
              <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-black text-white mb-4">Team Status</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Current Team</div>
                    <div className="text-white font-black text-base sm:text-lg">{transfer.team.name}</div>
                  </div>
                  {belongsToTeam && (
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <span className="text-emerald-400 font-bold text-sm">Your Player</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Player Stats */}
        {stats && (
          <div className="space-y-4 sm:space-y-6">
            {/* Offensive Stats */}
            {(stats.offensive_awareness || stats.ball_control || stats.dribbling || stats.finishing) && (
              <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-black text-white mb-4">Offensive Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {stats.offensive_awareness && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Off. Awareness</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.offensive_awareness}</div>
                    </div>
                  )}
                  {stats.ball_control && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Ball Control</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.ball_control}</div>
                    </div>
                  )}
                  {stats.dribbling && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Dribbling</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.dribbling}</div>
                    </div>
                  )}
                  {stats.tight_possession && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Tight Possession</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.tight_possession}</div>
                    </div>
                  )}
                  {stats.low_pass && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Low Pass</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.low_pass}</div>
                    </div>
                  )}
                  {stats.lofted_pass && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Lofted Pass</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.lofted_pass}</div>
                    </div>
                  )}
                  {stats.finishing && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Finishing</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.finishing}</div>
                    </div>
                  )}
                  {stats.heading && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Heading</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.heading}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Physical Stats */}
            {(stats.speed || stats.acceleration || stats.stamina || stats.balance) && (
              <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-black text-white mb-4">Physical Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {stats.speed && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Speed</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.speed}</div>
                    </div>
                  )}
                  {stats.acceleration && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Acceleration</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.acceleration}</div>
                    </div>
                  )}
                  {stats.kicking_power && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Kicking Power</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.kicking_power}</div>
                    </div>
                  )}
                  {stats.jumping && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Jumping</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.jumping}</div>
                    </div>
                  )}
                  {stats.physical_contact && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Physical Contact</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.physical_contact}</div>
                    </div>
                  )}
                  {stats.balance && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Balance</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.balance}</div>
                    </div>
                  )}
                  {stats.stamina && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Stamina</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.stamina}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Defensive Stats */}
            {(stats.defensive_awareness || stats.tackling || stats.aggression) && (
              <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-black text-white mb-4">Defensive Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {stats.defensive_awareness && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Def. Awareness</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.defensive_awareness}</div>
                    </div>
                  )}
                  {stats.tackling && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Tackling</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.tackling}</div>
                    </div>
                  )}
                  {stats.aggression && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Aggression</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.aggression}</div>
                    </div>
                  )}
                  {stats.defensive_engagement && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">Def. Engagement</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.defensive_engagement}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Goalkeeper Stats */}
            {(stats.gk_awareness || stats.gk_catching || stats.gk_parrying || stats.gk_reflexes) && (
              <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-black text-white mb-4">Goalkeeper Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {stats.gk_awareness && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">GK Awareness</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.gk_awareness}</div>
                    </div>
                  )}
                  {stats.gk_catching && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">GK Catching</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.gk_catching}</div>
                    </div>
                  )}
                  {stats.gk_parrying && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">GK Parrying</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.gk_parrying}</div>
                    </div>
                  )}
                  {stats.gk_reflexes && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">GK Reflexes</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.gk_reflexes}</div>
                    </div>
                  )}
                  {stats.gk_reach && (
                    <div>
                      <div className="text-[#7A7367] text-xs mb-1 font-medium">GK Reach</div>
                      <div className="text-white font-black text-base sm:text-lg">{stats.gk_reach}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
