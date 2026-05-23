import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      seasonId, 
      teamId, 
      oldPlayerId, 
      newPlayerId,
      newAmount 
    } = await request.json();

    if (!seasonId || !teamId || !oldPlayerId || !newPlayerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get season team
    const seasonTeam = await prisma.season_teams.findFirst({
      where: { seasonId, teamId },
      include: { team: { select: { name: true } } }
    });

    if (!seasonTeam) {
      return NextResponse.json({ error: 'Team not found in season' }, { status: 404 });
    }

    // Get old player transfer history
    const oldTransfer = await prisma.transfer_history.findFirst({
      where: {
        basePlayerId: oldPlayerId,
        teamId,
        seasonId
      },
      include: {
        basePlayer: { select: { name: true } }
      }
    });

    if (!oldTransfer) {
      return NextResponse.json({ error: 'Old player transfer not found' }, { status: 404 });
    }

    // Get new player details
    const newPlayer = await prisma.base_players.findUnique({
      where: { id: newPlayerId },
      select: { name: true }
    });

    if (!newPlayer) {
      return NextResponse.json({ error: 'New player not found' }, { status: 404 });
    }

    // Check if new player is already owned
    const existingTransfer = await prisma.transfer_history.findFirst({
      where: {
        basePlayerId: newPlayerId,
        seasonId
      }
    });

    if (existingTransfer) {
      return NextResponse.json({ 
        error: `${newPlayer.name} is already owned by another team` 
      }, { status: 400 });
    }

    const oldAmount = oldTransfer.soldPrice;
    const amountDifference = newAmount - oldAmount;

    // Find the ledger entry for this player purchase
    const ledgerEntry = await prisma.financial_ledger.findFirst({
      where: {
        seasonTeamId: seasonTeam.id,
        transactionType: 'PLAYER_PURCHASE',
        playerName: oldTransfer.basePlayer.name,
        amount: -oldAmount
      },
      orderBy: { createdAt: 'asc' }
    });

    if (!ledgerEntry) {
      return NextResponse.json({ 
        error: 'Financial ledger entry not found for this player' 
      }, { status: 404 });
    }

    // Get all ledger entries after this one (to recalculate)
    const allLedgerEntries = await prisma.financial_ledger.findMany({
      where: { seasonTeamId: seasonTeam.id },
      orderBy: { createdAt: 'asc' }
    });

    const entryIndex = allLedgerEntries.findIndex(e => e.id === ledgerEntry.id);
    if (entryIndex === -1) {
      return NextResponse.json({ error: 'Ledger entry index not found' }, { status: 500 });
    }

    // Start transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update transfer_history
      await tx.transfer_history.update({
        where: { id: oldTransfer.id },
        data: {
          basePlayerId: newPlayerId,
          soldPrice: newAmount
        }
      });

      // 2. Update the specific ledger entry
      const updatedPreviousBalance = ledgerEntry.previousBalance;
      const updatedNewBalance = updatedPreviousBalance + (-newAmount);

      // Extract round number from description if available
      const roundMatch = ledgerEntry.description?.match(/Round (\d+)/);
      const roundNumber = roundMatch ? roundMatch[1] : '';
      const newDescription = roundNumber 
        ? `Round ${roundNumber} player purchases`
        : 'Player purchase';

      await tx.financial_ledger.update({
        where: { id: ledgerEntry.id },
        data: {
          playerName: newPlayer.name,
          amount: -newAmount,
          newBalance: updatedNewBalance,
          description: newDescription
        }
      });

      // 3. Recalculate all subsequent ledger entries
      let runningBalance = updatedNewBalance;

      for (let i = entryIndex + 1; i < allLedgerEntries.length; i++) {
        const entry = allLedgerEntries[i];
        const expectedPrevious = runningBalance;
        const expectedNew = runningBalance + entry.amount;

        await tx.financial_ledger.update({
          where: { id: entry.id },
          data: {
            previousBalance: expectedPrevious,
            newBalance: expectedNew
          }
        });

        runningBalance = expectedNew;
      }

      // 4. Update team's current budget
      await tx.season_teams.update({
        where: { id: seasonTeam.id },
        data: { currentBudget: runningBalance }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully replaced ${oldTransfer.basePlayer.name} with ${newPlayer.name}`,
      oldPlayer: oldTransfer.basePlayer.name,
      newPlayer: newPlayer.name,
      oldAmount,
      newAmount,
      amountDifference,
      entriesRecalculated: allLedgerEntries.length - entryIndex - 1
    });
  } catch (error) {
    console.error('Error replacing player allocation:', error);
    return NextResponse.json(
      { error: 'Failed to replace player allocation' },
      { status: 500 }
    );
  }
}
