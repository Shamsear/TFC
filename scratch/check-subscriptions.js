const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying push subscriptions...');
  const subs = await prisma.push_subscriptions.findMany({
    include: { user: { select: { email: true, name: true } } }
  });

  console.log('\n--- Push Subscriptions ---');
  if (subs.length === 0) {
    console.log('No subscriptions found in the database.');
  } else {
    subs.forEach(s => {
      console.log(`ID: ${s.id} | Email: ${s.user.email} | Device: ${s.deviceName} (${s.deviceType}) | Active: ${s.isActive} | Endpoint: ${s.endpoint.substring(0, 40)}...`);
    });
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
