/**
 * Squad Size Validator
 * 
 * Validates team squad size constraints for auction rounds.
 * Ensures teams meet minimum squad requirements and don't exceed maximum limits.
 */

import { sql } from '@vercel/postgres';

export interface SquadSizeValidation {
  valid: boolean;
  error?: string;
  currentSquadSize: number;
  minSquadSize: number;
  maxSquadSize: number;
  slotsToMin: number;
  slotsToMax: number;
  canSkip: boolean;
  requiredSelections: number;
}

/**
 * Validates squad size constraints for a team's round selections
 * 
 * @param teamId - Team identifier
 * @param seasonId - Season identifier
 * @param proposedSelections - Number of players team wants to select
 * @returns Validation result with detailed information
 */
export async function validateSquadSizeForRound(
  teamId: string,
  seasonId: string,
  proposedSelections: number
): Promise<SquadSizeValidation> {
  
  // Get team's current squad size and team-specific limits
  const teamResult = await sql`
    SELECT 
      football_players_count,
      football_min_slots,
      football_max_slots
    FROM teams
    WHERE id = ${teamId} AND season_id = ${seasonId}
  `;
  
  if (teamResult.rows.length === 0) {
    throw new Error(`Team not found: ${teamId} in season ${seasonId}`);
  }
  
  const teamData = teamResult.rows[0];
  const currentSquadSize = parseInt(teamData.football_players_count) || 0;
  
  // Get season's default min/max squad settings (fallback)
  const settingsResult = await sql`
    SELECT min_squad_size, max_squad_size
    FROM auction_settings
    WHERE season_id = ${seasonId}
  `;
  
  // Use team-specific limits if set, otherwise use season defaults
  const minSquad = parseInt(teamData.football_min_slots) || 
                   parseInt(settingsResult.rows[0]?.min_squad_size) || 25;
  const maxSquad = parseInt(teamData.football_max_slots) || 
                   parseInt(settingsResult.rows[0]?.max_squad_size) || 30;
  
  const slotsToMin = Math.max(0, minSquad - currentSquadSize);
  const slotsToMax = Math.max(0, maxSquad - currentSquadSize);
  
  // Check if team has reached min squad
  const hasReachedMin = currentSquadSize >= minSquad;
  
  // Validation logic
  if (!hasReachedMin) {
    // Below min squad - must select to reach minimum
    if (proposedSelections === 0) {
      return {
        valid: false,
        error: `You must select at least ${slotsToMin} player${slotsToMin !== 1 ? 's' : ''} to reach minimum squad size (${minSquad})`,
        currentSquadSize,
        minSquadSize: minSquad,
        maxSquadSize: maxSquad,
        slotsToMin,
        slotsToMax,
        canSkip: false,
        requiredSelections: slotsToMin
      };
    }
    
    if (proposedSelections < slotsToMin) {
      return {
        valid: false,
        error: `Insufficient selections. You need ${slotsToMin} more player${slotsToMin !== 1 ? 's' : ''} to reach minimum squad size (${minSquad})`,
        currentSquadSize,
        minSquadSize: minSquad,
        maxSquadSize: maxSquad,
        slotsToMin,
        slotsToMax,
        canSkip: false,
        requiredSelections: slotsToMin
      };
    }
  }
  
  // Check max squad limit
  if (currentSquadSize + proposedSelections > maxSquad) {
    return {
      valid: false,
      error: `Selection would exceed maximum squad size (${maxSquad}). Current: ${currentSquadSize}, Proposed: ${proposedSelections}`,
      currentSquadSize,
      minSquadSize: minSquad,
      maxSquadSize: maxSquad,
      slotsToMin,
      slotsToMax,
      canSkip: hasReachedMin,
      requiredSelections: hasReachedMin ? 0 : slotsToMin
    };
  }
  
  return {
    valid: true,
    currentSquadSize,
    minSquadSize: minSquad,
    maxSquadSize: maxSquad,
    slotsToMin,
    slotsToMax,
    canSkip: hasReachedMin,
    requiredSelections: hasReachedMin ? 0 : slotsToMin
  };
}

/**
 * Get squad size information for display purposes
 * 
 * @param teamId - Team identifier
 * @param seasonId - Season identifier
 * @returns Squad size information
 */
export async function getSquadSizeInfo(
  teamId: string,
  seasonId: string
): Promise<Omit<SquadSizeValidation, 'valid' | 'error'>> {
  
  const validation = await validateSquadSizeForRound(teamId, seasonId, 0);
  
  return {
    currentSquadSize: validation.currentSquadSize,
    minSquadSize: validation.minSquadSize,
    maxSquadSize: validation.maxSquadSize,
    slotsToMin: validation.slotsToMin,
    slotsToMax: validation.slotsToMax,
    canSkip: validation.canSkip,
    requiredSelections: validation.requiredSelections
  };
}
