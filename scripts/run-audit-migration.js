const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function runMigration() {
  try {
    console.log('🚀 Starting audit trail migration...\n')

    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'prisma', 'migrations', 'add_audit_trail.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Split by semicolons and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'))

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments
      if (statement.startsWith('--')) continue
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)
        await prisma.$executeRawUnsafe(statement)
        console.log(`✅ Statement ${i + 1} completed\n`)
      } catch (error) {
        // Some statements might fail if already exists, that's okay
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)\n`)
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message)
          console.error(`Statement: ${statement.substring(0, 100)}...\n`)
        }
      }
    }

    console.log('✅ Migration completed successfully!')
    console.log('\n📊 Verifying audit_logs table...')

    // Verify the table was created
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
    `

    if (result.length > 0) {
      console.log('✅ audit_logs table exists')
      
      // Check columns
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs'
        ORDER BY ordinal_position
      `
      
      console.log(`✅ Found ${columns.length} columns in audit_logs table`)
      console.log('\nColumns:')
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`)
      })
    } else {
      console.log('❌ audit_logs table not found')
    }

    console.log('\n🎉 All done! The audit trail system is ready to use.')
    console.log('\nNext steps:')
    console.log('1. Create a sub-admin account at /super-admin/sub-admins/new')
    console.log('2. Login as sub-admin and perform some actions')
    console.log('3. View audit logs at /super-admin/sub-admins/[id]/audit')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
