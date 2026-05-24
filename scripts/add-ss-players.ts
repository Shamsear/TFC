import { PrismaClient } from '@prisma/client'
import { normalizeString } from '../lib/search-utils'

const prisma = new PrismaClient()

async function addSSPlayers() {
  try {
    // Get active season
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true }
    })

    if (!activeSeason) {
      throw new Error('No active season found. Please activate a season first.')
    }

    console.log(`Adding SS players to season: ${activeSeason.name} (${activeSeason.id})`)

    // Player 1: Marco Rossi (Italian SS)
    await prisma.base_players.upsert({
      where: { id: 'BP_SS_001' },
      create: {
        id: 'BP_SS_001',
        name: 'Marco Rossi',
        normalized_name: normalizeString('Marco Rossi'),
        player_id: 'dummy_ss_001',
        photoUrl: 'https://cdn.sofifa.net/players/default.png',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {}
    })

    await prisma.seasonal_player_stats.upsert({
      where: { id: 'SPS_SS_001' },
      create: {
        id: 'SPS_SS_001',
        basePlayerId: 'BP_SS_001',
        seasonId: activeSeason.id,
        position: 'SS',
        overallRating: 85,
        nationality: 'Italy',
        realWorldClub: 'Free Agent',
        speed: 82,
        finishing: 88,
        low_pass: 84,
        dribbling: 86,
        tackling: 45,
        physical_contact: 75,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {}
    })

    console.log('✓ Added Marco Rossi (SS, OVR 85, Italy)')

    // Player 2: Lucas Silva (Brazilian SS)
    await prisma.base_players.upsert({
      where: { id: 'BP_SS_002' },
      create: {
        id: 'BP_SS_002',
        name: 'Lucas Silva',
        normalized_name: normalizeString('Lucas Silva'),
        player_id: 'dummy_ss_002',
        photoUrl: 'https://cdn.sofifa.net/players/default.png',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {}
    })

    await prisma.seasonal_player_stats.upsert({
      where: { id: 'SPS_SS_002' },
      create: {
        id: 'SPS_SS_002',
        basePlayerId: 'BP_SS_002',
        seasonId: activeSeason.id,
        position: 'SS',
        overallRating: 83,
        nationality: 'Brazil',
        realWorldClub: 'Free Agent',
        speed: 85,
        finishing: 82,
        low_pass: 88,
        dribbling: 89,
        tackling: 40,
        physical_contact: 70,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {}
    })

    console.log('✓ Added Lucas Silva (SS, OVR 83, Brazil)')

    // Player 3: Ahmed Hassan (Egyptian SS)
    await prisma.base_players.upsert({
      where: { id: 'BP_SS_003' },
      create: {
        id: 'BP_SS_003',
        name: 'Ahmed Hassan',
        normalized_name: normalizeString('Ahmed Hassan'),
        name: 'Ahmed Hassan',
        player_id: 'dummy_ss_003',
        photoUrl: 'https://cdn.sofifa.net/players/default.png',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {}
    })

    await prisma.seasonal_player_stats.upsert({
      where: { id: 'SPS_SS_003' },
      create: {
        id: 'SPS_SS_003',
        basePlayerId: 'BP_SS_003',
        seasonId: activeSeason.id,
        position: 'SS',
        overallRating: 81,
        nationality: 'Egypt',
        realWorldClub: 'Free Agent',
        speed: 80,
        finishing: 84,
        low_pass: 78,
        dribbling: 80,
        tackling: 48,
        physical_contact: 82,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {}
    })

    console.log('✓ Added Ahmed Hassan (SS, OVR 81, Egypt)')

    // Verify
    const ssPlayers = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId: activeSeason.id,
        position: 'SS',
        basePlayerId: {
          in: ['BP_SS_001', 'BP_SS_002', 'BP_SS_003']
        }
      },
      include: {
        basePlayer: true
      },
      orderBy: {
        overallRating: 'desc'
      }
    })

    console.log('\n✅ Successfully added 3 SS players:')
    ssPlayers.forEach(player => {
      console.log(`   - ${player.basePlayer.name} (${player.position}, OVR ${player.overallRating}, ${player.nationality})`)
    })

  } catch (error) {
    console.error('❌ Error adding SS players:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

addSSPlayers()
