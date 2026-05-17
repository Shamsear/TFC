import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPositionGroup() {
  console.log('🔍 Testing position_group columns...\n')

  try {
    // Test 1: Check auction_slots
    console.log('1️⃣ Checking auction_slots...')
    const slots = await prisma.auction_slots.findFirst({
      select: {
        id: true,
        position: true,
        position_group: true
      }
    })
    console.log('✅ auction_slots.position_group exists:', slots)

    // Test 2: Check seasonal_player_stats
    console.log('\n2️⃣ Checking seasonal_player_stats...')
    const stats = await prisma.seasonal_player_stats.findFirst({
      select: {
        id: true,
        position: true,
        position_group: true
      }
    })
    console.log('✅ seasonal_player_stats.position_group exists:', stats)

    console.log('\n✅ All position_group columns are accessible!')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testPositionGroup()
