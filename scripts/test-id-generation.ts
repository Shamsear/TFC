import { PrismaClient } from '@prisma/client'
import { generateSeasonId, generateTeamId, generateUserId } from '../lib/id-generator'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testing ID Generation...\n')
  
  // Test season ID generation
  console.log('Testing Season ID generation:')
  const seasonId1 = await generateSeasonId()
  console.log(`  Generated: ${seasonId1}`)
  
  const seasonId2 = await generateSeasonId()
  console.log(`  Generated: ${seasonId2}`)
  
  const seasonId3 = await generateSeasonId()
  console.log(`  Generated: ${seasonId3}`)
  
  // Test team ID generation
  console.log('\nTesting Team ID generation:')
  const teamId1 = await generateTeamId()
  console.log(`  Generated: ${teamId1}`)
  
  const teamId2 = await generateTeamId()
  console.log(`  Generated: ${teamId2}`)
  
  // Test user ID generation
  console.log('\nTesting User ID generation:')
  const userId1 = await generateUserId()
  console.log(`  Generated: ${userId1}`)
  
  const userId2 = await generateUserId()
  console.log(`  Generated: ${userId2}`)
  
  console.log('\n✅ ID generation test complete!')
  console.log('\nNote: These IDs were generated but NOT saved to database')
}

main()
  .catch((e) => {
    console.error('\n❌ Fatal Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
