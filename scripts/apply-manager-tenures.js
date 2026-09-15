require('dotenv').config()
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL
  })

  try {
    await client.connect()
    console.log('✓ Connected to database')
    
    const sqlPath = path.join(__dirname, '..', 'prisma', 'migrations', 'add_manager_tenures.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('Running manager_tenures migration...')
    await client.query(sql)
    
    console.log('✓ Migration add_manager_tenures.sql completed successfully!')
  } catch (error) {
    console.error('✗ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
