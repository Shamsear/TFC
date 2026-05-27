const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying recent push delivery logs...');
  const logs = await prisma.push_delivery_log.findMany({
    take: 10,
    orderBy: { sentAt: 'desc' }
  });

  console.log('\n--- Push Delivery Logs ---');
  if (logs.length === 0) {
    console.log('No push delivery logs found.');
  } else {
    logs.forEach(l => {
      console.log(`ID: ${l.id} | SubId: ${l.subscriptionId} | Status: ${l.status} | SentAt: ${l.sentAt} | Error: ${l.errorMessage || 'None'}`);
    });
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
