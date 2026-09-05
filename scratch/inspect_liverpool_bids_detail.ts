import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient({
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
  const liverpoolBid = await db.team_round_bids.findFirst({
    where: { roundId: 'TFCR-43', teamId: 'TFCM-24' }
  })

  console.log('Liverpool Record:', liverpoolBid)
  if (liverpoolBid?.encryptedBids) {
    console.log('\nLiverpool Decrypted Bids:')
    console.log(decrypt(liverpoolBid.encryptedBids))
  }
}

run()
  .catch(console.error)
  .finally(() => db.$disconnect())
