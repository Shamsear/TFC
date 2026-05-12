/**
 * Diagnostic script to identify why players page might be empty
 * Run with: npx tsx scripts/diagnose-players-issue.ts
 */

import { prisma } from '../lib/prisma'

async function diagnose() {
  console.log('🔍 Diagnosing Players Page Issue...\n')

  // Check 1: Active Season
  console.log('1️⃣ Checking for active season...')
  const activeSeasons = await prisma.seasons.findMany({
    where: { isActive: true }
  })
  
  if (activeSeasons.length === 0) {
    console.log('❌ NO ACTIVE SEASON FOUND - This is the problem!')
    console.log('   Solution: Set a season as active in the database\n')
  } else if (activeSeasons.length > 1) {
    console.log(`⚠️  Multiple active seasons found (${activeSeasons.length})`)
    activeSeasons.forEach(s => console.log(`   - ${s.name} (ID: ${s.id})`))
    console.log('   Solution: Only one season should be active\n')
  } else {
    const activeSeason = activeSeasons[0]
    console.log(`✅ Active season: ${activeSeason.name} (ID: ${activeSeason.id})\n`)

    // Check 2: Seasonal Player Stats
    console.log('2️⃣ Checking seasonal player stats...')
    const statsCount = await prisma.seasonal_player_stats.count({
      where: { seasonId: activeSeason.id }
    })
    
    if (statsCount === 0) {
      console.log(`❌ NO SEASONAL PLAYER STATS for active season ${activeSeason.id}`)
      console.log('   This is why the players page is empty!\n')
      
      // Check if base players exist
      const basePlayersCount = await prisma.base_players.count()
      console.log(`   Base players in database: ${basePlayersCount}`)
      
      if (basePlayersCount > 0) {
        console.log('   Solution: Import players for this season or link existing players\n')
      } else {
        console.log('   Solution: Import players into the system\n')
      }
    } else {
      console.log(`✅ Found ${statsCount} seasonal player stats records\n`)
      
      // Check 3: Sample player data
      console.log('3️⃣ Sample player data...')
      const samplePlayers = await prisma.seasonal_player_stats.findMany({
        where: { seasonId: activeSeason.id },
        include: { basePlayer: true },
        take: 3
      })
      
      samplePlayers.forEach(p => {
        console.log(`   - ${p.basePlayer.name} (${p.position}, Rating: ${p.overallRating})`)
      })
    }
  }

  // Check 4: All seasons overview
  console.log('\n4️⃣ All seasons in database:')
  const allSeasons = await prisma.seasons.findMany({
    orderBy: { createdAt: 'desc' }
  })
  
  for (const season of allSeasons) {
    const playerCount = await prisma.seasonal_player_stats.count({
      where: { seasonId: season.id }
    })
    const activeFlag = season.isActive ? '🟢 ACTIVE' : '⚪'
    console.log(`   ${activeFlag} ${season.name} - ${playerCount} players`)
  }

  console.log('\n✅ Diagnosis complete!')
  
  await prisma.$disconnect()
}

diagnose().catch(console.error)
