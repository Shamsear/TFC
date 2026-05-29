import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AchievementsClient } from "@/components/team/AchievementsClient";

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

  return <AchievementsClient team={team} />;
}
