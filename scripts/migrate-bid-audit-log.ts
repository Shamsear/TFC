/**
 * Migrate bid_audit_log table from Int ID to String ID
 * Run this script with: npx tsx scripts/migrate-bid-audit-log.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateBidAuditLog() {
  try {
    console.log('🔄 Migrating bid_audit_log table...\n')

    // Step 1: Drop existing table
    console.log('📝 Step 1: Dropping existing bid_audit_log table...')
    await prisma.$executeRaw`DROP TABLE IF EXISTS bid_audit_log CASCADE;`
    console.log('✅ Table dropped\n')

    // Step 2: Recreate table with String ID
    console.log('📝 Step 2: Creating new bid_audit_log table with String ID...')
    await prisma.$executeRaw`
      CREATE TABLE bid_audit_log (
        id TEXT PRIMARY KEY,
        round_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        action TEXT NOT NULL,
        encrypted_bids TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT bid_audit_log_round_id_fkey FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
      );
    `
    console.log('✅ Table created\n')

    // Step 3: Create indexes
    console.log('📝 Step 3: Creating indexes...')
    await prisma.$executeRaw`CREATE INDEX bid_audit_log_round_id_idx ON bid_audit_log(round_id);`
    await prisma.$executeRaw`CREATE INDEX bid_audit_log_team_id_idx ON bid_audit_log(team_id);`
    await prisma.$executeRaw`CREATE INDEX bid_audit_log_timestamp_idx ON bid_audit_log(timestamp);`
    console.log('✅ Indexes created\n')

    // Step 4: Initialize counter
    console.log('📝 Step 4: Initializing TFCBA counter...')
    await prisma.$executeRaw`
      INSERT INTO id_counters (prefix, counter, updated_at)
      VALUES ('TFCBA', 0, NOW())
      ON CONFLICT (prefix) DO NOTHING;
    `
    console.log('✅ Counter initialized\n')

    console.log('✅ Migration complete!')
    console.log('\n📋 Next steps:')
    console.log('1. Run: npx prisma generate')
    console.log('2. Restart your dev server')
    console.log('3. Test by placing a bid in an auction round')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateBidAuditLog()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
