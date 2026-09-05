import crypto from 'crypto'
import { prisma } from '../lib/prisma'

async function findKeyForLiverpool() {
  const record = await prisma.team_round_bids.findFirst({
    where: { roundId: 'TFCR-43', teamId: 'TFCM-24' }
  })

  if (!record || !record.encryptedBids) return

  const combined = Buffer.from(record.encryptedBids, 'base64').toString('utf8')
  const parts = combined.split(':')
  if (parts.length !== 3) {
    console.error('Invalid parts:', parts)
    return
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  // Common keys
  const secretsToTest = [
    '56af2f811317764faa8f75a6759dc67f651c89a59a69640a1a1f221e8771b573',
    '45024bb583ef7b5051dbf9efe644193141f5aa03df9083bde68755556c3e94d8',
    '0'.repeat(64),
    process.env.ENCRYPTION_SECRET,
    process.env.OLD_ENCRYPTION_SECRET,
    process.env.NEXTAUTH_SECRET,
    process.env.AUTH_SECRET,
    process.env.POSTGRES_URL,
    process.env.VERCEL_OIDC_TOKEN,
    'tfc_auction_secret_2026',
    'tfc_secret_key',
    'turfcats_secret'
  ].filter(Boolean) as string[]

  for (const s of secretsToTest) {
    // Generate potential 32-byte buffers
    const candidateBuffers: Buffer[] = []
    if (s.length === 64 && /^[0-9a-fA-F]+$/.test(s)) {
      candidateBuffers.push(Buffer.from(s, 'hex'))
    }
    candidateBuffers.push(crypto.createHash('sha256').update(s).digest())
    const pad32 = Buffer.alloc(32, 0)
    Buffer.from(s, 'utf8').copy(pad32, 0, 0, Math.min(s.length, 32))
    candidateBuffers.push(pad32)

    for (const keyBuf of candidateBuffers) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv)
        decipher.setAuthTag(authTag)
        let dec = decipher.update(encryptedHex, 'hex', 'utf8')
        dec += decipher.final('utf8')
        console.log('🎉 SUCCESS! Key found!')
        console.log('Secret:', s)
        console.log('Key Hex:', keyBuf.toString('hex'))
        console.log('Decrypted Bids:', dec)
        return
      } catch (err) {
        // Continue
      }
    }
  }

  console.log('No key matched among candidate list.')
}

findKeyForLiverpool()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
