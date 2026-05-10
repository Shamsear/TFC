import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { placeBulkTiebreakerBid } from '@/lib/auction/finalize-bulk-tiebreaker';

/**
 * POST /api/team/bulk-tiebreakers/[id]/bid - Place bid in bulk tiebreaker
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || session.user.role !== 'TEAM_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = session.user.teamId;
    if (!teamId) {
      return NextResponse.json({ error: 'Team not found' }, { status: 400 });
    }

    const { id } = await params;
    const tiebreakerId = parseInt(id);
    if (isNaN(tiebreakerId)) {
      return NextResponse.json({ error: 'Invalid tiebreaker ID' }, { status: 400 });
    }

    const body = await request.json();
    const { bidAmount } = body;

    // Validate bid amount
    if (typeof bidAmount !== 'number' || bidAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid bid amount' },
        { status: 400 }
      );
    }

    // Place bid using utility function
    const result = await placeBulkTiebreakerBid(tiebreakerId, teamId, bidAmount);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to place bid' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      bidAmount,
      message: 'Bid placed successfully'
    });
  } catch (error) {
    console.error('Place bulk tiebreaker bid error:', error);
    return NextResponse.json(
      { error: 'Failed to place bid' },
      { status: 500 }
    );
  }
}
