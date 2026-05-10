import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * POST /api/admin/rounds/[id]/extend - Extend round time
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
    const body = await request.json();
    const { hours = 0, minutes = 0 } = body;

    // Validate input
    if (hours < 0 || minutes < 0) {
      return NextResponse.json(
        { error: 'Hours and minutes must be positive numbers' },
        { status: 400 }
      );
    }

    if (hours === 0 && minutes === 0) {
      return NextResponse.json(
        { error: 'Must add at least 1 minute' },
        { status: 400 }
      );
    }

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        status: true,
        endTime: true,
        durationSeconds: true
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if round is active
    if (round.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot extend time for round with status: ${round.status}` },
        { status: 400 }
      );
    }

    if (!round.endTime) {
      return NextResponse.json(
        { error: 'Round has no end time set' },
        { status: 400 }
      );
    }

    // Calculate additional seconds
    const additionalSeconds = (hours * 3600) + (minutes * 60);

    // Calculate new end time
    const currentEndTime = new Date(round.endTime);
    const newEndTime = new Date(currentEndTime.getTime() + (additionalSeconds * 1000));

    // Update round
    const updatedRound = await prisma.rounds.update({
      where: { id: roundId },
      data: {
        endTime: newEndTime,
        durationSeconds: round.durationSeconds + additionalSeconds
      }
    });

    return NextResponse.json({
      success: true,
      round: updatedRound,
      message: `Round extended by ${hours > 0 ? `${hours}h ` : ''}${minutes}m`,
      addedTime: {
        hours,
        minutes,
        seconds: additionalSeconds
      },
      newEndTime
    });
  } catch (error) {
    console.error('Extend round error:', error);
    return NextResponse.json(
      { error: 'Failed to extend round time' },
      { status: 500 }
    );
  }
}
