require('dotenv').config()
const { Client } = require('pg')
const fs = require('fs')

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    console.log('✓ Connected to database')
    
    const sql = fs.readFileSync('ADD-USER-COLUMNS.sql', 'utf8')
    
    console.log('Running migration...')
    await client.query(sql)
    
    console.log('✓ Migration completed successfully!')
  } catch (error) {
    console.error('✗ Migration failed:', error.message)
  } finally {
    await client.end()
  }
}

runMigration()
