import { prisma } from '../lib/prisma'
import { finalizeRound, applyFinalizationResults } from '../lib/auction/finalize-round'

async function cleanAndRefinalizeTFCR43() {
  const roundId = 'TFCR-43'
  console.log(`🧹 Cleaning up round ${roundId} results completely...`)

  const round = await prisma.rounds.findUnique({
    where: { id: roundId }
  })

  if (!round) {
    console.error('Round not found')
    return
  }

  // 1. Find all transfer_history records for TFCR-43
  const existingTransfers = await prisma.transfer_history.findMany({
    where: { roundId }
  })
  console.log(`Found ${existingTransfers.length} transfer records to revert.`)

  if (existingTransfers.length > 0) {
    // Group team refunds
    const teamRefunds = new Map<string, number>()
    for (const t of existingTransfers) {
      const current = teamRefunds.get(t.teamId) || 0
      teamRefunds.set(t.teamId, current + t.soldPrice)
    }

    // Refund budgets in season_teams
    for (const [teamId, amount] of teamRefunds.entries()) {
      await prisma.season_teams.update({
        where: { seasonId_teamId: { seasonId: round.seasonId, teamId } },
        data: { currentBudget: { increment: amount } }
      })
      console.log(`Refunded £${amount} to team ${teamId}`)
    }

    // Delete financial_ledger entries
    const deletedLedgers = await prisma.financial_ledger.deleteMany({
      where: {
        seasonId: round.seasonId,
        description: `Round ${roundId} player purchases`
      }
    })
    console.log(`Deleted ${deletedLedgers.count} financial_ledger records.`)

    // Delete transfer_history records
    const deletedTransfers = await prisma.transfer_history.deleteMany({
      where: { roundId }
    })
    console.log(`Deleted ${deletedTransfers.count} transfer_history records.`)
  }

  // 2. Set Liverpool (TFCM-24) submitted = false if their bids array is empty
  const liverpoolBid = await prisma.team_round_bids.findFirst({
    where: { roundId, teamId: 'TFCM-24' }
  })

  if (liverpoolBid) {
    await prisma.team_round_bids.update({
      where: { id: liverpoolBid.id },
      data: {
        submitted: false,
        bidCount: 0,
        submittedAt: null
      }
    })
    console.log('Reset Liverpool bid record to submitted = false.')
  }

  // 3. Reset round status to 'active'
  await prisma.rounds.update({
    where: { id: roundId },
    data: {
      status: 'active',
      finalizationState: null
    }
  })
  console.log(`Reset round ${roundId} status to 'active'.`)

  // 4. Run finalization
  console.log('🔄 Running finalization algorithm...')
  const result = await finalizeRound(roundId)
  console.log('Finalize Result:', JSON.stringify(result, null, 2))

  if (result.success && result.allocations.length > 0) {
    console.log(`Applying ${result.allocations.length} allocations to DB...`)
    await applyFinalizationResults(roundId, result.allocations)
    console.log('✅ Round TFCR-43 successfully re-finalized and applied to DB!')
  } else {
    console.log('No allocations applied or error:', result.error)
  }
}

cleanAndRefinalizeTFCR43()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
