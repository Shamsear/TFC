import { PrismaClient } from '@prisma/client'
import { calculateLevelFromXP } from '../lib/achievements-math'

const prisma = new PrismaClient()

async function fixTeamLevels() {
  console.log('🔧 FIXING TEAM LEVELS BASED ON CURRENT XP')
  console.log('=' .repeat(60))

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

    console.log(`📊 Found ${teams.length} teams\n`)

    let fixedCount = 0
    let correctCount = 0

    for (const team of teams) {
      const correctLevel = calculateLevelFromXP(team.xp)
      
      if (team.level !== correctLevel) {
        console.log(`🔧 ${team.name}`)
        console.log(`   Current: Level ${team.level} with ${team.xp} XP`)
        console.log(`   Correct: Level ${correctLevel}`)
        
        await prisma.teams.update({
          where: { id: team.id },
          data: { level: correctLevel }
        })
        
        console.log(`   ✅ Fixed!\n`)
        fixedCount++
      } else {
        correctCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 FIX COMPLETE')
    console.log('='.repeat(60))
    console.log(`✅ Fixed: ${fixedCount}`)
    console.log(`✓  Already correct: ${correctCount}`)
    console.log(`📊 Total: ${teams.length}`)
    console.log('='.repeat(60) + '\n')

    // Show all teams with their corrected levels
    const updatedTeams = await prisma.teams.findMany({
      select: {
        name: true,
        xp: true,
        level: true
      },
      orderBy: {
        xp: 'desc'
      }
    })

    console.log('📊 ALL TEAMS (sorted by XP):')
    console.log('─'.repeat(60))
    updatedTeams.forEach((team, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${team.name.padEnd(30)} Level ${team.level.toString().padStart(2)} (${team.xp.toString().padStart(6)} XP)`)
    })
    console.log('─'.repeat(60) + '\n')

  } catch (error) {
    console.error('💥 Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixTeamLevels()
  .then(() => {
    console.log('✨ Fix completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error)
    process.exit(1)
  })
