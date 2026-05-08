import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import type { UserRole } from '@prisma/client'

/**
 * Reset the test database by deleting all records in the correct order
 * to respect foreign key constraints
 */
export async function resetTestDatabase() {
  // Delete in order to respect foreign key constraints
  await prisma.financial_ledger.deleteMany()
  await prisma.retentions.deleteMany()
  await prisma.transfer_history.deleteMany()
  await prisma.seasonal_player_stats.deleteMany()
  await prisma.base_players.deleteMany()
  await prisma.season_teams.deleteMany()
  await prisma.seasons.deleteMany()
  await prisma.teams.deleteMany()
  await prisma.users.deleteMany()
}

/**
 * Create a test user with specified role
 */
export async function createTestUser(data?: {
  email?: string
  name?: string
  role?: UserRole
  password?: string
}) {
  const passwordHash = await hash(data?.password || 'password123', 10)
  
  return prisma.users.create({
    data: {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: data?.email || `test-${Date.now()}@example.com`,
      name: data?.name || 'Test User',
      role: data?.role || 'SUB_ADMIN',
      passwordHash,
      updatedAt: new Date()
    },
  })
}

/**
 * Create a test team in the global registry
 */
export async function createTestTeam(data?: {
  name?: string
  managerName?: string
  logoUrl?: string
}) {
  return prisma.teams.create({
    data: {
      id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data?.name || `Test Team ${Date.now()}`,
      managerName: data?.managerName || 'Test Manager',
      logoUrl: data?.logoUrl || 'https://ik.imagekit.io/test/logo.png',
      updatedAt: new Date()
    },
  })
}

/**
 * Create a test season
 */
export async function createTestSeason(data?: {
  name?: string
  startingPurse?: number
  isActive?: boolean
}) {
  return prisma.seasons.create({
    data: {
      id: `season-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data?.name || `Season ${Date.now()}`,
      startingPurse: data?.startingPurse || 100000,
      isActive: data?.isActive ?? false,
      updatedAt: new Date()
    },
  })
}

/**
 * Create a test base player
 */
export async function createTestPlayer(data?: {
  name?: string
  photoUrl?: string
}) {
  return prisma.base_players.create({
    data: {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data?.name || `Test Player ${Date.now()}`,
      photoUrl: data?.photoUrl || 'https://ik.imagekit.io/test/player.png',
      updatedAt: new Date()
    },
  })
}

/**
 * Create seasonal player stats for a player
 */
export async function createTestSeasonalStats(
  basePlayerId: string,
  seasonId: string,
  data?: {
    position?: string
    realWorldClub?: string
    overallRating?: number
  }
) {
  return prisma.seasonal_player_stats.create({
    data: {
      id: `stats-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      basePlayerId,
      seasonId,
      position: data?.position || 'CMF',
      realWorldClub: data?.realWorldClub || 'Test FC',
      overallRating: data?.overallRating || 85,
      updatedAt: new Date()
    },
  })
}

/**
 * Assign a team to a season with starting budget
 */
export async function createTestSeasonTeam(
  seasonId: string,
  teamId: string,
  data?: {
    currentBudget?: number
    finalBudget?: number
    trophiesWon?: number
  }
) {
  const season = await prisma.seasons.findUnique({ where: { id: seasonId } })
  
  return prisma.season_teams.create({
    data: {
      id: `season-team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      seasonId,
      teamId,
      currentBudget: data?.currentBudget ?? season?.startingPurse ?? 100000,
      finalBudget: data?.finalBudget,
      trophiesWon: data?.trophiesWon ?? 0,
      updatedAt: new Date()
    },
  })
}

/**
 * Create a transfer history record
 */
export async function createTestTransfer(
  basePlayerId: string,
  seasonId: string,
  teamId: string,
  soldPrice: number
) {
  return prisma.transfer_history.create({
    data: {
      id: `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      basePlayerId,
      seasonId,
      teamId,
      soldPrice,
    },
  })
}

/**
 * Create a financial ledger entry
 */
export async function createTestLedgerEntry(
  seasonTeamId: string,
  seasonId: string,
  data: {
    transactionType: 'INITIAL_PURSE' | 'PLAYER_PURCHASE' | 'PLAYER_SALE' | 'ADJUSTMENT'
    amount: number
    previousBalance: number
    newBalance: number
    description?: string
  }
) {
  return prisma.financial_ledger.create({
    data: {
      id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      seasonTeamId,
      seasonId,
      transactionType: data.transactionType,
      amount: data.amount,
      previousBalance: data.previousBalance,
      newBalance: data.newBalance,
      description: data.description,
    },
  })
}

/**
 * Create a retention record
 */
export async function createTestRetention(
  seasonId: string,
  basePlayerId: string,
  retainedFromSeasonId: string
) {
  return prisma.retentions.create({
    data: {
      id: `retention-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      seasonId,
      basePlayerId,
      retainedFromSeasonId,
    },
  })
}

/**
 * Create a complete test scenario with season, teams, and players
 */
export async function createTestScenario() {
  // Create season
  const season = await createTestSeason({
    name: 'Test Season 2024',
    startingPurse: 100000,
    isActive: true,
  })

  // Create teams
  const team1 = await createTestTeam({
    name: 'Team Alpha',
    managerName: 'Manager A',
  })
  
  const team2 = await createTestTeam({
    name: 'Team Beta',
    managerName: 'Manager B',
  })

  // Assign teams to season
  const seasonTeam1 = await createTestSeasonTeam(season.id, team1.id)
  const seasonTeam2 = await createTestSeasonTeam(season.id, team2.id)

  // Create players
  const player1 = await createTestPlayer({ name: 'John Doe' })
  const player2 = await createTestPlayer({ name: 'Jane Smith' })

  // Create seasonal stats
  await createTestSeasonalStats(player1.id, season.id, {
    position: 'ST',
    realWorldClub: 'Manchester United',
    overallRating: 89,
  })
  
  await createTestSeasonalStats(player2.id, season.id, {
    position: 'CM',
    realWorldClub: 'Barcelona',
    overallRating: 87,
  })

  return {
    season,
    teams: [team1, team2],
    seasonTeams: [seasonTeam1, seasonTeam2],
    players: [player1, player2],
  }
}
