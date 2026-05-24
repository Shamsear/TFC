import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTransferId, generateFinancialId } from '@/lib/id-generator';
import { auth } from '@/lib/auth';

/**
 * Fix incorrect player allocations (like Rafael Márquez case)
 * POST /api/admin/transfers/fix
 * Body: { 
 *   seasonId, 
 *   teamId, 
 *   wrongPlayerId, 
 *   correctPlayerId, 
 *   reason 
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { seasonId, teamId, wrongPlayerId, correctPlayerId, reason } = body;

    if (!seasonId || !teamId || !wrongPlayerId || !correctPlayerId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (wrongPlayerId === correctPlayerId) {
      return NextResponse.json({ error: 'Players must be different' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get both players
      const wrongPlayer = await tx.base_players.findUnique({
        where: { id: wrongPlayerId },
        select: { id: true, name: true }
      });

      const correctPlayer = await tx.base_players.findUnique({
        where: { id: correctPlayerId },
        select: { id: true, name: true }
      });

      if (!wrongPlayer || !correctPlayer) {
        throw new Error('Player not found');
      }

      // Check if correct player is already allocated
      const existingCorrectTransfer = await tx.transfer_history.findFirst({
        where: {
          basePlayerId: correctPlayerId,
          seasonId: seasonId
        }
      });

      if (existingCorrectTransfer) {
        throw new Error(`${correctPlayer.name} is already allocated to a team`);
      }

      // Find wrong player's transfer
      const wrongTransfer = await tx.transfer_history.findFirst({
        where: {
          basePlayerId: wrongPlayerId,
          seasonId: seasonId,
          teamId: teamId
        },
        include: {
          round: {
            select: {
              id: true,
              roundNumber: true,
              position_group: true
            }
          }
        }
      });

      if (!wrongTransfer) {
        throw new Error(`${wrongPlayer.name} not found in team`);
      }

      // Get season team
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: { seasonId, teamId }
        },
        include: {
          team: {
            select: {
              name: true
            }
          }
        }
      });

      if (!seasonTeam) {
        throw new Error('Season team not found');
      }

      const transferPrice = wrongTransfer.soldPrice;
      const oldBudget = seasonTeam.currentBudget;

      // Delete wrong transfer
      await tx.transfer_history.delete({
        where: { id: wrongTransfer.id }
      });

      // Refund
      const refundedBudget = oldBudget + transferPrice;

      // Create new transfer with correct player (same price)
      const newTransferId = await generateTransferId();
      await tx.transfer_history.create({
        data: {
          id: newTransferId,
          basePlayerId: correctPlayerId,
          seasonId: seasonId,
          teamId: teamId,
          roundId: wrongTransfer.roundId,
          soldPrice: transferPrice,
          acquisitionType: wrongTransfer.acquisitionType,
          acquisitionNotes: reason || `Corrected allocation: Replaced ${wrongPlayer.name} with ${correctPlayer.name}`,
          status: 'ACTIVE'
        }
      });

      // Charge for new player
      const finalBudget = refundedBudget - transferPrice;

      // Update budget
      await tx.season_teams.update({
        where: { id: seasonTeam.id },
        data: { currentBudget: finalBudget }
      });

      // Create refund ledger entry
      const refundLedgerId = await generateFinancialId();
      await tx.financial_ledger.create({
        data: {
          id: refundLedgerId,
          seasonTeamId: seasonTeam.id,
          seasonId: seasonId,
          transactionType: 'ADJUSTMENT',
          amount: transferPrice,
          previousBalance: oldBudget,
          newBalance: refundedBudget,
          description: `Refund for ${wrongPlayer.name} (incorrect allocation)`,
          playerName: wrongPlayer.name
        }
      });

      // Create purchase ledger entry
      const purchaseLedgerId = await generateFinancialId();
      await tx.financial_ledger.create({
        data: {
          id: purchaseLedgerId,
          seasonTeamId: seasonTeam.id,
          seasonId: seasonId,
          transactionType: 'PLAYER_PURCHASE',
          amount: -transferPrice,
          previousBalance: refundedBudget,
          newBalance: finalBudget,
          description: `Corrected allocation: ${correctPlayer.name}`,
          playerName: correctPlayer.name
        }
      });

      return {
        teamName: seasonTeam.team.name,
        removedPlayer: wrongPlayer.name,
        addedPlayer: correctPlayer.name,
        price: transferPrice,
        roundNumber: wrongTransfer.round?.roundNumber,
        positionGroup: wrongTransfer.round?.position_group
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer fixed successfully',
      ...result
    });
  } catch (error) {
    console.error('Transfer fix error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix transfer' },
      { status: 500 }
    );
  }
}
