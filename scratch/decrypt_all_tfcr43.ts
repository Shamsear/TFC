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

async function run() {
  const bids = await prisma.team_round_bids.findMany({
    where: { roundId: 'TFCR-43' }
  })

  for (const b of bids) {
    console.log(`\nTeam ${b.teamId} (submitted: ${b.submitted}, bidCount: ${b.bidCount}):`)
    console.log(decrypt(b.encryptedBids))
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
