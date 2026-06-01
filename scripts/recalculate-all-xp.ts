import { PrismaClient } from '@prisma/client'
import { evaluateTeamAchievements } from '../lib/achievements-engine'

const prisma = new PrismaClient()

async function recalculateAllXP() {
  console.log('🔄 Starting XP recalculation for all teams...')
  console.log('📝 This will update:')
  console.log('   - Team XP and levels')
  console.log('   - XP history audit trail (team_xp_history)')
  console.log('   - Badge awards\n')

  try {
    // Get all teams
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

    console.log(`📊 Found ${teams.length} teams to recalculate\n`)

    let successCount = 0
    let errorCount = 0

    // Process each team
    for (const team of teams) {
      try {
        console.log(`⚙️  Processing: ${team.name}`)
        console.log(`   Old: Level ${team.level}, ${team.xp} XP`)

        // Run achievement evaluation - this will recalculate everything
        const result = await evaluateTeamAchievements(team.id)

        if (result) {
          // Fetch updated team data
          const updatedTeam = await prisma.teams.findUnique({
            where: { id: team.id },
            select: { xp: true, level: true }
          })

          if (updatedTeam) {
            console.log(`   New: Level ${updatedTeam.level}, ${updatedTeam.xp} XP`)
            
            if (result.leveledUp) {
              console.log(`   🎉 LEVELED UP! ${result.oldLevel} → ${result.newLevel}`)
            } else if (updatedTeam.level < team.level) {
              console.log(`   ⬇️  Level adjusted down (new formula)`)
            }
            
            if (result.newBadgesUnlocked && result.newBadgesUnlocked.length > 0) {
              console.log(`   🏆 Badges: ${result.newBadgesUnlocked.map(b => b.key).join(', ')}`)
            }
          }

          successCount++
          console.log(`   ✅ Success!\n`)
        } else {
          console.log(`   ⚠️  No changes needed\n`)
          successCount++
        }
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}\n`)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 RECALCULATION COMPLETE')
    console.log('='.repeat(60))
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    console.log(`📊 Total: ${teams.length}`)
    console.log('\n📝 Updated:')
    console.log('   - Team XP and levels recalculated with new formula')
    console.log('   - XP history (team_xp_history) regenerated with new values')
    console.log('   - Badge awards verified and synced')
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

  } catch (error) {
    console.error('💥 Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
recalculateAllXP()
  .then(() => {
    console.log('✨ Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
