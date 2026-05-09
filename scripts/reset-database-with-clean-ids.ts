import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Starting database cleanup...')
  console.log('⚠️  WARNING: This will delete ALL data from the database!')
  console.log('')

  // Delete all data in correct order (respecting foreign keys)
  console.log('Deleting all existing data...')
  
  try {
    await prisma.retentions.deleteMany()
    console.log('✓ Deleted retentions')
    
    await prisma.auction_slots.deleteMany()
    console.log('✓ Deleted auction_slots')
    
    await prisma.auction_calendar.deleteMany()
    console.log('✓ Deleted auction_calendar')
    
    await prisma.financial_ledger.deleteMany()
    console.log('✓ Deleted financial_ledger')
    
    await prisma.transfer_history.deleteMany()
    console.log('✓ Deleted transfer_history')
    
    await prisma.seasonal_player_stats.deleteMany()
    console.log('✓ Deleted seasonal_player_stats')
    
    await prisma.base_players.deleteMany()
    console.log('✓ Deleted base_players')
    
    await prisma.standings.deleteMany()
    console.log('✓ Deleted standings')
    
    await prisma.knockout_pairings.deleteMany()
    console.log('✓ Deleted knockout_pairings')
    
    await prisma.knockout_rounds.deleteMany()
    console.log('✓ Deleted knockout_rounds')
    
    await prisma.tournament_teams.deleteMany()
    console.log('✓ Deleted tournament_teams')
    
    await prisma.matches.deleteMany()
    console.log('✓ Deleted matches')
    
    await prisma.groups.deleteMany()
    console.log('✓ Deleted groups')
    
    await prisma.tournaments.deleteMany()
    console.log('✓ Deleted tournaments')
    
    await prisma.season_teams.deleteMany()
    console.log('✓ Deleted season_teams')
    
    await prisma.seasons.deleteMany()
    console.log('✓ Deleted seasons')
    
    await prisma.teams.deleteMany()
    console.log('✓ Deleted teams')
    
    await prisma.audit_logs.deleteMany()
    console.log('✓ Deleted audit_logs')
    
    await prisma.users.deleteMany()
    console.log('✓ Deleted users')

    console.log('\n✅ All data deleted successfully')
  } catch (error) {
    console.error('❌ Error deleting data:', error)
    throw error
  }

  // Create Super Admin with clean ID
  console.log('\n👤 Creating Super Admin...')
  
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  try {
    const superAdmin = await prisma.users.create({
      data: {
        id: 'TFCU-1',
        email: 'admin@tfc.com',
        name: 'Super Admin',
        passwordHash: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
        assignedSeasons: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    console.log('✅ Super Admin created:', {
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: superAdmin.role
    })
  } catch (error) {
    console.error('❌ Error creating super admin:', error)
    throw error
  }

  console.log('\n✨ Database reset complete!')
  console.log('\n📝 Login credentials:')
  console.log('   Email: admin@tfc.com')
  console.log('   Password: admin123')
  console.log('\n⚠️  Please change the password after first login!')
  console.log('\n📚 Next steps:')
  console.log('   1. Login to the application')
  console.log('   2. Change the admin password')
  console.log('   3. Create seasons, teams, and import players')
  console.log('   4. All new entities will use clean IDs (TFCP-1, TFCS-1, etc.)')
}

main()
  .catch((e) => {
    console.error('\n❌ Fatal Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
