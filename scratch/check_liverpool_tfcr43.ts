import { prisma } from '../lib/prisma'

async function checkLiverpoolBid() {
  const roundId = 'TFCR-43'
  
  // Find Liverpool team
  const liverpool = await prisma.teams.findFirst({
    where: {
      name: { contains: 'Liverpool', mode: 'insensitive' }
    }
  })
  console.log('Liverpool Team:', liverpool)

  if (!liverpool) {
    console.error('Liverpool team not found')
    return
  }

  // Find team_round_bids for Liverpool in TFCR-43
  const bid = await prisma.team_round_bids.findFirst({
    where: {
      teamId: liverpool.id,
      roundId: roundId
    }
  })
  console.log('Liverpool Bid in TFCR-43:', bid)

  // Find all bids in round TFCR-43
  const allBidsInRound = await prisma.team_round_bids.findMany({
    where: { roundId }
  })
  console.log(`Total bids in TFCR-43: ${allBidsInRound.length}`)
  allBidsInRound.forEach(b => {
    console.log(`- TeamId: ${b.teamId}, Submitted: ${b.submitted}, BidCount: ${b.bidCount}, LastUpdated: ${b.lastUpdated}`)
  })
}

checkLiverpoolBid()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
