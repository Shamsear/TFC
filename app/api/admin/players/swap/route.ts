import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTransferId, generateFinancialId } from '@/lib/id-generator';
import { auth } from '@/lib/auth';

/**
 * Swap players between teams (even swaps only)
 * POST /api/admin/players/swap
 * Body: { 
 *   seasonId, 
 *   swaps: [
 *     { 
 *       team1Id, 
 *       team2Id, 
 *       team1PlayerIds: [playerId1, playerId2, ...],  // Players from team1 going to team2
 *       team2PlayerIds: [playerId3, playerId4, ...],  // Players from team2 going to team1
 *       notes 
 *     }
 *   ] 
 * }
 * 
 * Rules:
 * - Must be even swap (same number of players from each team)
 * - Players swap values (Player A gets Player B's value and vice versa)
 * - No budget changes
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { seasonId, swaps } = body;

    if (!seasonId || !swaps || !Array.isArray(swaps)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const results = await prisma.$transaction(async (tx) => {
      const successfulSwaps = [];
      const errors = [];

      for (const swap of swaps) {
        try {
          const { team1Id, team2Id, team1PlayerIds, team2PlayerIds, notes } = swap;

          // Validation
          if (team1Id === team2Id) {
            errors.push({ swap, error: 'Cannot swap players within the same team' });
            continue;
          }

          if (!team1PlayerIds || !Array.isArray(team1PlayerIds) || team1PlayerIds.length === 0) {
            errors.push({ swap, error: 'Team 1 must provide at least one player' });
            continue;
          }

          if (!team2PlayerIds || !Array.isArray(team2PlayerIds) || team2PlayerIds.length === 0) {
            errors.push({ swap, error: 'Team 2 must provide at least one player' });
            continue;
          }

          // Must be even swap
          if (team1PlayerIds.length !== team2PlayerIds.length) {
            errors.push({ 
              swap, 
              error: `Uneven swap not allowed. Team 1 has ${team1PlayerIds.length} player(s), Team 2 has ${team2PlayerIds.length} player(s). Must be equal.` 
            });
            continue;
          }

          // Get both season teams
          const [team1SeasonTeam, team2SeasonTeam] = await Promise.all([
            tx.season_teams.findUnique({
              where: { seasonId_teamId: { seasonId, teamId: team1Id } },
              include: { team: { select: { name: true } } }
            }),
            tx.season_teams.findUnique({
              where: { seasonId_teamId: { seasonId, teamId: team2Id } },
              include: { team: { select: { name: true } } }
            })
          ]);

          if (!team1SeasonTeam || !team2SeasonTeam) {
            errors.push({ swap, error: 'One or both teams not found in season' });
            continue;
          }

          // Process Team 1 players (going to Team 2)
          const team1Players = [];

          for (const playerId of team1PlayerIds) {
            const player = await tx.base_players.findUnique({
              where: { id: playerId },
              select: { id: true, name: true }
            });

            if (!player) {
              errors.push({ swap, error: `Player ${playerId} not found` });
              continue;
            }

            const existingTransfer = await tx.transfer_history.findFirst({
              where: {
                basePlayerId: playerId,
                seasonId: seasonId,
                teamId: team1Id,
                status: 'ACTIVE'
              }
            });

            if (!existingTransfer) {
              errors.push({ swap, error: `Player ${player.name} not in ${team1SeasonTeam.team.name}` });
              continue;
            }

            team1Players.push({
              id: playerId,
              name: player.name,
              transfer: existingTransfer
            });
          }

          // Process Team 2 players (going to Team 1)
          const team2Players = [];

          for (const playerId of team2PlayerIds) {
            const player = await tx.base_players.findUnique({
              where: { id: playerId },
              select: { id: true, name: true }
            });

            if (!player) {
              errors.push({ swap, error: `Player ${playerId} not found` });
              continue;
            }

            const existingTransfer = await tx.transfer_history.findFirst({
              where: {
                basePlayerId: playerId,
                seasonId: seasonId,
                teamId: team2Id,
                status: 'ACTIVE'
              }
            });

            if (!existingTransfer) {
              errors.push({ swap, error: `Player ${player.name} not in ${team2SeasonTeam.team.name}` });
              continue;
            }

            team2Players.push({
              id: playerId,
              name: player.name,
              transfer: existingTransfer
            });
          }

          // If any errors occurred during player validation, skip this swap
          if (team1Players.length !== team1PlayerIds.length || team2Players.length !== team2PlayerIds.length) {
            continue;
          }

          // Create swap description
          const team1PlayerNames = team1Players.map(p => p.name).join(', ');
          const team2PlayerNames = team2Players.map(p => p.name).join(', ');
          const swapType = team1Players.length === 1 ? 'Single' :
                          team1Players.length === 2 ? 'Double' :
                          team1Players.length === 3 ? 'Triple' :
                          `${team1Players.length}-player`;
          
          const swapDescription = notes || 
            `${swapType} swap: ${team1SeasonTeam.team.name} (${team1PlayerNames}) ↔ ${team2SeasonTeam.team.name} (${team2PlayerNames})`;

          // Mark all Team 1 players as SWAPPED_OUT
          for (const player of team1Players) {
            await tx.transfer_history.update({
              where: { id: player.transfer.id },
              data: {
                status: 'SWAPPED_OUT',
                releasedAt: new Date(),
                releaseNotes: swapDescription
              }
            });
          }

          // Mark all Team 2 players as SWAPPED_OUT
          for (const player of team2Players) {
            await tx.transfer_history.update({
              where: { id: player.transfer.id },
              data: {
                status: 'SWAPPED_OUT',
                releasedAt: new Date(),
                releaseNotes: swapDescription
              }
            });
          }

          // Create new transfers: Team 1 players → Team 2 (with Team 2 players' values)
          for (let i = 0; i < team1Players.length; i++) {
            const team1Player = team1Players[i];
            const team2Player = team2Players[i];
            
            const newTransferId = await generateTransferId();
            await tx.transfer_history.create({
              data: {
                id: newTransferId,
                basePlayerId: team1Player.id,
                seasonId: seasonId,
                teamId: team2Id,
                soldPrice: team2Player.transfer.soldPrice, // Takes Team 2 player's value
                acquisitionType: 'player_swap',
                acquisitionNotes: swapDescription,
                status: 'ACTIVE'
              }
            });
          }

          // Create new transfers: Team 2 players → Team 1 (with Team 1 players' values)
          for (let i = 0; i < team2Players.length; i++) {
            const team2Player = team2Players[i];
            const team1Player = team1Players[i];
            
            const newTransferId = await generateTransferId();
            await tx.transfer_history.create({
              data: {
                id: newTransferId,
                basePlayerId: team2Player.id,
                seasonId: seasonId,
                teamId: team1Id,
                soldPrice: team1Player.transfer.soldPrice, // Takes Team 1 player's value
                acquisitionType: 'player_swap',
                acquisitionNotes: swapDescription,
                status: 'ACTIVE'
              }
            });
          }

          // No budget changes - players swap values
          // Create ledger entries for tracking only (zero amount)
          const team1LedgerId = await generateFinancialId();
          await tx.financial_ledger.create({
            data: {
              id: team1LedgerId,
              seasonTeamId: team1SeasonTeam.id,
              seasonId: seasonId,
              transactionType: 'ADJUSTMENT',
              amount: 0,
              previousBalance: team1SeasonTeam.currentBudget,
              newBalance: team1SeasonTeam.currentBudget,
              description: swapDescription,
              playerName: `Out: ${team1PlayerNames} | In: ${team2PlayerNames}`
            }
          });

          const team2LedgerId = await generateFinancialId();
          await tx.financial_ledger.create({
            data: {
              id: team2LedgerId,
              seasonTeamId: team2SeasonTeam.id,
              seasonId: seasonId,
              transactionType: 'ADJUSTMENT',
              amount: 0,
              previousBalance: team2SeasonTeam.currentBudget,
              newBalance: team2SeasonTeam.currentBudget,
              description: swapDescription,
              playerName: `Out: ${team2PlayerNames} | In: ${team1PlayerNames}`
            }
          });

          // Build value swap details
          const valueSwaps = [];
          for (let i = 0; i < team1Players.length; i++) {
            valueSwaps.push({
              team1Player: team1Players[i].name,
              team1OldValue: team1Players[i].transfer.soldPrice,
              team1NewValue: team2Players[i].transfer.soldPrice,
              team2Player: team2Players[i].name,
              team2OldValue: team2Players[i].transfer.soldPrice,
              team2NewValue: team1Players[i].transfer.soldPrice
            });
          }

          successfulSwaps.push({
            swapType,
            team1: {
              id: team1Id,
              name: team1SeasonTeam.team.name,
              playersOut: team1PlayerNames,
              playersIn: team2PlayerNames
            },
            team2: {
              id: team2Id,
              name: team2SeasonTeam.team.name,
              playersOut: team2PlayerNames,
              playersIn: team1PlayerNames
            },
            valueSwaps
          });
        } catch (error) {
          errors.push({
            swap,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { successfulSwaps, errors };
    });

    return NextResponse.json({
      success: true,
      swapped: results.successfulSwaps.length,
      errors: results.errors.length,
      details: results
    });
  } catch (error) {
    console.error('Swap error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to swap players' },
      { status: 500 }
    );
  }
}
