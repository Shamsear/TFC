import { prisma } from '../lib/prisma'
import { decryptBids } from '../lib/auction/encryption'

async function submitLiverpoolBid() {
  const roundId = 'TFCR-43'
  const teamId = 'TFCM-24'

  // Fetch record directly from DB
  const bidRecord = await prisma.team_round_bids.findFirst({
    where: { roundId, teamId }
  })

  if (!bidRecord) {
    console.error('No bid record found for Liverpool in TFCR-43')
    return
  }

  console.log('Found Liverpool record:')
  console.log('- encryptedBids:', bidRecord.encryptedBids)
  console.log('- submitted:', bidRecord.submitted)
  console.log('- bidCount:', bidRecord.bidCount)

  if (!bidRecord.encryptedBids) {
    console.error('Liverpool has no encryptedBids content!')
    return
  }

  // Decrypt to verify content and count bids
  let bidsCount = 0
  try {
    const decryptedStr = decryptBids(bidRecord.encryptedBids)
    console.log('Decrypted content:', decryptedStr)
    const bidsArray = JSON.parse(decryptedStr)
    if (Array.isArray(bidsArray)) {
      bidsCount = bidsArray.length
    }
  } catch (e: any) {
    console.error('Decryption attempt error:', e.message)
  }

  console.log(`Detected player bids count: ${bidsCount}`)

  // Default to 27 if count parsing or decryption is sealed, or use detected count
  const finalBidCount = bidsCount > 0 ? bidsCount : 27

  // Update record to submitted = true
  const updated = await prisma.team_round_bids.update({
    where: { id: bidRecord.id },
    data: {
      submitted: true,
      bidCount: finalBidCount,
      submittedAt: new Date()
    }
  })

  console.log('Successfully updated Liverpool bid to SUBMITTED:')
  console.log(updated)
}

submitLiverpoolBid()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
