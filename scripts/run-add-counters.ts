import { readFileSync } from 'fs'
import { join } from 'path'
import { prisma } from '../lib/prisma'

async function runMigration() {
  try {
    console.log('🔄 Creating id_counters table and initializing counters...')
    
    const sql = readFileSync(join(__dirname, 'add-id-counters-table.sql'), 'utf-8')
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.toLowerCase().includes('select')) {
        // For SELECT statements, use queryRaw
        const result = await prisma.$queryRawUnsafe(statement)
        console.log('📊 Current counters:', result)
      } else {
        // For other statements, use executeRaw
        await prisma.$executeRawUnsafe(statement)
      }
    }
    
    console.log('✅ ID counters table created and initialized successfully!')
    
  } catch (error) {
    console.error('❌ Error running migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
