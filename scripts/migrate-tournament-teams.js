require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function runMigration() {
  console.log('🚀 Starting tournament_teams migration...\n')

  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '../prisma/migrations/add_tournament_teams.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Split by semicolon and filter out comments and empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'))

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        await prisma.$executeRawUnsafe(statement)
        console.log(`✅ Statement ${i + 1} completed\n`)
      } catch (error) {
        // Check if error is about table already existing
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Table already exists, skipping creation\n`)
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message)
          throw error
        }
      }
    }

    // Verify the migration
    console.log('🔍 Verifying migration...\n')
    
    const tournamentTeamsCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM tournament_teams
    `
    
    console.log(`✅ tournament_teams table has ${tournamentTeamsCount[0].count} records\n`)

    // Show sample data
    const sampleData = await prisma.$queryRaw`
      SELECT 
        tt.id,
        t.name as tournament_name,
        st.team_id,
        tt.group_name,
        tt.seed_position
      FROM tournament_teams tt
      JOIN tournaments t ON tt.tournament_id = t.id
      JOIN season_teams st ON tt.team_id = st.id
      LIMIT 5
    `

    if (sampleData.length > 0) {
      console.log('📊 Sample migrated data:')
      console.table(sampleData)
    }

    console.log('\n✨ Migration completed successfully!')
    console.log('\n📌 Next steps:')
    console.log('   1. Run: npx prisma generate')
    console.log('   2. Restart your development server')
    console.log('   3. Visit any tournament page to see the teams\n')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
