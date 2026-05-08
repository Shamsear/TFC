const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing database connection...');
  
  const users = await prisma.user.findMany();
  console.log('Users in database:', users.length);
  
  users.forEach(user => {
    console.log(`- ${user.email} (${user.role})`);
  });
  
  if (users.length === 0) {
    console.log('\n⚠️  No users found! Please run the SQL seed script in Neon.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
