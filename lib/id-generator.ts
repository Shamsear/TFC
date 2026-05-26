/**
 * ID Generator for TFC Application
 * Generates clean, readable IDs with prefixes
 */

import { prisma } from './prisma'

// ID Prefixes
export const ID_PREFIXES = {
  PLAYER: 'TFCP',
  SEASON: 'TFCS',
  USER: 'TFCU',
  TOURNAMENT: 'TFCT',
  TEAM: 'TFCM', // M for Team
  FIXTURE: 'TFCF',
  MATCH: 'TFCMA',
  TRANSFER: 'TFCTH', // TH for Transfer History
  TIEBREAKER: 'TFCTB', // TB for Tiebreaker
  BID_AUDIT: 'TFCBA', // BA for Bid Audit
  AUCTION: 'TFCA',
  AUCTION_SLOT: 'TFCAS',
  RETENTION: 'TFCR',
  SEASON_TEAM: 'TFCST',
  PLAYER_STATS: 'TFCPS',
  FINANCIAL: 'TFCFL',
  AUDIT: 'TFCAL',
  TOURNAMENT_TEAM: 'TFCTT',
  KNOCKOUT_ROUND: 'TFCKR',
  KNOCKOUT_PAIRING: 'TFCKP',
  GROUP: 'TFCG',
  STANDING: 'TFCSD',
  ROUND: 'TFCR',
  RELEASE_WINDOW: 'TFCRW',
  SWAP_WINDOW: 'TFCSW',
} as const

type IDPrefix = typeof ID_PREFIXES[keyof typeof ID_PREFIXES]

/**
 * Generate multiple IDs with the given prefix in batch
 * @param prefix - The prefix for the ID (e.g., 'TFCP' for players)
 * @param count - Number of IDs to generate
 * @returns Array of new unique IDs
 */
export async function generateIds(prefix: IDPrefix, count: number): Promise<string[]> {
  if (count <= 0) return [];
  
  // Use PostgreSQL's UPDATE ... RETURNING for atomic increment
  const result = await prisma.$queryRaw<Array<{ counter: number }>>`
    INSERT INTO id_counters (prefix, counter, updated_at)
    VALUES (${prefix}, ${count}, NOW())
    ON CONFLICT (prefix) 
    DO UPDATE SET 
      counter = id_counters.counter + ${count},
      updated_at = NOW()
    RETURNING counter
  `

  const endCounter = result[0]?.counter || count;
  const startCounter = endCounter - count + 1;
  
  const ids: string[] = [];
  for (let i = startCounter; i <= endCounter; i++) {
    ids.push(`${prefix}-${i}`);
  }
  
  return ids;
}

/**
 * Generate a new ID with the given prefix using atomic counter
 * @param prefix - The prefix for the ID (e.g., 'TFCP' for players)
 * @returns A new unique ID (e.g., 'TFCP-1', 'TFCP-2', etc.)
 */
export async function generateId(prefix: IDPrefix): Promise<string> {
  const ids = await generateIds(prefix, 1);
  return ids[0];
}

/**
 * Generate a player ID
 */
export async function generatePlayerId(): Promise<string> {
  return generateId(ID_PREFIXES.PLAYER)
}

/**
 * Generate a season ID
 */
export async function generateSeasonId(): Promise<string> {
  return generateId(ID_PREFIXES.SEASON)
}

/**
 * Generate a user ID
 */
export async function generateUserId(): Promise<string> {
  return generateId(ID_PREFIXES.USER)
}

/**
 * Generate a tournament ID
 */
export async function generateTournamentId(): Promise<string> {
  return generateId(ID_PREFIXES.TOURNAMENT)
}

/**
 * Generate a team ID
 */
export async function generateTeamId(): Promise<string> {
  return generateId(ID_PREFIXES.TEAM)
}

/**
 * Generate a fixture ID
 */
export async function generateFixtureId(): Promise<string> {
  return generateId(ID_PREFIXES.FIXTURE)
}

/**
 * Generate a match ID
 */
export async function generateMatchId(): Promise<string> {
  return generateId(ID_PREFIXES.MATCH)
}

/**
 * Generate a transfer ID
 */
export async function generateTransferId(): Promise<string> {
  return generateId(ID_PREFIXES.TRANSFER)
}

/**
 * Generate a tiebreaker ID
 */
export async function generateTiebreakerId(): Promise<string> {
  return generateId(ID_PREFIXES.TIEBREAKER)
}

/**
 * Generate a bid audit log ID
 */
export async function generateBidAuditId(): Promise<string> {
  return generateId(ID_PREFIXES.BID_AUDIT)
}

/**
 * Generate an auction ID
 */
export async function generateAuctionId(): Promise<string> {
  return generateId(ID_PREFIXES.AUCTION)
}

/**
 * Generate an auction slot ID
 */
export async function generateAuctionSlotId(): Promise<string> {
  return generateId(ID_PREFIXES.AUCTION_SLOT)
}

/**
 * Generate a retention ID
 */
export async function generateRetentionId(): Promise<string> {
  return generateId(ID_PREFIXES.RETENTION)
}

/**
 * Generate a season team ID
 */
export async function generateSeasonTeamId(): Promise<string> {
  return generateId(ID_PREFIXES.SEASON_TEAM)
}

/**
 * Generate a player stats ID
 */
export async function generatePlayerStatsId(): Promise<string> {
  return generateId(ID_PREFIXES.PLAYER_STATS)
}

/**
 * Generate a financial ledger ID
 */
export async function generateFinancialId(): Promise<string> {
  return generateId(ID_PREFIXES.FINANCIAL)
}

/**
 * Generate an audit log ID
 */
export async function generateAuditId(): Promise<string> {
  return generateId(ID_PREFIXES.AUDIT)
}

/**
 * Generate a tournament team ID
 */
export async function generateTournamentTeamId(): Promise<string> {
  return generateId(ID_PREFIXES.TOURNAMENT_TEAM)
}

/**
 * Generate a knockout round ID
 */
export async function generateKnockoutRoundId(): Promise<string> {
  return generateId(ID_PREFIXES.KNOCKOUT_ROUND)
}

/**
 * Generate a knockout pairing ID
 */
export async function generateKnockoutPairingId(): Promise<string> {
  return generateId(ID_PREFIXES.KNOCKOUT_PAIRING)
}

/**
 * Generate a group ID
 */
export async function generateGroupId(): Promise<string> {
  return generateId(ID_PREFIXES.GROUP)
}

/**
 * Generate a standing ID
 */
export async function generateStandingId(): Promise<string> {
  return generateId(ID_PREFIXES.STANDING)
}

/**
 * Generate a round ID
 */
export async function generateRoundId(): Promise<string> {
  return generateId(ID_PREFIXES.ROUND)
}

/**
 * Validate if an ID matches the expected format
 * @param id - The ID to validate
 * @param prefix - The expected prefix
 * @returns true if valid, false otherwise
 */
export function validateId(id: string, prefix: IDPrefix): boolean {
  const regex = new RegExp(`^${prefix}-\\d+$`)
  return regex.test(id)
}

/**
 * Extract the number from an ID
 * @param id - The ID (e.g., 'TFCP-123')
 * @returns The number part (e.g., 123)
 */
export function extractIdNumber(id: string): number {
  const parts = id.split('-')
  return parseInt(parts[1] || '0', 10)
}
