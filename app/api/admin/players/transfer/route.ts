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
    const { seasonId, transfers } = body;

    if (!seasonId || !transfers || !Array.isArray(transfers)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const results = await prisma.$transaction(async (tx) => {
      const successfulTransfers = [];
      const errors = [];

      for (const transfer of transfers) {
        try {
          const { playerId, fromTeamId, toTeamId, notes } = transfer;

          // Validate player exists
          const player = await tx.base_players.findUnique({
            where: { id: playerId },
            select: { id: true, name: true }
          });

          if (!player) {
            errors.push({ playerId, error: 'Player not found' });
            continue;
          }

          // Check if player is currently with fromTeam
          const existingTransfer = await tx.transfer_history.findFirst({
            where: {
              basePlayerId: playerId,
              seasonId: seasonId,
              teamId: fromTeamId
            },
            include: {
              round: {
                select: { id: true }
              }
            }
          });

          if (!existingTransfer) {
            errors.push({ playerId, playerName: player.name, error: 'Player not in source team' });
            continue;
          }

          // Get both season teams
          const fromSeasonTeam = await tx.season_teams.findUnique({
            where: {
              seasonId_teamId: { seasonId, teamId: fromTeamId }
            }
          });

          const toSeasonTeam = await tx.season_teams.findUnique({
            where: {
              seasonId_teamId: { seasonId, teamId: toTeamId }
            }
          });

          if (!fromSeasonTeam || !toSeasonTeam) {
            errors.push({ playerId, playerName: player.name, error: 'Season team not found' });
            continue;
          }

          const transferPrice = existingTransfer.soldPrice;

          // Delete old transfer
          await tx.transfer_history.delete({
            where: { id: existingTransfer.id }
          });

          // Refund to source team
          const fromNewBudget = fromSeasonTeam.currentBudget + transferPrice;
          await tx.season_teams.update({
            where: { id: fromSeasonTeam.id },
            data: { currentBudget: fromNewBudget }
          });

          // Create refund ledger entry for source team
          const refundLedgerId = await generateFinancialId();
          await tx.financial_ledger.create({
            data: {
              id: refundLedgerId,
              seasonTeamId: fromSeasonTeam.id,
              seasonId: seasonId,
              transactionType: 'PLAYER_SALE',
              amount: transferPrice,
              previousBalance: fromSeasonTeam.currentBudget,
              newBalance: fromNewBudget,
              description: notes || `Player transferred out: ${player.name}`,
              playerName: player.name
            }
          });

          // Create new transfer for destination team (free transfer - £0)
          const newTransferId = await generateTransferId();
          await tx.transfer_history.create({
            data: {
              id: newTransferId,
              basePlayerId: playerId,
              seasonId: seasonId,
              teamId: toTeamId,
              roundId: existingTransfer.roundId,
              soldPrice: 0, // Free transfer
              acquisitionType: 'free_transfer',
              acquisitionNotes: notes || `Free transfer from another team. Original price: £${transferPrice}`
            }
          });

          // No budget deduction for destination team (free transfer)
          // But create a ledger entry for tracking
          const transferLedgerId = await generateFinancialId();
          await tx.financial_ledger.create({
            data: {
              id: transferLedgerId,
              seasonTeamId: toSeasonTeam.id,
              seasonId: seasonId,
              transactionType: 'PLAYER_PURCHASE',
              amount: 0, // Free transfer
              previousBalance: toSeasonTeam.currentBudget,
              newBalance: toSeasonTeam.currentBudget,
              description: notes || `Free transfer in: ${player.name}`,
              playerName: player.name
            }
          });

          successfulTransfers.push({
            playerId,
            playerName: player.name,
            fromTeamId,
            toTeamId,
            originalPrice: transferPrice
          });
        } catch (error) {
          errors.push({
            playerId: transfer.playerId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { successfulTransfers, errors };
    });

    return NextResponse.json({
      success: true,
      transferred: results.successfulTransfers.length,
      errors: results.errors.length,
      details: results
    });
  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transfer players' },
      { status: 500 }
    );
  }
}
