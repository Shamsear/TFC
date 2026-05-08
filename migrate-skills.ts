import { prisma } from './lib/prisma'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function migrate() {
  try {
    const sql = fs.readFileSync('ADD-PLAYER-SKILLS-COLUMNS.sql', 'utf-8')
    
    // Remove comments and split by ALTER TABLE
    const lines = sql.split('\n').filter(line => !line.trim().startsWith('--'))
    const cleanSql = lines.join('\n')
    
    // Match all ALTER TABLE statements (including multi-line)
    const alterTableRegex = /ALTER TABLE[\s\S]*?;/g
    const statements = cleanSql.match(alterTableRegex) || []
    
    console.log(`Executing ${statements.length} ALTER TABLE statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`)
      await prisma.$executeRawUnsafe(statement)
      console.log('✓ Success')
    }
    
    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
