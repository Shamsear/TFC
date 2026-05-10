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
    errors.push('At least one bid is required');
    return { valid: false, errors };
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
    errors.push('At least one player must be selected');
    return { valid: false, errors };
  }
  
  // Check for duplicates
  const uniqueIds = new Set(playerIds);
  if (uniqueIds.size !== playerIds.length) {
    errors.push('Duplicate player selections are not allowed');
  }
  
  // Validate max selections
  if (context.maxBidsPerTeam && playerIds.length > context.maxBidsPerTeam) {
    errors.push(`Maximum ${context.maxBidsPerTeam} players allowed. You selected ${playerIds.length}.`);
  }
  
  // Validate players exist
  const existenceResult = await validatePlayersExist(
    playerIds.map(id => ({ base_player_id: id, amount: context.basePrice || 0 })),
    context.seasonId
  );
  allErrors.push(...existenceResult.errors);
  
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
        `Total cost (${totalCost}) exceeds current budget (${context.currentBudget})`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
