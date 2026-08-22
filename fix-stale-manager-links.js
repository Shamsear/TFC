const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find all managers with multiple isCurrent:true links
  const duplicates = await prisma.$queryRaw`
    SELECT 
      mt1.manager_id,
      m.name as manager_name
    FROM manager_teams mt1
    JOIN managers m ON mt1.manager_id = m.id
    WHERE mt1.is_current = true
    GROUP BY mt1.manager_id, m.name
    HAVING COUNT(*) > 1
  `;

  console.log(`Found ${duplicates.length} managers with multiple isCurrent:true links\n`);

  for (const dup of duplicates) {
    const managerId = dup.manager_id;
    const managerName = dup.manager_name;

    // Get all current links for this manager, ordered by createdAt desc
    const links = await prisma.manager_teams.findMany({
      where: { managerId, isCurrent: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`${managerName} (${managerId}): ${links.length} current links`);
    
    // Keep the FIRST (most recent) link, deactivate the rest
    const keepLink = links[0];
    const deactivateLinks = links.slice(1);

    for (const link of deactivateLinks) {
      await prisma.manager_teams.update({
        where: { managerId_teamId: { managerId: link.managerId, teamId: link.teamId } },
        data: { isCurrent: false }
      });
      console.log(`  ❌ Deactivated link to team ${link.teamId}`);
    }
    
    console.log(`  ✅ Kept link to team ${keepLink.teamId}\n`);
  }

  console.log('Done! All stale isCurrent:true links have been deactivated.');
}

main().finally(() => prisma.$disconnect());
