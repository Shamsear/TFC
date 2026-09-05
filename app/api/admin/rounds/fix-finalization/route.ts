import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { decryptBids } from '@/lib/auction/encryption';

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

    // 1. Fetch team bids to detect skipped teams
    const teamBids = await prisma.team_round_bids.findMany({
      where: { roundId },
      select: { teamId: true, submitted: true, encryptedBids: true }
    });
    const skippedTeamIds = new Set<string>();
    for (const b of teamBids) {
      try {
        const decrypted = decryptBids(b.encryptedBids);
        const parsed = JSON.parse(decrypted);
        if (parsed.skipped || (b.submitted && (!parsed.bids || parsed.bids.length === 0))) {
          skippedTeamIds.add(b.teamId);
        }
      } catch (e) {}
    }

    // 2. Fetch all transfers for this round
    const transfers = await prisma.transfer_history.findMany({
      where: { seasonId, roundId },
      orderBy: { createdAt: 'asc' }
    });

    const playerTransferMap = new Map<string, typeof transfers>();
    const teamAutoTransfersMap = new Map<string, typeof transfers>();
    const duplicateTransferIds: string[] = [];

    for (const t of transfers) {
      // Rule A: Remove duplicate transfers for the exact same player
      const existingPlayerTransfer = playerTransferMap.get(t.basePlayerId);
      if (!existingPlayerTransfer) {
        playerTransferMap.set(t.basePlayerId, [t]);
      } else {
        existingPlayerTransfer.push(t);
        duplicateTransferIds.push(t.id);
        continue;
      }

      // Rule B: Remove auto-assigned transfers for teams that explicitly skipped
      if (t.acquisitionType === 'auto_assigned' && skippedTeamIds.has(t.teamId)) {
        console.log(`[FIX-FINALIZATION] Removing auto-assigned transfer for skipped team ${t.teamId}: ${t.id}`);
        duplicateTransferIds.push(t.id);
        continue;
      }

      // Rule C: Remove duplicate auto-assigned transfers given to the same team in a round
      if (t.acquisitionType === 'auto_assigned') {
        const existingAutoList = teamAutoTransfersMap.get(t.teamId) || [];
        if (existingAutoList.length > 0) {
          console.log(`[FIX-FINALIZATION] Removing extra auto-assigned transfer for team ${t.teamId}: ${t.id}`);
          duplicateTransferIds.push(t.id);
        } else {
          existingAutoList.push(t);
          teamAutoTransfersMap.set(t.teamId, existingAutoList);
        }
      }
    }

    // 3. Fetch financial ledger entries for this round
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

    // Identify duplicate or invalid ledger entries
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
