const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting manager migration...");

  // 1. Fetch all teams
  const teams = await prisma.teams.findMany({
    select: { id: true, name: true, managerName: true },
  });

  console.log(`Found ${teams.length} teams.`);

  // 2. Group by managerName
  const managerMap = new Map(); // managerName -> array of team IDs

  for (const team of teams) {
    const mName = (team.managerName || "Unknown").trim();
    if (!managerMap.has(mName)) {
      managerMap.set(mName, []);
    }
    managerMap.get(mName).push(team.id);
  }

  console.log(`Found ${managerMap.size} unique managers.`);

  // 3. Create managers and links
  let createdCount = 0;
  let linkCount = 0;

  for (const [managerName, teamIds] of managerMap.entries()) {
    // Check if manager already exists
    let manager = await prisma.managers.findUnique({
      where: { name: managerName },
    });

    if (!manager) {
      manager = await prisma.managers.create({
        data: { name: managerName },
      });
      createdCount++;
    }

    // Link teams
    for (const teamId of teamIds) {
      // Check if link exists
      const link = await prisma.manager_teams.findUnique({
        where: {
          managerId_teamId: { managerId: manager.id, teamId: teamId },
        },
      });

      if (!link) {
        await prisma.manager_teams.create({
          data: {
            managerId: manager.id,
            teamId: teamId,
            isCurrent: true, // Assuming current for historical
          },
        });
        linkCount++;
      }
    }
  }

  console.log(`Migration Complete!`);
  console.log(`Created ${createdCount} new managers.`);
  console.log(`Created ${linkCount} team links.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
