import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AchievementsClient } from "@/components/team/AchievementsClient";
import { resolveTeamManagerNames } from "@/lib/resolve-manager";

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

  // Resolve current manager
  const mgrMap = await resolveTeamManagerNames([team.id])
  const teamWithManager = {
    ...team,
    managerName: mgrMap.get(team.id) || team.managerName
  }

  return <AchievementsClient team={teamWithManager} />;
}