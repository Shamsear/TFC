import { prisma } from '../lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

async function run() {
  try {
    console.log('Connecting to database via Prisma...')
    const sqlPath = path.join(__dirname, '..', 'prisma', 'migrations', 'add_manager_tenures.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('Executing add_manager_tenures.sql...')
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean)
    for (const stmt of statements) {
      console.log('Running statement:', stmt.slice(0, 60), '...')
      await prisma.$executeRawUnsafe(stmt)
    }
    
    console.log('✓ Migration add_manager_tenures.sql applied successfully!')
  } catch (err: any) {
    console.error('✗ Migration error:', err.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
