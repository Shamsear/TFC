import { prisma } from '../lib/prisma';
import { evaluateTeamAchievements } from '../lib/achievements-engine';

async function main() {
  console.log('🏁 Starting retroactive achievements and leveling calculation for all teams...');
  
  // Fetch all registered teams
  const teams = await prisma.teams.findMany({
    select: { id: true, name: true }
  });
  
  console.log(`📊 Found ${teams.length} teams in the database.`);
  
  for (const team of teams) {
    try {
      console.log(`⏳ Evaluating achievements and XP for: ${team.name} (${team.id})...`);
      await evaluateTeamAchievements(team.id);
      
      // Fetch updated stats to print results
      const updatedTeam = await prisma.teams.findUnique({
        where: { id: team.id },
        select: { xp: true, level: true }
      });
      
      console.log(`✅ Success! ${team.name} is now Level ${updatedTeam?.level} (${updatedTeam?.xp} XP)`);
    } catch (error) {
      console.error(`❌ Failed to evaluate achievements for ${team.name}:`, error);
    }
  }
  
  console.log('🏆 Retroactive achievements calculation completed successfully!');
}

main()
  .catch((e) => {
    console.error('Fatal error during retroactive calculation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
