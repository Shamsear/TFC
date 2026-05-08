/**
 * Property-Based Tests: Transfer History
 * 
 * Tests Properties 14-15 from the design document
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { resetTestDatabase, createTestSeason, createTestTeam, createTestPlayer, createTestSeasonTeam } from '../helpers/test-data'
import { prisma } from '@/lib/prisma'

describe('Property Tests: Transfer History', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  it('Property 14: Transfer History Required Fields', async () => {
    /**
     * Feature: turf-cats-tournament-platform
     * Property 14: For any transfer history record, it must include valid references
     * to season, team, base player, and a non-negative sold price.
     * 
     * **Validates: Requirements 6.2**
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // playerName
        fc.integer({ min: 0, max: 10000000 }), // soldPrice (non-negative)
        
        async (playerName, soldPrice) => {
          // Setup: Create season, team, and player
          const season = await createTestSeason()
          const team = await createTestTeam()
          await createTestSeasonTeam(season.id, team.id)
          const player = await createTestPlayer({ name: playerName })
          
          // Execute: Create transfer history record
          const transfer = await prisma.transferHistory.create({
            data: {
              basePlayerId: player.id,
              seasonId: season.id,
              teamId: team.id,
              soldPrice: soldPrice,
            }
          })
          
          // Verify: All required fields are present and valid
          expect(transfer.id).toBeDefined()
          expect(transfer.basePlayerId).toBe(player.id)
          expect(transfer.seasonId).toBe(season.id)
          expect(transfer.teamId).toBe(team.id)
          expect(transfer.soldPrice).toBe(soldPrice)
          expect(transfer.soldPrice).toBeGreaterThanOrEqual(0)
          expect(transfer.createdAt).toBeInstanceOf(Date)
          
          // Verify: References are valid (can be retrieved)
          const retrievedPlayer = await prisma.basePlayer.findUnique({
            where: { id: transfer.basePlayerId }
          })
          const retrievedSeason = await prisma.season.findUnique({
            where: { id: transfer.seasonId }
          })
          const retrievedTeam = await prisma.team.findUnique({
            where: { id: transfer.teamId }
          })
          
          expect(retrievedPlayer).toBeDefined()
          expect(retrievedSeason).toBeDefined()
          expect(retrievedTeam).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 15: Transfer History Preservation', async () => {
    /**
     * Feature: turf-cats-tournament-platform
     * Property 15: For any transfer history record, subsequent operations
     * (new seasons, team updates, player updates) should not delete or modify
     * that historical record.
     * 
     * **Validates: Requirements 6.4**
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 5000000 }), // soldPrice
        fc.string({ minLength: 1, maxLength: 50 }), // newTeamName
        fc.string({ minLength: 1, maxLength: 50 }), // newSeasonName
        
        async (soldPrice, newTeamName, newSeasonName) => {
          // Setup: Create initial season, team, player, and transfer
          const season1 = await createTestSeason({ name: 'Season 1' })
          const team1 = await createTestTeam({ name: 'Team 1' })
          await createTestSeasonTeam(season1.id, team1.id)
          const player = await createTestPlayer({ name: 'Test Player' })
          
          const originalTransfer = await prisma.transferHistory.create({
            data: {
              basePlayerId: player.id,
              seasonId: season1.id,
              teamId: team1.id,
              soldPrice: soldPrice,
            }
          })
          
          // Store original transfer data
          const originalTransferId = originalTransfer.id
          const originalSoldPrice = originalTransfer.soldPrice
          const originalCreatedAt = originalTransfer.createdAt
          
          // Execute: Perform subsequent operations
          
          // 1. Create new season
          const season2 = await createTestSeason({ name: newSeasonName })
          
          // 2. Update team information
          await prisma.team.update({
            where: { id: team1.id },
            data: { name: newTeamName }
          })
          
          // 3. Create new team
          const team2 = await createTestTeam({ name: 'Team 2' })
          await createTestSeasonTeam(season2.id, team2.id)
          
          // 4. Update player information
          await prisma.basePlayer.update({
            where: { id: player.id },
            data: { photoUrl: 'https://new-url.com/photo.jpg' }
          })
          
          // 5. Create new transfer in new season
          await prisma.transferHistory.create({
            data: {
              basePlayerId: player.id,
              seasonId: season2.id,
              teamId: team2.id,
              soldPrice: soldPrice + 1000,
            }
          })
          
          // Verify: Original transfer record is preserved and unchanged
          const preservedTransfer = await prisma.transferHistory.findUnique({
            where: { id: originalTransferId }
          })
          
          expect(preservedTransfer).toBeDefined()
          expect(preservedTransfer!.id).toBe(originalTransferId)
          expect(preservedTransfer!.basePlayerId).toBe(player.id)
          expect(preservedTransfer!.seasonId).toBe(season1.id)
          expect(preservedTransfer!.teamId).toBe(team1.id)
          expect(preservedTransfer!.soldPrice).toBe(originalSoldPrice)
          expect(preservedTransfer!.createdAt.getTime()).toBe(originalCreatedAt.getTime())
          
          // Verify: All transfer records exist (old and new)
          const allTransfers = await prisma.transferHistory.findMany({
            where: { basePlayerId: player.id }
          })
          expect(allTransfers.length).toBeGreaterThanOrEqual(2)
        }
      ),
      { numRuns: 100 }
    )
  })
})
