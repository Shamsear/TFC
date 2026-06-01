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

  // Check if user is admin
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    redirect("/");
  }

  const { seasonId } = await params;

  // Verify season exists
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
  });

  if (!season) {
    notFound();
  }

  // Fetch all teams with their badges and XP data
  const teams = await prisma.teams.findMany({
    where: {
      seasonTeams: {
        some: {
          seasonId: seasonId,
        }
      }
    },
    include: {
      unlockedBadges: {
        orderBy: {
          unlockedAt: 'desc',
        }
      },
      xpHistory: {
        orderBy: {
          createdAt: 'desc',
        }
      },
    },
    orderBy: [
      { xp: 'desc' },
      { name: 'asc' }
    ]
  });

  return <AllTeamsAchievementsClient teams={teams} season={season} />;
}
