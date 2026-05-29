import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting manager name migration...");
  
  // Find all season_teams and include their related team to get the manager name
  const seasonTeams = await prisma.season_teams.findMany({
    include: {
      team: true,
    },
  });

  console.log(`Found ${seasonTeams.length} season_teams to process.`);
  
  let updatedCount = 0;
  
  for (const st of seasonTeams) {
    if (!st.managerName && st.team?.managerName) {
      await prisma.season_teams.update({
        where: {
          id: st.id,
        },
        data: {
          managerName: st.team.managerName,
        },
      });
      updatedCount++;
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} season_teams records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
