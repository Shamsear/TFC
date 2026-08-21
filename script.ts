const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const seasons = await prisma.seasons.findMany({
    orderBy: { seasonNumber: 'asc' }
  });

  for (const season of seasons) {
    console.log(`\n=== ${season.name} (${season.id}) ===`);
    const sTeams = await prisma.season_teams.findMany({
      where: { seasonId: season.id },
      include: { team: true }
    });
    
    for (const st of sTeams) {
      console.log(`- Team: ${st.team.name} | managerName on season_teams: ${st.managerName} | teamId: ${st.teamId} | season_teams_id: ${st.id}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
