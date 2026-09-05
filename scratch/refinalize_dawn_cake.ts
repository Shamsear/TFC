import { prisma } from '../lib/prisma'
import { finalizeRound, applyFinalizationResults } from '../lib/auction/finalize-round'

async function run() {
  const roundId = 'TFCR-43'
  console.log(`🎯 Re-finalizing ${roundId} on ep-dawn-cake database...`)

  const round = await prisma.rounds.findUnique({
    where: { id: roundId }
  })

  if (!round) {
    console.error('Round not found')
    return
  }

  // Revert any existing transfer records/ledger for TFCR-43
  const existingTransfers = await prisma.transfer_history.findMany({
    where: { roundId }
  })
  console.log(`Found ${existingTransfers.length} existing transfer records to revert.`)

  if (existingTransfers.length > 0) {
    const teamRefunds = new Map<string, number>()
    for (const t of existingTransfers) {
      const current = teamRefunds.get(t.teamId) || 0
      teamRefunds.set(t.teamId, current + t.soldPrice)
    }

    for (const [teamId, amount] of teamRefunds.entries()) {
      await prisma.season_teams.update({
        where: { seasonId_teamId: { seasonId: round.seasonId, teamId } },
        data: { currentBudget: { increment: amount } }
      })
      console.log(`Refunded £${amount} to team ${teamId}`)
    }

    await prisma.financial_ledger.deleteMany({
      where: {
        seasonId: round.seasonId,
        description: `Round ${roundId} player purchases`
      }
    })

    await prisma.transfer_history.deleteMany({
      where: { roundId }
    })
    console.log('Deleted previous transfer_history & ledger records.')
  }

  // Reset round status to 'active'
  await prisma.rounds.update({
    where: { id: roundId },
    data: { status: 'active', finalizationState: null }
  })
  console.log(`Reset round ${roundId} status to 'active'.`)

  // Run finalization
  console.log('🔄 Executing finalizeRound algorithm...')
  const result = await finalizeRound(roundId)
  console.log('\nFinalization Result Summary:')
  console.log(`- Success: ${result.success}`)
  console.log(`- Allocations Count: ${result.allocations.length}`)
  console.log(`- Tie Detected: ${result.tieDetected}`)

  // Find Liverpool's allocation in the results
  const liverpoolAlloc = result.allocations.find(a => a.teamId === 'TFCM-24')
  console.log('\n⚽ Liverpool Allocation in TFCR-43:', liverpoolAlloc)

  if (result.success && result.allocations.length > 0) {
    console.log(`\n💾 Applying ${result.allocations.length} allocations to DB...`)
    await applyFinalizationResults(roundId, result.allocations)
    console.log('✅ Finalization applied successfully to ep-dawn-cake DB!')
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
