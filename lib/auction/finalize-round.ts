import { prisma } from '@/lib/prisma';
import { decryptBids } from './encryption';
import { calculateReserve, canAffordMultipleBids } from './reserve-calculator';

/**
 * Normal round finalization logic
 * Implements the allocation algorithm from OPTIMIZED-AUCTION-PROCESS.md
 */

export interface BidData {
  base_player_id: string;
  player_name?: string;
  amount: number;
  timestamp?: string;
}

export interface TeamBids {
  teamId: string;
  bids: BidData[];
  submitted: boolean;
}

export interface Allocation {
  teamId: string;
  basePlayerId: string;
  playerName: string;
  amount: number;
}

export interface TieInfo {
  basePlayerId: string;
  playerName: string;
  amount: number;
  tiedTeams: string[];
}

export interface FinalizationResult {
  success: boolean;
  allocations: Allocation[];
  tieDetected: boolean;
  ties?: TieInfo[];
  error?: string;
}

/**
 * Fetch and decrypt all team bids for a round
 */
async function fetchAllBids(roundId: string): Promise<TeamBids[]> {
  const teamBids = await prisma.team_round_bids.findMany({
    where: { roundId },
    select: {
      teamId: true,
      encryptedBids: true,
      submitted: true
    }
  });

  return teamBids.map(tb => {
    try {
      const decrypted = decryptBids(tb.encryptedBids);
      const parsed = JSON.parse(decrypted);
      return {
        teamId: tb.teamId,
        bids: parsed.bids || [],
        submitted: tb.submitted
      };
    } catch (error) {
      console.error(`Failed to decrypt bids for team ${tb.teamId}:`, error);
      return {
        teamId: tb.teamId,
        bids: [],
        submitted: tb.submitted
      };
    }
  });
}

/**
 * Build a map of player -> bids
 */
function buildPlayerBidsMap(teamBids: TeamBids[]): Map<string, Array<{ teamId: string; amount: number }>> {
  const playerBidsMap = new Map<string, Array<{ teamId: string; amount: number }>>();

  for (const tb of teamBids) {
    if (!tb.submitted) continue; // Only process submitted bids

    for (const bid of tb.bids) {
      if (!playerBidsMap.has(bid.base_player_id)) {
        playerBidsMap.set(bid.base_player_id, []);
      }
      playerBidsMap.get(bid.base_player_id)!.push({
        teamId: tb.teamId,
        amount: bid.amount
      });
    }
  }

  return playerBidsMap;
}

/**
 * Find highest bid for a player
 * Returns null if there's a tie
 */
function findHighestBid(
  bids: Array<{ teamId: string; amount: number }>
): { teamId: string; amount: number } | null {
  if (bids.length === 0) return null;

  // Sort by amount descending
  const sorted = [...bids].sort((a, b) => b.amount - a.amount);

  // Check for tie
  if (sorted.length > 1 && sorted[0].amount === sorted[1].amount) {
    return null; // Tie detected
  }

  return sorted[0];
}

/**
 * Allocate players to submitted teams
 */
async function allocateToSubmittedTeams(
  playerBidsMap: Map<string, Array<{ teamId: string; amount: number }>>,
  seasonId: string
): Promise<{ allocations: Allocation[]; ties: TieInfo[] }> {
  const allocations: Allocation[] = [];
  const ties: TieInfo[] = [];
  const allocatedTeams = new Set<string>();
  const allocatedPlayers = new Set<string>();

  // Get player names for display
  const allPlayerIds = Array.from(playerBidsMap.keys());
  const players = await prisma.base_players.findMany({
    where: { id: { in: allPlayerIds } },
    select: { id: true, name: true }
  });
  const playerNames = new Map(players.map(p => [p.id, p.name]));

  while (true) {
    let foundAllocation = false;

    // Find highest bid among unallocated players and teams
    let highestBid: { teamId: string; amount: number; playerId: string } | null = null;

    for (const [playerId, bids] of playerBidsMap.entries()) {
      if (allocatedPlayers.has(playerId)) continue;

      // Filter out allocated teams
      const availableBids = bids.filter(b => !allocatedTeams.has(b.teamId));
      if (availableBids.length === 0) continue;

      // Find highest bid for this player
      const highest = findHighestBid(availableBids);

      if (highest === null) {
        // Tie detected
        const tiedAmount = availableBids[0].amount;
        const tiedTeams = availableBids
          .filter(b => b.amount === tiedAmount)
          .map(b => b.teamId);

        ties.push({
          basePlayerId: playerId,
          playerName: playerNames.get(playerId) || playerId,
          amount: tiedAmount,
          tiedTeams
        });

        // Mark player as allocated (pending tiebreaker)
        allocatedPlayers.add(playerId);
        continue;
      }

      // Check if this is the highest bid overall
      if (!highestBid || highest.amount > highestBid.amount) {
        highestBid = {
          teamId: highest.teamId,
          amount: highest.amount,
          playerId
        };
      }
    }

    if (!highestBid) break; // No more allocations possible

    // Allocate player to team
    allocations.push({
      teamId: highestBid.teamId,
      basePlayerId: highestBid.playerId,
      playerName: playerNames.get(highestBid.playerId) || highestBid.playerId,
      amount: highestBid.amount
    });

    allocatedTeams.add(highestBid.teamId);
    allocatedPlayers.add(highestBid.playerId);
    foundAllocation = true;
  }

  return { allocations, ties };
}

/**
 * Handle non-submitted teams (Phase-based allocation)
 */
async function handleNonSubmittedTeams(
  teamBids: TeamBids[],
  seasonId: string,
  roundNumber: number,
  position?: string
): Promise<Allocation[]> {
  const allocations: Allocation[] = [];

  // Determine phase based on round number
  // Phase 1: Rounds 1-5, Phase 2: Rounds 6-10, Phase 3: Rounds 11+
  let phase = 1;
  if (roundNumber >= 11) phase = 3;
  else if (roundNumber >= 6) phase = 2;

  // Phase 2: No forced allocation
  if (phase === 2) {
    return allocations;
  }

  // Get non-submitted teams
  const nonSubmittedTeams = teamBids.filter(tb => !tb.submitted);

  for (const tb of nonSubmittedTeams) {
    // Check if team needs players
    const squadSize = await prisma.transfer_history.count({
      where: {
        teamId: tb.teamId,
        seasonId
      }
    });

    const minSquadSize = 16;
    if (squadSize >= minSquadSize) continue; // Team has enough players

    // Get team budget
    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId,
          teamId: tb.teamId
        }
      },
      select: { currentBudget: true }
    });

    if (!seasonTeam) continue;

    // Calculate forced allocation price (average or minimum)
    const minPlayerPrice = 5000;
    const allBids = teamBids
      .filter(t => t.submitted)
      .flatMap(t => t.bids.map(b => b.amount));
    
    const avgPrice = allBids.length > 0
      ? Math.round(allBids.reduce((sum, b) => sum + b, 0) / allBids.length)
      : minPlayerPrice;
    
    const forcedPrice = Math.max(avgPrice, minPlayerPrice);

    // Check if team can afford
    const reserve = calculateReserve(seasonTeam.currentBudget, squadSize, minSquadSize, minPlayerPrice);
    if (forcedPrice > reserve.availableBudget) continue;

    // Find available player from position pool or team's bids
    let availablePlayer: { id: string; name: string } | null = null;

    // Try to allocate from team's bids first
    if (tb.bids.length > 0) {
      const playerIds = tb.bids.map(b => b.base_player_id);
      const available = await prisma.base_players.findFirst({
        where: {
          id: { in: playerIds },
          transferHistory: {
            none: { seasonId }
          }
        },
        select: { id: true, name: true }
      });
      availablePlayer = available;
    }

    // If no player from bids, try position pool
    if (!availablePlayer && position) {
      const available = await prisma.seasonal_player_stats.findFirst({
        where: {
          seasonId,
          position,
          basePlayer: {
            transferHistory: {
              none: { seasonId }
            }
          }
        },
        select: {
          basePlayerId: true,
          basePlayer: {
            select: { name: true }
          }
        },
        orderBy: {
          overallRating: 'asc' // Lowest rated available
        }
      });

      if (available) {
        availablePlayer = {
          id: available.basePlayerId,
          name: available.basePlayer.name
        };
      }
    }

    if (availablePlayer) {
      allocations.push({
        teamId: tb.teamId,
        basePlayerId: availablePlayer.id,
        playerName: availablePlayer.name,
        amount: forcedPrice
      });
    }
  }

  return allocations;
}

/**
 * Finalize a normal round
 */
export async function finalizeRound(roundId: string): Promise<FinalizationResult> {
  try {
    // 1. Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        seasonId: true,
        roundNumber: true,
        position: true,
        status: true
      }
    });

    if (!round) {
      return {
        success: false,
        allocations: [],
        tieDetected: false,
        error: 'Round not found'
      };
    }

    if (round.status === 'completed') {
      return {
        success: false,
        allocations: [],
        tieDetected: false,
        error: 'Round already finalized'
      };
    }

    // 2. Fetch all team bids
    const teamBids = await fetchAllBids(roundId);

    // 3. Build player bids map (submitted teams only)
    const playerBidsMap = buildPlayerBidsMap(teamBids);

    // 4. Allocate to submitted teams
    const { allocations: submittedAllocations, ties } = await allocateToSubmittedTeams(
      playerBidsMap,
      round.seasonId
    );

    // 5. Check for ties
    if (ties.length > 0) {
      return {
        success: false,
        allocations: [],
        tieDetected: true,
        ties,
        error: 'Tiebreaker required'
      };
    }

    // 6. Handle non-submitted teams (Phase 1 & 3 only)
    const forcedAllocations = await handleNonSubmittedTeams(
      teamBids,
      round.seasonId,
      round.roundNumber,
      round.position || undefined
    );

    // 7. Combine all allocations
    const allAllocations = [...submittedAllocations, ...forcedAllocations];

    // 8. Validate budgets
    const budgetValidation = await validateAllocations(allAllocations, round.seasonId);
    if (!budgetValidation.valid) {
      return {
        success: false,
        allocations: [],
        tieDetected: false,
        error: `Budget validation failed: ${budgetValidation.errors.join(', ')}`
      };
    }

    return {
      success: true,
      allocations: allAllocations,
      tieDetected: false
    };
  } catch (error) {
    console.error('Finalization error:', error);
    return {
      success: false,
      allocations: [],
      tieDetected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate allocations against team budgets
 */
async function validateAllocations(
  allocations: Allocation[],
  seasonId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Group allocations by team
  const teamAllocations = new Map<string, Allocation[]>();
  for (const alloc of allocations) {
    if (!teamAllocations.has(alloc.teamId)) {
      teamAllocations.set(alloc.teamId, []);
    }
    teamAllocations.get(alloc.teamId)!.push(alloc);
  }

  // Validate each team
  for (const [teamId, teamAllocs] of teamAllocations.entries()) {
    // Get team budget and squad size
    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: { seasonId, teamId }
      },
      select: { currentBudget: true }
    });

    if (!seasonTeam) {
      errors.push(`Team ${teamId} not found in season`);
      continue;
    }

    const squadSize = await prisma.transfer_history.count({
      where: { teamId, seasonId }
    });

    // Check if team can afford all allocations
    const bidAmounts = teamAllocs.map(a => a.amount);
    const canAfford = canAffordMultipleBids(
      bidAmounts,
      seasonTeam.currentBudget,
      squadSize
    );

    if (!canAfford) {
      errors.push(
        `Team ${teamId} cannot afford allocations (total: ${bidAmounts.reduce((s, a) => s + a, 0)})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Apply finalization results to database
 */
export async function applyFinalizationResults(
  roundId: string,
  allocations: Allocation[]
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
            description: `Round ${roundId} player purchases`
          }
        });
      }
    }

    // 4. Update round status
    await tx.rounds.update({
      where: { id: roundId },
      data: { status: 'completed' }
    });
  });
}
