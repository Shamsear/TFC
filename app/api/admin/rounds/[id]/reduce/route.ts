import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * POST /api/admin/rounds/[id]/reduce
 * Reduce the time of an active round
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
        { error: 'Hours and minutes must be positive' },
        { status: 400 }
      );
    }

    if (hours === 0 && minutes === 0) {
      return NextResponse.json(
        { error: 'Must reduce at least 1 minute' },
        { status: 400 }
      );
    }

    // Get round
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        id: true,
        status: true,
        endTime: true,
        startTime: true
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Only allow reducing time for active rounds
    if (round.status !== 'active') {
      return NextResponse.json(
        { error: 'Can only reduce time for active rounds' },
        { status: 400 }
      );
    }

    if (!round.endTime) {
      return NextResponse.json(
        { error: 'Round has no end time set' },
        { status: 400 }
      );
    }

    // Calculate new end time
    const totalMilliseconds = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
    const currentEndTime = new Date(round.endTime);
    const newEndTime = new Date(currentEndTime.getTime() - totalMilliseconds);

    // Ensure new end time is not in the past
    const now = new Date();
    if (newEndTime <= now) {
      return NextResponse.json(
        { error: 'Cannot reduce time to a point in the past. The round would end immediately.' },
        { status: 400 }
      );
    }

    // Ensure new end time is after start time
    if (round.startTime && newEndTime <= new Date(round.startTime)) {
      return NextResponse.json(
        { error: 'Cannot reduce time below the start time' },
        { status: 400 }
      );
    }

    // Update round end time and duration
    const startTime = round.startTime ? new Date(round.startTime) : now;
    const newDurationSeconds = Math.floor((newEndTime.getTime() - startTime.getTime()) / 1000);

    await prisma.rounds.update({
      where: { id: roundId },
      data: {
        endTime: newEndTime,
        durationSeconds: newDurationSeconds
      }
    });

    return NextResponse.json({
      success: true,
      newEndTime: newEndTime.toISOString(),
      newDurationSeconds,
      message: `Round time reduced by ${hours}h ${minutes}m`
    });
  } catch (error) {
    console.error('Reduce round time error:', error);
    return NextResponse.json(
      { error: 'Failed to reduce round time' },
      { status: 500 }
    );
  }
}
