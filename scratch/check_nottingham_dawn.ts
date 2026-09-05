import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const dbDawn = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_KpYPXOtu1M4k@ep-dawn-cake-azlyly4k-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
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
  console.log('=== Checking Nottingham Forest (TFCM-28) in ep-dawn-cake ===')

  const record = await dbDawn.team_round_bids.findFirst({
    where: { roundId: 'TFCR-43', teamId: 'TFCM-28' }
  })

  console.log('Nottingham Forest Record in TFCR-43:', record)

  if (record?.encryptedBids) {
    console.log('\nDecrypted Bids:')
    console.log(decrypt(record.encryptedBids))
  }

  // Check transfer_history for Nottingham Forest in TFCR-43
  const transfer = await dbDawn.transfer_history.findFirst({
    where: { roundId: 'TFCR-43', teamId: 'TFCM-28' },
    include: { basePlayer: true }
  })
  console.log('\nNottingham Forest Transfer Result in TFCR-43:', transfer)
}

run()
  .catch(console.error)
  .finally(() => dbDawn.$disconnect())
