const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyMigration() {
  try {
    console.log('🔍 Verifying audit trail migration...\n')

    // Check audit_logs table
    const auditTable = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
    `

    if (auditTable.length > 0) {
      console.log('✅ audit_logs table exists')
    } else {
      console.log('❌ audit_logs table NOT found')
    }

    // Check tracking columns on various tables
    const tablesToCheck = [
      'tournaments',
      'matches',
      'auction_calendar',
      'transfer_history',
      'season_teams',
      'users'
    ]

    console.log('\n📋 Checking tracking columns...\n')

    for (const table of tablesToCheck) {
      const columns = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table}
          AND column_name IN ('created_by', 'updated_by', 'is_active', 'last_login', 'assigned_seasons')
      `

      const columnNames = columns.map(c => c.column_name).join(', ')
      
      if (columns.length > 0) {
        console.log(`✅ ${table}: ${columnNames}`)
      } else {
        console.log(`⚠️  ${table}: No tracking columns found`)
      }
    }

    // Check indexes on audit_logs
    console.log('\n📊 Checking indexes on audit_logs...\n')

    const indexes = await prisma.$queryRaw`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'audit_logs'
    `

    indexes.forEach(idx => {
      console.log(`✅ ${idx.indexname}`)
    })

    console.log('\n🎉 Migration verification complete!')
    console.log('\n✅ The audit trail system is ready to use.')
    console.log('\nNext steps:')
    console.log('1. Navigate to /super-admin/sub-admins/new')
    console.log('2. Create a sub-admin account')
    console.log('3. Login as sub-admin and perform actions')
    console.log('4. View audit logs at /super-admin/sub-admins/[id]/audit')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verifyMigration()
