import { prisma } from '@/lib/prisma';
import { finalizeRound, applyFinalizationResults } from './finalize-round';
import { createTiebreakers, hasActiveTiebreakers } from './tiebreaker';

/**
 * Lazy finalization checker
 * Called when users access rounds to automatically finalize expired rounds
 */

export interface LazyFinalizationResult {
  finalized: boolean;
  pendingManualFinalization?: boolean;
  alreadyFinalized?: boolean;
  tiebreakerRequired?: boolean;
  error?: string;
}

/**
 * Check and finalize expired round (if needed)
 */
export async function checkAndFinalizeExpiredRound(
  roundId: string
): Promise<LazyFinalizationResult> {
  try {
    // 1. Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        status: true,
        endTime: true,
        finalizationMode: true,
        roundNumber: true
      }
    });

    if (!round) {
      return { finalized: false, error: 'Round not found' };
    }

    // 2. Check if already finalized
    if (round.status === 'completed') {
      return { finalized: false, alreadyFinalized: true };
    }

    // 3. Check if expired
    const now = new Date();
    const endTime = round.endTime ? new Date(round.endTime) : null;

    if (!endTime || now <= endTime) {
      return { finalized: false }; // Not expired yet
    }

    // 4. Check finalization mode
    if (round.finalizationMode === 'manual') {
      // Manual mode: Mark as expired_pending_finalization
      if (round.status === 'active') {
        await prisma.rounds.update({
          where: { id: roundId },
          data: { status: 'expired_pending_finalization' }
        });
      }
      return { finalized: false, pendingManualFinalization: true };
    }

    // 5. Auto mode: Check if already finalizing
    if (round.status === 'finalizing') {
      return { finalized: false, alreadyFinalized: true };
    }

    // 6. Check for active tiebreakers
    const hasTiebreakers = await hasActiveTiebreakers(roundId);
    if (hasTiebreakers) {
      return { finalized: false, tiebreakerRequired: true };
    }

    // 7. Acquire lock (optimistic locking)
    const lockResult = await prisma.rounds.updateMany({
      where: {
        id: roundId,
        status: 'active'
      },
      data: {
        status: 'finalizing'
      }
    });

    if (lockResult.count === 0) {
      // Another request already got it
      return { finalized: false, alreadyFinalized: true };
    }

    // 8. Run finalization
    const result = await finalizeRound(roundId);

    // 9. Handle ties
    if (result.tieDetected && result.ties) {
      await createTiebreakers(roundId, result.ties);
      
      // Update status to tiebreaker_pending
      await prisma.rounds.update({
        where: { id: roundId },
        data: { status: 'tiebreaker_pending' }
      });

      return { finalized: false, tiebreakerRequired: true };
    }

    // 10. Apply results
    if (result.success && result.allocations.length > 0) {
      await applyFinalizationResults(roundId, result.allocations);
      return { finalized: true };
    }

    // 11. No allocations (empty round)
    if (result.success && result.allocations.length === 0) {
      await prisma.rounds.update({
        where: { id: roundId },
        data: { status: 'completed' }
      });
      return { finalized: true };
    }

    // 12. Finalization failed
    await prisma.rounds.update({
      where: { id: roundId },
      data: { status: 'active' } // Revert to active
    });

    return {
      finalized: false,
      error: result.error || 'Finalization failed'
    };
  } catch (error) {
    console.error('Lazy finalization error:', error);
    
    // Revert status on error
    try {
      await prisma.rounds.update({
        where: { id: roundId },
        data: { status: 'active' }
      });
    } catch (revertError) {
      console.error('Failed to revert status:', revertError);
    }

    return {
      finalized: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check and finalize multiple expired rounds
 */
export async function checkAndFinalizeExpiredRounds(
  roundIds: string[]
): Promise<Map<string, LazyFinalizationResult>> {
  const results = new Map<string, LazyFinalizationResult>();

  for (const roundId of roundIds) {
    const result = await checkAndFinalizeExpiredRound(roundId);
    results.set(roundId, result);
  }

  return results;
}

/**
 * Find all expired active rounds
 */
export async function findExpiredActiveRounds(seasonId?: string): Promise<string[]> {
  const where: any = {
    status: 'active',
    endTime: {
      lt: new Date()
    }
  };

  if (seasonId) {
    where.seasonId = seasonId;
  }

  const rounds = await prisma.rounds.findMany({
    where,
    select: { id: true },
    orderBy: { endTime: 'asc' }
  });

  return rounds.map(r => r.id);
}

/**
 * Auto-finalize all expired rounds (for cron job)
 */
export async function autoFinalizeExpiredRounds(seasonId?: string): Promise<{
  processed: number;
  finalized: number;
  failed: number;
  errors: Array<{ roundId: string; error: string }>;
}> {
  const expiredRoundIds = await findExpiredActiveRounds(seasonId);
  
  let finalized = 0;
  let failed = 0;
  const errors: Array<{ roundId: string; error: string }> = [];

  for (const roundId of expiredRoundIds) {
    const result = await checkAndFinalizeExpiredRound(roundId);
    
    if (result.finalized) {
      finalized++;
    } else if (result.error) {
      failed++;
      errors.push({ roundId, error: result.error });
    }
  }

  return {
    processed: expiredRoundIds.length,
    finalized,
    failed,
    errors
  };
}
