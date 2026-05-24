/**
 * Advanced Reserve Calculator for Three-Phase Auction System
 * 
 * Implements phase-based budget management with min/max squad size support.
 * Ensures teams maintain sufficient reserves throughout the auction process.
 */

import { prisma } from '@/lib/prisma';

export interface ReserveConfig {
  phase_1_end_round: number;
  phase_1_min_balance: number;
  phase_2_end_round: number;
  phase_2_min_balance: number;
  phase_3_min_balance: number;
  min_squad_size: number;
  max_squad_size: number;
}

export interface ReserveInfo {
  reserve: number;                 // Recommended reserve
  floorReserve: number;            // Minimum enforced reserve
  maxBid: number;                  // Hard limit (balance - floor)
  maxRecommendedBid: number;       // Soft limit (balance - reserve)
  phase: 'phase_1' | 'phase_2' | 'phase_3';
  enforceStrict: boolean;          // Whether to strictly enforce
  allowSkip: boolean;              // Can team skip this round
  minimumToParticipate: number;    // Minimum balance needed
  calculation: string;             // Human-readable explanation
  breakdown: {
    phase1Reserve?: number;
    phase2Reserve?: number;
    phase3Reserve?: number;
  };
  phase2MinBalance?: number;       // Min balance per round in phase 2
  phase2Rounds?: number;           // Total rounds in phase 2
}

/**
 * Core reserve calculation function
 * 
 * @param currentRoundNumber - Current auction round (1-25)
 * @param teamBalance - Team's available budget
 * @param teamSquadSize - Current number of players owned
 * @param config - Phase configuration
 * @returns Reserve information with limits and explanations
 */
export function calculateReserveCore(
  currentRoundNumber: number,
  teamBalance: number,
  teamSquadSize: number,
  config: ReserveConfig
): ReserveInfo {
  
  // Determine current phase
  let phase: 'phase_1' | 'phase_2' | 'phase_3';
  if (currentRoundNumber <= config.phase_1_end_round) {
    phase = 'phase_1';
  } else if (currentRoundNumber <= config.phase_2_end_round) {
    phase = 'phase_2';
  } else {
    phase = 'phase_3';
  }
  
  const breakdown: ReserveInfo['breakdown'] = {};
  
  // Phase 1: Strict Reserve
  if (phase === 'phase_1') {
    // Calculate remaining rounds in each phase
    const phase1Remaining = config.phase_1_end_round - currentRoundNumber;
    const phase2Full = config.phase_2_end_round - config.phase_1_end_round;
    
    // Calculate players after Phase 1 (if we win this round + remaining Phase 1)
    const playersAfterPhase1 = teamSquadSize + 1 + phase1Remaining;
    
    // Calculate Phase 3 slots needed if team SKIPS all Phase 2
    // This is the floor reserve - worst case scenario
    const phase3SlotsIfSkipPhase2 = Math.max(0, config.min_squad_size - playersAfterPhase1);
    
    // Calculate Phase 3 slots needed if team PARTICIPATES in all Phase 2
    // This is for the recommended reserve
    const playersAfterPhase2 = playersAfterPhase1 + phase2Full;
    const phase3SlotsIfDoPhase2 = Math.max(0, config.min_squad_size - playersAfterPhase2);
    
    // Calculate reserves
    const phase1Reserve = phase1Remaining * config.phase_1_min_balance;
    const phase2Reserve = phase2Full * config.phase_2_min_balance;
    const phase3ReserveIfSkip = phase3SlotsIfSkipPhase2 * config.phase_3_min_balance;
    const phase3ReserveIfDo = phase3SlotsIfDoPhase2 * config.phase_3_min_balance;
    
    breakdown.phase1Reserve = phase1Reserve;
    breakdown.phase2Reserve = phase2Reserve;
    breakdown.phase3Reserve = phase3ReserveIfDo;
    
    // Floor reserve: Phase 1 + Phase 3 (if skip all Phase 2)
    const floorReserve = phase1Reserve + phase3ReserveIfSkip;
    
    // Recommended reserve: Phase 1 + Phase 2 + Phase 3 (if do all Phase 2)
    const totalReserve = phase1Reserve + phase2Reserve + phase3ReserveIfDo;
    
    const maxBid = Math.max(0, teamBalance - floorReserve);
    const maxRecommendedBid = Math.max(0, teamBalance - totalReserve);
    
    return {
      reserve: totalReserve,
      floorReserve,
      maxBid,
      maxRecommendedBid,
      phase: 'phase_1',
      enforceStrict: true,
      allowSkip: true,
      minimumToParticipate: config.phase_1_min_balance,
      calculation: `Phase 1 Strict: ${phase1Remaining}×£${config.phase_1_min_balance} + Phase 3 Strict: ${phase3SlotsIfSkipPhase2}×£${config.phase_3_min_balance} = £${floorReserve} (to reach min squad ${config.min_squad_size} if skip Phase 2). Keep Phase 2 reserve (£${phase2Reserve}) to participate in all Phase 2 rounds.`,
      breakdown,
      phase2MinBalance: config.phase_2_min_balance,
      phase2Rounds: phase2Full
    };
  }
  
  // Phase 2: Soft Reserve with Floor
  if (phase === 'phase_2') {
    // Floor calculation (worst case - skip remaining Phase 2)
    const playersAfterThisRound = teamSquadSize + 1;
    const slotsToMinFloor = Math.max(0, config.min_squad_size - playersAfterThisRound);
    const floorReserve = slotsToMinFloor * config.phase_3_min_balance;
    
    // Recommended calculation (complete Phase 2)
    const phase2Remaining = config.phase_2_end_round - currentRoundNumber;
    const playersAfterPhase2 = teamSquadSize + 1 + phase2Remaining;
    const slotsToMinRecommended = Math.max(0, config.min_squad_size - playersAfterPhase2);
    
    const phase2Reserve = phase2Remaining * config.phase_2_min_balance;
    const phase3Reserve = slotsToMinRecommended * config.phase_3_min_balance;
    const recommendedReserve = phase2Reserve + phase3Reserve;
    
    breakdown.phase2Reserve = phase2Reserve;
    breakdown.phase3Reserve = phase3Reserve;
    
    const maxBid = Math.max(0, teamBalance - floorReserve);
    const maxRecommendedBid = Math.max(0, teamBalance - recommendedReserve);
    
    return {
      reserve: recommendedReserve,
      floorReserve,
      maxBid,
      maxRecommendedBid,
      phase: 'phase_2',
      enforceStrict: false,
      allowSkip: true,
      minimumToParticipate: config.phase_2_min_balance,
      calculation: `Phase 2 Floor: ${slotsToMinFloor}×£${config.phase_3_min_balance} = £${floorReserve}. Recommended: ${phase2Remaining}×£${config.phase_2_min_balance} + ${slotsToMinRecommended}×£${config.phase_3_min_balance} = £${recommendedReserve}`,
      breakdown
    };
  }
  
  // Phase 3: Flexible Floor
  // Check if team has reached minimum squad size
  if (teamSquadSize >= config.min_squad_size) {
    // Minimum squad complete - no reserve needed
    return {
      reserve: 0,
      floorReserve: 0,
      maxBid: teamBalance,
      maxRecommendedBid: teamBalance,
      phase: 'phase_3',
      enforceStrict: false,
      allowSkip: true,
      minimumToParticipate: config.phase_3_min_balance,
      calculation: `Phase 3: Min squad reached (${config.min_squad_size}), no reserve needed. Can acquire up to ${config.max_squad_size} players.`,
      breakdown
    };
  }
  
  // Below minimum squad - need reserve
  const slotsToMin = config.min_squad_size - teamSquadSize;
  const reserve = slotsToMin * config.phase_3_min_balance;
  const maxBid = Math.max(0, teamBalance - reserve);
  
  breakdown.phase3Reserve = reserve;
  
  return {
    reserve,
    floorReserve: reserve,
    maxBid,
    maxRecommendedBid: maxBid,
    phase: 'phase_3',
    enforceStrict: true,  // Enforce until min squad reached
    allowSkip: true,
    minimumToParticipate: config.phase_3_min_balance,
    calculation: `Phase 3: ${slotsToMin} slots to min squad × £${config.phase_3_min_balance} = £${reserve}`,
    breakdown
  };
}

/**
 * Get auction settings and calculate reserve for a team
 * 
 * @param teamId - Team identifier
 * @param roundId - Round identifier
 * @param seasonId - Season identifier
 * @returns Reserve information
 */
export async function calculateReserve(
  teamId: string,
  roundId: string,
  seasonId: string
): Promise<ReserveInfo> {
  
  // Get team balance from season_teams
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId,
        teamId
      }
    },
    select: {
      currentBudget: true
    }
  });
  
  if (!seasonTeam) {
    throw new Error(`Team not found in season: ${teamId}`);
  }
  
  const teamBalance = seasonTeam.currentBudget;
  
  // Get squad size by counting ACTIVE transfer history only
  const teamSquadSize = await prisma.transfer_history.count({
    where: {
      teamId,
      seasonId,
      status: 'ACTIVE'
    }
  });
  
  // Get round number
  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    select: { roundNumber: true }
  });
  
  if (!round) {
    throw new Error(`Round not found: ${roundId}`);
  }
  
  const currentRoundNumber = round.roundNumber;
  
  // Get auction settings using Prisma raw query
  const settingsResult = await prisma.$queryRaw<Array<{
    phase_1_end_round: number;
    phase_1_min_balance: number;
    phase_2_end_round: number;
    phase_2_min_balance: number;
    phase_3_min_balance: number;
    min_squad_size: number;
    max_squad_size: number;
  }>>`
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
  
  if (settingsResult.length === 0) {
    // Use defaults if no settings found
    const config: ReserveConfig = {
      phase_1_end_round: 18,
      phase_1_min_balance: 30,
      phase_2_end_round: 20,
      phase_2_min_balance: 30,
      phase_3_min_balance: 10,
      min_squad_size: 25,
      max_squad_size: 30
    };
    
    return calculateReserveCore(currentRoundNumber, teamBalance, teamSquadSize, config);
  }
  
  const settings = settingsResult[0];
  const config: ReserveConfig = {
    phase_1_end_round: settings.phase_1_end_round || 18,
    phase_1_min_balance: settings.phase_1_min_balance || 30,
    phase_2_end_round: settings.phase_2_end_round || 20,
    phase_2_min_balance: settings.phase_2_min_balance || 30,
    phase_3_min_balance: settings.phase_3_min_balance || 10,
    min_squad_size: settings.min_squad_size || 25,
    max_squad_size: settings.max_squad_size || 30
  };
  
  return calculateReserveCore(currentRoundNumber, teamBalance, teamSquadSize, config);
}

/**
 * Validate bid amount against reserve requirements
 * 
 * @param bidAmount - Proposed bid amount
 * @param reserveInfo - Reserve information from calculateReserve
 * @returns Validation result with error message if invalid
 */
export function validateBidAgainstReserve(
  bidAmount: number,
  reserveInfo: ReserveInfo
): { valid: boolean; error?: string; warning?: string } {
  
  
  // Phase 1: Strict enforcement
  if (reserveInfo.phase === 'phase_1' && reserveInfo.enforceStrict) {
    if (bidAmount > reserveInfo.maxBid) {
      return {
        valid: false,
        error: `Bid exceeds reserve. ${reserveInfo.calculation}. Maximum safe bid: £${reserveInfo.maxBid}`
      };
    }
    
    if (bidAmount > reserveInfo.maxRecommendedBid && reserveInfo.phase2MinBalance && reserveInfo.phase2Rounds) {
      const excess = bidAmount - reserveInfo.maxRecommendedBid;
      const skippedRounds = Math.ceil(excess / reserveInfo.phase2MinBalance);
      const participateRounds = Math.max(0, reserveInfo.phase2Rounds - skippedRounds);
      
      if (participateRounds === 0) {
        return {
          valid: true,
          warning: `⚠️ Warning: Bidding £${bidAmount.toLocaleString()} will leave you with insufficient budget to participate in any Phase 2 rounds. You will have to skip all Phase 2 rounds.`
        };
      } else {
        return {
          valid: true,
          warning: `⚠️ Warning: Bidding £${bidAmount.toLocaleString()} will leave you with sufficient budget to participate in only ${participateRounds} Phase 2 round(s). You will have to skip ${skippedRounds} Phase 2 round(s).`
        };
      }
    }
  }
  
  // Phase 2: Floor enforcement with warnings
  if (reserveInfo.phase === 'phase_2') {
    if (bidAmount > reserveInfo.maxBid) {
      return {
        valid: false,
        error: `Bid violates Phase 3 floor reserve. Maximum allowed: £${reserveInfo.maxBid} (must maintain £${reserveInfo.floorReserve} for remaining slots to reach min squad)`
      };
    }
    
    if (bidAmount > reserveInfo.maxRecommendedBid) {
      return {
        valid: true,
        warning: `⚠️ Bid exceeds recommended limit (£${reserveInfo.maxRecommendedBid}). You may not have enough for upcoming Phase 2 rounds to reach minimum squad size.`
      };
    }
  }
  
  // Phase 3: Conditional enforcement
  if (reserveInfo.phase === 'phase_3') {
    if (reserveInfo.enforceStrict && bidAmount > reserveInfo.maxBid) {
      return {
        valid: false,
        error: `Bid exceeds reserve. You must maintain £${reserveInfo.floorReserve} to reach minimum squad size. Maximum allowed: £${reserveInfo.maxBid}`
      };
    }
  }
  
  return { valid: true };
}
