import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AchievementsClient } from "@/components/team/AchievementsClient";
import { getActiveSeason } from "@/lib/get-active-season";
import { calculateLevelFromXP } from "@/lib/achievements-math";

export default async function AchievementsPage() {
  const session = await auth();

  if (!session?.user?.teamId) {
    redirect("/auth/signin");
  }

  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
    include: {
      unlockedBadges: true,
      xpHistory: {
        orderBy: {
          createdAt: 'desc',
        }
      }
    },
  });

  if (!team) {
    notFound();
  }

  // Resolve current manager from season_teams (authoritative)
  const activeSeason = await getActiveSeason();
  const currentSeasonTeam = activeSeason
    ? await prisma.season_teams.findFirst({
        where: { seasonId: activeSeason.id, teamId: team.id },
        select: { managerName: true }
      })
    : null;
  const mgrName = currentSeasonTeam?.managerName || team.managerName;

  // Resolve XP across ALL teams this manager has managed
  let totalXP = team.xp;
  let totalLevel = team.level;
  let allBadges = team.unlockedBadges;
  let allXpHistory = team.xpHistory;

  if (mgrName) {
    const mgrTeamIds = await prisma.season_teams.findMany({
      where: { managerName: { equals: mgrName, mode: 'insensitive' } },
      select: { teamId: true },
      distinct: ['teamId'],
    });
    const otherTeamIds = mgrTeamIds.map(t => t.teamId).filter(id => id !== team.id);

    if (otherTeamIds.length > 0) {
      const otherTeams = await prisma.teams.findMany({
        where: { id: { in: otherTeamIds } },
        select: {
          xp: true,
          level: true,
          unlockedBadges: true,
          xpHistory: {
            orderBy: { createdAt: 'desc' }
          }
        },
      });

      totalXP = [team, ...otherTeams].reduce((sum, t) => sum + t.xp, 0);
      totalLevel = calculateLevelFromXP(totalXP);
      allBadges = [...team.unlockedBadges, ...otherTeams.flatMap(t => t.unlockedBadges)];
      allXpHistory = [...team.xpHistory, ...otherTeams.flatMap(t => t.xpHistory)]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  const teamWithManager = {
    ...team,
    managerName: mgrName,
    xp: totalXP,
    level: totalLevel,
    unlockedBadges: allBadges,
    xpHistory: allXpHistory,
  };

  return <AchievementsClient team={teamWithManager} />;
}
