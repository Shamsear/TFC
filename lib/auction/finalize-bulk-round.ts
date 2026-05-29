import { prisma } from '@/lib/prisma';
import { calculateReserve } from './reserve-calculator-v2';
import { generateIds, ID_PREFIXES } from '@/lib/id-generator';

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
  roundId: string,
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
    // Check if player is available (not ACTIVE with any team)
    const owned = await prisma.transfer_history.findFirst({
      where: {
        basePlayerId: playerId,
        seasonId,
        status: 'ACTIVE'
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
      where: { 
        teamId, 
        seasonId,
        status: 'ACTIVE'
      }
    });

    // Check budget with reserves using v2
    const reserveInfo = await calculateReserve(teamId, roundId, seasonId);
    if (basePrice > reserveInfo.maxBid) {
      errors.push(
        `Team ${teamId} cannot afford ${playerNames.get(playerId)} ` +
        `(needs ${basePrice}, has ${reserveInfo.maxBid} available)`
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
  console.log('\n' + '='.repeat(80));
  console.log('🎯 STARTING BULK ROUND FINALIZATION');
  console.log('='.repeat(80));
  console.log(`Round ID: ${roundId}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // 1. Get round details
    console.log(`📋 Step 1: Fetching round details...`);
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        seasonId: true,
        basePrice: true,
        status: true
      }
    });

    if (!round) {
      console.error(`❌ Round ${roundId} not found`);
      return {
        success: false,
        allocations: [],
        conflicts: [],
        error: 'Round not found'
      };
    }

    if (round.status === 'completed') {
      console.error(`❌ Round ${roundId} already finalized`);
      return {
        success: false,
        allocations: [],
        conflicts: [],
        error: 'Round already finalized'
      };
    }

    if (!round.basePrice) {
      console.error(`❌ Base price not set for round ${roundId}`);
      return {
        success: false,
        allocations: [],
        conflicts: [],
        error: 'Base price not set for bulk round'
      };
    }

    console.log(`   ✓ Round found: seasonId=${round.seasonId}, basePrice=£${round.basePrice}, status=${round.status}`);

    // 2. Fetch all selections
    console.log(`📋 Step 2: Fetching team selections...`);
    const selections = await fetchAllSelections(roundId);
    console.log(`   ✓ Found ${selections.length} team selections`);
    
    const submittedCount = selections.filter(s => s.submitted).length;
    console.log(`   ✓ ${submittedCount} teams submitted their selections`);

    // 3. Build player -> teams map
    console.log(`📋 Step 3: Building player selection map...`);
    const playerTeamsMap = buildPlayerTeamsMap(selections);
    console.log(`   ✓ ${playerTeamsMap.size} unique players selected`);

    // 4. Separate single bidders from conflicts
    console.log(`📋 Step 4: Identifying conflicts...`);
    const { singleBidders, conflicts } = separateAllocationsAndConflicts(playerTeamsMap);
    console.log(`   ✓ ${singleBidders.size} players with single bidder (no conflict)`);
    console.log(`   ✓ ${conflicts.size} players with multiple bidders (conflict)`);

    // 5. Allocate single bidders
    console.log(`📋 Step 5: Allocating players to teams...`);
    const { allocations, errors } = await allocateSingleBidders(
      singleBidders,
      round.seasonId,
      roundId,
      round.basePrice
    );
    console.log(`   ✓ ${allocations.length} successful allocations`);

    if (errors.length > 0) {
      console.warn(`   ⚠️  ${errors.length} allocation errors (budget/availability issues)`);
      errors.forEach(err => console.warn(`      - ${err}`));
    }

    // 6. Build conflicts list
    console.log(`📋 Step 6: Building conflicts list...`);
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
      console.log(`   ✓ ${conflictsList.length} conflicts require tiebreakers`);
    } else {
      console.log(`   ✓ No conflicts - all players allocated`);
    }

    console.log(`\n✅ Bulk round finalization complete!`);
    console.log(`   📊 Summary:`);
    console.log(`      - Allocations: ${allocations.length}`);
    console.log(`      - Conflicts: ${conflictsList.length}`);
    console.log(`      - Errors: ${errors.length}`);
    console.log('='.repeat(80) + '\n');

    return {
      success: true,
      allocations,
      conflicts: conflictsList
    };
  } catch (error) {
    console.error('❌ Bulk finalization error:', error);
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
  allocations: BulkAllocation[],
  conflicts: BulkConflict[] = []
): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log(`💾 APPLYING BULK FINALIZATION RESULTS`);
  console.log('='.repeat(80));
  console.log(`Round ID: ${roundId} | Allocations: ${allocations.length} | Conflicts: ${conflicts.length}\n`);
  
  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    select: { seasonId: true }
  });

  if (!round) {
    throw new Error('Round not found');
  }

  console.log(`📋 Pre-generating IDs for ${allocations.length} allocations...`);
  
  // Pre-generate all IDs in batch outside the transaction to avoid timeout
  const transferIds = await generateIds(ID_PREFIXES.TRANSFER, allocations.length);
  console.log(`   ✓ Generated ${transferIds.length} transfer IDs in batch`);

  // Group allocations by team for batch processing
  const teamAllocations = new Map<string, BulkAllocation[]>();
  for (const alloc of allocations) {
    if (!teamAllocations.has(alloc.teamId)) {
      teamAllocations.set(alloc.teamId, []);
    }
    teamAllocations.get(alloc.teamId)!.push(alloc);
  }
  console.log(`   ✓ Grouped allocations for ${teamAllocations.size} teams`);

  // Pre-generate financial IDs in batch for each team
  const financialIds = await generateIds(ID_PREFIXES.FINANCIAL, teamAllocations.size);
  const financialIdMap = new Map<string, string>();
  let idIndex = 0;
  for (const teamId of teamAllocations.keys()) {
    financialIdMap.set(teamId, financialIds[idIndex++]);
  }
  console.log(`   ✓ Generated ${financialIds.length} financial ledger IDs in batch`);

  console.log(`\n💾 Starting database transaction...`);
  
  await prisma.$transaction(async (tx) => {
    // Check for existing transfers in this round to prevent duplicates
    console.log('   🔍 Checking for existing transfers in this round...');
    const existingTransfers = await tx.transfer_history.findMany({
      where: {
        roundId: roundId,
        seasonId: round.seasonId
      },
      select: {
        basePlayerId: true,
        teamId: true
      }
    });
    
    const existingTransferKeys = new Set(
      existingTransfers.map(t => `${t.basePlayerId}-${t.teamId}`)
    );
    
    if (existingTransfers.length > 0) {
      console.log(`      ⚠️  Found ${existingTransfers.length} existing transfer(s) in this round`);
    }
    
    // Filter out duplicate allocations
    const newAllocations = allocations.filter((alloc, index) => {
      const transferKey = `${alloc.basePlayerId}-${alloc.teamId}`;
      const isDuplicate = existingTransferKeys.has(transferKey);
      if (isDuplicate) {
        console.warn(`      ⚠️  Skipping duplicate: Player ${alloc.basePlayerId} → Team ${alloc.teamId}`);
        return false;
      }
      return true;
    });
    
    // Adjust transfer IDs array to match filtered allocations
    const newTransferIds = transferIds.slice(0, newAllocations.length);
    
    // 1. Batch insert transfer history records
    if (newAllocations.length > 0) {
      console.log(`   📝 Inserting ${newAllocations.length} transfer history records...`);
      await tx.transfer_history.createMany({
        data: newAllocations.map((alloc, index) => ({
          id: newTransferIds[index],
          basePlayerId: alloc.basePlayerId,
          seasonId: round.seasonId,
          teamId: alloc.teamId,
          soldPrice: alloc.amount,
          roundId: roundId,
          status: 'ACTIVE'
        }))
      });
      console.log(`      ✓ Transfer history records created`);
    } else {
      console.log(`      ℹ️  No new transfers to create (all were duplicates)`);
    }

    // 2. Update team budgets and create financial ledger entries
    console.log(`   💰 Updating budgets for ${teamAllocations.size} teams...`);
    let teamCount = 0;
    for (const [teamId, teamAllocs] of teamAllocations.entries()) {
      teamCount++;
      const totalSpent = teamAllocs.reduce((sum, alloc) => sum + alloc.amount, 0);
      const playerNames = teamAllocs.map(alloc => alloc.playerName);

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

        // Check for existing ledger entry to prevent duplicates
        const existingLedger = await tx.financial_ledger.findFirst({
          where: {
            seasonTeamId: seasonTeam.id,
            transactionType: 'PLAYER_PURCHASE',
            amount: -totalSpent,
            description: `Bulk round ${roundId} player purchases`
          }
        });
        
        if (existingLedger) {
          console.warn(`      ⚠️  Ledger entry already exists for team ${teamId}, skipping`);
        } else {
          // Insert financial ledger entry
          await tx.financial_ledger.create({
            data: {
              id: financialIdMap.get(teamId)!,
              seasonTeamId: seasonTeam.id,
              seasonId: round.seasonId,
              transactionType: 'PLAYER_PURCHASE',
              amount: -totalSpent,
              previousBalance: seasonTeam.currentBudget,
              newBalance: newBudget,
              description: `Bulk round ${roundId} player purchases`,
              playerName: playerNames.join(', ')
            }
          });
        }
        
        console.log(`      ✓ [${teamCount}/${teamAllocations.size}] ${teamId}: £${totalSpent} spent, ${teamAllocs.length} players`);
      }
    }

    // 3. Update round status
    const hasConflicts = conflicts.length > 0;
    const newStatus = hasConflicts ? 'tiebreaker_pending' : 'completed';
    
    console.log(`   🔄 Updating round status to: ${newStatus}`);
    await tx.rounds.update({
      where: { id: roundId },
      data: {
        status: newStatus
      }
    });
    console.log(`      ✓ Round status updated`);
  }, {
    maxWait: 10000,
    timeout: 30000 // Increase timeout to 30 seconds for large bulk rounds
  });

  console.log(`\n✅ Database transaction complete!`);
  console.log(`   📊 Applied ${allocations.length} allocations across ${teamAllocations.size} teams`);
  if (conflicts.length > 0) {
    console.log(`   ⚠️  ${conflicts.length} conflicts require bulk tiebreakers`);
  }
  console.log('='.repeat(80) + '\n');
}
