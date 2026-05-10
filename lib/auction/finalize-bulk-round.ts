import { prisma } from '@/lib/prisma';
import { calculateReserve } from './reserve-calculator';

/**
 * Bulk round finalization logic
 */

export interface BulkSelection {
  teamId: string;
  playerIds: string[];
  submitted: boolean;
}

export interface BulkAllocation {
  teamId: string;
  basePlayerId: string;
  playerName: string;
  amount: number;
}

export interface BulkConflict {
  basePlayerId: string;
  playerName: string;
  teamIds: string[];
}

export interface BulkFinalizationResult {
  success: boolean;
  allocations: BulkAllocation[];
  conflicts: BulkConflict[];
  error?: string;
}

/**
 * Fetch all team selections for a bulk round
 */
async function fetchAllSelections(roundId: string): Promise<BulkSelection[]> {
  const selections = await prisma.bulk_round_selections.findMany({
    where: { roundId },
    select: {
      teamId: true,
      selectedPlayers: true,
      submitted: true
    }
  });

  return selections.map(s => {
    try {
      const parsed = JSON.parse(s.selectedPlayers);
      return {
        teamId: s.teamId,
        playerIds: parsed.players || [],
        submitted: s.submitted
      };
    } catch (error) {
      console.error(`Failed to parse selections for team ${s.teamId}:`, error);
      return {
        teamId: s.teamId,
        playerIds: [],
        submitted: s.submitted
      };
    }
  });
}

/**
 * Build player -> teams map
 */
function buildPlayerTeamsMap(
  selections: BulkSelection[]
): Map<string, string[]> {
  const playerTeamsMap = new Map<string, string[]>();

  for (const selection of selections) {
    if (!selection.submitted) continue;

    for (const playerId of selection.playerIds) {
      if (!playerTeamsMap.has(playerId)) {
        playerTeamsMap.set(playerId, []);
      }
      playerTeamsMap.get(playerId)!.push(selection.teamId);
    }
  }

  return playerTeamsMap;
}

/**
 * Separate single bidders from conflicts
 */
function separateAllocationsAndConflicts(
  playerTeamsMap: Map<string, string[]>
): {
  singleBidders: Map<string, string>;
  conflicts: Map<string, string[]>;
} {
  const singleBidders = new Map<string, string>();
  const conflicts = new Map<string, string[]>();

  for (const [playerId, teamIds] of playerTeamsMap.entries()) {
    if (teamIds.length === 1) {
      singleBidders.set(playerId, teamIds[0]);
    } else {
      conflicts.set(playerId, teamIds);
    }
  }

  return { singleBidders, conflicts };
}

/**
 * Validate and allocate single bidders
 */
async function allocateSingleBidders(
  singleBidders: Map<string, string>,
  seasonId: string,
  basePrice: number
): Promise<{ allocations: BulkAllocation[]; errors: string[] }> {
  const allocations: BulkAllocation[] = [];
  const errors: string[] = [];

  // Get player names
  const playerIds = Array.from(singleBidders.keys());
  const players = await prisma.base_players.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, name: true }
  });
  const playerNames = new Map(players.map(p => [p.id, p.name]));

  for (const [playerId, teamId] of singleBidders.entries()) {
    // Check if player is available
    const owned = await prisma.transfer_history.findFirst({
      where: {
        basePlayerId: playerId,
        seasonId
      }
    });

    if (owned) {
      errors.push(`Player ${playerNames.get(playerId)} is already owned`);
      continue;
    }

    // Get team budget and squad size
    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: { seasonId, teamId }
      },
      select: { currentBudget: true }
    });

    if (!seasonTeam) {
      errors.push(`Team ${teamId} not found`);
      continue;
    }

    const squadSize = await prisma.transfer_history.count({
      where: { teamId, seasonId }
    });

    // Check budget with reserves
    const reserve = calculateReserve(seasonTeam.currentBudget, squadSize);
    if (basePrice > reserve.availableBudget) {
      errors.push(
        `Team ${teamId} cannot afford ${playerNames.get(playerId)} ` +
        `(needs ${basePrice}, has ${reserve.availableBudget} available)`
      );
      continue;
    }

    // Allocate
    allocations.push({
      teamId,
      basePlayerId: playerId,
      playerName: playerNames.get(playerId) || playerId,
      amount: basePrice
    });
  }

  return { allocations, errors };
}

/**
 * Finalize a bulk round
 */
export async function finalizeBulkRound(roundId: string): Promise<BulkFinalizationResult> {
  try {
    // 1. Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        seasonId: true,
        basePrice: true,
        status: true
      }
    });

    if (!round) {
      return {
        success: false,
        allocations: [],
        conflicts: [],
        error: 'Round not found'
      };
    }

    if (round.status === 'completed') {
      return {
        success: false,
        allocations: [],
        conflicts: [],
        error: 'Round already finalized'
      };
    }

    if (!round.basePrice) {
      return {
        success: false,
        allocations: [],
        conflicts: [],
        error: 'Base price not set for bulk round'
      };
    }

    // 2. Fetch all selections
    const selections = await fetchAllSelections(roundId);

    // 3. Build player -> teams map
    const playerTeamsMap = buildPlayerTeamsMap(selections);

    // 4. Separate single bidders from conflicts
    const { singleBidders, conflicts } = separateAllocationsAndConflicts(playerTeamsMap);

    // 5. Allocate single bidders
    const { allocations, errors } = await allocateSingleBidders(
      singleBidders,
      round.seasonId,
      round.basePrice
    );

    if (errors.length > 0) {
      console.warn('Bulk allocation errors:', errors);
    }

    // 6. Build conflicts list
    const conflictsList: BulkConflict[] = [];
    const playerIds = Array.from(conflicts.keys());
    
    if (playerIds.length > 0) {
      const players = await prisma.base_players.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, name: true }
      });
      const playerNames = new Map(players.map(p => [p.id, p.name]));

      for (const [playerId, teamIds] of conflicts.entries()) {
        conflictsList.push({
          basePlayerId: playerId,
          playerName: playerNames.get(playerId) || playerId,
          teamIds
        });
      }
    }

    return {
      success: true,
      allocations,
      conflicts: conflictsList
    };
  } catch (error) {
    console.error('Bulk finalization error:', error);
    return {
      success: false,
      allocations: [],
      conflicts: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Apply bulk finalization results to database
 */
export async function applyBulkFinalizationResults(
  roundId: string,
  allocations: BulkAllocation[]
): Promise<void> {
  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    select: { seasonId: true }
  });

  if (!round) {
    throw new Error('Round not found');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Insert transfer history records
    for (const alloc of allocations) {
      await tx.transfer_history.create({
        data: {
          id: `SSPSLTH${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          basePlayerId: alloc.basePlayerId,
          seasonId: round.seasonId,
          teamId: alloc.teamId,
          soldPrice: alloc.amount
        }
      });
    }

    // 2. Update team budgets
    const teamUpdates = new Map<string, number>();
    for (const alloc of allocations) {
      const current = teamUpdates.get(alloc.teamId) || 0;
      teamUpdates.set(alloc.teamId, current + alloc.amount);
    }

    for (const [teamId, totalSpent] of teamUpdates.entries()) {
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: round.seasonId,
            teamId
          }
        }
      });

      if (seasonTeam) {
        const newBudget = seasonTeam.currentBudget - totalSpent;

        await tx.season_teams.update({
          where: {
            seasonId_teamId: {
              seasonId: round.seasonId,
              teamId
            }
          },
          data: { currentBudget: newBudget }
        });

        // 3. Insert financial ledger entry
        await tx.financial_ledger.create({
          data: {
            id: `SSPSLFL${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
            seasonTeamId: seasonTeam.id,
            seasonId: round.seasonId,
            transactionType: 'PLAYER_PURCHASE',
            amount: -totalSpent,
            previousBalance: seasonTeam.currentBudget,
            newBalance: newBudget,
            description: `Bulk round ${roundId} player purchases`
          }
        });
      }
    }

    // 4. Update round status
    // If there are conflicts, mark as pending_tiebreakers
    // Otherwise, mark as completed
    const hasConflicts = await tx.bulk_round_selections.count({
      where: { roundId }
    }) > allocations.length;

    await tx.rounds.update({
      where: { id: roundId },
      data: {
        status: hasConflicts ? 'pending_tiebreakers' : 'completed'
      }
    });
  });
}
