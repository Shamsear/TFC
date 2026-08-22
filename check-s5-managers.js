const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the Schalke 04 entry in Season 5
  const schalke = await prisma.season_teams.findMany({
    where: { seasonId: 'TFCS-5' },
    include: {
      team: { select: { id: true, name: true, managerName: true } },
      season: { select: { name: true } }
    },
    orderBy: { team: { name: 'asc' } }
  });

  // Find all entries with Shadow as manager
  const shadowEntries = schalke.filter(st => 
    (st.managerName || '').toLowerCase() === 'shadow'
  );
  console.log("=== SEASON 5 ENTRIES WITH SHADOW ===");
  console.log(JSON.stringify(shadowEntries.map(st => ({
    seasonTeamId: st.id,
    teamName: st.team.name,
    teamId: st.teamId,
    teamManagerName: st.team.managerName,
    seasonTeamManagerName: st.managerName,
    isActive: st.isActive
  })), null, 2));

  // Also check Season 4 for Shadow
  const s4 = await prisma.season_teams.findMany({
    where: { 
      seasonId: 'TFCS-4',
    },
    include: {
      team: { select: { id: true, name: true } },
    }
  });
  const s4Shadow = s4.filter(st => (st.managerName || '').toLowerCase() === 'shadow');
  console.log("\n=== SEASON 4 ENTRIES WITH SHADOW ===");
  console.log(JSON.stringify(s4Shadow.map(st => ({
    seasonTeamId: st.id,
    teamName: st.team.name,
    teamId: st.teamId,
    seasonTeamManagerName: st.managerName,
    isActive: st.isActive
  })), null, 2));

  // Check what Schalke's actual manager should be
  const schalkeTeam = await prisma.teams.findFirst({
    where: { name: { contains: 'Schalke', mode: 'insensitive' } },
    include: {
      managerLinks: { include: { manager: true }, orderBy: { createdAt: 'desc' } }
    }
  });
  console.log("\n=== SCHALKE 04 TEAM INFO ===");
  console.log(JSON.stringify({
    teamId: schalkeTeam?.id,
    teamName: schalkeTeam?.name,
    teamManagerName: schalkeTeam?.managerName,
    managerLinks: schalkeTeam?.managerLinks.map(ml => ({
      managerId: ml.managerId,
      managerName: ml.manager?.name,
      isCurrent: ml.isCurrent
    }))
  }, null, 2));

  // Check if Al Hilal in Season 5 should have Shadow or someone else
  const alHilal = await prisma.teams.findFirst({
    where: { name: { contains: 'Hilal', mode: 'insensitive' } },
    include: {
      managerLinks: { include: { manager: true }, orderBy: { createdAt: 'desc' } }
    }
  });
  console.log("\n=== AL HILAL TEAM INFO ===");
  console.log(JSON.stringify({
    teamId: alHilal?.id,
    teamName: alHilal?.name,
    teamManagerName: alHilal?.managerName,
    managerLinks: alHilal?.managerLinks.map(ml => ({
      managerId: ml.managerId,
      managerName: ml.manager?.name,
      isCurrent: ml.isCurrent
    }))
  }, null, 2));
}

main().finally(() => prisma.$disconnect());
