import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { seasonId } = await params;

    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    // 1. Fetch Season Teams
    const seasonTeamsData = await prisma.season_teams.findMany({
      where: { seasonId },
      include: { team: true },
    });

    const seasonTeams = seasonTeamsData.map((st) => ({
      id: st.teamId,
      name: st.team.name,
      managerName: st.managerName || "",
      tempId: `tm_${st.teamId}`, // use real ID as tempId suffix to easily match
    }));

    // 2. Fetch Tournaments
    const tournamentsData = await prisma.tournaments.findMany({
      where: { seasonId },
    });

    const tournaments = tournamentsData.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.tournamentType,
      startDate: t.startDate.toISOString().split("T")[0],
      groupName: "", // Just placeholder, as we don't strictly use groupName in the UI right now for main listing
    }));

    // Fetch tournament teams to populate activeTournTeams accurately
    const tournTeamsData = await prisma.tournament_teams.findMany({
      where: {
        tournamentId: { in: tournamentsData.map((t) => t.id) }
      }
    });

    const activeTournTeams: Record<string, string[]> = {};
    tournamentsData.forEach(t => {
      activeTournTeams[t.id] = [];
    });
    
    tournTeamsData.forEach((tt) => {
      const st = seasonTeamsData.find(x => x.id === tt.teamId);
      if (st) {
        if (!activeTournTeams[tt.tournamentId]) activeTournTeams[tt.tournamentId] = [];
        activeTournTeams[tt.tournamentId].push(`tm_${st.teamId}`);
      }
    });

    // 3. Fetch Standings
    const standingsData = await prisma.standings.findMany({
      where: { 
        tournamentId: { in: tournamentsData.map((t) => t.id) }
      },
    });

    const stats: Record<string, any> = {};
    standingsData.forEach((s) => {
      // Find the season_team to map back to the tempId
      const st = seasonTeamsData.find(x => x.id === s.teamId);
      if (st) {
        const key = `${s.tournamentId}_tm_${st.teamId}`;
        stats[key] = {
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          points: s.points,
        };
      }
    });

    // 4. Fetch Player Assignments (Transfer History)
    const transfersData = await prisma.transfer_history.findMany({
      where: { seasonId },
      select: { teamId: true, basePlayerId: true, soldPrice: true }
    });

    const teamPlayers: Record<string, { id: string; price: number }[]> = {};
    transfersData.forEach((tx) => {
      const tempId = `tm_${tx.teamId}`;
      if (!teamPlayers[tempId]) {
        teamPlayers[tempId] = [];
      }
      if (!teamPlayers[tempId].some(p => p.id === tx.basePlayerId)) {
        teamPlayers[tempId].push({ id: tx.basePlayerId, price: tx.soldPrice });
      }
    });

    // 5. Fetch Awards
    const awardsData = await prisma.season_awards.findMany({
      where: { seasonId },
    });

    const awards: Record<string, any> = {};
    awardsData.forEach((aw) => {
      if (aw.awardType === "LEAGUE_WINNER") awards.winnerTeamId = `tm_${aw.teamId}`;
      if (aw.awardType === "LEAGUE_RUNNER_UP") awards.runnerUpTeamId = `tm_${aw.teamId}`;
      if (aw.awardType === "GOLDEN_BOOT") awards.goldenBootPlayerId = aw.basePlayerId;
      if (aw.awardType === "GOLDEN_GLOVE") awards.goldenGlovePlayerId = aw.basePlayerId;
      if (aw.awardType === "GOLDEN_BALL") awards.goldenBallPlayerId = aw.basePlayerId;
      if (aw.awardType === "BALLON_D_OR") awards.ballonDorPlayerId = aw.basePlayerId;
      if (aw.awardType === "TEAM_OF_THE_SEASON") {
        if (!awards.teamOfTheSeasonPlayerIds) awards.teamOfTheSeasonPlayerIds = [];
        awards.teamOfTheSeasonPlayerIds.push(aw.basePlayerId);
      }
    });

    return NextResponse.json({
      season: { id: season.id, name: season.name },
      seasonTeams,
      tournaments,
      activeTournTeams,
      stats,
      teamPlayers,
      awards,
    });
  } catch (error: any) {
    console.error("Error fetching historical data:", error);
    return NextResponse.json(
      { error: "Failed to fetch historical data", details: error.message },
      { status: 500 }
    );
  }
}
