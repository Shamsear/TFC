import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AchievementsClient } from "@/components/team/AchievementsClient";

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

  return <AchievementsClient team={team} />;
}