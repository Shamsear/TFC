/**
 * Budget reserve calculator for auction system
 * 
 * Calculates how much budget a team must reserve based on:
 * - Current squad size
 * - Minimum squad size requirement
 * - Minimum player price
 */

export interface ReserveCalculation {
  currentBudget: number;
  currentSquadSize: number;
  minSquadSize: number;
  minPlayerPrice: number;
  slotsNeeded: number;
  reserveAmount: number;
  availableBudget: number;
}

/**
 * Calculate budget reserve for a team
 * 
 * @param currentBudget - Team's current budget
 * @param currentSquadSize - Number of players currently in squad
 * @param minSquadSize - Minimum squad size required (default: 16)
 * @param minPlayerPrice - Minimum price per player (default: 5000)
 * @returns Reserve calculation details
 */
export function calculateReserve(
  currentBudget: number,
  currentSquadSize: number,
  minSquadSize: number = 16,
  minPlayerPrice: number = 5000
): ReserveCalculation {
  // Calculate how many more players needed
  const slotsNeeded = Math.max(0, minSquadSize - currentSquadSize);
  
  // Calculate reserve amount
  const reserveAmount = slotsNeeded * minPlayerPrice;
  
  // Calculate available budget for bidding
  const availableBudget = Math.max(0, currentBudget - reserveAmount);
  
  return {
    currentBudget,
    currentSquadSize,
    minSquadSize,
    minPlayerPrice,
    slotsNeeded,
    reserveAmount,
    availableBudget
  };
}

/**
 * Check if a team can afford a bid amount
 * 
 * @param bidAmount - Amount team wants to bid
 * @param currentBudget - Team's current budget
 * @param currentSquadSize - Number of players currently in squad
 * @param minSquadSize - Minimum squad size required
 * @param minPlayerPrice - Minimum price per player
 * @returns true if team can afford the bid
 */
export function canAffordBid(
  bidAmount: number,
  currentBudget: number,
  currentSquadSize: number,
  minSquadSize: number = 16,
  minPlayerPrice: number = 5000
): boolean {
  const reserve = calculateReserve(
    currentBudget,
    currentSquadSize,
    minSquadSize,
    minPlayerPrice
  );
  
  return bidAmount <= reserve.availableBudget;
}

/**
 * Calculate maximum bid a team can place
 * 
 * @param currentBudget - Team's current budget
 * @param currentSquadSize - Number of players currently in squad
 * @param minSquadSize - Minimum squad size required
 * @param minPlayerPrice - Minimum price per player
 * @returns Maximum bid amount team can place
 */
export function calculateMaxBid(
  currentBudget: number,
  currentSquadSize: number,
  minSquadSize: number = 16,
  minPlayerPrice: number = 5000
): number {
  const reserve = calculateReserve(
    currentBudget,
    currentSquadSize,
    minSquadSize,
    minPlayerPrice
  );
  
  return reserve.availableBudget;
}

/**
 * Validate multiple bids against budget with reserves
 * 
 * This is used during finalization to ensure a team can afford
 * all their winning bids while maintaining minimum squad requirements.
 * 
 * @param bids - Array of bid amounts (only winning bids)
 * @param currentBudget - Team's current budget
 * @param currentSquadSize - Number of players currently in squad
 * @param minSquadSize - Minimum squad size required
 * @param minPlayerPrice - Minimum price per player
 * @returns true if team can afford all bids
 */
export function canAffordMultipleBids(
  bids: number[],
  currentBudget: number,
  currentSquadSize: number,
  minSquadSize: number = 16,
  minPlayerPrice: number = 5000
): boolean {
  // Calculate total cost of winning bids
  const totalCost = bids.reduce((sum, bid) => sum + bid, 0);
  
  // Calculate new squad size after winning these bids
  const newSquadSize = currentSquadSize + bids.length;
  
  // Calculate new budget after purchases
  const newBudget = currentBudget - totalCost;
  
  // Calculate reserve needed with new squad size
  const reserve = calculateReserve(
    newBudget,
    newSquadSize,
    minSquadSize,
    minPlayerPrice
  );
  
  // Team must have enough budget to cover reserve
  return newBudget >= reserve.reserveAmount;
}

/**
 * Calculate budget breakdown for display
 * 
 * @param currentBudget - Team's current budget
 * @param currentSquadSize - Number of players currently in squad
 * @param minSquadSize - Minimum squad size required
 * @param minPlayerPrice - Minimum price per player
 * @returns Formatted budget breakdown
 */
export function getBudgetBreakdown(
  currentBudget: number,
  currentSquadSize: number,
  minSquadSize: number = 16,
  minPlayerPrice: number = 5000
): {
  total: number;
  reserved: number;
  available: number;
  slotsNeeded: number;
  breakdown: string;
} {
  const reserve = calculateReserve(
    currentBudget,
    currentSquadSize,
    minSquadSize,
    minPlayerPrice
  );
  
  const breakdown = [
    `Total Budget: ${currentBudget.toLocaleString()}`,
    `Current Squad: ${currentSquadSize}/${minSquadSize} players`,
    `Slots Needed: ${reserve.slotsNeeded}`,
    `Reserved: ${reserve.reserveAmount.toLocaleString()} (${reserve.slotsNeeded} × ${minPlayerPrice.toLocaleString()})`,
    `Available for Bidding: ${reserve.availableBudget.toLocaleString()}`
  ].join('\n');
  
  return {
    total: currentBudget,
    reserved: reserve.reserveAmount,
    available: reserve.availableBudget,
    slotsNeeded: reserve.slotsNeeded,
    breakdown
  };
}

/**
 * Phase-based allocation helper
 * 
 * Determines if a team should receive forced allocation based on phase
 * and whether they submitted bids.
 * 
 * @param phase - Current auction phase (1, 2, or 3)
 * @param submitted - Whether team submitted their bids
 * @param currentSquadSize - Number of players currently in squad
 * @param minSquadSize - Minimum squad size required
 * @returns true if team should receive forced allocation
 */
export function shouldReceiveForcedAllocation(
  phase: number,
  submitted: boolean,
  currentSquadSize: number,
  minSquadSize: number = 16
): boolean {
  // Phase 2: No forced allocation
  if (phase === 2) {
    return false;
  }
  
  // Phase 1 & 3: Only if didn't submit AND needs players
  if (!submitted && currentSquadSize < minSquadSize) {
    return true;
  }
  
  return false;
}

/**
 * Calculate forced allocation price
 * 
 * For teams that didn't submit bids in Phase 1 or 3,
 * calculate the price they should pay for forced allocation.
 * 
 * @param allBids - All bids placed in the round
 * @param minPlayerPrice - Minimum price per player
 * @returns Price for forced allocation (average or minimum)
 */
export function calculateForcedAllocationPrice(
  allBids: number[],
  minPlayerPrice: number = 5000
): number {
  if (allBids.length === 0) {
    return minPlayerPrice;
  }
  
  // Calculate average bid
  const average = allBids.reduce((sum, bid) => sum + bid, 0) / allBids.length;
  
  // Return average or minimum, whichever is higher
  return Math.max(Math.round(average), minPlayerPrice);
}
