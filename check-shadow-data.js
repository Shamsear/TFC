const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the manager named Shadow
  const shadow = await prisma.managers.findFirst({
    where: { name: { equals: 'Shadow', mode: 'insensitive' } },
    include: {
      teamLinks: {
        include: { team: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  console.log("\n=== SHADOW MANAGER ===");
  console.log(JSON.stringify(shadow, null, 2));

  // Find all season_teams where managerName contains Shadow
  const seasonTeams = await prisma.season_teams.findMany({
    where: { managerName: { contains: 'Shadow', mode: 'insensitive' } },
    include: {
      team: { select: { id: true, name: true, managerName: true } },
      season: { select: { id: true, name: true, seasonNumber: true } }
    },
    orderBy: { season: { seasonNumber: 'desc' } }
  });
  console.log("\n=== SEASON_TEAMS WITH SHADOW ===");
  console.log(JSON.stringify(seasonTeams.map(st => ({
    seasonTeamId: st.id,
    seasonName: st.season.name,
    seasonNumber: st.season.seasonNumber,
    teamName: st.team.name,
    teamManagerName: st.team.managerName,
    seasonTeamManagerName: st.managerName,
    teamId: st.teamId
  })), null, 2));

  // Also find the teams Al Hilal and PSG
  const teams = await prisma.teams.findMany({
    where: {
      OR: [
        { name: { contains: 'Hilal', mode: 'insensitive' } },
        { name: { contains: 'PSG', mode: 'insensitive' } }
      ]
    },
    include: {
      managerLinks: {
        include: { manager: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  console.log("\n=== AL HILAL AND PSG TEAMS ===");
  console.log(JSON.stringify(teams.map(t => ({
    teamId: t.id,
    teamName: t.name,
    managerName: t.managerName,
    managerLinks: t.managerLinks.map(ml => ({
      managerId: ml.managerId,
      managerName: ml.manager?.name,
      isCurrent: ml.isCurrent,
      createdAt: ml.createdAt
    }))
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
