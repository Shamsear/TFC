import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key_must_be_32_bytes_long';

function decryptBids(encryptedData: string): string {
  try {
    const textParts = encryptedData.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return '{}';
  }
}

async function main() {
  const bids = await prisma.team_round_bids.findMany({
    where: { roundId: 'TFCR-1' }
  });

  for (const bid of bids) {
    console.log(`Team ${bid.teamId}:`);
    try {
      const decrypted = decryptBids(bid.encryptedBids);
      console.log(JSON.parse(decrypted));
    } catch (e) {
      console.log('Failed to parse:', e);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
