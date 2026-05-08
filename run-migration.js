const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

async function runMigration() {
  try {
    console.log('Running migration...')
    
    const sql = fs.readFileSync('ADD-USER-COLUMNS.sql', 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim())
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...')
        await prisma.$executeRawUnsafe(statement)
      }
    }
    
    console.log('✓ Migration completed successfully!')
  } catch (error) {
    console.error('✗ Migration failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
