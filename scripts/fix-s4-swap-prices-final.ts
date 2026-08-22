import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Checking All Swapped Players Current ACTIVE Prices ===\n')

  // For each player involved in a swap, find their ORIGINAL purchase price
  const swappedPlayers = await prisma.transfer_history.findMany({
    where: {
      seasonId: 'TFCS-4',
      OR: [{ status: 'SWAPPED_OUT' }, { id: { startsWith: 'swap-' } }],
    },
    select: { basePlayerId: true, basePlayer: { select: { name: true } } },
    distinct: ['basePlayerId'],
  })
  const playerIds = swappedPlayers.map((p) => p.basePlayerId)

  // Get ALL S4 transfers for these players
  const allTransfers = await prisma.transfer_history.findMany({
    where: { seasonId: 'TFCS-4', basePlayerId: { in: playerIds } },
    select: {
      basePlayerId: true,
      status: true,
      soldPrice: true,
      teamId: true,
      id: true,
      basePlayer: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const issues: { name: string; original: number; current: number; currentId: string; currentTeam: string }[] = []

  for (const pid of playerIds) {
    const transfers = allTransfers.filter((t) => t.basePlayerId === pid)
    const name = transfers[0]?.basePlayer.name || pid

    // Original purchase = first transfer ever (auction)
    const original = transfers[0]
    if (!original) continue

    // Current ACTIVE transfer
    const current = transfers.find((t) => t.status === 'ACTIVE')
    if (!current) continue

    if (current.soldPrice !== original.soldPrice) {
      issues.push({
        name,
        original: original.soldPrice,
        current: current.soldPrice,
        currentId: current.id,
        currentTeam: current.teamId,
      })
    }
  }

  console.log(`Players with incorrect ACTIVE transfer price: ${issues.length}\n`)
  for (const i of issues) {
    console.log(`${i.name}: original=£${i.original} current=£${i.current} (team=${i.currentTeam}, id=${i.currentId})`)
  }

  // Fix them
  if (issues.length > 0) {
    console.log(`\n=== Fixing ${issues.length} players ===`)
    for (const i of issues) {
      await prisma.transfer_history.update({
        where: { id: i.currentId },
        data: { soldPrice: i.original },
      })
      console.log(`✅ ${i.name}: £${i.current} → £${i.original}`)
    }
    console.log('\nDone!')
  } else {
    console.log('\nAll prices are correct!')
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
