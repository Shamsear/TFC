const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find all managers with MULTIPLE isCurrent: true links
  const managersWithMultipleCurrent = await prisma.$queryRaw`
    SELECT 
      mt1.manager_id,
      m.name as manager_name,
      mt1.team_id as team1_id,
      t1.name as team1_name,
      mt1.created_at as team1_created,
      mt2.team_id as team2_id,
      t2.name as team2_name,
      mt2.created_at as team2_created
    FROM manager_teams mt1
    JOIN manager_teams mt2 ON mt1.manager_id = mt2.manager_id 
      AND mt1.team_id < mt2.team_id
      AND mt1.is_current = true 
      AND mt2.is_current = true
    JOIN managers m ON mt1.manager_id = m.id
    JOIN teams t1 ON mt1.team_id = t1.id
    JOIN teams t2 ON mt2.team_id = t2.id
    ORDER BY m.name
  `;
  
  console.log("\n=== MANAGERS WITH MULTIPLE isCurrent:true LINKS ===");
  console.log(JSON.stringify(managersWithMultipleCurrent, null, 2));
  console.log(`Total: ${managersWithMultipleCurrent.length} managers\n`);

  // Also check: in each season, are there season_teams entries where the SAME 
  // managerName appears for different teams?
  const duplicateManagersInSeason = await prisma.$queryRaw`
    SELECT 
      st1.season_id,
      s.name as season_name,
      st1.manager_name,
      st1.team_id as team1_id,
      t1.name as team1_name,
      st2.team_id as team2_id,
      t2.name as team2_name
    FROM season_teams st1
    JOIN season_teams st2 ON st1.season_id = st2.season_id 
      AND st1.team_id < st2.team_id
      AND st1.manager_name IS NOT NULL
      AND st1.manager_name = st2.manager_name
    JOIN seasons s ON st1.season_id = s.id
    JOIN teams t1 ON st1.team_id = t1.id
    JOIN teams t2 ON st2.team_id = t2.id
    ORDER BY s.season_number DESC, st1.manager_name
  `;
  
  console.log("\n=== SAME MANAGER IN SAME SEASON FOR DIFFERENT TEAMS ===");
  console.log(JSON.stringify(duplicateManagersInSeason, null, 2));
  console.log(`Total: ${duplicateManagersInSeason.length} duplicates\n`);

  // Check for managers that appear in the managers table but DON'T have 
  // manager_teams links — these would fall back to season_teams matching
  const managersWithoutLinks = await prisma.managers.findMany({
    where: {
      teamLinks: { none: {} }
    },
    select: { id: true, name: true }
  });
  console.log("\n=== MANAGERS WITHOUT ANY TEAM LINK ===");
  console.log(JSON.stringify(managersWithoutLinks, null, 2));
  console.log(`Total: ${managersWithoutLinks.length}\n`);
}

main().finally(() => prisma.$disconnect());
