import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking for old-format IDs...\n')
  
  // Check all seasons
  const seasons = await prisma.seasons.findMany()
  console.log('📅 Seasons found:', seasons.length)
  seasons.forEach(season => {
    const isOldFormat = !season.id.startsWith('TFCS-')
    console.log(`   ${isOldFormat ? '❌' : '✅'} ${season.id} - ${season.name}`)
  })
  
  // Check all teams
  const teams = await prisma.teams.findMany()
  console.log('\n🏆 Teams found:', teams.length)
  teams.forEach(team => {
    const isOldFormat = !team.id.startsWith('TFCT-')
    console.log(`   ${isOldFormat ? '❌' : '✅'} ${team.id} - ${team.name}`)
  })
  
  // Check all users
  const users = await prisma.users.findMany()
  console.log('\n👤 Users found:', users.length)
  users.forEach(user => {
    const isOldFormat = !user.id.startsWith('TFCU-')
    console.log(`   ${isOldFormat ? '❌' : '✅'} ${user.id} - ${user.email} (${user.role})`)
  })
  
  // Check all players
  const players = await prisma.base_players.findMany()
  console.log('\n⚽ Players found:', players.length)
  players.forEach(player => {
    const isOldFormat = !player.id.startsWith('TFCP-')
    console.log(`   ${isOldFormat ? '❌' : '✅'} ${player.id} - ${player.name}`)
  })
  
  // Find old-format seasons
  const oldSeasons = seasons.filter(s => !s.id.startsWith('TFCS-'))
  
  if (oldSeasons.length > 0) {
    console.log('\n⚠️  Found old-format seasons. Deleting...\n')
    
    for (const season of oldSeasons) {
      console.log(`🗑️  Deleting season: ${season.id} - ${season.name}`)
      
      // Delete related data first
      await prisma.season_teams.deleteMany({
        where: { seasonId: season.id }
      })
      console.log('   ✓ Deleted season_teams')
      
      await prisma.tournaments.deleteMany({
        where: { seasonId: season.id }
      })
      console.log('   ✓ Deleted tournaments')
      
      // Delete the season
      await prisma.seasons.delete({
        where: { id: season.id }
      })
      console.log('   ✅ Season deleted\n')
    }
  } else {
    console.log('\n✅ No old-format seasons found. Database is clean!')
  }
  
  // Summary
  console.log('\n📊 Final Summary:')
  const finalSeasons = await prisma.seasons.findMany()
  const finalTeams = await prisma.teams.findMany()
  const finalUsers = await prisma.users.findMany()
  const finalPlayers = await prisma.base_players.findMany()
  
  console.log(`   Seasons: ${finalSeasons.length}`)
  console.log(`   Teams: ${finalTeams.length}`)
  console.log(`   Users: ${finalUsers.length}`)
  console.log(`   Players: ${finalPlayers.length}`)
  
  console.log('\n✨ Database cleanup complete!')
}

main()
  .catch((e) => {
    console.error('\n❌ Fatal Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
