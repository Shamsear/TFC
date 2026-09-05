import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const dbDawnCake = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_KpYPXOtu1M4k@ep-dawn-cake-azlyly4k-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    }
  }
})

const dbLivelyBreeze = new PrismaClient({
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

async function inspectDBs() {
  console.log('=== Checking DATABASE 1: ep-dawn-cake ===')
  try {
    const bids1 = await dbDawnCake.team_round_bids.findMany({ where: { roundId: 'TFCR-43' } })
    console.log(`Dawn-Cake total bids in TFCR-43: ${bids1.length}`)
    for (const b of bids1) {
      console.log(`- Team ${b.teamId} (submitted: ${b.submitted}, bidCount: ${b.bidCount}):`)
      console.log(decrypt(b.encryptedBids))
    }
  } catch (e: any) {
    console.error('Dawn-Cake error:', e.message)
  }

  console.log('\n=== Checking DATABASE 2: ep-lively-breeze ===')
  try {
    const bids2 = await dbLivelyBreeze.team_round_bids.findMany({ where: { roundId: 'TFCR-43' } })
    console.log(`Lively-Breeze total bids in TFCR-43: ${bids2.length}`)
    for (const b of bids2) {
      console.log(`- Team ${b.teamId} (submitted: ${b.submitted}, bidCount: ${b.bidCount}):`)
      console.log(decrypt(b.encryptedBids))
    }
  } catch (e: any) {
    console.error('Lively-Breeze error:', e.message)
  }
}

inspectDBs()
  .catch(console.error)
  .finally(async () => {
    await dbDawnCake.$disconnect()
    await dbLivelyBreeze.$disconnect()
  })
