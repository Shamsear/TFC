import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * POST /api/admin/bulk-rounds - Create a bulk round
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
      roundNumber,
      maxBidsPerTeam,
      basePrice,
      durationSeconds,
      finalizationMode = 'auto'
    } = body;

    // Validate required fields
    if (!seasonId || !roundNumber || !basePrice || !durationSeconds) {
      return NextResponse.json(
        { error: 'Missing required fields: seasonId, roundNumber, basePrice, durationSeconds' },
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

    // Check if round number already exists
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
    const roundId = `SSPSLR${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    // Create bulk round
    const round = await prisma.rounds.create({
      data: {
        id: roundId,
        seasonId,
        position,
        roundNumber,
        roundType: 'bulk',
        maxBidsPerTeam,
        basePrice,
        durationSeconds,
        finalizationMode,
        status: 'draft'
      }
    });

    return NextResponse.json({
      success: true,
      round
    });
  } catch (error) {
    console.error('Create bulk round error:', error);
    return NextResponse.json(
      { error: 'Failed to create bulk round' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/bulk-rounds - List bulk rounds
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

    // Build where clause
    const where: any = {
      roundType: 'bulk'
    };
    if (seasonId) where.seasonId = seasonId;
    if (status) where.status = status;

    // Fetch bulk rounds
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
        _count: {
          select: {
            bulkRoundSelections: true
          }
        }
      },
      orderBy: [
        { seasonId: 'desc' },
        { roundNumber: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      rounds
    });
  } catch (error) {
    console.error('List bulk rounds error:', error);
    return NextResponse.json(
      { error: 'Failed to list bulk rounds' },
      { status: 500 }
    );
  }
}
