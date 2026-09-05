import { prisma } from '../lib/prisma'

async function searchLogs() {
  const logs = await prisma.audit_logs.findMany({
    where: {
      OR: [
        { details: { contains: 'TFCM-24' } },
        { details: { contains: 'Liverpool' } },
        { details: { contains: 'TFCR-43' } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  console.log(`Found ${logs.length} audit logs:`)
  logs.forEach(l => {
    console.log(`[${l.createdAt.toISOString()}] ${l.action} - ${l.details}`)
  })
}

searchLogs()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
