import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateBulkSelections } from '@/lib/auction/bid-validator';

/**
 * POST /api/team/bulk-rounds/[id]/select - Select players (UPSERT)
 */
export async function POST(
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
    const body = await request.json();
    const { playerIds, submitted = false } = body;

    // Validate playerIds array
    if (!Array.isArray(playerIds)) {
      return NextResponse.json(
        { error: 'playerIds must be an array' },
        { status: 400 }
      );
    }

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        status: true,
        seasonId: true,
        roundType: true,
        maxBidsPerTeam: true,
        basePrice: true,
        endTime: true
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if round is active
    if (round.status !== 'active') {
      return NextResponse.json(
        { error: `Round is not active (status: ${round.status})` },
        { status: 400 }
      );
    }

    // Check if round type is bulk
    if (round.roundType !== 'bulk') {
      return NextResponse.json(
        { error: 'This endpoint is for bulk rounds only' },
        { status: 400 }
      );
    }

    // Check if round has expired
    if (round.endTime) {
      const now = new Date();
      const endTime = new Date(round.endTime);
      if (now > endTime) {
        return NextResponse.json(
          { error: 'Round has expired' },
          { status: 400 }
        );
      }
    }

    // Check if team belongs to season
    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId: round.seasonId,
          teamId
        }
      },
      select: {
        currentBudget: true
      }
    });

    if (!seasonTeam) {
      return NextResponse.json(
        { error: 'Team not found in this season' },
        { status: 400 }
      );
    }

    // Get current squad size
    const squadSize = await prisma.transfer_history.count({
      where: {
        teamId,
        seasonId: round.seasonId
      }
    });

    // Validate selections
    const validation = await validateBulkSelections(playerIds, {
      roundId,
      teamId,
      seasonId: round.seasonId,
      maxBidsPerTeam: round.maxBidsPerTeam || undefined,
      basePrice: round.basePrice || 0,
      currentBudget: seasonTeam.currentBudget
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    // Prepare selection data
    const selectionData = {
      players: playerIds,
      timestamp: new Date().toISOString()
    };

    // UPSERT bulk_round_selections
    const selection = await prisma.bulk_round_selections.upsert({
      where: {
        roundId_teamId: {
          roundId,
          teamId
        }
      },
      create: {
        id: `${roundId}_${teamId}`,
        roundId,
        teamId,
        selectedPlayers: JSON.stringify(selectionData),
        submitted,
        lastUpdated: new Date()
      },
      update: {
        selectedPlayers: JSON.stringify(selectionData),
        submitted,
        lastUpdated: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      playerCount: playerIds.length,
      submitted,
      lastUpdated: selection.lastUpdated,
      message: submitted ? 'Selections submitted successfully' : 'Selections saved as draft'
    });
  } catch (error) {
    console.error('Select players error:', error);
    return NextResponse.json(
      { error: 'Failed to save selections' },
      { status: 500 }
    );
  }
}
