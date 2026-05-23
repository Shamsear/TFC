import { prisma } from '../lib/prisma'

async function addEndDateColumn() {
  try {
    console.log('Adding endDate column to auction_calendar...')

    // Add the column (nullable first)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE auction_calendar ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
    `)

    console.log('Column added. Updating existing records...')

    // Update existing records to have endDate = auctionDate + 3 hours
    await prisma.$executeRawUnsafe(`
      UPDATE auction_calendar 
      SET "endDate" = "auctionDate" + INTERVAL '3 hours'
      WHERE "endDate" IS NULL;
    `)

    console.log('Existing records updated. Making column NOT NULL...')

    // Now make it NOT NULL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE auction_calendar ALTER COLUMN "endDate" SET NOT NULL;
    `)

    console.log('Adding index...')

    // Add index for better query performance
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "auction_calendar_endDate_idx" ON auction_calendar("endDate");
    `)

    console.log('✅ Migration completed successfully!')

    // Verify the update
    const sample = await prisma.auction_calendar.findMany({
      take: 5,
      orderBy: { auctionDate: 'desc' },
      select: {
        id: true,
        description: true,
        auctionDate: true,
        endDate: true
      }
    })

    console.log('\nSample records:')
    sample.forEach(record => {
      const start = new Date(record.auctionDate)
      const end = record.endDate ? new Date(record.endDate) : null
      const duration = end ? (end.getTime() - start.getTime()) / (1000 * 60 * 60) : 0
      console.log(`- ${record.description || 'Auction'}: ${start.toLocaleString()} → ${end?.toLocaleString()} (${duration}h)`)
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

addEndDateColumn()
