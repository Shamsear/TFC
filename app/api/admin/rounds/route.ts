import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateRoundId } from '@/lib/id-generator';

/**
 * POST /api/admin/rounds - Create a new round
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      seasonId,
      position,
      position_group,
      roundNumber,
      roundType = 'normal',
      targetTeamId,
      maxBidsPerTeam,
      basePrice,
      durationSeconds,
      finalizationMode = 'auto',
      startTime,
      endTime
    } = body;

    // Validate required fields
    if (!seasonId || !roundNumber || !durationSeconds) {
      return NextResponse.json(
        { error: 'Missing required fields: seasonId, roundNumber, durationSeconds' },
        { status: 400 }
      );
    }

    // Validate round type
    if (!['normal', 'bulk', 'special'].includes(roundType)) {
      return NextResponse.json(
        { error: 'Invalid roundType. Must be "normal", "bulk", or "special"' },
        { status: 400 }
      );
    }

    // Validate finalization mode
    if (!['auto', 'manual'].includes(finalizationMode)) {
      return NextResponse.json(
        { error: 'Invalid finalizationMode. Must be "auto" or "manual"' },
        { status: 400 }
      );
    }

    // Check if season exists
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId }
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    // If targetTeamId is provided, check if team is in this season
    if (targetTeamId) {
      const seasonTeam = await prisma.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId,
            teamId: targetTeamId
          }
        }
      });

      if (!seasonTeam) {
        return NextResponse.json({ error: 'Target team is not participating in this season' }, { status: 400 });
      }
    }

    // Check if round number already exists for this season
    const existingRound = await prisma.rounds.findFirst({
      where: {
        seasonId,
        roundNumber
      }
    });

    if (existingRound) {
      return NextResponse.json(
        { error: `Round ${roundNumber} already exists for this season` },
        { status: 400 }
      );
    }

    // Generate round ID
    const roundId = await generateRoundId();

    // Create round
    const round = await prisma.rounds.create({
      data: {
        id: roundId,
        seasonId,
        position,
        position_group,
        roundNumber,
        roundType: roundType === 'special' ? 'bulk' : roundType,
        targetTeamId: targetTeamId || null,
        maxBidsPerTeam,
        basePrice,
        durationSeconds,
        finalizationMode,
        status: 'draft',
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null
      },
      include: {
        targetTeam: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      round
    });
  } catch (error) {
    console.error('Create round error:', error);
    return NextResponse.json(
      { error: 'Failed to create round' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/rounds - List all rounds
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const status = searchParams.get('status');
    const roundType = searchParams.get('roundType');

    // Build where clause
    const where: any = {};
    if (seasonId) where.seasonId = seasonId;
    if (status) where.status = status;
    if (roundType) where.roundType = roundType;

    // Fetch rounds with limit
    const rounds = await prisma.rounds.findMany({
      where,
      include: {
        season: {
          select: {
            id: true,
            name: true,
            seasonNumber: true
          }
        },
        targetTeam: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        },
        _count: {
          select: {
            teamRoundBids: true,
            tiebreakers: true,
            bulkRoundSelections: true
          }
        }
      },
      orderBy: [
        { seasonId: 'desc' },
        { roundNumber: 'asc' }
      ],
      take: 100 // Limit to 100 rounds
    });

    return NextResponse.json({
      success: true,
      rounds
    });
  } catch (error) {
    console.error('List rounds error:', error);
    return NextResponse.json(
      { error: 'Failed to list rounds' },
      { status: 500 }
    );
  }
}
