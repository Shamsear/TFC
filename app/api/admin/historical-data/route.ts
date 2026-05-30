import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateUserId } from "@/lib/id-generator";
import { generateUniqueEmail, generatePasswordFromTeamName } from "@/lib/password-generator";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const payload = await req.json();
    const { season, seasonTeams, tournaments, stats, teamPlayers, awards } = payload;

    if (!seasonTeams || seasonTeams.length === 0) {
      return NextResponse.json({ error: "No teams provided for the season" }, { status: 400 });
    }

    // 1. Resolve Season
    let seasonId = season.id;
    if (!seasonId && season.name) {
      const maxSeason = await prisma.seasons.findFirst({ orderBy: { seasonNumber: "desc" } });
      const nextNumber = (maxSeason?.seasonNumber || 0) + 1;
      const newSeason = await prisma.seasons.create({
        data: {
          id: crypto.randomUUID(),
          name: season.name,
          startingPurse: 100000000,
          seasonNumber: nextNumber,
          isActive: false,
          updatedAt: new Date(),
        },
      });
      seasonId = newSeason.id;
    } else if (!seasonId) {
      return NextResponse.json({ error: "Season ID or Name is required" }, { status: 400 });
    }

    // Maps to track created/resolved IDs
    // tempId -> global Team ID
    const globalTeamIdMap = new Map<string, string>();
    // tempId -> season_team ID
    const seasonTeamIdMap = new Map<string, string>();
    // tempTournId -> dbTournId
    const tournIdMap = new Map<string, string>();

    // 2. Resolve Teams & Upsert season_teams
    for (const t of seasonTeams) {
      let teamId = t.id;
      if (!teamId && t.name) {
        // Create new global team and user credentials
        const teamIdStr = crypto.randomUUID();
        
        const email = await generateUniqueEmail(t.name.trim(), async (email) => {
          const existing = await prisma.users.findUnique({ where: { email } });
          return !!existing;
        });
        const password = generatePasswordFromTeamName(t.name.trim());
        const passwordHash = await hash(password, 10);
        const userId = await generateUserId();

        const [newTeam, newUser] = await prisma.$transaction([
          prisma.teams.create({
            data: {
              id: teamIdStr,
              name: t.name,
              managerName: t.managerName || "Manager",
              logoUrl: "/team-logos/default.png",
              updatedAt: new Date(),
            },
          }),
          prisma.users.create({
            data: {
              id: userId,
              email,
              name: t.managerName || "Manager",
              passwordHash,
              role: "TEAM_MANAGER",
              teamId: teamIdStr,
              createdBy: session.user.id,
              isActive: true,
              assignedSeasons: [seasonId]
            }
          })
        ]);
        teamId = newTeam.id;
      }
      globalTeamIdMap.set(t.tempId, teamId);

      // Create/Upsert season_team
      const seasonTeam = await prisma.season_teams.upsert({
        where: { seasonId_teamId: { seasonId, teamId } },
        update: { managerName: t.managerName, updatedAt: new Date() },
        create: {
          id: crypto.randomUUID(),
          seasonId,
          teamId,
          managerName: t.managerName,
          currentBudget: 100000000,
          updatedAt: new Date(),
        },
      });
      seasonTeamIdMap.set(t.tempId, seasonTeam.id);
    }

    // 3. Resolve Tournaments
    for (const t of tournaments) {
      let dbTournId = t.id;
      if (t.id.startsWith("t_")) {
        // Look up by name first
        let existingT = await prisma.tournaments.findUnique({
          where: { seasonId_name: { seasonId, name: t.name } },
        });
        if (!existingT) {
          existingT = await prisma.tournaments.create({
            data: {
              id: crypto.randomUUID(),
              seasonId,
              name: t.name,
              tournamentType: t.type || "LEAGUE",
              startDate: new Date(t.startDate || new Date()),
              updatedAt: new Date(),
            },
          });
        }
        dbTournId = existingT.id;
      }
      tournIdMap.set(t.id, dbTournId);

      // Link all resolved teams to this tournament
      for (const [tempId, seasonTeamId] of seasonTeamIdMap.entries()) {
        await prisma.tournament_teams.upsert({
          where: { tournamentId_teamId: { tournamentId: dbTournId, teamId: seasonTeamId } },
          update: {},
          create: { id: crypto.randomUUID(), tournamentId: dbTournId, teamId: seasonTeamId },
        });
      }
    }

    // 4. Save Standings (Stats)
    if (stats) {
      for (const [key, statData] of Object.entries(stats)) {
        // key is `${tournId}_${teamTempId}`
        const parts = key.split("_");
        // Reconstruct tournId in case it contained underscores (e.g., t_1)
        const teamTempId = parts[parts.length - 1]; // last part is tempId like tm_1234
        // Extract original tournament ID key
        const tournKey = key.replace(`_${teamTempId}`, "");
        
        const dbTournId = tournIdMap.get(tournKey) || tournKey;
        const seasonTeamId = seasonTeamIdMap.get(teamTempId);
        
        // Find tournament to get its groupName (if needed) or use empty string
        const tourn = tournaments.find((x: any) => x.id === tournKey);
        const groupName = tourn?.groupName || "";

        if (dbTournId && seasonTeamId) {
          const s = statData as any;
          await prisma.standings.upsert({
            where: {
              tournamentId_teamId_groupName: {
                tournamentId: dbTournId,
                teamId: seasonTeamId,
                groupName,
              },
            },
            update: {
              played: s.played || 0,
              won: s.won || 0,
              drawn: s.drawn || 0,
              lost: s.lost || 0,
              goalsFor: s.goalsFor || 0,
              goalsAgainst: s.goalsAgainst || 0,
              points: s.points || 0,
              updatedAt: new Date(),
            },
            create: {
              id: crypto.randomUUID(),
              tournamentId: dbTournId,
              teamId: seasonTeamId,
              groupName,
              played: s.played || 0,
              won: s.won || 0,
              drawn: s.drawn || 0,
              lost: s.lost || 0,
              goalsFor: s.goalsFor || 0,
              goalsAgainst: s.goalsAgainst || 0,
              points: s.points || 0,
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    // 5. Assign Players
    if (teamPlayers) {
      for (const [teamTempId, playerIds] of Object.entries(teamPlayers)) {
        const pIds = playerIds as string[];
        if (pIds.length === 0) continue;
        
        const globalTeamId = globalTeamIdMap.get(teamTempId);
        const seasonTeamId = seasonTeamIdMap.get(teamTempId);
        
        if (!globalTeamId || !seasonTeamId) continue;

        // Check existing to avoid duplicates
        const existingTransfers = await prisma.transfer_history.findMany({
          where: { seasonId, teamId: globalTeamId, basePlayerId: { in: pIds } },
        });
        const existingSet = new Set(existingTransfers.map(tx => tx.basePlayerId));

        const newTransfers = pIds
          .filter(pid => !existingSet.has(pid))
          .map(pid => ({
            id: crypto.randomUUID(),
            basePlayerId: pid,
            seasonId,
            teamId: globalTeamId,
            seasonTeamId,
            soldPrice: 0,
            acquisitionType: "historical_import",
            acquisitionNotes: "Imported via bulk Historical Data Wizard",
            status: "ACTIVE" as any,
          }));

        if (newTransfers.length > 0) {
          await prisma.transfer_history.createMany({ data: newTransfers });
        }
      }
    }

    // 6. Assign Awards
    if (awards) {
      // Clear existing awards for the season to do a fresh insert, or we can just upsert. 
      // Since it's easier to just wipe and rewrite for this season from the bulk UI:
      await prisma.season_awards.deleteMany({
        where: { seasonId }
      });

      const awardRecords: any[] = [];
      const pushAward = (type: string, teamTempId?: string, playerId?: string) => {
        if (!teamTempId && !playerId) return;
        awardRecords.push({
          id: crypto.randomUUID(),
          seasonId,
          awardType: type,
          teamId: teamTempId ? globalTeamIdMap.get(teamTempId) || null : null,
          basePlayerId: playerId || null,
        });
      };

      if (awards.winnerTeamId) pushAward("LEAGUE_WINNER", awards.winnerTeamId);
      if (awards.runnerUpTeamId) pushAward("LEAGUE_RUNNER_UP", awards.runnerUpTeamId);
      if (awards.goldenBootPlayerId) pushAward("GOLDEN_BOOT", undefined, awards.goldenBootPlayerId);
      if (awards.goldenGlovePlayerId) pushAward("GOLDEN_GLOVE", undefined, awards.goldenGlovePlayerId);
      if (awards.goldenBallPlayerId) pushAward("GOLDEN_BALL", undefined, awards.goldenBallPlayerId);
      if (awards.ballonDorPlayerId) pushAward("BALLON_D_OR", undefined, awards.ballonDorPlayerId);
      
      if (awards.teamOfTheSeasonPlayerIds && Array.isArray(awards.teamOfTheSeasonPlayerIds)) {
        for (const pid of awards.teamOfTheSeasonPlayerIds) {
          pushAward("TEAM_OF_THE_SEASON", undefined, pid);
        }
      }

      if (awardRecords.length > 0) {
        await prisma.season_awards.createMany({ data: awardRecords });
      }
    }

    // Log the bulk action
    await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        userEmail: session.user.email!,
        userRole: session.user.role,
        action: "historical_data_bulk_import",
        entityType: "seasons",
        entityId: seasonId,
        entityName: season.name || "Bulk Season",
        seasonId: seasonId,
        details: `Imported historical data for ${seasonTeams.length} teams in season ${season.name || seasonId}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving bulk historical data:", error);
    return NextResponse.json(
      { error: "Failed to save historical data", details: error.message },
      { status: 500 }
    );
  }
}
