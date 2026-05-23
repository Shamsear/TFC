import { prisma } from '@/lib/prisma';

/**
 * Bid validation utilities
 */

export interface BidData {
  base_player_id: string;
  player_name?: string;
  amount: number;
  timestamp?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationContext {
  roundId: string;
  teamId: string;
  seasonId: string;
  maxBidsPerTeam?: number;
  basePrice?: number;
  currentBudget: number;
  skipBalanceCheck?: boolean; // Skip balance/reserve validation for edits
}

/**
 * Validate bid data structure
 */
export function validateBidStructure(bids: any[]): ValidationResult {
  const errors: string[] = [];
  
  if (!Array.isArray(bids)) {
    errors.push('Bids must be an array');
    return { valid: false, errors };
  }
  
  if (bids.length === 0) {
    return { valid: true, errors: [] };
  }
  
  bids.forEach((bid, index) => {
    if (!bid.base_player_id || typeof bid.base_player_id !== 'string') {
      errors.push(`Bid ${index + 1}: base_player_id is required and must be a string`);
    }
    
    if (typeof bid.amount !== 'number' || bid.amount <= 0) {
      errors.push(`Bid ${index + 1}: amount must be a positive number`);
    }
    
    if (bid.amount && !Number.isInteger(bid.amount)) {
      errors.push(`Bid ${index + 1}: amount must be an integer`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate bid count against round limits
 */
export function validateBidCount(
  bids: BidData[],
  maxBidsPerTeam?: number
): ValidationResult {
  const errors: string[] = [];
  
  if (maxBidsPerTeam && bids.length > maxBidsPerTeam) {
    errors.push(`Maximum ${maxBidsPerTeam} bids allowed per team. You submitted ${bids.length} bids.`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate bid amounts against base price
 */
export function validateBidAmounts(
  bids: BidData[],
  basePrice?: number
): ValidationResult {
  const errors: string[] = [];
  
  if (basePrice) {
    bids.forEach((bid, index) => {
      if (bid.amount < basePrice) {
        errors.push(
          `Bid ${index + 1} (${bid.player_name || bid.base_player_id}): ` +
          `Amount ${bid.amount} is below base price ${basePrice}`
        );
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate no duplicate player bids
 */
export function validateNoDuplicates(bids: BidData[]): ValidationResult {
  const errors: string[] = [];
  const playerIds = new Set<string>();
  
  bids.forEach((bid, index) => {
    if (playerIds.has(bid.base_player_id)) {
      errors.push(
        `Bid ${index + 1}: Duplicate bid for player ${bid.player_name || bid.base_player_id}`
      );
    }
    playerIds.add(bid.base_player_id);
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate no duplicate bid amounts
 */
export function validateNoDuplicateAmounts(bids: BidData[]): ValidationResult {
  const errors: string[] = [];
  const amounts = new Set<number>();
  
  bids.forEach((bid, index) => {
    if (amounts.has(bid.amount)) {
      errors.push(
        `Bid ${index + 1} (${bid.player_name || bid.base_player_id}): ` +
        `Duplicate bid amount £${bid.amount.toLocaleString()}. Each bid must be unique.`
      );
    }
    amounts.add(bid.amount);
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate team has sufficient budget for all bids
 * Note: This is a rough check. Actual budget is calculated with reserves during finalization.
 */
export function validateBudget(
  bids: BidData[],
  currentBudget: number
): ValidationResult {
  const errors: string[] = [];
  
  // Validate each bid amount does not exceed current budget
  bids.forEach((bid, index) => {
    if (bid.amount > currentBudget) {
      errors.push(
        `Bid ${index + 1} (${bid.player_name || bid.base_player_id}): ` +
        `Amount £${bid.amount.toLocaleString()} exceeds current budget £${currentBudget.toLocaleString()}`
      );
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate bids against reserve requirements
 * OPTIMIZED: Reduced database queries
 */
export async function validateBidsAgainstReserves(
  bids: BidData[],
  context: ValidationContext
): Promise<ValidationResult> {
  const errors: string[] = [];
  
  try {
    // Import reserve calculator
    const { calculateReserveCore, validateBidAgainstReserve } = await import('./reserve-calculator-v2');
    const { prisma } = await import('@/lib/prisma');
    
    // OPTIMIZATION: Get all data in a single parallel query
    const [round, settingsResult, currentSquadSize] = await Promise.all([
      prisma.rounds.findUnique({
        where: { id: context.roundId },
        select: { roundNumber: true }
      }),
      prisma.$queryRaw<any[]>`
        SELECT 
          phase_1_end_round,
          phase_1_min_balance,
          phase_2_end_round,
          phase_2_min_balance,
          phase_3_min_balance,
          min_squad_size,
          max_squad_size
        FROM auction_settings
        WHERE "seasonId" = ${context.seasonId}
      `,
      prisma.transfer_history.count({
        where: { teamId: context.teamId, seasonId: context.seasonId }
      })
    ]);
    
    if (!round || !settingsResult || settingsResult.length === 0) {
      // No auction settings or round, skip reserve check
      return { valid: true, errors: [] };
    }
    
    const settings = settingsResult[0];
    const config = {
      phase_1_end_round: parseInt(settings.phase_1_end_round) || 18,
      phase_1_min_balance: parseInt(settings.phase_1_min_balance) || 30,
      phase_2_end_round: parseInt(settings.phase_2_end_round) || 20,
      phase_2_min_balance: parseInt(settings.phase_2_min_balance) || 30,
      phase_3_min_balance: parseInt(settings.phase_3_min_balance) || 10,
      min_squad_size: parseInt(settings.min_squad_size) || 25,
      max_squad_size: parseInt(settings.max_squad_size) || 30
    };
    
    // Calculate reserve using context.currentBudget (already provided)
    const reserveInfo = calculateReserveCore(
      round.roundNumber,
      context.currentBudget, // Use provided budget instead of querying again
      currentSquadSize,
      config
    );
    
    // Validate each bid against reserve individually for normal rounds
    bids.forEach((bid, index) => {
      const validation = validateBidAgainstReserve(bid.amount, reserveInfo);
      if (!validation.valid) {
        errors.push(
          `Bid ${index + 1} (${bid.player_name || bid.base_player_id}): ` +
          (validation.error || 'Bid exceeds reserve requirements')
        );
      }
      if (validation.warning) {
        console.warn(`Reserve warning for team ${context.teamId} on bid ${index + 1}:`, validation.warning);
      }
    });
    
  } catch (error) {
    console.error('Error validating reserves:', error);
    // Don't fail validation if reserve check fails - allow bid to proceed
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate players exist in the season
 */
export async function validatePlayersExist(
  bids: BidData[],
  seasonId: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  
  try {
    const playerIds = bids.map(bid => bid.base_player_id);
    
    const existingPlayers = await prisma.seasonal_player_stats.findMany({
      where: {
        basePlayerId: { in: playerIds },
        seasonId: seasonId
      },
      select: {
        basePlayerId: true,
        basePlayer: {
          select: {
            name: true
          }
        }
      }
    });
    
    const existingPlayerIds = new Set(existingPlayers.map(p => p.basePlayerId));
    
    bids.forEach((bid, index) => {
      if (!existingPlayerIds.has(bid.base_player_id)) {
        errors.push(
          `Bid ${index + 1}: Player ${bid.player_name || bid.base_player_id} ` +
          `does not exist in this season`
        );
      }
    });
  } catch (error) {
    console.error('Error validating players:', error);
    errors.push('Failed to validate player existence');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate players are not already owned by any team
 */
export async function validatePlayersAvailable(
  bids: BidData[],
  seasonId: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  
  try {
    const playerIds = bids.map(bid => bid.base_player_id);
    
    const ownedPlayers = await prisma.transfer_history.findMany({
      where: {
        basePlayerId: { in: playerIds },
        seasonId: seasonId
      },
      select: {
        basePlayerId: true,
        basePlayer: {
          select: {
            name: true
          }
        },
        team: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (ownedPlayers.length > 0) {
      ownedPlayers.forEach(owned => {
        errors.push(
          `Player ${owned.basePlayer.name} is already owned by ${owned.team.name}`
        );
      });
    }
  } catch (error) {
    console.error('Error validating player availability:', error);
    errors.push('Failed to validate player availability');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Comprehensive bid validation
 * OPTIMIZED: Run async validations in parallel
 */
export async function validateBids(
  bids: BidData[],
  context: ValidationContext
): Promise<ValidationResult> {
  const allErrors: string[] = [];
  
  // 1. Structure validation (sync)
  const structureResult = validateBidStructure(bids);
  allErrors.push(...structureResult.errors);
  
  if (!structureResult.valid) {
    return { valid: false, errors: allErrors };
  }
  
  // 2. Bid count validation (sync)
  const countResult = validateBidCount(bids, context.maxBidsPerTeam);
  allErrors.push(...countResult.errors);
  
  // 3. Bid amount validation (sync)
  const amountResult = validateBidAmounts(bids, context.basePrice);
  allErrors.push(...amountResult.errors);
  
  // 4. Duplicate validation (sync)
  const duplicateResult = validateNoDuplicates(bids);
  allErrors.push(...duplicateResult.errors);
  
  // 4b. Duplicate amount validation (sync)
  const duplicateAmountResult = validateNoDuplicateAmounts(bids);
  allErrors.push(...duplicateAmountResult.errors);
  
  // 5. Budget validation (sync - rough check) - SKIP FOR EDITS
  if (!context.skipBalanceCheck) {
    const budgetResult = validateBudget(bids, context.currentBudget);
    allErrors.push(...budgetResult.errors);
  }
  
  // OPTIMIZATION: Run async validations in parallel
  // For edits, skip reserve validation but still check existence and availability
  const asyncValidations = [
    validatePlayersExist(bids, context.seasonId),
    validatePlayersAvailable(bids, context.seasonId)
  ];
  
  // Only validate reserves for new submissions, not edits
  if (!context.skipBalanceCheck) {
    asyncValidations.push(validateBidsAgainstReserves(bids, context));
  }
  
  const results = await Promise.all(asyncValidations);
  
  results.forEach(result => {
    allErrors.push(...result.errors);
  });
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validate bulk round selections
 */
export async function validateBulkSelections(
  playerIds: string[],
  context: ValidationContext
): Promise<ValidationResult> {
  const errors: string[] = [];
  
  if (!Array.isArray(playerIds)) {
    errors.push('Player selections must be an array');
    return { valid: false, errors };
  }
  
  if (playerIds.length === 0) {
    return { valid: true, errors: [] };
  }
  
  // Check for duplicates
  const uniqueIds = new Set(playerIds);
  if (uniqueIds.size !== playerIds.length) {
    errors.push('Duplicate player selections are not allowed');
  }
  
  // Note: maxBidsPerTeam is NOT checked for bulk rounds
  // Teams can select as many players as they need for their squad
  
  // Validate players exist
  const existenceResult = await validatePlayersExist(
    playerIds.map(id => ({ base_player_id: id, amount: context.basePrice || 0 })),
    context.seasonId
  );
  errors.push(...existenceResult.errors);
  
  // Validate players available
  const availabilityResult = await validatePlayersAvailable(
    playerIds.map(id => ({ base_player_id: id, amount: context.basePrice || 0 })),
    context.seasonId
  );
  errors.push(...availabilityResult.errors);
  
  // Validate budget (all players at base price)
  if (context.basePrice) {
    const totalCost = playerIds.length * context.basePrice;
    if (totalCost > context.currentBudget) {
      errors.push(
        `Total cost £${totalCost.toLocaleString()} exceeds current budget £${context.currentBudget.toLocaleString()}`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
