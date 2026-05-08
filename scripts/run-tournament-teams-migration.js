require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function runMigration() {
  try {
    console.log('🚀 Starting tournament_teams migration...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'prisma', 'migrations', 'add_tournament_teams.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Split by semicolons and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`\n⚙️  Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        await prisma.$executeRawUnsafe(statement)
        console.log(`✅ Statement ${i + 1} completed successfully`)
      } catch (error) {
        // If table already exists, that's okay
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`)
        } else {
          throw error
        }
      }
    }
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...')
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM tournament_teams`
    console.log(`✅ Migration successful! Found ${count[0].count} tournament-team relationships`)
    
    // Show sample data
    const sample = await prisma.$queryRaw`
      SELECT tt.*, t.name as tournament_name
      FROM tournament_teams tt
      JOIN tournaments t ON t.id = tt.tournament_id
      LIMIT 5
    `
    console.log('\n📊 Sample data:')
    console.table(sample)
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
  .then(() => {
    console.log('\n✨ Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })
