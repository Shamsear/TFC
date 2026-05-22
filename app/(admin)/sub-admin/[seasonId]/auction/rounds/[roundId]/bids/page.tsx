import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TeamBidsClient from '@/components/auction/TeamBidsClient'
import { decryptBids } from '@/lib/auction/encryption'

export default async function RoundBidsPage({
  params
}: {
  params: Promise<{ seasonId: string; roundId: string }>
}) {
  const { seasonId, roundId } = await params
  const session = await auth()

  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
    redirect('/login')
  }

  // Get round details
  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    select: {
      id: true,
      roundNumber: true,
      roundType: true,
      position: true,
      position_group: true,
      status: true,
      basePrice: true,
      season: {
        select: {
          id: true,
          name: true,
          seasonNumber: true
        }
      }
    }
  })

  if (!round || round.season.id !== seasonId) {
    redirect(`/sub-admin/${seasonId}/auction`)
  }

  // Get all teams in the season
  const teams = await prisma.season_teams.findMany({
    where: { seasonId },
    select: {
      team: {
        select: {
          id: true,
          name: true,
          logoUrl: true
        }
      }
    },
    orderBy: {
      team: { name: 'asc' }
    }
  })

  // Get team bids based on round type and decrypt on server
  let teamBidsData: any[] = []

  if (round.roundType === 'bulk') {
    const rawData = await prisma.bulk_round_selections.findMany({
      where: { roundId },
      select: {
        teamId: true,
        selectedPlayers: true,
        submitted: true,
        submittedAt: true
      }
    })
    
    // Parse bulk selections
    teamBidsData = rawData.map(data => {
      try {
        const parsed = JSON.parse(data.selectedPlayers || '{}')
        const players = parsed.players || []
        return {
          teamId: data.teamId,
          bids: players.map((p: any) => ({
            base_player_id: p.basePlayerId,
            player_name: p.name,
            amount: round.basePrice || 0,
            timestamp: data.submittedAt?.toISOString()
          })),
          submitted: data.submitted,
          submittedAt: data.submittedAt,
          bidCount: players.length
        }
      } catch (e) {
        return {
          teamId: data.teamId,
          bids: [],
          submitted: false,
          submittedAt: null,
          bidCount: 0
        }
      }
    })
  } else {
    const rawData = await prisma.team_round_bids.findMany({
      where: { roundId },
      select: {
        teamId: true,
        encryptedBids: true,
        submitted: true,
        submittedAt: true,
        bidCount: true
      }
    })
    
    // Decrypt bids on server
    teamBidsData = rawData.map(data => {
      try {
        const decrypted = decryptBids(data.encryptedBids)
        const parsed = JSON.parse(decrypted)
        return {
          teamId: data.teamId,
          bids: parsed.bids || [],
          submitted: data.submitted,
          submittedAt: data.submittedAt,
          bidCount: data.bidCount || 0
        }
      } catch (e) {
        console.error(`Failed to decrypt bids for team ${data.teamId}:`, e)
        return {
          teamId: data.teamId,
          bids: [],
          submitted: data.submitted,
          submittedAt: data.submittedAt,
          bidCount: 0
        }
      }
    })
  }

  // Validate all player IDs exist in database
  const allPlayerIds = new Set<string>()
  teamBidsData.forEach(teamData => {
    teamData.bids.forEach((bid: any) => {
      if (bid.base_player_id) {
        allPlayerIds.add(bid.base_player_id)
      }
    })
  })

  // Check which players exist in database
  const existingPlayers = await prisma.base_players.findMany({
    where: {
      id: { in: Array.from(allPlayerIds) }
    },
    select: {
      id: true,
      name: true
    }
  })

  const existingPlayerIds = new Set(existingPlayers.map(p => p.id))
  const playerNameMap = new Map(existingPlayers.map(p => [p.id, p.name]))

  // Mark invalid players and update player names
  teamBidsData = teamBidsData.map(teamData => ({
    ...teamData,
    bids: teamData.bids.map((bid: any) => ({
      ...bid,
      player_exists: existingPlayerIds.has(bid.base_player_id),
      player_name: playerNameMap.get(bid.base_player_id) || bid.player_name || bid.base_player_id
    }))
  }))

  // Calculate validation stats
  const totalBids = teamBidsData.reduce((sum, td) => sum + td.bids.length, 0)
  const invalidBids = teamBidsData.reduce((sum, td) => 
    sum + td.bids.filter((b: any) => !b.player_exists).length, 0
  )
  const teamsWithInvalidBids = teamBidsData.filter(td => 
    td.bids.some((b: any) => !b.player_exists)
  ).length

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="border-b border-white/10 pb-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/sub-admin/${seasonId}/auction/rounds/${roundId}`}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Round
            </Link>
          </div>
          <h1 className="text-4xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Round {round.roundNumber} - Team Bids
            </span>
          </h1>
          <p className="text-[#D4CCBB]">
            {round.season.name} • {round.position || 'All Positions'} • {round.roundType === 'normal' ? 'Normal Round' : 'Bulk Round'}
          </p>
        </div>

        <TeamBidsClient
          round={round}
          teams={teams.map(st => st.team)}
          teamBidsData={teamBidsData}
          validationStats={{
            totalBids,
            invalidBids,
            teamsWithInvalidBids
          }}
        />
      </div>
    </div>
  )
}
