import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Season-end badges that should only be awarded manually
const SEASON_END_BADGES = [
  'GOLDEN_BOOT',
  'GOLDEN_GLOVE',
  'GOLDEN_INVINCIBLES',
  'TROPHY_HOARDER'
]

async function removeSeasonEndBadges() {
  console.log('🧹 Removing wrongly awarded season-end badges...\n')

  try {
    // Find all season-end badges that were awarded
    const wrongBadges = await prisma.team_badges.findMany({
      where: {
        badgeKey: {
          in: SEASON_END_BADGES
        }
      },
      include: {
        team: {
          select: {
            name: true
          }
        }
      }
    })

    console.log(`📊 Found ${wrongBadges.length} season-end badges to remove\n`)

    if (wrongBadges.length === 0) {
      console.log('✅ No wrongly awarded badges found!')
      return
    }

    // Group by badge type for reporting
    const badgesByType: Record<string, any[]> = {}
    wrongBadges.forEach(badge => {
      if (!badgesByType[badge.badgeKey]) {
        badgesByType[badge.badgeKey] = []
      }
      badgesByType[badge.badgeKey].push(badge)
    })

    // Show what will be removed
    console.log('📋 Badges to be removed:')
    console.log('─'.repeat(60))
    for (const [badgeKey, badges] of Object.entries(badgesByType)) {
      console.log(`\n${badgeKey} (${badges.length} teams):`)
      badges.forEach(badge => {
        console.log(`  - ${badge.team.name}`)
      })
    }
    console.log('\n' + '─'.repeat(60) + '\n')

    // Delete the badges
    const result = await prisma.team_badges.deleteMany({
      where: {
        badgeKey: {
          in: SEASON_END_BADGES
        }
      }
    })

    console.log(`✅ Successfully removed ${result.count} badges\n`)

    // Now we need to recalculate XP for affected teams
    console.log('🔄 Recalculating XP for affected teams...\n')

    const affectedTeamIds = [...new Set(wrongBadges.map(b => b.teamId))]
    
    for (const teamId of affectedTeamIds) {
      const team = await prisma.teams.findUnique({
        where: { id: teamId },
        select: { name: true, xp: true, level: true }
      })

      if (team) {
        console.log(`⚙️  ${team.name}`)
        console.log(`   Before: Level ${team.level}, ${team.xp} XP`)

        // Import and run achievement evaluation
        const { evaluateTeamAchievements } = await import('../lib/achievements-engine')
        await evaluateTeamAchievements(teamId)

        const updatedTeam = await prisma.teams.findUnique({
          where: { id: teamId },
          select: { xp: true, level: true }
        })

        if (updatedTeam) {
          console.log(`   After: Level ${updatedTeam.level}, ${updatedTeam.xp} XP`)
          
          if (updatedTeam.level < team.level) {
            console.log(`   ⬇️  Level decreased (badges removed)`)
          }
        }
        console.log()
      }
    }

    console.log('='.repeat(60))
    console.log('✨ CLEANUP COMPLETE')
    console.log('='.repeat(60))
    console.log(`🗑️  Removed: ${result.count} season-end badges`)
    console.log(`🔄 Recalculated: ${affectedTeamIds.length} teams`)
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('💥 Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
removeSeasonEndBadges()
  .then(() => {
    console.log('✅ Cleanup completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  })
