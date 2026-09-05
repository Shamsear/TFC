import crypto from 'crypto'
import { prisma } from '../lib/prisma'

const masterHex = '56af2f811317764faa8f75a6759dc67f651c89a59a69640a1a1f221e8771b573'
const keyBuf = Buffer.from(masterHex, 'hex')

function decrypt(b64: string) {
  try {
    const combined = Buffer.from(b64, 'base64').toString('utf8')
    const [ivHex, authTagHex, encryptedHex] = combined.split(':')
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    let dec = decipher.update(encryptedHex, 'hex', 'utf8')
    dec += decipher.final('utf8')
    return dec
  } catch (e: any) {
    return `Error: ${e.message}`
  }
}

async function checkPastRounds() {
  const liverpoolBids = await prisma.team_round_bids.findMany({
    where: { teamId: 'TFCM-24' },
    orderBy: { roundId: 'desc' },
    take: 5
  })

  for (const b of liverpoolBids) {
    console.log(`Round ${b.roundId}: submitted=${b.submitted}, bidCount=${b.bidCount}`)
    if (b.encryptedBids) {
      console.log('Decrypted:', decrypt(b.encryptedBids))
    }
  }
}

checkPastRounds()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
