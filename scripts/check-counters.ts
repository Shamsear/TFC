import { prisma } from '../lib/prisma'

async function checkCounters() {
  try {
    const counters = await prisma.$queryRaw`SELECT * FROM id_counters ORDER BY prefix`
    console.log('📊 Current ID Counters:')
    console.table(counters)
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCounters()
