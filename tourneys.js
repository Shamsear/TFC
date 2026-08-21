const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.tournaments.findMany({ where: { seasonId: 'TFCS-3' } }).then(console.log).finally(() => prisma.$disconnect());
