import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTransferId, generateFinancialId } from '@/lib/id-generator';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, transferId, newPlayerId } = body;

    if (action === 'swap') {
      // Swap a player in an existing transfer
      const transfer = await prisma.transfer_history.findUnique({
        where: { id: transferId },
        include: {
          team: { select: { id: true, name: true } },
          round: { select: { id: true, roundNumber: true, position_group: true } },
          basePlayer: { select: { id: true, name: true } }
        }
      });

      if (!transfer) {
        return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
      }

      // Get new player details
      const newPlayer = await prisma.base_players.findUnique({
        where: { id: newPlayerId },
        select: { id: true, name: true }
      });

      if (!newPlayer) {
        return NextResponse.json({ error: 'New player not found' }, { status: 404 });
      }

      // Check if new player is already sold
      const existingTransfer = await prisma.transfer_history.findFirst({
        where: {
          basePlayerId: newPlayerId,
          seasonId: transfer.seasonId
        }
      });

      if (existingTransfer) {
        return NextResponse.json({ error: 'New player is already sold in this season' }, { status: 400 });
      }

      // Execute swap in transaction
      await prisma.$transaction(async (tx) => {
        // Get season team for ledger
        const seasonTeam = await tx.season_teams.findUnique({
          where: {
            seasonId_teamId: {
              seasonId: transfer.seasonId,
              teamId: transfer.teamId
            }
          }
        });

        if (!seasonTeam) {
          throw new Error('Season team not found');
        }

        const currentBudget = seasonTeam.currentBudget;

        // Delete old transfer
        await tx.transfer_history.delete({
          where: { id: transferId }
        });

        // Refund old price
        const refundedBudget = currentBudget + transfer.soldPrice;

        // Create new transfer
        const newTransferId = await generateTransferId();
        await tx.transfer_history.create({
          data: {
            id: newTransferId,
            basePlayerId: newPlayerId,
            seasonId: transfer.seasonId,
            teamId: transfer.teamId,
            roundId: transfer.roundId,
            soldPrice: transfer.soldPrice,
            acquisitionType: transfer.acquisitionType,
            acquisitionNotes: `Admin swap: ${transfer.basePlayer.name} → ${newPlayer.name} (same price). Original: ${transfer.acquisitionNotes || ''}`
          }
        });

        // Charge new price (same as old)
        const finalBudget = refundedBudget - transfer.soldPrice;

        // Update budget
        await tx.season_teams.update({
          where: {
            seasonId_teamId: {
              seasonId: transfer.seasonId,
              teamId: transfer.teamId
            }
          },
          data: { currentBudget: finalBudget }
        });

        // Add ledger entries
        const ledgerId1 = await generateFinancialId();
        await tx.financial_ledger.create({
          data: {
            id: ledgerId1,
            seasonTeamId: seasonTeam.id,
            seasonId: transfer.seasonId,
            transactionType: 'ADJUSTMENT',
            amount: transfer.soldPrice,
            previousBalance: currentBudget,
            newBalance: refundedBudget,
            description: `Refund for ${transfer.basePlayer.name} (admin swap)`,
            playerName: transfer.basePlayer.name
          }
        });

        const ledgerId2 = await generateFinancialId();
        await tx.financial_ledger.create({
          data: {
            id: ledgerId2,
            seasonTeamId: seasonTeam.id,
            seasonId: transfer.seasonId,
            transactionType: 'PLAYER_PURCHASE',
            amount: -transfer.soldPrice,
            previousBalance: refundedBudget,
            newBalance: finalBudget,
            description: `Admin swap: ${newPlayer.name}`,
            playerName: newPlayer.name
          }
        });
      });

      return NextResponse.json({
        success: true,
        message: `Successfully swapped ${transfer.basePlayer.name} with ${newPlayer.name}`
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Transfer fix error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix transfer' },
      { status: 500 }
    );
  }
}
