const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const st = await prisma.season_teams.findUnique({
    where: { id: 'TFCST-360' },
    include: {
      team: { select: { id: true, name: true, managerName: true, logoUrl: true } },
      season: { select: { id: true, name: true } }
    }
  });
  console.log("=== SEASON TEAM TFCST-360 ===");
  console.log(JSON.stringify(st, null, 2));

  // Check if there's a manager named Ameen
  const ameen = await prisma.managers.findFirst({
    where: { name: { contains: 'Ameen', mode: 'insensitive' } }
  });
  console.log("\n=== AMEEN MANAGER ===");
  console.log(JSON.stringify(ameen, null, 2));

  // Check all S5 entries that show Shadow
  const s5 = await prisma.season_teams.findMany({
    where: { seasonId: 'TFCS-5' },
    include: {
      team: { select: { name: true } }
    }
  });
  const shadowS5 = s5.filter(st => (st.managerName || '').toLowerCase() === 'shadow');
  console.log("\n=== ALL S5 ENTRIES WITH MANAGER=SHADOW ===");
  console.log(JSON.stringify(shadowS5.map(st => ({
    id: st.id, teamName: st.team.name, managerName: st.managerName
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
