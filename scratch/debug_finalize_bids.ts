import { prisma } from '../lib/prisma'
import { decryptBids } from '../lib/auction/encryption'

async function debugFinalizeBids() {
  const roundId = 'TFCR-43'

  const teamBids = await prisma.team_round_bids.findMany({
    where: { roundId },
    select: {
      teamId: true,
      encryptedBids: true,
      submitted: true
    }
  })

  console.log(`Found ${teamBids.length} team bid records in DB.`)

  for (const tb of teamBids) {
    const team = await prisma.teams.findUnique({ where: { id: tb.teamId } })
    try {
      const decrypted = decryptBids(tb.encryptedBids)
      const parsed = JSON.parse(decrypted)
      console.log(`Team ${team?.name} (${tb.teamId}) - submitted: ${tb.submitted}, bids count: ${parsed.bids?.length || 0}`)
      if (tb.teamId === 'TFCM-24') {
        console.log('Liverpool bids sample:', parsed.bids?.slice(0, 5))
      }
    } catch (e: any) {
      console.error(`Failed to decrypt for Team ${team?.name} (${tb.teamId}):`, e.message)
    }
  }
}

debugFinalizeBids()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
