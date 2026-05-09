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
  TRANSFER: 'TFCTR',
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
} as const

type IDPrefix = typeof ID_PREFIXES[keyof typeof ID_PREFIXES]

/**
 * Generate a new ID with the given prefix
 * @param prefix - The prefix for the ID (e.g., 'TFCP' for players)
 * @param tableName - The Prisma model name (e.g., 'base_players')
 * @returns A new unique ID (e.g., 'TFCP-1', 'TFCP-2', etc.)
 */
export async function generateId(prefix: IDPrefix, tableName: string): Promise<string> {
  // Get the last ID with this prefix
  const lastRecord = await (prisma as any)[tableName].findFirst({
    where: {
      id: {
        startsWith: prefix
      }
    },
    orderBy: {
      id: 'desc'
    },
    select: {
      id: true
    }
  })

  if (!lastRecord) {
    return `${prefix}-1`
  }

  // Extract the number from the last ID
  const lastNumber = parseInt(lastRecord.id.split('-')[1] || '0', 10)
  const nextNumber = lastNumber + 1

  return `${prefix}-${nextNumber}`
}

/**
 * Generate a player ID
 */
export async function generatePlayerId(): Promise<string> {
  return generateId(ID_PREFIXES.PLAYER, 'base_players')
}

/**
 * Generate a season ID
 */
export async function generateSeasonId(): Promise<string> {
  return generateId(ID_PREFIXES.SEASON, 'seasons')
}

/**
 * Generate a user ID
 */
export async function generateUserId(): Promise<string> {
  return generateId(ID_PREFIXES.USER, 'users')
}

/**
 * Generate a tournament ID
 */
export async function generateTournamentId(): Promise<string> {
  return generateId(ID_PREFIXES.TOURNAMENT, 'tournaments')
}

/**
 * Generate a team ID
 */
export async function generateTeamId(): Promise<string> {
  return generateId(ID_PREFIXES.TEAM, 'teams')
}

/**
 * Generate a fixture ID
 */
export async function generateFixtureId(): Promise<string> {
  return generateId(ID_PREFIXES.FIXTURE, 'fixtures')
}

/**
 * Generate a match ID
 */
export async function generateMatchId(): Promise<string> {
  return generateId(ID_PREFIXES.MATCH, 'fixture_matches')
}

/**
 * Generate a transfer ID
 */
export async function generateTransferId(): Promise<string> {
  return generateId(ID_PREFIXES.TRANSFER, 'transfer_history')
}

/**
 * Generate an auction ID
 */
export async function generateAuctionId(): Promise<string> {
  return generateId(ID_PREFIXES.AUCTION, 'auction_calendar')
}

/**
 * Generate an auction slot ID
 */
export async function generateAuctionSlotId(): Promise<string> {
  return generateId(ID_PREFIXES.AUCTION_SLOT, 'auction_slots')
}

/**
 * Generate a retention ID
 */
export async function generateRetentionId(): Promise<string> {
  return generateId(ID_PREFIXES.RETENTION, 'retentions')
}

/**
 * Generate a season team ID
 */
export async function generateSeasonTeamId(): Promise<string> {
  return generateId(ID_PREFIXES.SEASON_TEAM, 'season_teams')
}

/**
 * Generate a player stats ID
 */
export async function generatePlayerStatsId(): Promise<string> {
  return generateId(ID_PREFIXES.PLAYER_STATS, 'seasonal_player_stats')
}

/**
 * Generate a financial ledger ID
 */
export async function generateFinancialId(): Promise<string> {
  return generateId(ID_PREFIXES.FINANCIAL, 'financial_ledger')
}

/**
 * Generate an audit log ID
 */
export async function generateAuditId(): Promise<string> {
  return generateId(ID_PREFIXES.AUDIT, 'audit_logs')
}

/**
 * Generate a tournament team ID
 */
export async function generateTournamentTeamId(): Promise<string> {
  return generateId(ID_PREFIXES.TOURNAMENT_TEAM, 'tournament_teams')
}

/**
 * Generate a knockout round ID
 */
export async function generateKnockoutRoundId(): Promise<string> {
  return generateId(ID_PREFIXES.KNOCKOUT_ROUND, 'knockout_rounds')
}

/**
 * Generate a knockout pairing ID
 */
export async function generateKnockoutPairingId(): Promise<string> {
  return generateId(ID_PREFIXES.KNOCKOUT_PAIRING, 'knockout_pairings')
}

/**
 * Generate a group ID
 */
export async function generateGroupId(): Promise<string> {
  return generateId(ID_PREFIXES.GROUP, 'groups')
}

/**
 * Generate a standing ID
 */
export async function generateStandingId(): Promise<string> {
  return generateId(ID_PREFIXES.STANDING, 'standings')
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
