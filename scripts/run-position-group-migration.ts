import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runMigration() {
  console.log('🚀 Starting position_group migration...\n')

  try {
    // 1. Add position_group to seasonal_player_stats
    console.log('1️⃣ Checking seasonal_player_stats...')
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'seasonal_player_stats' 
          AND column_name = 'position_group'
        ) THEN
          ALTER TABLE seasonal_player_stats 
          ADD COLUMN position_group VARCHAR(10) CHECK (position_group IN ('A', 'B'));
          
          CREATE INDEX idx_seasonal_player_stats_position_group 
          ON seasonal_player_stats(position, position_group);
          
          RAISE NOTICE 'Added position_group to seasonal_player_stats';
        ELSE
          RAISE NOTICE 'position_group already exists in seasonal_player_stats';
        END IF;
      END $$;
    `)
    console.log('✅ seasonal_player_stats done\n')

    // 2. Add position_group to auction_slots
    console.log('2️⃣ Checking auction_slots...')
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'auction_slots' 
          AND column_name = 'position_group'
        ) THEN
          ALTER TABLE auction_slots 
          ADD COLUMN position_group VARCHAR(10) CHECK (position_group IN ('A', 'B', 'ALL'));
          
          UPDATE auction_slots SET position_group = 'ALL' WHERE position_group IS NULL;
          
          RAISE NOTICE 'Added position_group to auction_slots';
        ELSE
          RAISE NOTICE 'position_group already exists in auction_slots';
        END IF;
      END $$;
    `)
    console.log('✅ auction_slots done\n')

    // 3. Add position_group to rounds
    console.log('3️⃣ Checking rounds...')
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'rounds' 
          AND column_name = 'position_group'
        ) THEN
          ALTER TABLE rounds 
          ADD COLUMN position_group VARCHAR(10) CHECK (position_group IN ('A', 'B', 'ALL'));
          
          RAISE NOTICE 'Added position_group to rounds';
        ELSE
          RAISE NOTICE 'position_group already exists in rounds';
        END IF;
      END $$;
    `)
    console.log('✅ rounds done\n')

    // 4. Add updated_by to auction_calendar
    console.log('4️⃣ Checking auction_calendar...')
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'auction_calendar' 
          AND column_name = 'updated_by'
        ) THEN
          ALTER TABLE auction_calendar 
          ADD COLUMN updated_by TEXT;
          
          ALTER TABLE auction_calendar
          ADD CONSTRAINT fk_auction_calendar_updated_by 
          FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
          
          CREATE INDEX idx_auction_calendar_updated_by ON auction_calendar(updated_by);
          
          RAISE NOTICE 'Added updated_by to auction_calendar';
        ELSE
          RAISE NOTICE 'updated_by already exists in auction_calendar';
        END IF;
      END $$;
    `)
    console.log('✅ auction_calendar done\n')

    // Verification
    console.log('🔍 Verifying migrations...\n')
    
    const verifications = await Promise.all([
      prisma.$queryRaw`
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'seasonal_player_stats' AND column_name = 'position_group'
      `,
      prisma.$queryRaw`
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'auction_slots' AND column_name = 'position_group'
      `,
      prisma.$queryRaw`
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'rounds' AND column_name = 'position_group'
      `,
      prisma.$queryRaw`
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'auction_calendar' AND column_name = 'updated_by'
      `
    ])

    console.log('📊 Verification Results:')
    console.log('seasonal_player_stats.position_group:', verifications[0])
    console.log('auction_slots.position_group:', verifications[1])
    console.log('rounds.position_group:', verifications[2])
    console.log('auction_calendar.updated_by:', verifications[3])

    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
