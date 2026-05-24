import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateFinancialId } from '@/lib/id-generator';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { seasonId, releases } = body;

    if (!seasonId || !releases || !Array.isArray(releases)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const results = await prisma.$transaction(async (tx) => {
      const successfulReleases = [];
      const errors = [];

      for (const release of releases) {
        try {
          const { playerId, teamId, notes } = release;

          // Validate player exists
          const player = await tx.base_players.findUnique({
            where: { id: playerId },
            select: { id: true, name: true }
          });

          if (!player) {
            errors.push({ playerId, error: 'Player not found' });
            continue;
          }

          // Check if player is currently with team (ACTIVE status)
          const existingTransfer = await tx.transfer_history.findFirst({
            where: {
              basePlayerId: playerId,
              seasonId: seasonId,
              teamId: teamId,
              status: 'ACTIVE'
            }
          });

          if (!existingTransfer) {
            errors.push({ playerId, playerName: player.name, error: 'Player not in team' });
            continue;
          }

          // Get season team
          const seasonTeam = await tx.season_teams.findUnique({
            where: {
              seasonId_teamId: { seasonId, teamId }
            }
          });

          if (!seasonTeam) {
            errors.push({ playerId, playerName: player.name, error: 'Season team not found' });
            continue;
          }

          const transferPrice = existingTransfer.soldPrice;

          // Mark transfer as RELEASED instead of deleting
          await tx.transfer_history.update({
            where: { id: existingTransfer.id },
            data: {
              status: 'RELEASED',
              releasedAt: new Date(),
              releaseNotes: notes || `Player released: ${player.name}`
            }
          });

          // Refund to team
          const newBudget = seasonTeam.currentBudget + transferPrice;
          await tx.season_teams.update({
            where: { id: seasonTeam.id },
            data: { currentBudget: newBudget }
          });

          // Create refund ledger entry
          const ledgerId = await generateFinancialId();
          await tx.financial_ledger.create({
            data: {
              id: ledgerId,
              seasonTeamId: seasonTeam.id,
              seasonId: seasonId,
              transactionType: 'PLAYER_SALE',
              amount: transferPrice,
              previousBalance: seasonTeam.currentBudget,
              newBalance: newBudget,
              description: notes || `Player released: ${player.name}`,
              playerName: player.name
            }
          });

          successfulReleases.push({
            playerId,
            playerName: player.name,
            teamId,
            refundAmount: transferPrice
          });
        } catch (error) {
          errors.push({
            playerId: release.playerId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { successfulReleases, errors };
    });

    return NextResponse.json({
      success: true,
      released: results.successfulReleases.length,
      errors: results.errors.length,
      details: results
    });
  } catch (error) {
    console.error('Release error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to release players' },
      { status: 500 }
    );
  }
}
