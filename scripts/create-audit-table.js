const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createAuditTable() {
  try {
    console.log('🔍 Checking for audit_logs table...\n')

    // Check if table exists
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
    `

    if (tables.length > 0) {
      console.log('✅ audit_logs table already exists')
      return
    }

    console.log('📝 Creating audit_logs table...\n')

    // Create the table
    await prisma.$executeRaw`
      CREATE TABLE audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(255),
        entity_name VARCHAR(500),
        season_id VARCHAR(255),
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL
      )
    `

    console.log('✅ audit_logs table created\n')

    // Create indexes
    console.log('📝 Creating indexes...\n')

    await prisma.$executeRaw`CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id)`
    console.log('✅ Index on user_id created')

    await prisma.$executeRaw`CREATE INDEX idx_audit_logs_season_id ON audit_logs(season_id)`
    console.log('✅ Index on season_id created')

    await prisma.$executeRaw`CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC)`
    console.log('✅ Index on created_at created')

    await prisma.$executeRaw`CREATE INDEX idx_audit_logs_action ON audit_logs(action)`
    console.log('✅ Index on action created')

    await prisma.$executeRaw`CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type)`
    console.log('✅ Index on entity_type created')

    console.log('\n🎉 audit_logs table and indexes created successfully!')

    // Verify
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
      ORDER BY ordinal_position
    `

    console.log(`\n✅ Verified: Found ${columns.length} columns`)
    console.log('\nColumns:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAuditTable()
