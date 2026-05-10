import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/team/bulk-rounds/[id]/my-selections - Get team's selections
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TEAM_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = session.user.teamId;
    if (!teamId) {
      return NextResponse.json({ error: 'Team not found' }, { status: 400 });
    }

    const roundId = params.id;

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        id: true,
        roundNumber: true,
        position: true,
        roundType: true,
        status: true,
        startTime: true,
        endTime: true,
        maxBidsPerTeam: true,
        basePrice: true,
        seasonId: true
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if team belongs to season
    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId: round.seasonId,
          teamId
        }
      }
    });

    if (!seasonTeam) {
      return NextResponse.json(
        { error: 'Team not found in this season' },
        { status: 400 }
      );
    }

    // Get team's selections
    const selection = await prisma.bulk_round_selections.findUnique({
      where: {
        roundId_teamId: {
          roundId,
          teamId
        }
      },
      select: {
        selectedPlayers: true,
        submitted: true,
        lastUpdated: true
      }
    });

    if (!selection) {
      return NextResponse.json({
        success: true,
        playerIds: [],
        submitted: false,
        playerCount: 0,
        round
      });
    }

    // Parse selections
    let playerIds = [];
    try {
      const parsed = JSON.parse(selection.selectedPlayers);
      playerIds = parsed.players || [];
    } catch (error) {
      console.error('Failed to parse selections:', error);
      return NextResponse.json(
        { error: 'Failed to parse selections' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      playerIds,
      submitted: selection.submitted,
      playerCount: playerIds.length,
      lastUpdated: selection.lastUpdated,
      round
    });
  } catch (error) {
    console.error('Get my selections error:', error);
    return NextResponse.json(
      { error: 'Failed to get selections' },
      { status: 500 }
    );
  }
}
