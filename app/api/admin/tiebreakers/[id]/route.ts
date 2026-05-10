import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { resolveTiebreaker, applyTiebreakerResult } from '@/lib/auction/tiebreaker';

/**
 * GET /api/admin/tiebreakers/[id] - Get tiebreaker details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tiebreakerId } = await params;

    const tiebreaker = await prisma.tiebreakers.findUnique({
      where: { id: tiebreakerId },
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
      }
    });

    if (!tiebreaker) {
      return NextResponse.json({ error: 'Tiebreaker not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tiebreaker
    });
  } catch (error) {
    console.error('Get tiebreaker error:', error);
    return NextResponse.json(
      { error: 'Failed to get tiebreaker details' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tiebreakers/[id]/resolve - Resolve tiebreaker
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tiebreakerId } = await params;

    // Resolve tiebreaker
    const result = await resolveTiebreaker(tiebreakerId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to resolve tiebreaker' },
        { status: 400 }
      );
    }

    // Apply result
    if (result.winnerId && result.winningBid) {
      await applyTiebreakerResult(tiebreakerId, result.winnerId, result.winningBid);
    }

    return NextResponse.json({
      success: true,
      winnerId: result.winnerId,
      winningBid: result.winningBid,
      message: 'Tiebreaker resolved successfully'
    });
  } catch (error) {
    console.error('Resolve tiebreaker error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve tiebreaker' },
      { status: 500 }
    );
  }
}
