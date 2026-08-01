import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import SeasonStatsClient from "./SeasonStatsClient";

interface PageProps {
  params: Promise<{
    seasonId: string;
  }>;
}

export default async function SeasonStatsPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if user is authorized
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

  // Fetch season teams, team details, and standings for all tournaments in this season
  const seasonTeams = await prisma.season_teams.findMany({
    where: { seasonId },
    include: {
      team: true,
      standings: {
        include: {
          tournament: true,
        },
      },
    },
  });

  // Serialize before passing to client component to avoid Next.js serialization warnings
  const serializedSeason = JSON.parse(JSON.stringify(season));
  const serializedSeasonTeams = JSON.parse(JSON.stringify(seasonTeams));

  return (
    <SeasonStatsClient
      season={serializedSeason}
      seasonTeams={serializedSeasonTeams}
    />
  );
}
