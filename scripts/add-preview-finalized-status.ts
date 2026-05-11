/**
 * Migration Script: Add preview_finalized status to rounds table
 * 
 * This script adds 'preview_finalized' to the allowed status values
 * for the rounds table to support manual finalization mode.
 * 
 * Run with: npx tsx scripts/add-preview-finalized-status.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting migration: Add preview_finalized status...\n');

  try {
    // Drop existing constraint
    console.log('1. Dropping existing rounds_status_check constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_status_check;
    `);
    console.log('   ✓ Constraint dropped\n');

    // Add new constraint with preview_finalized
    console.log('2. Adding new constraint with preview_finalized...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE rounds ADD CONSTRAINT rounds_status_check CHECK (status IN (
        'draft',
        'active',
        'finalizing',
        'completed',
        'expired_pending_finalization',
        'pending_finalization',
        'tiebreaker_pending',
        'preview_finalized',
        'cancelled'
      ));
    `);
    console.log('   ✓ New constraint added\n');

    // Verify the change
    console.log('3. Verifying constraint...');
    const result = await prisma.$queryRaw<any[]>`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'rounds_status_check';
    `;
    
    if (result.length > 0) {
      console.log('   ✓ Constraint verified:');
      console.log(`   ${result[0].definition}\n`);
    }

    console.log('✅ Migration completed successfully!');
    console.log('\nThe rounds table now accepts "preview_finalized" status.');
    console.log('This enables manual finalization mode where admins can preview');
    console.log('results before making them public.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
