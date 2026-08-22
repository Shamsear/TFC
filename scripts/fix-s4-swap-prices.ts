import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Fixing S4 Swap Prices ===\n')

  // Get all S4 SWAPPED_OUT transfers (these have the original prices)
  const swappedOut = await prisma.transfer_history.findMany({
    where: { seasonId: 'TFCS-4', status: 'SWAPPED_OUT' },
    select: {
      basePlayerId: true,
      teamId: true,
      soldPrice: true,
      basePlayer: { select: { name: true } },
    },
  })

  console.log(`Found ${swappedOut.length} SWAPPED_OUT records`)

  // Get all S4 swap-created ACTIVE transfers (IDs start with 'swap-')
  const swappedIn = await prisma.transfer_history.findMany({
    where: {
      seasonId: 'TFCS-4',
      status: 'ACTIVE',
      id: { startsWith: 'swap-' },
    },
    select: {
      id: true,
      basePlayerId: true,
      teamId: true,
      soldPrice: true,
      basePlayer: { select: { name: true } },
    },
  })

  console.log(`Found ${swappedIn.length} swap-created ACTIVE records\n`)

  let fixed = 0
  let unchanged = 0

  for (const outRec of swappedOut) {
    // Find the swap-in record for the same player
    const inRec = swappedIn.find(i => i.basePlayerId === outRec.basePlayerId)

    if (!inRec) {
      console.log(`⚠️  ${outRec.basePlayer.name}: No swap-in found (skipped)`)
      continue
    }

    if (inRec.soldPrice === outRec.soldPrice) {
      unchanged++
      continue
    }

    // Fix the price
    await prisma.transfer_history.update({
      where: { id: inRec.id },
      data: { soldPrice: outRec.soldPrice },
    })

    console.log(
      `✅ ${outRec.basePlayer.name}: £${inRec.soldPrice} → £${outRec.soldPrice}`
    )
    fixed++
  }

  console.log(`\n=== Summary ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Already correct: ${unchanged}`)
  console.log(`Not found: ${swappedOut.length - fixed - unchanged}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
