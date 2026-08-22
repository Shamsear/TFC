import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AchievementsClient } from "@/components/team/AchievementsClient";
import { resolveTeamManagerNames } from "@/lib/resolve-manager";

interface PageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export default async function AchievementsPage({ params }: PageProps) {
  const { teamId } = await params;

  const team = await prisma.teams.findUnique({
    where: { id: teamId },
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

  // Resolve current manager
  const mgrMap = await resolveTeamManagerNames([team.id])
  const teamWithManager = {
    ...team,
    managerName: mgrMap.get(team.id) || team.managerName
  }

  return <AchievementsClient team={teamWithManager} />;
}
