import { prisma } from '@/lib/prisma'
import { generateTransferId, generateFinancialId } from '@/lib/id-generator';
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
  acquisitionType: 'bid_won' | 'auto_assigned' | 'tiebreaker_won';
  acquisitionNotes?: string;
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
  resuming?: boolean; // Indicates if this is resuming from a previous tiebreaker
}

interface FinalizationState {
  allocatedTeams: string[];
  allocatedPlayers: string[];
  processedAllocations: Allocation[];
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
      amount: highestBid.amount,
      acquisitionType: 'bid_won',
      acquisitionNotes: `Won with highest bid of £${highestBid.amount.toLocaleString()}`
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
        amount: avgPrice,
        acquisitionType: 'auto_assigned',
        acquisitionNotes: `Auto-assigned (team did not submit bids). Price averaged from ${submittedAllocations.length} winning bid(s) at £${avgPrice.toLocaleString()}`
      });
      
      console.log(`      ✅ Assigned ${availablePlayer.name} at £${avgPrice.toLocaleString()}\n`);
    } else {
      console.log(`      ⚠️  No available players found\n`);
    }
  }

  return allocations;
}

/**
 * Finalize a normal round with sequential tiebreaker resolution
 */
export async function finalizeRound(roundId: string): Promise<FinalizationResult> {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 STARTING ROUND FINALIZATION');
  console.log('='.repeat(80));
  console.log(`Round ID: ${roundId}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // 1. Get round details and check for existing finalization state
    console.log('📋 Step 1: Fetching round details...');
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        seasonId: true,
        roundNumber: true,
        position: true,
        status: true,
        finalizationState: true
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
    console.log(`   ✓ Status: ${round.status}`);

    if (round.status === 'completed') {
      console.log('⚠️  Round already finalized\n');
      return {
        success: false,
        allocations: [],
        tieDetected: false,
        error: 'Round already finalized'
      };
    }

    // 2. Check if resuming from previous tiebreaker
    let allocatedTeams = new Set<string>();
    let allocatedPlayers = new Set<string>();
    let existingAllocations: Allocation[] = [];
    let isResuming = false;

    if (round.finalizationState) {
      const state = round.finalizationState as FinalizationState;
      allocatedTeams = new Set(state.allocatedTeams || []);
      allocatedPlayers = new Set(state.allocatedPlayers || []);
      existingAllocations = state.processedAllocations || [];
      isResuming = true;
      
      console.log(`   🔄 RESUMING from previous state`);
      console.log(`   ✓ Already allocated teams: ${allocatedTeams.size}`);
      console.log(`   ✓ Already allocated players: ${allocatedPlayers.size}`);
      console.log(`   ✓ Existing allocations: ${existingAllocations.length}\n`);
    } else {
      console.log('   ✓ Starting fresh finalization\n');
    }

    // 3. Fetch all team bids
    console.log('📦 Step 2: Fetching and decrypting team bids...');
    const teamBids = await fetchAllBids(roundId);
    const submittedCount = teamBids.filter(tb => tb.submitted).length;
    const draftCount = teamBids.filter(tb => !tb.submitted).length;
    
    console.log(`   ✓ Total teams with bids: ${teamBids.length}`);
    console.log(`   ✓ Submitted bids: ${submittedCount}`);
    console.log(`   ✓ Draft/Not submitted: ${draftCount}\n`);

    // 4. Build player bids map (submitted teams only)
    console.log('🗺️  Step 3: Building player bids map...');
    const playerBidsMap = buildPlayerBidsMap(teamBids);
    console.log(`   ✓ Players with bids: ${playerBidsMap.size}`);

    // 5. Filter out already allocated teams and players
    if (isResuming) {
      console.log('   🔍 Filtering out already allocated teams and players...');
      for (const [playerId, bids] of Array.from(playerBidsMap.entries())) {
        if (allocatedPlayers.has(playerId)) {
          playerBidsMap.delete(playerId);
          continue;
        }

        // Remove allocated teams from this player's bids
        const filteredBids = bids.filter(b => !allocatedTeams.has(b.teamId));
        if (filteredBids.length === 0) {
          playerBidsMap.delete(playerId);
        } else {
          playerBidsMap.set(playerId, filteredBids);
        }
      }
      console.log(`   ✓ Remaining players to process: ${playerBidsMap.size}\n`);
    } else {
      console.log('');
    }

    // Log bid details
    if (playerBidsMap.size > 0) {
      console.log('📊 Bid Details:');
      for (const [playerId, bids] of playerBidsMap.entries()) {
        const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);
        console.log(`   Player ${playerId}:`);
        sortedBids.forEach((bid, idx) => {
          console.log(`      ${idx + 1}. Team ${bid.teamId}: £${bid.amount.toLocaleString()}`);
        });
      }
      console.log('');
    }

    // 6. Process bids ONE AT A TIME using GLOBAL HIGHEST BID FIRST approach
    console.log('🎲 Step 4: Processing bids (highest bid first globally)...');
    
    // Collect ALL bids into a single array
    interface GlobalBid {
      playerId: string;
      playerName: string;
      teamId: string;
      amount: number;
    }
    
    const allBids: GlobalBid[] = [];
    const playerNames = new Map<string, string>();
    
    // Get player names
    const allPlayerIds = Array.from(playerBidsMap.keys());
    if (allPlayerIds.length > 0) {
      const players = await prisma.base_players.findMany({
        where: { id: { in: allPlayerIds } },
        select: { id: true, name: true }
      });
      players.forEach(p => playerNames.set(p.id, p.name));
    }
    
    // Collect all bids
    for (const [playerId, bids] of playerBidsMap.entries()) {
      for (const bid of bids) {
        allBids.push({
          playerId,
          playerName: playerNames.get(playerId) || playerId,
          teamId: bid.teamId,
          amount: bid.amount
        });
      }
    }
    
    // Sort ALL bids by amount descending (HIGHEST FIRST)
    allBids.sort((a, b) => b.amount - a.amount);
    
    console.log(`   📊 Total bids collected: ${allBids.length}`);
    console.log(`   🔝 Highest bid: £${allBids[0]?.amount.toLocaleString() || 0}`);
    console.log(`   🔻 Lowest bid: £${allBids[allBids.length - 1]?.amount.toLocaleString() || 0}\n`);
    
    // Get total teams in season to know when to stop
    const totalTeams = await prisma.season_teams.count({
      where: { seasonId: round.seasonId }
    });
    
    console.log(`   🎯 Target: Allocate to ${totalTeams} teams\n`);
    
    // Process bids from highest to lowest
    for (let i = 0; i < allBids.length; i++) {
      const currentBid = allBids[i];
      
      // Skip if player already allocated
      if (allocatedPlayers.has(currentBid.playerId)) {
        continue;
      }
      
      // Skip if team already allocated
      if (allocatedTeams.has(currentBid.teamId)) {
        continue;
      }
      
      // Check for tie: Find all bids for this player at this exact amount from non-allocated teams
      const tiedBids = allBids.filter(b => 
        b.playerId === currentBid.playerId && 
        b.amount === currentBid.amount &&
        !allocatedTeams.has(b.teamId)
      );
      
      if (tiedBids.length > 1) {
        // TIE DETECTED - STOP HERE AND CREATE ONE TIEBREAKER
        console.log(`   ⚠️  TIE DETECTED for ${currentBid.playerName}`);
        console.log(`      Amount: £${currentBid.amount.toLocaleString()}`);
        console.log(`      Tied teams: ${tiedBids.map(b => b.teamId).join(', ')}`);
        console.log(`   ⏸️  PAUSING finalization - saving state...\n`);
        
        // Save current state
        await prisma.rounds.update({
          where: { id: roundId },
          data: {
            finalizationState: {
              allocatedTeams: Array.from(allocatedTeams),
              allocatedPlayers: Array.from(allocatedPlayers),
              processedAllocations: existingAllocations
            }
          }
        });
        
        console.log('✅ State saved - ready for tiebreaker creation\n');
        
        // Return with tie info (will create ONE tiebreaker)
        return {
          success: false,
          allocations: existingAllocations,
          tieDetected: true,
          resuming: isResuming,
          ties: [{
            basePlayerId: currentBid.playerId,
            playerName: currentBid.playerName,
            amount: currentBid.amount,
            tiedTeams: tiedBids.map(b => b.teamId)
          }]
        };
      }
      
      // No tie - Allocate this player to this team
      console.log(`   ✓ Allocating ${currentBid.playerName} → Team ${currentBid.teamId} (£${currentBid.amount.toLocaleString()})`);
      
      existingAllocations.push({
        teamId: currentBid.teamId,
        basePlayerId: currentBid.playerId,
        playerName: currentBid.playerName,
        amount: currentBid.amount,
        acquisitionType: 'bid_won',
        acquisitionNotes: `Won with highest bid of £${currentBid.amount.toLocaleString()}`
      });
      
      allocatedTeams.add(currentBid.teamId);
      allocatedPlayers.add(currentBid.playerId);
      
      // Check if all teams have been allocated
      if (allocatedTeams.size >= totalTeams) {
        console.log(`\n   🎉 All ${totalTeams} teams have been allocated a player!`);
        break;
      }
    }

    console.log(`\n   ✓ Submitted team allocations: ${existingAllocations.length}\n`);

    // 7. Handle non-submitted teams (only if not resuming)
    let forcedAllocations: Allocation[] = [];
    if (!isResuming) {
      console.log('🎰 Step 5: Handling non-submitted teams...');
      forcedAllocations = await handleNonSubmittedTeams(
        teamBids,
        round.seasonId,
        round.roundNumber,
        round.position || undefined,
        existingAllocations
      );

      console.log(`   ✓ Random allocations: ${forcedAllocations.length}\n`);

      if (forcedAllocations.length > 0) {
        console.log('🎲 Random Allocations (Non-submitted teams):');
        forcedAllocations.forEach((alloc, idx) => {
          console.log(`   ${idx + 1}. ${alloc.playerName} → Team ${alloc.teamId} for £${alloc.amount.toLocaleString()}`);
        });
        console.log('');
      }
    } else {
      console.log('🎰 Step 5: Skipping non-submitted teams (resuming from tiebreaker)\n');
    }

    // 8. Combine all allocations
    const allAllocations = [...existingAllocations, ...forcedAllocations];
    console.log(`📊 Total allocations: ${allAllocations.length}\n`);

    // 9. Validate budgets
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

    // 10. Clear finalization state (finalization complete)
    await prisma.rounds.update({
      where: { id: roundId },
      data: {
        finalizationState: null
      }
    });

    console.log('✅ FINALIZATION SUCCESSFUL - No more ties');
    console.log('='.repeat(80) + '\n');

    return {
      success: true,
      allocations: allAllocations,
      tieDetected: false,
      resuming: isResuming
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

  // Calculate team updates and collect player names
  const teamUpdates = new Map<string, number>();
  const teamPlayerNames = new Map<string, string[]>();
  for (const alloc of allocations) {
    const current = teamUpdates.get(alloc.teamId) || 0;
    teamUpdates.set(alloc.teamId, current + alloc.amount);
    
    const playerNames = teamPlayerNames.get(alloc.teamId) || [];
    playerNames.push(alloc.playerName);
    teamPlayerNames.set(alloc.teamId, playerNames);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Insert transfer history records
    console.log('📝 Step 1: Creating transfer history records...');
    
    // Generate transfer IDs for all allocations
    const transferRecords = await Promise.all(
      allocations.map(async (alloc) => ({
        id: await generateTransferId(),
        basePlayerId: alloc.basePlayerId,
        seasonId: round.seasonId,
        teamId: alloc.teamId,
        roundId: roundId,
        soldPrice: alloc.amount,
        acquisitionType: alloc.acquisitionType,
        acquisitionNotes: alloc.acquisitionNotes || null
      }))
    );

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
        const ledgerId = await generateFinancialId();
        const playerNames = teamPlayerNames.get(teamId) || [];
        await tx.financial_ledger.create({
          data: {
            id: ledgerId,
            seasonTeamId: seasonTeam.id,
            seasonId: round.seasonId,
            transactionType: 'PLAYER_PURCHASE',
            amount: -totalSpent,
            previousBalance: seasonTeam.currentBudget,
            newBalance: newBudget,
            description: `Round ${roundId} player purchases`,
            playerName: playerNames.join(', ')
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
