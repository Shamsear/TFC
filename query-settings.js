const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  try {
    const settings = await prisma.$queryRawUnsafe(`SELECT * FROM auction_settings`)
    console.log('--- Current Auction Settings ---')
    console.log(JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('Error fetching settings:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
