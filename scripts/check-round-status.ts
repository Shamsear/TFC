import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function checkRound() {
  const round = await prisma.rounds.findUnique({
    where: { id: 'TFCR-21' },
    select: {
      roundNumber: true,
      roundType: true,
      status: true
    }
  })
  
  console.log('Round TFCR-21:', JSON.stringify(round, null, 2))
  
  if (round?.roundType === 'bulk') {
    const selections = await prisma.bulk_round_selections.findMany({
      where: { roundId: 'TFCR-21' },
      select: {
        teamId: true,
        submitted: true
      }
    })
    console.log('\nBulk selections count:', selections.length)
    console.log('Submitted:', selections.filter(s => s.submitted).length)
  }
  
  await prisma.$disconnect()
}

checkRound()
