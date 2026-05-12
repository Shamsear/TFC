/**
 * Fix script for players page showing no players
 * Run with: npx tsx scripts/fix-players-page.ts
 */

import { prisma } from '../lib/prisma'

async function fix() {
  console.log('🔧 Attempting to fix players page issue...\n')

  // Step 1: Check for active season
  const activeSeasons = await prisma.seasons.findMany({
    where: { isActive: true }
  })

  let activeSeason = activeSeasons[0]

  if (activeSeasons.length === 0) {
    console.log('❌ No active season found')
    
    // Find the most recent season
    const latestSeason = await prisma.seasons.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (latestSeason) {
      console.log(`✅ Setting "${latestSeason.name}" as active season...`)
      activeSeason = await prisma.seasons.update({
        where: { id: latestSeason.id },
        data: { isActive: true }
      })
      console.log(`✅ Season "${activeSeason.name}" is now active\n`)
    } else {
      console.log('❌ No seasons found in database. Please create a season first.')
      await prisma.$disconnect()
      return
    }
  } else if (activeSeasons.length > 1) {
    console.log(`⚠️  Found ${activeSeasons.length} active seasons. Keeping only the most recent one...`)
    
    // Sort by creation date and keep the most recent
    const sortedSeasons = activeSeasons.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    )
    
    activeSeason = sortedSeasons[0]
    
    // Deactivate all others
    for (let i = 1; i < sortedSeasons.length; i++) {
      await prisma.seasons.update({
        where: { id: sortedSeasons[i].id },
        data: { isActive: false }
      })
      console.log(`   Deactivated: ${sortedSeasons[i].name}`)
    }
    console.log(`✅ Only "${activeSeason.name}" is now active\n`)
  } else {
    console.log(`✅ Active season: ${activeSeason.name}\n`)
  }

  // Step 2: Check for seasonal player stats
  const statsCount = await prisma.seasonal_player_stats.count({
    where: { seasonId: activeSeason.id }
  })

  console.log(`📊 Seasonal player stats for active season: ${statsCount}`)

  if (statsCount === 0) {
    console.log('⚠️  No players linked to active season')
    
    // Check if there are players in other seasons
    const otherSeasonStats = await prisma.seasonal_player_stats.findMany({
      where: { seasonId: { not: activeSeason.id } },
      include: { season: true },
      distinct: ['seasonId']
    })

    if (otherSeasonStats.length > 0) {
      const uniqueSeasons = [...new Set(otherSeasonStats.map(s => s.season))]
      console.log('\n📋 Players found in other seasons:')
      
      for (const season of uniqueSeasons) {
        const count = await prisma.seasonal_player_stats.count({
          where: { seasonId: season.id }
        })
        console.log(`   - ${season.name}: ${count} players`)
      }
      
      console.log('\n💡 Suggestion: Import players for the active season or switch active season')
    } else {
      console.log('\n💡 Suggestion: Import players using the import functionality')
    }
  } else {
    console.log(`✅ Players are properly linked to active season\n`)
  }

  console.log('✅ Fix attempt complete!')
  console.log('\n🔄 If the issue persists, try:')
  console.log('   1. Clear Next.js cache: rm -rf .next')
  console.log('   2. Restart the dev server')
  console.log('   3. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)')
  
  await prisma.$disconnect()
}

fix().catch(console.error)
