const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sTeams = await prisma.season_teams.findMany({
    where: { seasonId: 'TFCS-3' },
    include: { team: true },
    orderBy: { team: { name: 'asc' } }
  });
  
  console.log(`=== TFC Season 3 (TFCS-3) ===`);
  for (const st of sTeams) {
    console.log(`${st.team.name} | Current Manager Name: ${st.managerName} | teamId: ${st.teamId} | id: ${st.id}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
