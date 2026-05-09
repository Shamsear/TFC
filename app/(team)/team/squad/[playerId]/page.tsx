import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getPlayerPhotoUrl, getPlayerCardUrl } from "@/lib/image-cdn"

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

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
  })

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
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/team/squad"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all mb-6"
        >
          ← Back to Squad
        </Link>

        {/* Player Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Player Card */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
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
                <div className="bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Purchase Price</div>
                  <div className="text-2xl font-bold text-[#E8A800]">
                    ${transfer.soldPrice.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Acquired: {new Date(transfer.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Player Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <h1 className="text-3xl font-bold text-white mb-4">{player.name}</h1>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats?.position && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Position</div>
                    <div className="text-white font-bold text-lg">{stats.position}</div>
                  </div>
                )}
                {stats?.overallRating && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Overall</div>
                    <div className="text-[#E8A800] font-bold text-lg">{stats.overallRating}</div>
                  </div>
                )}
                {stats?.realWorldClub && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Club</div>
                    <div className="text-white font-bold text-lg">{stats.realWorldClub}</div>
                  </div>
                )}
                {stats?.star_rating && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Stars</div>
                    <div className="text-[#E8A800] text-lg">
                      {"⭐".repeat(stats.star_rating)}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                  {stats.nationality && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Nationality</div>
                      <div className="text-white">{stats.nationality}</div>
                    </div>
                  )}
                  {stats.age && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Age</div>
                      <div className="text-white">{stats.age}</div>
                    </div>
                  )}
                  {stats.height && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Height</div>
                      <div className="text-white">{stats.height} cm</div>
                    </div>
                  )}
                  {stats.foot && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Foot</div>
                      <div className="text-white">{stats.foot}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Team Status */}
            {transfer && (
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Team Status</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Current Team</div>
                    <div className="text-white font-bold text-lg">{transfer.team.name}</div>
                  </div>
                  {belongsToTeam && (
                    <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <span className="text-green-400 font-medium">Your Player</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Player Stats */}
        {stats && (
          <div className="space-y-6">
            {/* Offensive Stats */}
            {(stats.offensive_awareness || stats.ball_control || stats.dribbling || stats.finishing) && (
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Offensive Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {stats.offensive_awareness && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Off. Awareness</div>
                      <div className="text-white font-bold">{stats.offensive_awareness}</div>
                    </div>
                  )}
                  {stats.ball_control && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Ball Control</div>
                      <div className="text-white font-bold">{stats.ball_control}</div>
                    </div>
                  )}
                  {stats.dribbling && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Dribbling</div>
                      <div className="text-white font-bold">{stats.dribbling}</div>
                    </div>
                  )}
                  {stats.tight_possession && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Tight Possession</div>
                      <div className="text-white font-bold">{stats.tight_possession}</div>
                    </div>
                  )}
                  {stats.low_pass && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Low Pass</div>
                      <div className="text-white font-bold">{stats.low_pass}</div>
                    </div>
                  )}
                  {stats.lofted_pass && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Lofted Pass</div>
                      <div className="text-white font-bold">{stats.lofted_pass}</div>
                    </div>
                  )}
                  {stats.finishing && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Finishing</div>
                      <div className="text-white font-bold">{stats.finishing}</div>
                    </div>
                  )}
                  {stats.heading && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Heading</div>
                      <div className="text-white font-bold">{stats.heading}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Physical Stats */}
            {(stats.speed || stats.acceleration || stats.stamina || stats.balance) && (
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Physical Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {stats.speed && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Speed</div>
                      <div className="text-white font-bold">{stats.speed}</div>
                    </div>
                  )}
                  {stats.acceleration && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Acceleration</div>
                      <div className="text-white font-bold">{stats.acceleration}</div>
                    </div>
                  )}
                  {stats.kicking_power && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Kicking Power</div>
                      <div className="text-white font-bold">{stats.kicking_power}</div>
                    </div>
                  )}
                  {stats.jumping && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Jumping</div>
                      <div className="text-white font-bold">{stats.jumping}</div>
                    </div>
                  )}
                  {stats.physical_contact && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Physical Contact</div>
                      <div className="text-white font-bold">{stats.physical_contact}</div>
                    </div>
                  )}
                  {stats.balance && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Balance</div>
                      <div className="text-white font-bold">{stats.balance}</div>
                    </div>
                  )}
                  {stats.stamina && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Stamina</div>
                      <div className="text-white font-bold">{stats.stamina}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Defensive Stats */}
            {(stats.defensive_awareness || stats.tackling || stats.aggression) && (
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Defensive Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {stats.defensive_awareness && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Def. Awareness</div>
                      <div className="text-white font-bold">{stats.defensive_awareness}</div>
                    </div>
                  )}
                  {stats.tackling && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Tackling</div>
                      <div className="text-white font-bold">{stats.tackling}</div>
                    </div>
                  )}
                  {stats.aggression && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Aggression</div>
                      <div className="text-white font-bold">{stats.aggression}</div>
                    </div>
                  )}
                  {stats.defensive_engagement && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Def. Engagement</div>
                      <div className="text-white font-bold">{stats.defensive_engagement}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Goalkeeper Stats */}
            {(stats.gk_awareness || stats.gk_catching || stats.gk_parrying || stats.gk_reflexes) && (
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Goalkeeper Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {stats.gk_awareness && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">GK Awareness</div>
                      <div className="text-white font-bold">{stats.gk_awareness}</div>
                    </div>
                  )}
                  {stats.gk_catching && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">GK Catching</div>
                      <div className="text-white font-bold">{stats.gk_catching}</div>
                    </div>
                  )}
                  {stats.gk_parrying && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">GK Parrying</div>
                      <div className="text-white font-bold">{stats.gk_parrying}</div>
                    </div>
                  )}
                  {stats.gk_reflexes && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">GK Reflexes</div>
                      <div className="text-white font-bold">{stats.gk_reflexes}</div>
                    </div>
                  )}
                  {stats.gk_reach && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">GK Reach</div>
                      <div className="text-white font-bold">{stats.gk_reach}</div>
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
