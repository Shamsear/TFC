import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { withdrawFromBulkTiebreaker } from '@/lib/auction/finalize-bulk-tiebreaker';

/**
 * POST /api/team/bulk-tiebreakers/[id]/withdraw - Withdraw from bulk tiebreaker
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

    // Withdraw using utility function
    const result = await withdrawFromBulkTiebreaker(tiebreakerId, teamId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to withdraw' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawn from tiebreaker successfully'
    });
  } catch (error) {
    console.error('Withdraw from bulk tiebreaker error:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw' },
      { status: 500 }
    );
  }
}
