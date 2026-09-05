import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const dbCherry = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_KpYPXOtu1M4k@ep-ancient-cherry-azc4o24p-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
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
  console.log('=== Checking ep-ancient-cherry Database ===')

  // Find all bids in TFCR-43
  const bids = await dbCherry.team_round_bids.findMany({
    where: { roundId: 'TFCR-43' }
  })
  console.log(`Total bid records in TFCR-43: ${bids.length}`)

  for (const b of bids) {
    const team = await dbCherry.teams.findUnique({ where: { id: b.teamId } })
    const decStr = decrypt(b.encryptedBids)
    let count = 0
    try {
      const parsed = JSON.parse(decStr)
      count = parsed.bids?.length || 0
    } catch {}
    console.log(`Team: ${team?.name || b.teamId} (${b.teamId}) | Submitted: ${b.submitted} | BidCount: ${b.bidCount} | DecryptedCount: ${count}`)
  }

  // Find Nottingham Forest team specifically
  const forestTeam = await dbCherry.teams.findFirst({
    where: {
      OR: [
        { name: { contains: 'Nottingham', mode: 'insensitive' } },
        { name: { contains: 'Forest', mode: 'insensitive' } }
      ]
    }
  })
  console.log('\nNottingham Forest Team:', forestTeam)

  if (forestTeam) {
    const forestBid = await dbCherry.team_round_bids.findFirst({
      where: { roundId: 'TFCR-43', teamId: forestTeam.id }
    })
    console.log('Nottingham Forest Bid Record:', forestBid)
    if (forestBid?.encryptedBids) {
      console.log('Nottingham Forest Decrypted Bids:', decrypt(forestBid.encryptedBids))
    }
  }
}

run()
  .catch(console.error)
  .finally(() => dbCherry.$disconnect())
