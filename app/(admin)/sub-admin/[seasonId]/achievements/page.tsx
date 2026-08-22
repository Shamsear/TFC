import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AllTeamsAchievementsClient } from "@/components/admin/AllTeamsAchievementsClient";

interface PageProps {
  params: Promise<{
    seasonId: string;
  }>;
}

export default async function AllTeamsAchievementsPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    redirect("/");
  }

  const { seasonId } = await params;

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
  });

  if (!season) {
    notFound();
  }

  // Fetch all season_teams for this season to get manager names
  const seasonTeams = await prisma.season_teams.findMany({
    where: { seasonId },
    select: { teamId: true, managerName: true },
  });

  // Get unique manager names
  const managerNames = [...new Set(seasonTeams.map(st => st.managerName).filter(Boolean))] as string[];

  // For each manager, find ALL their teams and aggregate XP/badges
  const teamsWithManagers = await Promise.all(
    seasonTeams.map(async (st) => {
      // Find all teams this manager has managed across all seasons
      const mgrAllTeams = await prisma.season_teams.findMany({
        where: { managerName: { equals: st.managerName || '', mode: 'insensitive' } },
        select: { teamId: true },
        distinct: ['teamId'],
      });
      const allTeamIds = [...new Set(mgrAllTeams.map(t => t.teamId))];

      const allTeams = await prisma.teams.findMany({
        where: { id: { in: allTeamIds } },
        select: {
          xp: true,
          level: true,
          unlockedBadges: true,
          xpHistory: { orderBy: { createdAt: 'desc' } },
        },
      });

      const totalXP = allTeams.reduce((sum, t) => sum + t.xp, 0);
      const maxLevel = Math.max(...allTeams.map(t => t.level), 1);
      const allBadges = allTeams.flatMap(t => t.unlockedBadges);
      const allXpHistory = allTeams.flatMap(t => t.xpHistory)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Get the current season team data
      const currentTeam = await prisma.teams.findUnique({
        where: { id: st.teamId },
        select: { id: true, name: true, logoUrl: true, managerName: true },
      });

      return {
        ...currentTeam!,
        managerName: st.managerName || currentTeam?.managerName || '',
        xp: totalXP,
        level: maxLevel,
        unlockedBadges: allBadges,
        xpHistory: allXpHistory,
      };
    })
  );

  return <AllTeamsAchievementsClient teams={teamsWithManagers} season={season} />;
}
