import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { decryptBids } from '@/lib/auction/encryption';

/**
 * GET /api/admin/rounds/audit-finalization?seasonId=TFCS-5
 * Audits rounds in a season for double finalisation and duplicate transfers/ledger entries.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 });
    }

    // Get all rounds for the season
    const rounds = await prisma.rounds.findMany({
      where: { seasonId },
      orderBy: { roundNumber: 'desc' },
      select: {
        id: true,
        roundNumber: true,
        position: true,
        position_group: true,
        status: true,
        roundType: true,
        endTime: true,
        createdAt: true
      }
    });

    const roundAudits = [];

    for (const round of rounds) {
      // Fetch team bids to detect skipped teams
      const teamBids = await prisma.team_round_bids.findMany({
        where: { roundId: round.id },
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

      // 1. Fetch transfers for this round
      const transfers = await prisma.transfer_history.findMany({
        where: {
          seasonId,
          roundId: round.id
        },
        select: {
          id: true,
          basePlayerId: true,
          teamId: true,
          soldPrice: true,
          acquisitionType: true,
          createdAt: true,
          basePlayer: { select: { name: true } },
          team: { select: { name: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      // Group transfers by basePlayerId to find duplicate player allocations
      const playerTransferMap = new Map<string, typeof transfers>();
      const teamAutoTransfersMap = new Map<string, typeof transfers>();
      let invalidSkippedAutoTransfersCount = 0;

      for (const t of transfers) {
        const list = playerTransferMap.get(t.basePlayerId) || [];
        list.push(t);
        playerTransferMap.set(t.basePlayerId, list);

        if (t.acquisitionType === 'auto_assigned') {
          if (skippedTeamIds.has(t.teamId)) {
            invalidSkippedAutoTransfersCount++;
          }
          const autoList = teamAutoTransfersMap.get(t.teamId) || [];
          autoList.push(t);
          teamAutoTransfersMap.set(t.teamId, autoList);
        }
      }

      let multipleAutoAssignedCount = 0;
      for (const autoList of teamAutoTransfersMap.values()) {
        if (autoList.length > 1) {
          multipleAutoAssignedCount += (autoList.length - 1);
        }
      }

      const duplicatePlayers: Array<{ playerId: string; playerName: string; transferCount: number }> = [];
      let totalDuplicateTransfers = 0;

      for (const [playerId, tList] of playerTransferMap.entries()) {
        if (tList.length > 1) {
          totalDuplicateTransfers += (tList.length - 1);
          duplicatePlayers.push({
            playerId,
            playerName: tList[0].basePlayer?.name || playerId,
            transferCount: tList.length
          });
        }
      }

      // 2. Fetch financial ledger entries for this round
      const ledgerEntries = await prisma.financial_ledger.findMany({
        where: {
          seasonId,
          OR: [
            { description: { contains: round.id } },
            { description: { contains: `Round ${round.roundNumber}` } }
          ]
        },
        select: {
          id: true,
          seasonTeamId: true,
          amount: true,
          playerName: true,
          createdAt: true,
          seasonTeam: { select: { team: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'asc' }
      });

      // Group ledger entries to detect duplicates
      const ledgerMap = new Map<string, typeof ledgerEntries>();
      for (const l of ledgerEntries) {
        const key = `${l.seasonTeamId}_${l.playerName || l.amount}`;
        const list = ledgerMap.get(key) || [];
        list.push(l);
        ledgerMap.set(key, list);
      }

      let totalDuplicateLedger = 0;
      for (const lList of ledgerMap.values()) {
        if (lList.length > 1) {
          totalDuplicateLedger += (lList.length - 1);
        }
      }

      const totalIssuesCount = totalDuplicateTransfers + invalidSkippedAutoTransfersCount + multipleAutoAssignedCount;
      const hasIssue = totalIssuesCount > 0 || totalDuplicateLedger > 0;

      roundAudits.push({
        id: round.id,
        roundNumber: round.roundNumber,
        position: round.position,
        positionGroup: round.position_group,
        status: round.status,
        roundType: round.roundType,
        totalTransfers: transfers.length,
        uniquePlayersCount: playerTransferMap.size,
        duplicateTransfersCount: totalIssuesCount,
        totalLedgerEntries: ledgerEntries.length,
        duplicateLedgerCount: totalDuplicateLedger,
        duplicatePlayers,
        hasIssue,
        endTime: round.endTime,
        createdAt: round.createdAt
      });
    }

    const roundsWithIssuesCount = roundAudits.filter(r => r.hasIssue).length;

    return NextResponse.json({
      success: true,
      seasonId,
      totalRounds: rounds.length,
      roundsWithIssuesCount,
      roundAudits
    });
  } catch (error) {
    console.error('Audit finalization API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to audit finalization' },
      { status: 500 }
    );
  }
}
