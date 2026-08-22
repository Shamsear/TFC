import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Fixing S4 Swap Prices (v2 - Chronological Matching) ===\n')

  // Get all S4 SWAPPED_OUT transfers sorted by date
  const swappedOut = await prisma.transfer_history.findMany({
    where: { seasonId: 'TFCS-4', status: 'SWAPPED_OUT' },
    select: {
      id: true,
      basePlayerId: true,
      teamId: true,
      soldPrice: true,
      createdAt: true,
      basePlayer: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Get all S4 swap-created ACTIVE transfers sorted by date
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
      createdAt: true,
      basePlayer: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Found ${swappedOut.length} SWAPPED_OUT, ${swappedIn.length} swap-created ACTIVE\n`)

  // For each player, match SWAPPED_OUT → swap-in chronologically
  // Group by basePlayerId
  const outByPlayer = new Map<string, typeof swappedOut>()
  const inByPlayer = new Map<string, typeof swappedIn>()

  for (const r of swappedOut) {
    const list = outByPlayer.get(r.basePlayerId) || []
    list.push(r)
    outByPlayer.set(r.basePlayerId, list)
  }
  for (const r of swappedIn) {
    const list = inByPlayer.get(r.basePlayerId) || []
    list.push(r)
    inByPlayer.set(r.basePlayerId, list)
  }

  let fixed = 0
  let unchanged = 0
  let skipped = 0

  for (const [playerId, outs] of outByPlayer) {
    const ins = inByPlayer.get(playerId) || []

    // Match chronologically: out[0] → in[0], out[1] → in[1], etc.
    for (let i = 0; i < Math.min(outs.length, ins.length); i++) {
      const out = outs[i]
      const inn = ins[i]

      if (inn.soldPrice === out.soldPrice) {
        unchanged++
        continue
      }

      await prisma.transfer_history.update({
        where: { id: inn.id },
        data: { soldPrice: out.soldPrice },
      })

      console.log(
        `✅ ${out.basePlayer.name}: £${inn.soldPrice} → £${out.soldPrice}`
      )
      fixed++
    }

    if (outs.length > ins.length) {
      for (let i = ins.length; i < outs.length; i++) {
        console.log(`⚠️  ${outs[i].basePlayer.name}: SWAPPED_OUT without matching swap-in`)
        skipped++
      }
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Already correct: ${unchanged}`)
  console.log(`Skipped (no match): ${skipped}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
