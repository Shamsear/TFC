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

  // Get team bids based on round type - only extract player IDs for validation
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
    
    // Parse bulk selections - only extract player IDs
    teamBidsData = rawData.map(data => {
      try {
        const parsed = JSON.parse(data.selectedPlayers || '{}')
        const players = parsed.players || []
        const playerIds = players.map((p: any) => p.basePlayerId)
        
        return {
          teamId: data.teamId,
          playerIds,
          submitted: data.submitted,
          submittedAt: data.submittedAt,
          bidCount: players.length
        }
      } catch (e) {
        return {
          teamId: data.teamId,
          playerIds: [],
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
    
    // Decrypt bids only to extract player IDs
    teamBidsData = rawData.map(data => {
      try {
        const decrypted = decryptBids(data.encryptedBids)
        const parsed = JSON.parse(decrypted)
        const bids = parsed.bids || []
        const playerIds = bids.map((b: any) => b.base_player_id)
        
        return {
          teamId: data.teamId,
          playerIds,
          submitted: data.submitted,
          submittedAt: data.submittedAt,
          bidCount: data.bidCount || 0
        }
      } catch (e) {
        console.error(`Failed to decrypt bids for team ${data.teamId}:`, e)
        return {
          teamId: data.teamId,
          playerIds: [],
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
    teamData.playerIds.forEach((playerId: string) => {
      if (playerId) {
        allPlayerIds.add(playerId)
      }
    })
  })

  // Check which players exist in database
  const existingPlayers = await prisma.base_players.findMany({
    where: {
      id: { in: Array.from(allPlayerIds) }
    },
    select: {
      id: true
    }
  })

  const existingPlayerIds = new Set(existingPlayers.map(p => p.id))

  // Calculate validation stats for each team
  teamBidsData = teamBidsData.map(teamData => {
    const invalidPlayerIds = teamData.playerIds.filter((id: string) => !existingPlayerIds.has(id))
    return {
      ...teamData,
      invalidCount: invalidPlayerIds.length,
      hasInvalidBids: invalidPlayerIds.length > 0
    }
  })

  // Calculate overall validation stats
  const totalBids = teamBidsData.reduce((sum, td) => sum + td.bidCount, 0)
  const invalidBids = teamBidsData.reduce((sum, td) => sum + td.invalidCount, 0)
  const teamsWithInvalidBids = teamBidsData.filter(td => td.hasInvalidBids).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}/auction/rounds/${roundId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Round
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Round {round.roundNumber} - Team Bids
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
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
  )
}
