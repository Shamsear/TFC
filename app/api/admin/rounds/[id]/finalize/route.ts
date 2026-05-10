import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { finalizeRound, applyFinalizationResults } from '@/lib/auction/finalize-round';
import { finalizeBulkRound, applyBulkFinalizationResults } from '@/lib/auction/finalize-bulk-round';
import { createTiebreakers } from '@/lib/auction/tiebreaker';

/**
 * POST /api/admin/rounds/[id]/finalize - Finalize a round
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundId } = await params;
  
  try {
    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { force = false, preview = false } = body;

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        status: true,
        roundType: true,
        endTime: true,
        finalizationMode: true
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if round can be finalized
    const now = new Date();
    const endTime = round.endTime ? new Date(round.endTime) : null;

    if (!force && endTime && now < endTime) {
      return NextResponse.json(
        { error: 'Round has not expired yet. Use force=true to finalize early.' },
        { status: 400 }
      );
    }

    if (!force && !['active', 'expired_pending_finalization', 'pending_finalization'].includes(round.status)) {
      return NextResponse.json(
        { error: `Cannot finalize round with status: ${round.status}` },
        { status: 400 }
      );
    }

    // Preview mode: Calculate results without applying
    if (preview) {
      if (round.roundType === 'bulk') {
        const result = await finalizeBulkRound(roundId);
        return NextResponse.json({
          success: true,
          preview: true,
          allocations: result.allocations,
          conflicts: result.conflicts,
          error: result.error
        });
      } else {
        const result = await finalizeRound(roundId);
        return NextResponse.json({
          success: true,
          preview: true,
          allocations: result.allocations,
          tieDetected: result.tieDetected,
          ties: result.ties,
          error: result.error
        });
      }
    }

    // Acquire lock
    const lockResult = await prisma.rounds.updateMany({
      where: {
        id: roundId,
        status: { in: ['active', 'expired_pending_finalization', 'pending_finalization'] }
      },
      data: {
        status: 'finalizing'
      }
    });

    if (lockResult.count === 0) {
      return NextResponse.json(
        { error: 'Round is already being finalized or completed' },
        { status: 400 }
      );
    }

    // Finalize based on round type
    if (round.roundType === 'bulk') {
      const result = await finalizeBulkRound(roundId);

      if (!result.success) {
        // Revert status
        await prisma.rounds.update({
          where: { id: roundId },
          data: { status: 'active' }
        });

        return NextResponse.json(
          { error: result.error || 'Finalization failed' },
          { status: 500 }
        );
      }

      // Apply results
      await applyBulkFinalizationResults(roundId, result.allocations);

      return NextResponse.json({
        success: true,
        allocations: result.allocations,
        conflicts: result.conflicts,
        message: result.conflicts.length > 0
          ? 'Round finalized with conflicts. Create bulk tiebreakers to resolve.'
          : 'Round finalized successfully'
      });
    } else {
      // Normal round
      const result = await finalizeRound(roundId);

      if (result.tieDetected && result.ties) {
        // Create tiebreakers
        const tiebreakers = await createTiebreakers(roundId, result.ties);

        // Update status
        await prisma.rounds.update({
          where: { id: roundId },
          data: { status: 'tiebreaker_pending' }
        });

        return NextResponse.json({
          success: true,
          tieDetected: true,
          tiebreakers,
          message: 'Tiebreakers created. Teams must submit new bids.'
        });
      }

      if (!result.success) {
        // Revert status
        await prisma.rounds.update({
          where: { id: roundId },
          data: { status: 'active' }
        });

        return NextResponse.json(
          { error: result.error || 'Finalization failed' },
          { status: 500 }
        );
      }

      // Apply results
      await applyFinalizationResults(roundId, result.allocations);

      return NextResponse.json({
        success: true,
        allocations: result.allocations,
        message: 'Round finalized successfully'
      });
    }
  } catch (error) {
    console.error('Finalize round error:', error);

    // Try to revert status
    try {
      await prisma.rounds.update({
        where: { id: roundId },
        data: { status: 'active' }
      });
    } catch (revertError) {
      console.error('Failed to revert status:', revertError);
    }

    return NextResponse.json(
      { error: 'Failed to finalize round' },
      { status: 500 }
    );
  }
}
