import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const payload = await req.json();
    const { seasonId, tournamentId, activeTeams = [], stats = {}, groupName = "" } = payload;

    if (!seasonId || !tournamentId) {
      return NextResponse.json(
        { error: "seasonId and tournamentId are required" },
        { status: 400 }
      );
    }

    // 1. Verify Season and Tournament exist
    const [seasonObj, tournamentObj] = await prisma.$transaction([
      prisma.seasons.findUnique({ where: { id: seasonId } }),
      prisma.tournaments.findUnique({ where: { id: tournamentId } }),
    ]);

    if (!seasonObj) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }
    if (!tournamentObj) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // 2. Perform Transaction to save stats & active teams
    await prisma.$transaction(async (tx) => {
      // Delete existing tournament_teams for this tournament first
      await tx.tournament_teams.deleteMany({
        where: { tournamentId },
      });

      // Insert new tournament_teams
      if (activeTeams.length > 0) {
        const tournTeamRecords = [];
        for (const teamTempId of activeTeams) {
          // Resolve seasonTeam ID: teamTempId is in format "tm_GLOBAL_TEAM_ID"
          const globalTeamId = teamTempId.replace(/^tm_/, "");
          // Look up season_team for this season and global team
          const seasonTeam = await tx.season_teams.findUnique({
            where: { seasonId_teamId: { seasonId, teamId: globalTeamId } },
          });

          if (seasonTeam) {
            tournTeamRecords.push({
              id: crypto.randomUUID(),
              tournamentId,
              teamId: seasonTeam.id,
            });
          }
        }

        if (tournTeamRecords.length > 0) {
          await tx.tournament_teams.createMany({
            data: tournTeamRecords,
          });
        }
      }

      // Save standings
      // First, delete existing standings for this tournament and groupName
      await tx.standings.deleteMany({
        where: {
          tournamentId,
          groupName,
        },
      });

      // Insert new standings
      const standingRecords = [];
      for (const [key, statData] of Object.entries(stats)) {
        // key is `${tournamentId}_${teamTempId}`
        if (!key.startsWith(`${tournamentId}_`)) continue;
        
        let teamTempId = "";
        if (key.includes("_tm_")) {
          teamTempId = "tm_" + key.split("_tm_")[1];
        } else {
          teamTempId = key.split("_").pop() || "";
        }

        const globalTeamId = teamTempId.replace(/^tm_/, "");
        const seasonTeam = await tx.season_teams.findUnique({
          where: { seasonId_teamId: { seasonId, teamId: globalTeamId } },
        });

        if (seasonTeam) {
          const s = statData as any;
          standingRecords.push({
            id: crypto.randomUUID(),
            tournamentId,
            teamId: seasonTeam.id,
            groupName,
            played: s.played || 0,
            won: s.won || 0,
            drawn: s.drawn || 0,
            lost: s.lost || 0,
            goalsFor: s.goalsFor || 0,
            goalsAgainst: s.goalsAgainst || 0,
            points: s.points || 0,
            updatedAt: new Date(),
          });
        }
      }

      if (standingRecords.length > 0) {
        await tx.standings.createMany({
          data: standingRecords,
        });
      }
    });

    return NextResponse.json({
      success: true,
      tournamentId,
      teamsCount: activeTeams.length,
      statsCount: Object.keys(stats).length,
    });
  } catch (error: any) {
    console.error("Error saving tournament stats:", error);
    return NextResponse.json(
      { error: "Failed to save tournament stats", details: error.message },
      { status: 500 }
    );
  }
}
