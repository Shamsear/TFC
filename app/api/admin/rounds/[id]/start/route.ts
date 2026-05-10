import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * POST /api/admin/rounds/[id]/start - Start a round
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

    const { id: roundId } = await params;

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        status: true,
        durationSeconds: true
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if round is in draft status
    if (round.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot start round with status: ${round.status}` },
        { status: 400 }
      );
    }

    // Calculate start and end times
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (round.durationSeconds * 1000));

    // Update round
    const updatedRound = await prisma.rounds.update({
      where: { id: roundId },
      data: {
        status: 'active',
        startTime,
        endTime
      }
    });

    return NextResponse.json({
      success: true,
      round: updatedRound,
      message: 'Round started successfully'
    });
  } catch (error) {
    console.error('Start round error:', error);
    return NextResponse.json(
      { error: 'Failed to start round' },
      { status: 500 }
    );
  }
}
