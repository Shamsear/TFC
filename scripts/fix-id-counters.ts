import { Pool } from '@neondatabase/serverless'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env' })

async function fixIdCounters() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    console.log('🔧 Starting ID counters fix...\n')

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-id-counters.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    // Execute the SQL
    const result = await pool.query(sql)

    console.log('✅ ID counters fixed successfully!\n')
    
    // Display the results (last query result which is the SELECT)
    if (result.rows && result.rows.length > 0) {
      console.log('📊 Current ID Counters:')
      console.log('─'.repeat(60))
      result.rows.forEach((row: any) => {
        console.log(`${row.prefix.padEnd(10)} | ${String(row.counter).padStart(6)} | ${row.updated_at}`)
      })
      console.log('─'.repeat(60))
      console.log(`\nTotal counters: ${result.rows.length}`)
    }

  } catch (error) {
    console.error('❌ Error fixing ID counters:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the script
fixIdCounters()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })
