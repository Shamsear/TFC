import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/tiebreakers - List all tiebreakers
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const seasonId = searchParams.get('seasonId');
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};
    if (roundId) where.roundId = roundId;
    if (status) where.status = status;
    if (seasonId) {
      where.round = {
        seasonId
      };
    }

    // Fetch tiebreakers
    const tiebreakers = await prisma.tiebreakers.findMany({
      where,
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        },
        round: {
          select: {
            id: true,
            roundNumber: true,
            seasonId: true,
            season: {
              select: {
                name: true
              }
            }
          }
        },
        teamTiebreakerBids: {
          select: {
            teamId: true,
            oldBidAmount: true,
            newBidAmount: true,
            submitted: true,
            submittedAt: true
          }
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
    console.error('List tiebreakers error:', error);
    return NextResponse.json(
      { error: 'Failed to list tiebreakers' },
      { status: 500 }
    );
  }
}
