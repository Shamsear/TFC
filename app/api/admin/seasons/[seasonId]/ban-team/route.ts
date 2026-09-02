import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { resolveTeamManagerNames } from '@/lib/resolve-manager'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId } = await params

    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: { id: true, name: true, startingPurse: true }
    })

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    const seasonTeams = await prisma.season_teams.findMany({
      where: { seasonId, isActive: true },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            managerName: true
          }
        }
      }
    })

    const teamIds = seasonTeams.map(st => st.teamId)
    const mgrMap = await resolveTeamManagerNames(teamIds, seasonId)

    // Count active squad players per team
    const playerCounts = await prisma.transfer_history.groupBy({
      by: ['teamId'],
      where: {
        seasonId,
        teamId: { in: teamIds },
        status: 'ACTIVE'
      },
      _count: { _all: true }
    })

    const playerCountMap = new Map<string, number>()
    playerCounts.forEach(pc => playerCountMap.set(pc.teamId, pc._count._all))

    const teams = seasonTeams.map(st => ({
      id: st.team.id,
      name: st.team.name,
      logoUrl: st.team.logoUrl,
      managerName: mgrMap.get(st.team.id) || st.managerName || st.team.managerName,
      currentBudget: st.currentBudget,
      startingPurse: season.startingPurse,
      activePlayersCount: playerCountMap.get(st.team.id) || 0
    })).sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      season: { id: season.id, name: season.name },
      teams
    })
  } catch (error: any) {
    console.error('Error fetching season teams for ban tool:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId } = await params
    const body = await req.json()
    const { teamId, reason = 'Inactive team banned and removed from season' } = body

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Check season and team
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: { id: true, name: true }
    })

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId,
          teamId
        }
      },
      include: {
        team: {
          select: { id: true, name: true, managerName: true }
        }
      }
    })

    if (!seasonTeam) {
      return NextResponse.json({ error: 'Team is not part of this season' }, { status: 400 })
    }

    // Find active player transfers for this team in this season
    const activeTransfers = await prisma.transfer_history.findMany({
      where: {
        seasonId,
        teamId,
        status: 'ACTIVE'
      },
      select: { id: true, basePlayerId: true }
    })

    const activeTransferIds = activeTransfers.map(t => t.id)

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Release all active players to Free Agents
      if (activeTransferIds.length > 0) {
        await tx.transfer_history.updateMany({
          where: { id: { in: activeTransferIds } },
          data: {
            status: 'RELEASED',
            releasedAt: new Date(),
            releaseNotes: reason
          }
        })
      }

      // 2. Clean up starred_players
      await tx.starred_players.deleteMany({
        where: { seasonId, seasonTeamId: seasonTeam.id }
      })

      // 3. Clean up auction_plans
      await tx.auction_plans.deleteMany({
        where: { season_id: seasonId, team_id: teamId }
      })

      // 4. Clean up team_squads
      await tx.team_squads.deleteMany({
        where: { season_id: seasonId, team_id: teamId }
      })

      // 5. Clean up team_round_bids
      const seasonRounds = await tx.rounds.findMany({
        where: { seasonId },
        select: { id: true }
      })
      const roundIds = seasonRounds.map(r => r.id)
      if (roundIds.length > 0) {
        await tx.team_round_bids.deleteMany({
          where: {
            roundId: { in: roundIds },
            teamId
          }
        })
      }

      // 6. Clean up financial_ledger
      await tx.financial_ledger.deleteMany({
        where: { seasonId, teamId }
      })

      // 7. Clean up requests (release, swap, retention)
      await tx.release_requests.deleteMany({
        where: { seasonId, teamId }
      })
      await tx.swap_requests.deleteMany({
        where: { seasonId, requestingTeamId: teamId }
      })
      await tx.retention_requests.deleteMany({
        where: { seasonId, teamId }
      })

      // 8. Delete season_teams entry (removes team from season)
      await tx.season_teams.delete({
        where: {
          seasonId_teamId: {
            seasonId,
            teamId
          }
        }
      })

      // 9. Create audit log
      await tx.audit_logs.create({
        data: {
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          userId: session.user.id || 'admin',
          userEmail: session.user.email || 'admin@turfcats.com',
          userRole: session.user.role || 'ADMIN',
          action: 'BAN_TEAM_REMOVE_FROM_SEASON',
          entityType: 'TEAM',
          entityId: teamId,
          entityName: seasonTeam.team.name,
          seasonId,
          details: `Banned and removed team ${seasonTeam.team.name} from season ${season.name}. Released ${activeTransfers.length} players to Free Agency. Reason: ${reason}`
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${seasonTeam.team.name} from ${season.name}. Released ${activeTransfers.length} players to Free Agency.`,
      releasedPlayersCount: activeTransfers.length
    })
  } catch (error: any) {
    console.error('Error banning team from season:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
