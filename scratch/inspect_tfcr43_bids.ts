import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { decryptBids } from '../lib/auction/encryption'

async function inspectAllBids() {
  const roundId = 'TFCR-43'

  const allBids = await prisma.team_round_bids.findMany({
    where: { roundId }
  })

  console.log(`Total bid records in ${roundId}: ${allBids.length}`)

  for (const b of allBids) {
    const team = await prisma.teams.findUnique({ where: { id: b.teamId } })
    console.log(`\nTeam: ${team?.name} (${b.teamId})`)
    console.log(`- Submitted: ${b.submitted}`)
    console.log(`- BidCount: ${b.bidCount}`)
    console.log(`- SubmittedAt: ${b.submittedAt}`)
    
    if (b.encryptedBids) {
      try {
        const decrypted = decryptBids(b.encryptedBids)
        console.log(`- Decrypted Bids Content: ${decrypted}`)
      } catch (e: any) {
        console.log(`- Decryption Error: ${e.message}`)
      }
    } else {
      console.log(`- encryptedBids: null/empty`)
    }
  }
}

inspectAllBids()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
