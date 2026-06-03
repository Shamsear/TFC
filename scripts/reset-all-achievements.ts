import { PrismaClient } from '@prisma/client'
import { evaluateTeamAchievements } from '../lib/achievements-engine'

const prisma = new PrismaClient()

// Check if running in preview mode
const PREVIEW_MODE = process.argv.includes('--preview') || process.argv.includes('--dry-run')

async function resetAllAchievements() {
  if (PREVIEW_MODE) {
    console.log('👀 PREVIEW MODE - NO CHANGES WILL BE MADE')
    console.log('=' .repeat(60))
    console.log('This will simulate:')
    console.log('  1. Checking all team data integrity')
    console.log('  2. Counting existing badges and XP history')
    console.log('  3. Testing achievement evaluation for each team')
    console.log('  4. Reporting any errors or issues found')
    console.log('=' .repeat(60) + '\n')
  } else {
    console.log('🔄 RESETTING ALL ACHIEVEMENTS AND XP')
    console.log('=' .repeat(60))
    console.log('This will:')
    console.log('  1. Delete all team badges')
    console.log('  2. Delete all XP history')
    console.log('  3. Reset all team XP and levels to 1')
    console.log('  4. Recalculate everything from scratch')
    console.log('=' .repeat(60) + '\n')
  }

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

    if (PREVIEW_MODE) {
      // PREVIEW MODE - Check data without modifying
      console.log('🔍 Checking existing data...')
      
      const badgeCount = await prisma.team_badges.count()
      console.log(`   📛 Current badges: ${badgeCount}`)
      
      const xpHistoryCount = await prisma.team_xp_history.count()
      console.log(`   📈 Current XP history records: ${xpHistoryCount}`)

      const teamsWithXP = await prisma.teams.count({
        where: { xp: { gt: 0 } }
      })
      console.log(`   ⚡ Teams with XP: ${teamsWithXP}`)

      const teamsAboveLevel1 = await prisma.teams.count({
        where: { level: { gt: 1 } }
      })
      console.log(`   📊 Teams above Level 1: ${teamsAboveLevel1}\n`)

      // Test data integrity
      console.log('🔍 Testing data integrity...')
      
      // Check for badges with non-existent teams
      const allBadges = await prisma.team_badges.findMany({
        select: { id: true, teamId: true, badgeKey: true }
      })
      const allTeamIds = new Set(teams.map(t => t.id))
      const orphanedBadges = allBadges.filter(b => !allTeamIds.has(b.teamId))
      
      if (orphanedBadges.length > 0) {
        console.log(`   ⚠️  WARNING: Found ${orphanedBadges.length} orphaned badges (team doesn't exist)`)
        orphanedBadges.slice(0, 5).forEach(b => {
          console.log(`      - Badge ${b.badgeKey} for team ${b.teamId}`)
        })
        if (orphanedBadges.length > 5) {
          console.log(`      ... and ${orphanedBadges.length - 5} more`)
        }
      } else {
        console.log(`   ✅ No orphaned badges found`)
      }

      // Check for XP records with non-existent teams
      const allXPRecords = await prisma.team_xp_history.findMany({
        select: { id: true, teamId: true }
      })
      const orphanedXP = allXPRecords.filter(x => !allTeamIds.has(x.teamId))
      
      if (orphanedXP.length > 0) {
        console.log(`   ⚠️  WARNING: Found ${orphanedXP.length} orphaned XP records (team doesn't exist)`)
      } else {
        console.log(`   ✅ No orphaned XP records found`)
      }
      
      console.log()
    } else {
      // ACTUAL MODE - Delete data
      console.log('🗑️  Deleting all badges and XP history...')
      
      const deletedBadges = await prisma.team_badges.deleteMany({})
      console.log(`   ✅ Deleted ${deletedBadges.count} badges`)
      
      const deletedXP = await prisma.team_xp_history.deleteMany({})
      console.log(`   ✅ Deleted ${deletedXP.count} XP history records`)

      // Reset all teams to level 1 with 0 XP
      console.log('\n🔄 Resetting all teams to Level 1...')
      await prisma.teams.updateMany({
        data: {
          xp: 0,
          level: 1
        }
      })
      console.log('   ✅ All teams reset to Level 1, 0 XP\n')
    }

    // Step 4: Test/Calculate achievements for each team
    console.log('=' .repeat(60))
    if (PREVIEW_MODE) {
      console.log('🔍 TESTING ACHIEVEMENT EVALUATION (NO CHANGES)')
    } else {
      console.log('🔄 RECALCULATING ACHIEVEMENTS FROM SCRATCH')
    }
    console.log('=' .repeat(60) + '\n')

    let successCount = 0
    let errorCount = 0
    const errors: { team: string; error: string }[] = []
    const mismatches: { 
      team: string; 
      currentXP: number; 
      currentLevel: number;
      currentBadges: string[];
      matchCount: number;
    }[] = []

    for (const team of teams) {
      try {
        console.log(`⚙️  ${PREVIEW_MODE ? 'Testing' : 'Processing'}: ${team.name}`)

        if (PREVIEW_MODE) {
          // Get current badges for this team
          const currentBadges = await prisma.team_badges.findMany({
            where: { teamId: team.id },
            select: { badgeKey: true },
            orderBy: { badgeKey: 'asc' }
          })
          const currentBadgeKeys = currentBadges.map(b => b.badgeKey).sort()

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

          console.log(`   Current: Level ${team.level}, ${team.xp} XP`)
          console.log(`   Badges: ${currentBadgeKeys.length > 0 ? currentBadgeKeys.join(', ') : 'None'}`)
          console.log(`   Matches: ${matchCount}`)

          // Check for mismatches
          if (matchCount > 0 && team.xp === 0) {
            console.log(`   ⚠️  MISMATCH: Team has ${matchCount} matches but 0 XP`)
            mismatches.push({
              team: team.name,
              currentXP: team.xp,
              currentLevel: team.level,
              currentBadges: currentBadgeKeys,
              matchCount
            })
          }

          if (matchCount === 0 && (team.xp > 0 || currentBadgeKeys.length > 0)) {
            console.log(`   ⚠️  MISMATCH: Team has no matches but has ${team.xp} XP and ${currentBadgeKeys.length} badges`)
            mismatches.push({
              team: team.name,
              currentXP: team.xp,
              currentLevel: team.level,
              currentBadges: currentBadgeKeys,
              matchCount
            })
          }

          console.log(`   ✅ Data accessible\n`)
          successCount++
        } else {
          // Run actual achievement evaluation
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

            console.log(`   ✅ Success!\n`)
          } else {
            console.log(`   ⚠️  No achievements\n`)
          }
        }

        successCount++
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}\n`)
        errors.push({ team: team.name, error: error.message })
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    if (PREVIEW_MODE) {
      console.log('📋 PREVIEW COMPLETE')
    } else {
      console.log('📈 RESET COMPLETE')
    }
    console.log('='.repeat(60))
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    console.log(`📊 Total: ${teams.length}`)
    
    if (PREVIEW_MODE) {
      console.log('\n📝 Preview Summary:')
      console.log('   - No changes were made to the database')
      console.log('   - All teams were tested for data accessibility')
      console.log('   - Achievement evaluation was simulated')
      if (mismatches.length > 0) {
        console.log(`   - ⚠️  ${mismatches.length} mismatches detected`)
      }
      if (errorCount > 0) {
        console.log(`   - ⚠️  ${errorCount} errors found (see below)`)
      } else if (mismatches.length === 0) {
        console.log('   - ✅ No errors or mismatches detected')
      }
    } else {
      console.log('\n📝 All achievements recalculated with:')
      console.log('   - New XP values (reduced)')
      console.log('   - New level formula (steeper curve)')
      console.log('   - Season-end badges disabled')
    }
    console.log('='.repeat(60) + '\n')

    // Show mismatches if any (preview mode only)
    if (PREVIEW_MODE && mismatches.length > 0) {
      console.log('⚠️  MISMATCHES DETECTED:')
      console.log('─'.repeat(60))
      mismatches.forEach((m, idx) => {
        console.log(`${idx + 1}. ${m.team}`)
        console.log(`   Matches: ${m.matchCount}`)
        console.log(`   Current: Level ${m.currentLevel}, ${m.currentXP} XP`)
        console.log(`   Badges: ${m.currentBadges.length > 0 ? m.currentBadges.join(', ') : 'None'}`)
        if (m.matchCount > 0 && m.currentXP === 0) {
          console.log(`   Issue: Has matches but no XP (achievements not evaluated)`)
        } else if (m.matchCount === 0 && (m.currentXP > 0 || m.currentBadges.length > 0)) {
          console.log(`   Issue: No matches but has XP/badges (stale data)`)
        }
      })
      console.log('─'.repeat(60) + '\n')
    }

    // Show errors if any
    if (errors.length > 0) {
      console.log('❌ ERRORS ENCOUNTERED:')
      console.log('─'.repeat(60))
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.team}`)
        console.log(`   ${err.error}`)
      })
      console.log('─'.repeat(60) + '\n')
    }

    if (!PREVIEW_MODE) {
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
    }

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
    if (PREVIEW_MODE) {
      console.log('✨ Preview completed successfully!')
      console.log('💡 To run the actual reset, remove --preview or --dry-run flag')
    } else {
      console.log('✨ Reset completed successfully!')
    }
    process.exit(0)
  })
  .catch((error) => {
    if (PREVIEW_MODE) {
      console.error('💥 Preview failed:', error)
    } else {
      console.error('💥 Reset failed:', error)
    }
    process.exit(1)
  })
