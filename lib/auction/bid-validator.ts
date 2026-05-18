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
 * Validate team has sufficient budget for all bids
 * Note: This is a rough check. Actual budget is calculated with reserves during finalization.
 */
export function validateBudget(
  bids: BidData[],
  currentBudget: number
): ValidationResult {
  const errors: string[] = [];
  
  // Calculate total if team wins all bids (worst case)
  const totalBidAmount = bids.reduce((sum, bid) => sum + bid.amount, 0);
  
  if (totalBidAmount > currentBudget) {
    errors.push(
      `Total bid amount (${totalBidAmount}) exceeds current budget (${currentBudget}). ` +
      `Note: You won't win all bids, but this is a safety check.`
    );
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate bids against reserve requirements
 */
export async function validateBidsAgainstReserves(
  bids: BidData[],
  context: ValidationContext
): Promise<ValidationResult> {
  const errors: string[] = [];
  
  try {
    // Import reserve calculator
    const { sql } = await import('@vercel/postgres');
    const { calculateReserveCore, validateBidAgainstReserve } = await import('./reserve-calculator-v2');
    
    // Get team balance and squad size from Neon
    const teamResult = await sql`
      SELECT football_budget, football_players_count
      FROM teams
      WHERE id = ${context.teamId} AND season_id = ${context.seasonId}
    `;
    
    if (teamResult.rows.length === 0) {
      // If team not in Neon, skip reserve check (use Prisma budget)
      return { valid: true, errors: [] };
    }
    
    const teamBalance = parseInt(teamResult.rows[0].football_budget) || 0;
    const currentSquadSize = parseInt(teamResult.rows[0].football_players_count) || 0;
    
    // Get round number
    const { prisma } = await import('@/lib/prisma');
    const round = await prisma.rounds.findUnique({
      where: { id: context.roundId },
      select: { roundNumber: true }
    });
    
    if (!round) {
      return { valid: true, errors: [] };
    }
    
    // Get auction settings
    const settingsResult = await sql`
      SELECT 
        phase_1_end_round,
        phase_1_min_balance,
        phase_2_end_round,
        phase_2_min_balance,
        phase_3_min_balance,
        min_squad_size,
        max_squad_size
      FROM auction_settings
      WHERE season_id = ${context.seasonId}
    `;
    
    if (settingsResult.rows.length === 0) {
      // No auction settings, skip reserve check
      return { valid: true, errors: [] };
    }
    
    const settings = settingsResult.rows[0];
    const config = {
      phase_1_end_round: parseInt(settings.phase_1_end_round) || 18,
      phase_1_min_balance: parseInt(settings.phase_1_min_balance) || 30,
      phase_2_end_round: parseInt(settings.phase_2_end_round) || 20,
      phase_2_min_balance: parseInt(settings.phase_2_min_balance) || 30,
      phase_3_min_balance: parseInt(settings.phase_3_min_balance) || 10,
      min_squad_size: parseInt(settings.min_squad_size) || 25,
      max_squad_size: parseInt(settings.max_squad_size) || 30
    };
    
    // Calculate reserve
    const reserveInfo = calculateReserveCore(
      round.roundNumber,
      teamBalance,
      currentSquadSize,
      config
    );
    
    // Check each bid against reserve
    // For normal rounds, we check if the TOTAL of all bids exceeds available budget
    const totalBidAmount = bids.reduce((sum, bid) => sum + bid.amount, 0);
    
    // Validate total against reserve
    const validation = validateBidAgainstReserve(totalBidAmount, reserveInfo);
    
    if (!validation.valid) {
      errors.push(validation.error || 'Bid exceeds reserve requirements');
    }
    
    if (validation.warning) {
      // For warnings, we still allow but log it
      console.warn(`Reserve warning for team ${context.teamId}:`, validation.warning);
    }
    
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
 */
export async function validateBids(
  bids: BidData[],
  context: ValidationContext
): Promise<ValidationResult> {
  const allErrors: string[] = [];
  
  // 1. Structure validation
  const structureResult = validateBidStructure(bids);
  allErrors.push(...structureResult.errors);
  
  if (!structureResult.valid) {
    return { valid: false, errors: allErrors };
  }
  
  // 2. Bid count validation
  const countResult = validateBidCount(bids, context.maxBidsPerTeam);
  allErrors.push(...countResult.errors);
  
  // 3. Bid amount validation
  const amountResult = validateBidAmounts(bids, context.basePrice);
  allErrors.push(...amountResult.errors);
  
  // 4. Duplicate validation
  const duplicateResult = validateNoDuplicates(bids);
  allErrors.push(...duplicateResult.errors);
  
  // 5. Budget validation (rough check)
  const budgetResult = validateBudget(bids, context.currentBudget);
  allErrors.push(...budgetResult.errors);
  
  // 6. Player existence validation (async)
  const existenceResult = await validatePlayersExist(bids, context.seasonId);
  allErrors.push(...existenceResult.errors);
  
  // 7. Player availability validation (async)
  const availabilityResult = await validatePlayersAvailable(bids, context.seasonId);
  allErrors.push(...availabilityResult.errors);
  
  // 8. Reserve validation (async) - NEW
  const reserveResult = await validateBidsAgainstReserves(bids, context);
  allErrors.push(...reserveResult.errors);
  
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
