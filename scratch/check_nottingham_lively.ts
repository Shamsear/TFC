import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const dbLively = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_S6Dejo4Jwygz@ep-lively-breeze-azqotftf-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
})

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
  console.log('=== Checking Nottingham Forest in ep-lively-breeze ===')

  // Find Nottingham Forest team
  const teams = await dbLively.teams.findMany({
    where: {
      OR: [
        { name: { contains: 'Nottingham', mode: 'insensitive' } },
        { name: { contains: 'Forest', mode: 'insensitive' } }
      ]
    }
  })
  console.log('Nottingham Forest Teams found:', teams)

  // Find all bids in TFCR-43 on ep-lively-breeze
  const allBids = await dbLively.team_round_bids.findMany({
    where: { roundId: 'TFCR-43' }
  })
  console.log(`Total bids in TFCR-43 on ep-lively-breeze: ${allBids.length}`)

  for (const b of allBids) {
    const t = await dbLively.teams.findUnique({ where: { id: b.teamId } })
    console.log(`\nTeam: ${t?.name || b.teamId} (${b.teamId})`)
    console.log(`- Submitted: ${b.submitted}`)
    console.log(`- BidCount: ${b.bidCount}`)
    console.log(`- LastUpdated: ${b.lastUpdated}`)
    console.log(`- SubmittedAt: ${b.submittedAt}`)
    if (b.encryptedBids) {
      console.log(`- Decrypted:`, decrypt(b.encryptedBids))
    }
  }
}

run()
  .catch(console.error)
  .finally(() => dbLively.$disconnect())
