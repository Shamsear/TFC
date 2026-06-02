import { PrismaClient } from '@prisma/client'
import { evaluateTeamAchievements } from '../lib/achievements-engine'

const prisma = new PrismaClient()

async function resetAllAchievements() {
  console.log('🔄 RESETTING ALL ACHIEVEMENTS AND XP')
  console.log('=' .repeat(60))
  console.log('This will:')
  console.log('  1. Delete all team badges')
  console.log('  2. Delete all XP history')
  console.log('  3. Reset all team XP and levels to 1')
  console.log('  4. Recalculate everything from scratch')
  console.log('=' .repeat(60) + '\n')

  try {
    // Step 1: Get all teams
    const teams = await prisma.teams.findMany({
      select: {
        id: true,
        name: true,
        xp: true,
        level: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    console.log(`📊 Found ${teams.length} teams\n`)

    // Step 2: Delete all badges and XP history
    console.log('🗑️  Deleting all badges and XP history...')
    
    const deletedBadges = await prisma.team_badges.deleteMany({})
    console.log(`   ✅ Deleted ${deletedBadges.count} badges`)
    
    const deletedXP = await prisma.team_xp_history.deleteMany({})
    console.log(`   ✅ Deleted ${deletedXP.count} XP history records`)

    // Step 3: Reset all teams to level 1 with 0 XP
    console.log('\n🔄 Resetting all teams to Level 1...')
    await prisma.teams.updateMany({
      data: {
        xp: 0,
        level: 1
      }
    })
    console.log('   ✅ All teams reset to Level 1, 0 XP\n')

    // Step 4: Recalculate achievements for each team
    console.log('=' .repeat(60))
    console.log('🔄 RECALCULATING ACHIEVEMENTS FROM SCRATCH')
    console.log('=' .repeat(60) + '\n')

    let successCount = 0
    let errorCount = 0

    for (const team of teams) {
      try {
        console.log(`⚙️  Processing: ${team.name}`)

        // Run achievement evaluation
        const result = await evaluateTeamAchievements(team.id)

        if (result) {
          // Fetch updated team data
          const updatedTeam = await prisma.teams.findUnique({
            where: { id: team.id },
            select: { xp: true, level: true }
          })

          // Get match count for this team
          const seasonTeams = await prisma.season_teams.findMany({
            where: { teamId: team.id },
            select: { id: true }
          })
          const seasonTeamIds = seasonTeams.map(st => st.id)
          
          const matchCount = await prisma.matches.count({
            where: {
              status: 'COMPLETED',
              OR: [
                { homeTeamId: { in: seasonTeamIds } },
                { awayTeamId: { in: seasonTeamIds } },
              ],
            }
          })

          if (updatedTeam) {
            console.log(`   Level ${updatedTeam.level}, ${updatedTeam.xp} XP`)
            console.log(`   Matches processed: ${matchCount}`)
            
            if (result.newBadgesUnlocked && result.newBadgesUnlocked.length > 0) {
              console.log(`   🏆 Badges: ${result.newBadgesUnlocked.map(b => b.key).join(', ')}`)
            }
          }

          successCount++
          console.log(`   ✅ Success!\n`)
        } else {
          console.log(`   ⚠️  No achievements\n`)
          successCount++
        }
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}\n`)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 RESET COMPLETE')
    console.log('='.repeat(60))
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    console.log(`📊 Total: ${teams.length}`)
    console.log('\n📝 All achievements recalculated with:')
    console.log('   - New XP values (reduced)')
    console.log('   - New level formula (steeper curve)')
    console.log('   - Season-end badges disabled')
    console.log('='.repeat(60) + '\n')

    // Show top teams by new XP
    const topTeams = await prisma.teams.findMany({
      select: {
        name: true,
        xp: true,
        level: true
      },
      orderBy: {
        xp: 'desc'
      },
      take: 10
    })

    console.log('🏆 TOP 10 TEAMS BY XP:')
    console.log('─'.repeat(60))
    topTeams.forEach((team, idx) => {
      console.log(`${idx + 1}. ${team.name.padEnd(30)} Level ${team.level} (${team.xp} XP)`)
    })
    console.log('─'.repeat(60) + '\n')

    // Show badge distribution
    const badgeStats = await prisma.team_badges.groupBy({
      by: ['badgeKey'],
      _count: {
        badgeKey: true
      },
      orderBy: {
        _count: {
          badgeKey: 'desc'
        }
      }
    })

    console.log('🏅 BADGE DISTRIBUTION:')
    console.log('─'.repeat(60))
    badgeStats.forEach(stat => {
      console.log(`${stat.badgeKey.padEnd(30)} ${stat._count.badgeKey} teams`)
    })
    console.log('─'.repeat(60) + '\n')

  } catch (error) {
    console.error('💥 Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the reset
resetAllAchievements()
  .then(() => {
    console.log('✨ Reset completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Reset failed:', error)
    process.exit(1)
  })
