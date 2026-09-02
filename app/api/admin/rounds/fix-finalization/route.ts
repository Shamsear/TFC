import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * POST /api/admin/rounds/fix-finalization
 * Fixes double finalisation for a round by removing duplicate transfers & ledger entries and syncing team budgets.
 * Body: { roundId: string, seasonId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roundId, seasonId } = body;

    if (!roundId || !seasonId) {
      return NextResponse.json({ error: 'roundId and seasonId are required' }, { status: 400 });
    }

    // 1. Fetch all transfers for this round
    const transfers = await prisma.transfer_history.findMany({
      where: { seasonId, roundId },
      orderBy: { createdAt: 'asc' }
    });

    // Identify duplicate transfers (keep the first one created per player, mark rest for deletion)
    const playerTransferMap = new Map<string, typeof transfers>();
    const duplicateTransferIds: string[] = [];

    for (const t of transfers) {
      const existing = playerTransferMap.get(t.basePlayerId);
      if (!existing) {
        playerTransferMap.set(t.basePlayerId, [t]);
      } else {
        existing.push(t);
        duplicateTransferIds.push(t.id);
      }
    }

    // 2. Fetch financial ledger entries for this round
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: { roundNumber: true }
    });

    const ledgerEntries = await prisma.financial_ledger.findMany({
      where: {
        seasonId,
        OR: [
          { description: { contains: roundId } },
          round?.roundNumber ? { description: { contains: `Round ${round.roundNumber}` } } : {}
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    // Identify duplicate ledger entries (keep the first one per team/player, mark rest for deletion)
    const ledgerMap = new Map<string, typeof ledgerEntries>();
    const duplicateLedgerIds: string[] = [];

    for (const l of ledgerEntries) {
      const key = `${l.seasonTeamId}_${l.playerName || l.amount}`;
      const existing = ledgerMap.get(key);
      if (!existing) {
        ledgerMap.set(key, [l]);
      } else {
        existing.push(l);
        duplicateLedgerIds.push(l.id);
      }
    }

    if (duplicateTransferIds.length === 0 && duplicateLedgerIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No duplicate transfers or ledger entries found for this round.',
        deletedTransfersCount: 0,
        deletedLedgerCount: 0
      });
    }

    // Pre-fetch team budget info
    const seasonTeams = await prisma.season_teams.findMany({
      where: { seasonId },
      include: { team: true }
    });

    // Pre-fetch active transfers excluding duplicates to be deleted
    const validActiveTransfers = await prisma.transfer_history.findMany({
      where: {
        seasonId,
        status: 'ACTIVE',
        id: { notIn: duplicateTransferIds.length > 0 ? duplicateTransferIds : ['none'] }
      }
    });

    // Pre-fetch valid ledger entries excluding duplicates to be deleted
    const validLedgerEntries = await prisma.financial_ledger.findMany({
      where: {
        seasonId,
        id: { notIn: duplicateLedgerIds.length > 0 ? duplicateLedgerIds : ['none'] }
      }
    });

    // Compute updated budgets for all teams
    const budgetUpdates: Array<{ id: string; teamName: string; newBudget: number }> = [];

    for (const st of seasonTeams) {
      const initialPurseEntry = validLedgerEntries.find(l => l.seasonTeamId === st.id && l.transactionType === 'INITIAL_PURSE');
      const initialPurse = initialPurseEntry ? initialPurseEntry.amount : 10000;

      const teamTransfers = validActiveTransfers.filter(t => t.teamId === st.teamId);
      const totalSpent = teamTransfers.reduce((sum, t) => sum + t.soldPrice, 0);

      const teamAdjustments = validLedgerEntries.filter(l => l.seasonTeamId === st.id && l.transactionType === 'ADJUSTMENT');
      const totalAdjustments = teamAdjustments.reduce((sum, l) => sum + l.amount, 0);

      const newBudget = initialPurse - totalSpent + totalAdjustments;
      budgetUpdates.push({ id: st.id, teamName: st.team.name, newBudget });
    }

    // Execute database cleanup in a transaction
    await prisma.$transaction(async (tx) => {
      if (duplicateTransferIds.length > 0) {
        await tx.transfer_history.deleteMany({
          where: { id: { in: duplicateTransferIds } }
        });
      }

      if (duplicateLedgerIds.length > 0) {
        await tx.financial_ledger.deleteMany({
          where: { id: { in: duplicateLedgerIds } }
        });
      }

      for (const update of budgetUpdates) {
        await tx.season_teams.update({
          where: { id: update.id },
          data: { currentBudget: update.newBudget }
        });
      }
    }, {
      timeout: 30000
    });

    return NextResponse.json({
      success: true,
      roundId,
      deletedTransfersCount: duplicateTransferIds.length,
      deletedLedgerCount: duplicateLedgerIds.length,
      updatedTeamsCount: budgetUpdates.length,
      message: `Successfully fixed double finalisation for ${roundId}: deleted ${duplicateTransferIds.length} duplicate transfer(s) and ${duplicateLedgerIds.length} duplicate ledger entry(ies), and synced ${budgetUpdates.length} team budgets.`
    });
  } catch (error) {
    console.error('Fix finalization API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix finalization' },
      { status: 500 }
    );
  }
}
