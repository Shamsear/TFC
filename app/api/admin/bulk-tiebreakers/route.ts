import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * POST /api/admin/bulk-tiebreakers - Create bulk tiebreaker
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roundId, basePlayerId, basePrice, teamIds } = body;

    // Validate required fields
    if (!roundId || !basePlayerId || !basePrice || !teamIds || !Array.isArray(teamIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: roundId, basePlayerId, basePrice, teamIds' },
        { status: 400 }
      );
    }

    if (teamIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 teams required for tiebreaker' },
        { status: 400 }
      );
    }

    // Check if round exists
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: { id: true, roundType: true }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    if (round.roundType !== 'bulk') {
      return NextResponse.json(
        { error: 'Can only create bulk tiebreakers for bulk rounds' },
        { status: 400 }
      );
    }

    // Check if player exists
    const player = await prisma.base_players.findUnique({
      where: { id: basePlayerId }
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Calculate max end time (24 hours from now)
    const startTime = new Date();
    const maxEndTime = new Date(startTime.getTime() + (24 * 60 * 60 * 1000));

    // Create bulk tiebreaker
    const tiebreaker = await prisma.bulk_tiebreakers.create({
      data: {
        roundId,
        basePlayerId,
        basePrice,
        status: 'pending',
        teamsRemaining: teamIds.length,
        startTime,
        maxEndTime,
        participants: {
          create: teamIds.map((teamId: string) => ({
            teamId,
            status: 'active'
          }))
        }
      },
      include: {
        basePlayer: {
          select: {
            name: true,
            photoUrl: true
          }
        },
        participants: true
      }
    });

    return NextResponse.json({
      success: true,
      tiebreaker
    });
  } catch (error) {
    console.error('Create bulk tiebreaker error:', error);
    return NextResponse.json(
      { error: 'Failed to create bulk tiebreaker' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/bulk-tiebreakers - List bulk tiebreakers
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};
    if (roundId) where.roundId = roundId;
    if (status) where.status = status;

    // Fetch bulk tiebreakers
    const tiebreakers = await prisma.bulk_tiebreakers.findMany({
      where,
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        },
        participants: {
          select: {
            teamId: true,
            status: true,
            currentBid: true,
            lastBidTime: true
          }
        },
        bidHistory: {
          orderBy: {
            bidTime: 'desc'
          },
          take: 10
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      tiebreakers
    });
  } catch (error) {
    console.error('List bulk tiebreakers error:', error);
    return NextResponse.json(
      { error: 'Failed to list bulk tiebreakers' },
      { status: 500 }
    );
  }
}
