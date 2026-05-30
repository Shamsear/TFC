import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import HistoricalDataWizard from "./HistoricalDataWizard";

export default async function HistoricalDataPage() {
  const session = await auth();

  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // Fetch base data for the wizard
  const [seasons, teams, players, managers, tournaments] = await Promise.all([
    prisma.seasons.findMany({
      orderBy: { seasonNumber: "desc" },
      select: { id: true, name: true, seasonNumber: true, startingPurse: true },
    }),
    prisma.teams.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, managerName: true },
    }),
    prisma.base_players.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        normalized_name: true,
        seasonalPlayerStats: {
          select: {
            seasonId: true,
            position: true,
            overallRating: true
          }
        }
      },
    }),
    prisma.managers.findMany({
      include: {
        teamLinks: true,
      },
    }),
    prisma.tournaments.findMany({
      select: { id: true, name: true, seasonId: true },
    }),
  ]);

  return (
    <div className="max-w-4xl lg:max-w-7xl xl:max-w-[1450px] 2xl:max-w-[1650px] mx-auto px-4 py-8 transition-all duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">Historical Data Import</h1>
        <p className="text-gray-400">
          Backfill historical data for previous seasons including team setup, tournaments, stats, and player assignments.
        </p>
      </div>

      <HistoricalDataWizard
        initialSeasons={seasons}
        initialTeams={teams}
        players={players}
        initialManagers={managers}
        initialTournaments={tournaments}
      />
    </div>
  );
}
