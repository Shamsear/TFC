import { prisma } from '@/lib/prisma';
import { calculateReserveCore, ReserveConfig } from './reserve-calculator-v2';
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
 * Validate and allocate single bidders (batch-optimized to avoid N+1 query overhead & timeouts)
 */
async function allocateSingleBidders(
  singleBidders: Map<string, string>,
  seasonId: string,
  roundId: string,
  basePrice: number
): Promise<{ allocations: BulkAllocation[]; errors: string[] }> {
  const allocations: BulkAllocation[] = [];
  const errors: string[] = [];

  const playerIds = Array.from(singleBidders.keys());
  if (playerIds.length === 0) {
    return { allocations: [], errors: [] };
  }

  // 1. Batch query: Player names
  const players = await prisma.base_players.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, name: true }
  });
  const playerNames = new Map(players.map(p => [p.id, p.name]));

  // 2. Batch query: Active owned players for this season
  const activeTransfers = await prisma.transfer_history.findMany({
    where: {
      seasonId,
      status: 'ACTIVE'
    },
    select: {
      basePlayerId: true
    }
  });
  const ownedPlayerIds = new Set(activeTransfers.map(t => t.basePlayerId));

  // 3. Batch query: Season team budgets
  const seasonTeams = await prisma.season_teams.findMany({
    where: { seasonId },
    select: { teamId: true, currentBudget: true }
  });
  const teamBudgetMap = new Map(seasonTeams.map(st => [st.teamId, st.currentBudget]));

  // 4. Batch query: Active squad sizes
  const squadSizeGroup = await prisma.transfer_history.groupBy({
    by: ['teamId'],
    where: {
      seasonId,
      status: 'ACTIVE'
    },
    _count: { id: true }
  });
  const teamSquadSizeMap = new Map(squadSizeGroup.map(sg => [sg.teamId, sg._count.id]));

  // 5. Batch query: Round details
  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    select: { roundNumber: true }
  });
  const currentRoundNumber = round?.roundNumber || 1;

  // 6. Batch query: Auction settings
  const settingsResult = await prisma.$queryRaw<Array<ReserveConfig>>`
    SELECT 
      phase_1_end_round,
      phase_1_min_balance,
      phase_2_end_round,
      phase_2_min_balance,
      phase_3_min_balance,
      min_squad_size,
      max_squad_size
    FROM auction_settings
    WHERE "seasonId" = ${seasonId}
  `;

  const defaultConfig: ReserveConfig = {
    phase_1_end_round: 18,
    phase_1_min_balance: 30,
    phase_2_end_round: 20,
    phase_2_min_balance: 30,
    phase_3_min_balance: 10,
    min_squad_size: 25,
    max_squad_size: 30
  };

  const settings = settingsResult[0];
  const config: ReserveConfig = settings ? {
    phase_1_end_round: settings.phase_1_end_round || 18,
    phase_1_min_balance: settings.phase_1_min_balance || 30,
    phase_2_end_round: settings.phase_2_end_round || 20,
    phase_2_min_balance: settings.phase_2_min_balance || 30,
    phase_3_min_balance: settings.phase_3_min_balance || 10,
    min_squad_size: settings.min_squad_size || 25,
    max_squad_size: settings.max_squad_size || 30
  } : defaultConfig;

  // Track allocations per team in memory for dynamic reserve checks
  const pendingSpentPerTeam = new Map<string, number>();
  const pendingCountPerTeam = new Map<string, number>();

  let i = 0;
  for (const [playerId, teamId] of singleBidders.entries()) {
    i++;
    if (i % 10 === 0 || i === singleBidders.size) {
      console.log(`   ⏳ Processing allocation ${i} of ${singleBidders.size}...`);
    }

    const pName = playerNames.get(playerId) || playerId;

    if (ownedPlayerIds.has(playerId)) {
      errors.push(`Player ${pName} is already owned`);
      continue;
    }

    const initialBudget = teamBudgetMap.get(teamId);
    if (initialBudget === undefined) {
      errors.push(`Team ${teamId} not found`);
      continue;
    }

    const alreadySpent = pendingSpentPerTeam.get(teamId) || 0;
    const alreadyAddedCount = pendingCountPerTeam.get(teamId) || 0;

    const currentBudget = initialBudget - alreadySpent;
    const initialSquadSize = teamSquadSizeMap.get(teamId) || 0;
    const currentSquadSize = initialSquadSize + alreadyAddedCount;

    const reserveInfo = calculateReserveCore(currentRoundNumber, currentBudget, currentSquadSize, config);

    if (basePrice > reserveInfo.maxBid) {
      errors.push(
        `Team ${teamId} cannot afford ${pName} ` +
        `(needs ${basePrice}, has ${reserveInfo.maxBid} available)`
      );
      continue;
    }

    allocations.push({
      teamId,
      basePlayerId: playerId,
      playerName: pName,
      amount: basePrice
    });

    pendingSpentPerTeam.set(teamId, alreadySpent + basePrice);
    pendingCountPerTeam.set(teamId, alreadyAddedCount + 1);
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
    select: { seasonId: true, basePrice: true, status: true }
  });

  if (!round) {
    throw new Error('Round not found');
  }

  if (round.status === 'completed') {
    console.log('⚠️ Bulk round is ALREADY completed. Aborting applyBulkFinalizationResults to prevent double deductions/assignments.\n');
    return;
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

    // Group allocations by team for batch processing (using ONLY new allocations to prevent duplicate budget deduction)
    const newTeamAllocations = new Map<string, BulkAllocation[]>();
    for (const alloc of newAllocations) {
      if (!newTeamAllocations.has(alloc.teamId)) {
        newTeamAllocations.set(alloc.teamId, []);
      }
      newTeamAllocations.get(alloc.teamId)!.push(alloc);
    }
    
    // 2. Pre-fetch season teams for allocated teams in 1 batch query
    console.log(`   💰 Pre-fetching season teams for ${newTeamAllocations.size} teams...`);
    const targetTeamIds = Array.from(newTeamAllocations.keys());
    const seasonTeamList = targetTeamIds.length > 0 ? await tx.season_teams.findMany({
      where: {
        seasonId: round.seasonId,
        teamId: { in: targetTeamIds }
      }
    }) : [];
    const seasonTeamMap = new Map(seasonTeamList.map(st => [st.teamId, st]));

    // Pre-fetch existing ledgers in 1 batch query to avoid N+1 check
    const existingLedgerList = targetTeamIds.length > 0 ? await tx.financial_ledger.findMany({
      where: {
        seasonId: round.seasonId,
        transactionType: 'PLAYER_PURCHASE',
        description: `Bulk round ${roundId} player purchases`
      },
      select: { seasonTeamId: true }
    }) : [];
    const existingLedgerTeamIds = new Set(existingLedgerList.map(l => l.seasonTeamId));

    // Update team budgets and create financial ledger entries
    console.log(`   💰 Updating budgets for ${newTeamAllocations.size} teams...`);
    let teamCount = 0;
    for (const [teamId, teamAllocs] of newTeamAllocations.entries()) {
      teamCount++;
      const totalSpent = teamAllocs.reduce((sum, alloc) => sum + alloc.amount, 0);
      const playerNames = teamAllocs.map(alloc => alloc.playerName);

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

        if (existingLedgerTeamIds.has(seasonTeam.id)) {
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
        
        console.log(`      ✓ [${teamCount}/${newTeamAllocations.size}] ${teamId}: £${totalSpent} spent, ${teamAllocs.length} players`);
      }
    }

    // 2.5 Create bulk tiebreakers for conflicts
    if (conflicts.length > 0) {
      console.log(`   ⚖️ Processing ${conflicts.length} bulk tiebreakers...`);
      
      const conflictPlayerIds = conflicts.map(c => c.basePlayerId);
      const existingTiebreakers = await tx.bulk_tiebreakers.findMany({
        where: {
          roundId,
          basePlayerId: { in: conflictPlayerIds }
        },
        select: { basePlayerId: true }
      });
      const existingTiebreakerPlayerIds = new Set(existingTiebreakers.map(t => t.basePlayerId));

      for (const conflict of conflicts) {
        if (existingTiebreakerPlayerIds.has(conflict.basePlayerId)) {
          console.warn(`      ⚠️  Tiebreaker already exists for player ${conflict.basePlayerId}, skipping`);
          continue;
        }

        // Create the tiebreaker
        const tiebreaker = await tx.bulk_tiebreakers.create({
          data: {
            roundId,
            basePlayerId: conflict.basePlayerId,
            basePrice: round.basePrice || 10,
            status: 'pending',
            teamsRemaining: conflict.teamIds.length
          }
        });

        // Create participants
        await tx.bulk_tiebreaker_participants.createMany({
          data: conflict.teamIds.map(teamId => ({
            tiebreakerId: tiebreaker.id,
            teamId,
            status: 'active',
            currentBid: round.basePrice || 10
          }))
        });
      }
      console.log(`      ✓ Bulk tiebreakers creation pass complete`);
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
    maxWait: 20000,
    timeout: 60000 // 60 seconds timeout for large bulk rounds
  });

  console.log(`\n✅ Database transaction complete!`);
  console.log(`   📊 Applied ${allocations.length} allocations across ${teamAllocations.size} teams`);
  if (conflicts.length > 0) {
    console.log(`   ⚠️  ${conflicts.length} conflicts require bulk tiebreakers`);
  }
  console.log('='.repeat(80) + '\n');
}
