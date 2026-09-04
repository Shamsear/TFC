import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

/**
 * POST /api/admin/rounds/[id]/revert
 * Reverts all actions performed by a finalized (or finalizing/tiebreaker) round:
 * 1. Deletes created transfers (transfer_history)
 * 2. Refunds team budgets (season_teams.currentBudget)
 * 3. Deletes financial ledger entries created for the round
 * 4. Deletes normal tiebreakers (tiebreakers & team_tiebreaker_bids)
 * 5. Deletes bulk tiebreakers (bulk_tiebreakers, participants & history)
 * 6. Deletes preview allocations (preview_allocations)
 * 7. Resets round status back to 'active' (or 'draft')
 * 
 * Query/Body parameters:
 * - resetBids (boolean): if true, sets team submitted bids back to unsubmitted (default: false)
 * - targetStatus (string): 'active' (default) or 'draft'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: roundId } = await params;
    let body: { resetBids?: boolean; deleteBids?: boolean; targetStatus?: 'active' | 'draft' } = {};

    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = await request.json();
      }
    } catch {
      // Empty or invalid body - default options used
    }

    const { resetBids = false, deleteBids = false, targetStatus = 'active' } = body;

    // Fetch round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      include: { season: true }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // 1. Fetch transfers created by this round to calculate budget refunds
    const transfers = await prisma.transfer_history.findMany({
      where: { roundId }
    });

    // Group refund amounts by teamId
    const teamRefundsMap = new Map<string, number>();
    for (const t of transfers) {
      const currentRefund = teamRefundsMap.get(t.teamId) || 0;
      teamRefundsMap.set(t.teamId, currentRefund + t.soldPrice);
    }

    // 2. Fetch financial ledger entries created for this round
    const ledgerEntries = await prisma.financial_ledger.findMany({
      where: {
        seasonId: round.seasonId,
        OR: [
          { description: { contains: roundId } },
          { description: { contains: `Round ${round.roundNumber}` } }
        ]
      }
    });
    const ledgerIdsToDelete = ledgerEntries.map(l => l.id);

    // 3. Fetch bulk tiebreakers associated with this round
    const bulkTiebreakers = await prisma.bulk_tiebreakers.findMany({
      where: { roundId },
      select: { id: true }
    });
    const bulkTiebreakerIds = bulkTiebreakers.map(bt => bt.id);

    // Perform reverting logic inside an atomic database transaction
    const revertSummary = await prisma.$transaction(async (tx) => {
      // A. Delete transfers
      const deletedTransfers = await tx.transfer_history.deleteMany({
        where: { roundId }
      });

      // B. Restore team budgets
      const budgetUpdates: Array<{ teamId: string; refundedAmount: number }> = [];
      for (const [teamId, refundAmount] of teamRefundsMap.entries()) {
        const seasonTeam = await tx.season_teams.findUnique({
          where: { seasonId_teamId: { seasonId: round.seasonId, teamId } }
        });

        if (seasonTeam) {
          await tx.season_teams.update({
            where: { id: seasonTeam.id },
            data: { currentBudget: { increment: refundAmount } }
          });
          budgetUpdates.push({ teamId, refundedAmount: refundAmount });
        }
      }

      // C. Delete financial ledger entries
      let deletedLedgerCount = 0;
      if (ledgerIdsToDelete.length > 0) {
        const res = await tx.financial_ledger.deleteMany({
          where: { id: { in: ledgerIdsToDelete } }
        });
        deletedLedgerCount = res.count;
      }

      // D. Delete normal tiebreakers (team_tiebreaker_bids delete automatically via cascade or explicit delete)
      const deletedTiebreakers = await tx.tiebreakers.deleteMany({
        where: { roundId }
      });

      // E. Delete bulk tiebreakers (participants & history delete via cascade or explicit delete)
      let deletedBulkTiebreakersCount = 0;
      if (bulkTiebreakerIds.length > 0) {
        const res = await tx.bulk_tiebreakers.deleteMany({
          where: { id: { in: bulkTiebreakerIds } }
        });
        deletedBulkTiebreakersCount = res.count;
      }

      // F. Delete preview allocations
      const deletedPreviewAllocations = await tx.preview_allocations.deleteMany({
        where: { roundId }
      });

      // G. Reset or delete team_round_bids if requested
      if (deleteBids) {
        await tx.team_round_bids.deleteMany({ where: { roundId } });
        await tx.bulk_round_selections.deleteMany({ where: { roundId } });
      } else if (resetBids) {
        await tx.team_round_bids.updateMany({
          where: { roundId },
          data: { submitted: false }
        });
        await tx.bulk_round_selections.updateMany({
          where: { roundId },
          data: { submitted: false }
        });
      }

      // H. Update round status back to active/draft and clear finalizationState & dates
      const roundUpdateData: any = {
        status: targetStatus,
        finalizationState: Prisma.JsonNull
      };

      if (targetStatus === 'draft') {
        roundUpdateData.startTime = null;
        roundUpdateData.endTime = null;
      }

      const updatedRound = await tx.rounds.update({
        where: { id: roundId },
        data: roundUpdateData
      });

      return {
        deletedTransfersCount: deletedTransfers.count,
        deletedLedgerCount,
        deletedTiebreakersCount: deletedTiebreakers.count,
        deletedBulkTiebreakersCount,
        deletedPreviewAllocationsCount: deletedPreviewAllocations.count,
        budgetRefunds: budgetUpdates,
        newRoundStatus: updatedRound.status
      };
    }, {
      timeout: 30000
    });

    return NextResponse.json({
      success: true,
      message: `Round ${round.roundNumber} (${roundId}) reverted successfully.`,
      summary: revertSummary
    });
  } catch (error: any) {
    console.error('Error reverting round:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to revert round' },
      { status: 500 }
    );
  }
}
