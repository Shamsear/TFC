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
 * Handle non-submitted teams - assign random players at average winning price
 */
async function handleNonSubmittedTeams(
  teamBids: TeamBids[],
  seasonId: string,
  roundNumber: number,
  position: string | undefined,
  submittedAllocations: Allocation[]
): Promise<Allocation[]> {
  const allocations: Allocation[] = [];

  // Calculate average price from WINNING BIDS (submitted allocations)
  const minPlayerPrice = 10; // Minimum bid amount
  const avgPrice = submittedAllocations.length > 0
    ? Math.round(submittedAllocations.reduce((sum, alloc) => sum + alloc.amount, 0) / submittedAllocations.length)
    : minPlayerPrice;

  console.log(`   💵 Average winning price from ${submittedAllocations.length} allocations: £${avgPrice.toLocaleString()}`);

  // Get ALL teams in the season
  const allSeasonTeams = await prisma.season_teams.findMany({
    where: { seasonId },
    select: { teamId: true }
  });

  // Get teams that submitted bids
  const submittedTeamIds = new Set(teamBids.filter(tb => tb.submitted).map(tb => tb.teamId));

  // Find teams that didn't submit
  const nonSubmittedTeamIds = allSeasonTeams
    .map(st => st.teamId)
    .filter(teamId => !submittedTeamIds.has(teamId));
  
  if (nonSubmittedTeamIds.length === 0) {
    console.log('   ℹ️  No non-submitted teams to process');
    return allocations;
  }

  console.log(`   🎲 Processing ${nonSubmittedTeamIds.length} non-submitted team(s)...\n`);

  for (const teamId of nonSubmittedTeamIds) {
    console.log(`   Team ${teamId}:`);
    
    // Get team budget
    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId,
          teamId: teamId
        }
      },
      select: { currentBudget: true }
    });

    if (!seasonTeam) {
      console.log(`      ⚠️  Team not found in season, skipping`);
      continue;
    }

    console.log(`      Budget: £${seasonTeam.currentBudget.toLocaleString()}`);

    // Check if team can afford average price
    const squadSize = await prisma.transfer_history.count({
      where: {
        teamId: teamId,
        seasonId
      }
    });

    console.log(`      Squad size: ${squadSize}`);

    const reserve = calculateReserve(seasonTeam.currentBudget, squadSize, 16, minPlayerPrice);
    console.log(`      Available budget: £${reserve.availableBudget.toLocaleString()}`);
    
    if (avgPrice > reserve.availableBudget) {
      console.log(`      ❌ Cannot afford average price £${avgPrice.toLocaleString()}`);
      continue;
    }

    // Get already allocated player IDs to avoid duplicates
    const allocatedPlayerIds = new Set([
      ...submittedAllocations.map(a => a.basePlayerId),
      ...allocations.map(a => a.basePlayerId)
    ]);

    // Find available player from the round's position
    let availablePlayer: { id: string; name: string } | null = null;

    if (position) {
      console.log(`      🔍 Searching for available ${position} players...`);
      // Get random available player from position pool
      const availablePlayers = await prisma.seasonal_player_stats.findMany({
        where: {
          seasonId,
          position,
          basePlayerId: {
            notIn: Array.from(allocatedPlayerIds)
          },
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
          },
          overallRating: true
        },
        orderBy: {
          overallRating: 'desc' // Get better players first
        },
        take: 10 // Get top 10 available
      });

      console.log(`      📊 Found ${availablePlayers.length} available players`);

      if (availablePlayers.length > 0) {
        // Pick a random player from available pool
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        const selected = availablePlayers[randomIndex];
        availablePlayer = {
          id: selected.basePlayerId,
          name: selected.basePlayer.name
        };
      }
    } else {
      console.log(`      🔍 Searching for available players (all positions)...`);
      // No position filter - get any available player
      const availablePlayers = await prisma.seasonal_player_stats.findMany({
        where: {
          seasonId,
          basePlayerId: {
            notIn: Array.from(allocatedPlayerIds)
          },
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
          },
          overallRating: true
        },
        orderBy: {
          overallRating: 'desc'
        },
        take: 10
      });

      console.log(`      📊 Found ${availablePlayers.length} available players`);

      if (availablePlayers.length > 0) {
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        const selected = availablePlayers[randomIndex];
        availablePlayer = {
          id: selected.basePlayerId,
          name: selected.basePlayer.name
        };
      }
    }

    if (availablePlayer) {
      allocations.push({
        teamId: teamId,
        basePlayerId: availablePlayer.id,
        playerName: availablePlayer.name,
        amount: avgPrice
      });
      
      console.log(`      ✅ Assigned ${availablePlayer.name} at £${avgPrice.toLocaleString()}\n`);
    } else {
      console.log(`      ⚠️  No available players found\n`);
    }
  }

  return allocations;
}

/**
 * Finalize a normal round
 */
export async function finalizeRound(roundId: string): Promise<FinalizationResult> {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 STARTING ROUND FINALIZATION');
  console.log('='.repeat(80));
  console.log(`Round ID: ${roundId}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // 1. Get round details
    console.log('📋 Step 1: Fetching round details...');
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
      console.log('❌ ERROR: Round not found\n');
      return {
        success: false,
        allocations: [],
        tieDetected: false,
        error: 'Round not found'
      };
    }

    console.log(`   ✓ Round ${round.roundNumber} found`);
    console.log(`   ✓ Season: ${round.seasonId}`);
    console.log(`   ✓ Position: ${round.position || 'All positions'}`);
    console.log(`   ✓ Status: ${round.status}\n`);

    if (round.status === 'completed') {
      console.log('⚠️  Round already finalized\n');
      return {
        success: false,
        allocations: [],
        tieDetected: false,
        error: 'Round already finalized'
      };
    }

    // 2. Fetch all team bids
    console.log('📦 Step 2: Fetching and decrypting team bids...');
    const teamBids = await fetchAllBids(roundId);
    const submittedCount = teamBids.filter(tb => tb.submitted).length;
    const draftCount = teamBids.filter(tb => !tb.submitted).length;
    
    console.log(`   ✓ Total teams with bids: ${teamBids.length}`);
    console.log(`   ✓ Submitted bids: ${submittedCount}`);
    console.log(`   ✓ Draft/Not submitted: ${draftCount}\n`);

    // 3. Build player bids map (submitted teams only)
    console.log('🗺️  Step 3: Building player bids map...');
    const playerBidsMap = buildPlayerBidsMap(teamBids);
    console.log(`   ✓ Players with bids: ${playerBidsMap.size}\n`);

    // Log bid details
    console.log('📊 Bid Details:');
    for (const [playerId, bids] of playerBidsMap.entries()) {
      const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);
      console.log(`   Player ${playerId}:`);
      sortedBids.forEach((bid, idx) => {
        console.log(`      ${idx + 1}. Team ${bid.teamId}: £${bid.amount.toLocaleString()}`);
      });
    }
    console.log('');

    // 4. Allocate to submitted teams
    console.log('🎲 Step 4: Allocating players to submitted teams...');
    const { allocations: submittedAllocations, ties } = await allocateToSubmittedTeams(
      playerBidsMap,
      round.seasonId
    );

    console.log(`   ✓ Successful allocations: ${submittedAllocations.length}`);
    console.log(`   ✓ Ties detected: ${ties.length}\n`);

    if (submittedAllocations.length > 0) {
      console.log('✅ Submitted Team Allocations:');
      submittedAllocations.forEach((alloc, idx) => {
        console.log(`   ${idx + 1}. ${alloc.playerName} → Team ${alloc.teamId} for £${alloc.amount.toLocaleString()}`);
      });
      console.log('');
    }

    // 5. Check for ties
    if (ties.length > 0) {
      console.log('⚠️  TIES DETECTED - Tiebreaker Required:');
      ties.forEach((tie, idx) => {
        console.log(`   ${idx + 1}. ${tie.playerName} - £${tie.amount.toLocaleString()}`);
        console.log(`      Tied teams: ${tie.tiedTeams.join(', ')}`);
      });
      console.log('\n❌ Finalization halted - resolve ties first\n');
      return {
        success: false,
        allocations: [],
        tieDetected: true,
        ties,
        error: 'Tiebreaker required'
      };
    }

    // 6. Handle non-submitted teams
    console.log('🎰 Step 5: Handling non-submitted teams...');
    const forcedAllocations = await handleNonSubmittedTeams(
      teamBids,
      round.seasonId,
      round.roundNumber,
      round.position || undefined,
      submittedAllocations
    );

    console.log(`   ✓ Random allocations: ${forcedAllocations.length}\n`);

    if (forcedAllocations.length > 0) {
      console.log('🎲 Random Allocations (Non-submitted teams):');
      forcedAllocations.forEach((alloc, idx) => {
        console.log(`   ${idx + 1}. ${alloc.playerName} → Team ${alloc.teamId} for £${alloc.amount.toLocaleString()}`);
      });
      console.log('');
    }

    // 7. Combine all allocations
    const allAllocations = [...submittedAllocations, ...forcedAllocations];
    console.log(`📊 Total allocations: ${allAllocations.length}\n`);

    // 8. Validate budgets
    console.log('💰 Step 6: Validating team budgets...');
    const budgetValidation = await validateAllocations(allAllocations, round.seasonId);
    
    if (!budgetValidation.valid) {
      console.log('❌ Budget validation failed:');
      budgetValidation.errors.forEach(err => console.log(`   - ${err}`));
      console.log('');
      return {
        success: false,
        allocations: [],
        tieDetected: false,
        error: `Budget validation failed: ${budgetValidation.errors.join(', ')}`
      };
    }

    console.log('   ✓ All budgets validated\n');

    console.log('✅ FINALIZATION SUCCESSFUL');
    console.log('='.repeat(80) + '\n');

    return {
      success: true,
      allocations: allAllocations,
      tieDetected: false
    };
  } catch (error) {
    console.error('\n❌ FINALIZATION ERROR:', error);
    console.log('='.repeat(80) + '\n');
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
  const minPlayerPrice = 10; // Minimum bid amount

  // Group allocations by team
  const teamAllocations = new Map<string, Allocation[]>();
  for (const alloc of allocations) {
    if (!teamAllocations.has(alloc.teamId)) {
      teamAllocations.set(alloc.teamId, []);
    }
    teamAllocations.get(alloc.teamId)!.push(alloc);
  }

  console.log('   📋 Validating budgets for each team:\n');

  // Validate each team
  for (const [teamId, teamAllocs] of teamAllocations.entries()) {
    console.log(`   Team ${teamId}:`);
    
    // Get team budget and squad size
    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: { seasonId, teamId }
      },
      select: { currentBudget: true }
    });

    if (!seasonTeam) {
      const error = `Team ${teamId} not found in season`;
      console.log(`      ❌ ${error}`);
      errors.push(error);
      continue;
    }

    const squadSize = await prisma.transfer_history.count({
      where: { teamId, seasonId }
    });

    console.log(`      Current budget: £${seasonTeam.currentBudget.toLocaleString()}`);
    console.log(`      Squad size: ${squadSize}`);
    console.log(`      Allocations: ${teamAllocs.length}`);

    // Check if team can afford all allocations
    const bidAmounts = teamAllocs.map(a => a.amount);
    const totalCost = bidAmounts.reduce((s, a) => s + a, 0);
    
    console.log(`      Total cost: £${totalCost.toLocaleString()}`);
    
    const canAfford = canAffordMultipleBids(
      bidAmounts,
      seasonTeam.currentBudget,
      squadSize,
      16,
      minPlayerPrice
    );

    if (!canAfford) {
      const error = `Team ${teamId} cannot afford allocations (total: £${totalCost.toLocaleString()}, budget: £${seasonTeam.currentBudget.toLocaleString()})`;
      console.log(`      ❌ ${error}`);
      errors.push(error);
    } else {
      console.log(`      ✓ Budget validated`);
    }
    console.log('');
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
  console.log('\n' + '='.repeat(80));
  console.log('💾 APPLYING FINALIZATION RESULTS TO DATABASE');
  console.log('='.repeat(80));
  console.log(`Round ID: ${roundId}`);
  console.log(`Allocations to apply: ${allocations.length}\n`);

  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    select: { seasonId: true }
  });

  if (!round) {
    console.log('❌ ERROR: Round not found\n');
    throw new Error('Round not found');
  }

  console.log('🔄 Starting database transaction...\n');

  // Pre-fetch all season teams to avoid queries inside transaction
  const teamIds = Array.from(new Set(allocations.map(a => a.teamId)));
  const seasonTeams = await prisma.season_teams.findMany({
    where: {
      seasonId: round.seasonId,
      teamId: { in: teamIds }
    },
    select: {
      id: true,
      teamId: true,
      currentBudget: true
    }
  });

  const seasonTeamMap = new Map(seasonTeams.map(st => [st.teamId, st]));

  // Calculate team updates
  const teamUpdates = new Map<string, number>();
  for (const alloc of allocations) {
    const current = teamUpdates.get(alloc.teamId) || 0;
    teamUpdates.set(alloc.teamId, current + alloc.amount);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Insert transfer history records
    console.log('📝 Step 1: Creating transfer history records...');
    const transferRecords = allocations.map(alloc => ({
      id: `SSPSLTH${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      basePlayerId: alloc.basePlayerId,
      seasonId: round.seasonId,
      teamId: alloc.teamId,
      soldPrice: alloc.amount
    }));

    await tx.transfer_history.createMany({
      data: transferRecords
    });

    for (const alloc of allocations) {
      console.log(`   ✓ ${alloc.playerName} → Team ${alloc.teamId} (£${alloc.amount.toLocaleString()})`);
    }
    console.log('');

    // 2. Update team budgets and create ledger entries
    console.log('💰 Step 2: Updating team budgets...');
    
    for (const [teamId, totalSpent] of teamUpdates.entries()) {
      const seasonTeam = seasonTeamMap.get(teamId);

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

        console.log(`   ✓ Team ${teamId}: £${seasonTeam.currentBudget.toLocaleString()} → £${newBudget.toLocaleString()} (-£${totalSpent.toLocaleString()})`);

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
    console.log('');

    // 4. Update round status
    console.log('🏁 Step 3: Marking round as completed...');
    await tx.rounds.update({
      where: { id: roundId },
      data: { status: 'completed' }
    });
    console.log('   ✓ Round status updated to completed\n');
  }, {
    timeout: 30000 // 30 second timeout
  });

  console.log('✅ DATABASE TRANSACTION COMPLETED SUCCESSFULLY');
  console.log('='.repeat(80) + '\n');
}
