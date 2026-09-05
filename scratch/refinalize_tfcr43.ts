import { prisma } from '../lib/prisma'
import { finalizeRound, applyFinalizationResults } from '../lib/auction/finalize-round'

async function refinalizeTFCR43() {
  const roundId = 'TFCR-43'

  console.log(`Starting re-finalization for round ${roundId}...`)

  // 1. Fetch current round
  const round = await prisma.rounds.findUnique({
    where: { id: roundId }
  })

  if (!round) {
    console.error('Round not found')
    return
  }

  console.log('Current Round Status:', round.status)

  // 2. Find any existing transfer_history records for this round
  const existingTransfers = await prisma.transfer_history.findMany({
    where: { roundId }
  })
  console.log(`Found ${existingTransfers.length} existing transfer history records for ${roundId}`)

  // 3. Revert financial ledger / budget changes if previous transfers exist
  if (existingTransfers.length > 0) {
    console.log('Reverting previous transfers and financial ledger entries...')
    // Group by team and calculate total spent to refund
    const teamRefunds = new Map<string, number>()
    for (const t of existingTransfers) {
      const current = teamRefunds.get(t.teamId) || 0
      teamRefunds.set(t.teamId, current + t.soldPrice)
    }

    // Refund budgets
    for (const [teamId, amount] of teamRefunds.entries()) {
      await prisma.season_teams.update({
        where: { seasonId_teamId: { seasonId: round.seasonId, teamId } },
        data: { currentBudget: { increment: amount } }
      })
      console.log(`Refunded $${amount} to team ${teamId}`)
    }

    // Delete financial ledger entries for this round
    const deletedLedger = await prisma.financial_ledger.deleteMany({
      where: {
        seasonId: round.seasonId,
        description: `Round ${roundId} player purchases`
      }
    })
    console.log(`Deleted ${deletedLedger.count} ledger entries.`)

    // Delete transfer_history records
    const deletedTransfers = await prisma.transfer_history.deleteMany({
      where: { roundId }
    })
    console.log(`Deleted ${deletedTransfers.count} transfer history records.`)
  }

  // 4. Reset round status to 'active' so finalizeRound can process it
  await prisma.rounds.update({
    where: { id: roundId },
    data: { status: 'active', finalizationState: null }
  })
  console.log(`Reset round ${roundId} status to 'active'`)

  // 5. Run finalizeRound
  console.log('Running finalizeRound algorithm...')
  const result = await finalizeRound(roundId)
  console.log('FinalizeRound Result:', result)

  // 6. Apply finalization results if successful
  if (result.success && result.allocations.length > 0) {
    console.log(`Applying ${result.allocations.length} allocations to database...`)
    await applyFinalizationResults(roundId, result.allocations)
    console.log('🎉 Round re-finalized successfully!')
  } else if (result.tieDetected) {
    console.log('⚠️ Ties detected during re-finalization!')
    console.log('Ties:', result.ties)
  } else {
    console.log('No allocations to apply or error occurred:', result.error)
  }
}

refinalizeTFCR43()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
