import { prisma } from '../lib/prisma'
import { decryptBids } from '../lib/auction/encryption'

async function testDecryptLiverpool() {
  const roundId = 'TFCR-43'
  const teamId = 'TFCM-24'

  const bidRecord = await prisma.team_round_bids.findFirst({
    where: { roundId, teamId }
  })

  if (!bidRecord || !bidRecord.encryptedBids) {
    console.error('No encrypted bids found for Liverpool')
    return
  }

  const decrypted = decryptBids(bidRecord.encryptedBids)
  console.log('Decrypted Bids:', decrypted)
  console.log(`Decrypted player count: ${decrypted?.length || 0}`)
}

testDecryptLiverpool()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
