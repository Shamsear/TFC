const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const prisma = new PrismaClient()

async function runMigration() {
  try {
    console.log('🚀 Running tournament linking system database migration...')
    
    const sqlPath = path.join(__dirname, 'add-tournament-linking.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Parse statements respecting DO $$ blocks
    const statements = []
    let current = ''
    let inDollarQuote = false
    
    const lines = sql.split('\n')
    for (const line of lines) {
      if (line.includes('$$')) {
        inDollarQuote = !inDollarQuote
      }
      
      current += line + '\n'
      
      if (!inDollarQuote && line.trim().endsWith(';')) {
        statements.push(current.trim())
        current = ''
      }
    }
    if (current.trim()) {
      statements.push(current.trim())
    }
    
    console.log(`Parsed ${statements.length} SQL statements. Executing...`)
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (stmt) {
        console.log(`Executing statement [${i + 1}/${statements.length}]:`)
        console.log(stmt.substring(0, 80) + (stmt.length > 80 ? '...' : ''))
        await prisma.$executeRawUnsafe(stmt)
      }
    }
    
    console.log('✓ Database tables and columns created successfully.')
    
    console.log('⚙ Regenerating Prisma Client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    console.log('✓ Prisma Client regenerated successfully.')
    
    console.log('🎉 Migration complete!')
  } catch (error) {
    console.error('✗ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
