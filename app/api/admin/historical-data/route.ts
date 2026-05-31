import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { 
  generateUserId, 
  generateSeasonId, 
  generateTeamId, 
  generateSeasonTeamId, 
  generateTournamentId, 
  generateTournamentTeamId,
  generateStandingId,
  generateTransferId,
  generateAuditId,
  generateManagerId
} from "@/lib/id-generator";
import { generateUniqueEmail, generatePasswordFromTeamName } from "@/lib/password-generator";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const payload = await req.json();
    const { 
      season, 
      seasonTeams = [], 
      tournaments = [], 
      activeTournTeams = {}, 
      stats = {}, 
      teamPlayers = {}, 
      awards = null 
    } = payload;

    const sTeams = seasonTeams;

    let counts = {
      season: 0,
      teams: 0,
      tournaments: 0,
      stats: 0,
      players: 0,
      awards: 0
    };
    let logs: string[] = [];

    // 1. Resolve Season
    let seasonId = season.id;
    if (!seasonId && season.name) {
      let targetNumber: number | null = null;
      const match = season.name.match(/\d+/);
      if (match) {
        targetNumber = parseInt(match[0], 10);
      }

      let generatedSeasonId = await generateSeasonId();
      const maxSeason = await prisma.seasons.findFirst({ orderBy: { seasonNumber: "desc" } });
      let generatedSeasonNumber = (maxSeason?.seasonNumber || 0) + 1;

      // If user typed "Season 1", try to use TFCS-1 and seasonNumber=1
      if (targetNumber !== null) {
        const potentialId = `TFCS-${targetNumber}`;
        const existing = await prisma.seasons.findUnique({ where: { id: potentialId } });
        const existingNum = await prisma.seasons.findUnique({ where: { seasonNumber: targetNumber } });
        
        if (!existing && !existingNum) {
          generatedSeasonId = potentialId;
          generatedSeasonNumber = targetNumber;
          // Synchronize the counter so we don't accidentally generate this ID later if the counter is behind
          await prisma.$executeRaw`
            INSERT INTO id_counters (prefix, counter, updated_at)
            VALUES ('TFCS', ${targetNumber}, NOW())
            ON CONFLICT (prefix) 
            DO UPDATE SET 
              counter = GREATEST(id_counters.counter, ${targetNumber}),
              updated_at = NOW()
          `;
        }
      }

      const newSeason = await prisma.seasons.create({
        data: {
          id: generatedSeasonId,
          name: season.name,
          startingPurse: 20000,
          seasonNumber: generatedSeasonNumber,
          isActive: false,
          updatedAt: new Date(),
        },
      });
      seasonId = newSeason.id;
      counts.season = 1;
      logs.push(`Created New Season '${newSeason.name}' with ID ${newSeason.id}`);
    } else if (!seasonId) {
      return NextResponse.json({ error: "Season ID or Name is required" }, { status: 400 });
    }

    // Maps for cross-referencing
    const globalTeamIdMap = new Map<string, string>(); // tempId -> global team.id
    const seasonTeamIdMap = new Map<string, string>(); // tempId -> season_team.id

    // 2. Resolve Teams & Upsert season_teams
    for (const t of sTeams) {
      counts.teams++;
      let teamId = t.id;
      if ((!teamId || teamId === "new") && t.name) {
        let existingTeam = await prisma.teams.findFirst({
          where: { name: { equals: t.name.trim(), mode: "insensitive" } }
        });
        
        if (existingTeam) {
          teamId = existingTeam.id;
          logs.push(`Linked Existing Global Team '${t.name}' (ID: ${teamId})`);
        } else {
          // Create new global team
          const teamIdStr = await generateTeamId();
          const newTeam = await prisma.teams.create({
            data: {
              id: teamIdStr,
              name: t.name.trim(),
              managerName: t.managerName || "Manager",
              logoUrl: "/team-logos/default.png",
              updatedAt: new Date(),
            },
          });
          teamId = newTeam.id;
          logs.push(`Created New Team '${newTeam.name}' with ID ${newTeam.id}`);
        }
      } else {
        logs.push(`Linked Existing Team '${t.name}' (ID: ${teamId})`);
      }
      globalTeamIdMap.set(t.tempId, teamId);

      // Create/Upsert season_team
      const seasonTeam = await prisma.season_teams.upsert({
        where: { seasonId_teamId: { seasonId, teamId } },
        update: { managerName: t.managerName, updatedAt: new Date() },
        create: {
          id: await generateSeasonTeamId(),
          seasonId,
          teamId,
          managerName: t.managerName,
          currentBudget: 20000,
          updatedAt: new Date(),
        },
      });
      seasonTeamIdMap.set(t.tempId, seasonTeam.id);

      // Link to Manager Profile & Resolve User Identity
      if (t.managerName && t.managerName.trim() !== "") {
        const mName = t.managerName.trim();
        let manager = await prisma.managers.findFirst({
          where: { name: { equals: mName, mode: "insensitive" } },
        });
        if (!manager) {
          const newManagerId = await generateManagerId();
          manager = await prisma.managers.create({
            data: { id: newManagerId, name: mName },
          });
          logs.push(`Created New Manager '${manager.name}' (ID: ${manager.id})`);
        }
        
        // Link Team to Manager
        await prisma.manager_teams.upsert({
          where: { managerId_teamId: { managerId: manager.id, teamId } },
          update: {},
          create: {
            managerId: manager.id,
            teamId,
            isCurrent: true,
          }
        });

        // Resolve User Identity
        const existingUser = await prisma.users.findFirst({ where: { managerId: manager.id } });
        if (!existingUser) {
          const normalizedManagerName = mName.toLowerCase().replace(/[^a-z0-9]/g, "");
          const email = await generateUniqueEmail(normalizedManagerName, async (email) => {
            const existing = await prisma.users.findUnique({ where: { email } });
            return !!existing;
          });
          const password = generatePasswordFromTeamName(normalizedManagerName);
          const passwordHash = await hash(password, 10);
          const userId = await generateUserId();

          await prisma.users.create({
            data: {
              id: userId,
              email,
              name: mName,
              passwordHash,
              role: "TEAM_MANAGER",
              teamId: teamId, // Initial active context
              managerId: manager.id,
              createdBy: session.user.id,
              isActive: true,
            }
          });
          logs.push(`Created New User for Manager '${mName}' (Email: ${email})`);
        }
      }
    }

    // 3. Resolve Tournaments
    const tournIdMap = new Map<string, string>();
    for (const t of tournaments) {
      counts.tournaments++;
      let dbTournId = t.id;
      
      // Safety check: if it's a real ID, ensure it actually belongs to the target season.
      // If it belongs to another season (e.g. from a dirty draft), force it to be treated as new.
      if (!dbTournId.startsWith("t_") && dbTournId) {
        const verifyT = await prisma.tournaments.findUnique({ where: { id: dbTournId } });
        if (verifyT && verifyT.seasonId !== seasonId) {
          dbTournId = `t_dirty_${dbTournId}`;
        }
      }

      if (dbTournId.startsWith("t_")) {
        // Look up by name first
        let existingT = await prisma.tournaments.findUnique({
          where: { seasonId_name: { seasonId, name: t.name } },
        });
        if (!existingT) {
          let safeType = "KNOCKOUT_ONLY";
          if (t.type === "LEAGUE_ONLY" || t.type === "LEAGUE_PLAYOFF" || t.type === "GROUP_KNOCKOUT" || t.type === "KNOCKOUT_ONLY") {
            safeType = t.type;
          } else if (t.type && typeof t.type === "string") {
            const up = t.type.toUpperCase();
            if (up.includes("LEAGUE")) safeType = "LEAGUE_ONLY";
            else if (up.includes("GROUP")) safeType = "GROUP_KNOCKOUT";
            else safeType = "KNOCKOUT_ONLY";
          }

          const newTourn = await prisma.tournaments.create({
            data: {
              id: await generateTournamentId(),
              seasonId,
              name: t.name,
              tournamentType: safeType as any,
              startDate: new Date(t.startDate || new Date()),
              updatedAt: new Date(),
            },
          });
          dbTournId = newTourn.id;
          logs.push(`Created New Tournament '${newTourn.name}' with ID ${newTourn.id}`);
        } else {
          dbTournId = existingT.id;
          logs.push(`Linked Existing Tournament '${t.name}' (ID: ${dbTournId})`);
        }
      }
      tournIdMap.set(t.id, dbTournId);

      // Clear existing tournament_teams for this tournament first
      await prisma.tournament_teams.deleteMany({
        where: { tournamentId: dbTournId }
      });

      // Link specific teams to this tournament if activeTournTeams is provided
      if (activeTournTeams && activeTournTeams[t.id] && activeTournTeams[t.id].length > 0) {
        for (const tempId of activeTournTeams[t.id]) {
          const seasonTeamId = seasonTeamIdMap.get(tempId);
          if (seasonTeamId) {
            await prisma.tournament_teams.upsert({
              where: { tournamentId_teamId: { tournamentId: dbTournId, teamId: seasonTeamId } },
              update: {},
              create: { id: await generateTournamentTeamId(), tournamentId: dbTournId, teamId: seasonTeamId },
            });
          }
        }
      } else if (!activeTournTeams) {
        // Fallback for older payloads without activeTournTeams: link all teams
        for (const [tempId, seasonTeamId] of seasonTeamIdMap.entries()) {
          await prisma.tournament_teams.upsert({
            where: { tournamentId_teamId: { tournamentId: dbTournId, teamId: seasonTeamId } },
            update: {},
            create: { id: await generateTournamentTeamId(), tournamentId: dbTournId, teamId: seasonTeamId },
          });
        }
      }
    }

    // 4. Save Standings (Stats)
    if (stats) {
      for (const [key, statData] of Object.entries(stats)) {
        // key is `${tournId}_${teamTempId}`
        let tournKey = "";
        let teamTempId = "";
        if (key.includes("_tm_")) {
          const parts = key.split("_tm_");
          tournKey = parts[0];
          teamTempId = "tm_" + parts[1];
        } else {
          // fallback
          const parts = key.split("_");
          teamTempId = parts[parts.length - 1];
          tournKey = key.replace(`_${teamTempId}`, "");
        }
        
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
              id: await generateStandingId(),
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
          counts.stats++;
        }
      }
      if (counts.stats > 0) logs.push(`Saved ${counts.stats} standing/stats records for season`);
    }

    // 5. Assign Players
    if (teamPlayers) {
      for (const [teamTempId, players] of Object.entries(teamPlayers)) {
        const pList = players as any[];
        if (pList.length === 0) continue;
        
        const globalTeamId = globalTeamIdMap.get(teamTempId);
        const seasonTeamId = seasonTeamIdMap.get(teamTempId);
        
        if (!globalTeamId || !seasonTeamId) continue;

        const pIds = pList.map(p => typeof p === 'string' ? p : p.id);

        // Check existing to avoid duplicates
        const existingTransfers = await prisma.transfer_history.findMany({
          where: { seasonId, teamId: globalTeamId, basePlayerId: { in: pIds } },
        });
        const existingSet = new Set(existingTransfers.map(tx => tx.basePlayerId));

        const newTransfers = pList
          .filter(p => {
            const pid = typeof p === 'string' ? p : p.id;
            return !existingSet.has(pid);
          })
          .map(p => {
            const pid = typeof p === 'string' ? p : p.id;
            const price = typeof p === 'string' ? 0 : (p.price || 0);
            
            return {
              id: crypto.randomUUID(),
              basePlayerId: pid,
              seasonId,
              teamId: globalTeamId,
              seasonTeamId,
              soldPrice: price,
              acquisitionType: "historical_import",
              acquisitionNotes: "Imported via bulk Historical Data Wizard",
              status: "ACTIVE" as any,
            };
          });

        if (newTransfers.length > 0) {
          await prisma.transfer_history.createMany({ data: newTransfers });
          counts.players += newTransfers.length;
          logs.push(`Assigned ${newTransfers.length} players to Team ID ${globalTeamId}`);
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
      const pushAward = (type: string, teamTempId?: string, metadataValue?: string) => {
        if (!teamTempId) return;
        const globalTeamId = globalTeamIdMap.get(teamTempId);
        if (!globalTeamId) return;
        awardRecords.push({
          id: crypto.randomUUID(), // Keeping UUID for awards as there is no TFCAW prefix currently
          seasonId,
          awardType: type,
          teamId: globalTeamId,
          basePlayerId: null,
          metadata: metadataValue || null,
        });
      };

      // 6a. Push tournament-specific awards
      if (awards.tournamentAwards && typeof awards.tournamentAwards === "object") {
        for (const [tournTempId, tournAwardData] of Object.entries(awards.tournamentAwards)) {
          const dbTournId = tournIdMap.get(tournTempId) || tournTempId;
          const data = tournAwardData as { winnerTeamId?: string; runnerUpTeamId?: string };
          if (data.winnerTeamId) {
            pushAward("LEAGUE_WINNER", data.winnerTeamId, dbTournId);
          }
          if (data.runnerUpTeamId) {
            pushAward("LEAGUE_RUNNER_UP", data.runnerUpTeamId, dbTournId);
          }
        }
      } else {
        // Fallback to legacy single season award
        if (awards.winnerTeamId) pushAward("LEAGUE_WINNER", awards.winnerTeamId);
        if (awards.runnerUpTeamId) pushAward("LEAGUE_RUNNER_UP", awards.runnerUpTeamId);
      }

      // 6b. Push individual awards
      if (awards.goldenBootTeamId) pushAward("GOLDEN_BOOT", awards.goldenBootTeamId);
      if (awards.goldenGloveTeamId) pushAward("GOLDEN_GLOVE", awards.goldenGloveTeamId);
      if (awards.goldenBallTeamId) pushAward("GOLDEN_BALL", awards.goldenBallTeamId);
      if (awards.ballonDorTeamId) pushAward("BALLON_D_OR", awards.ballonDorTeamId);
      
      if (awards.teamOfTheSeasonPlayerIds && Array.isArray(awards.teamOfTheSeasonPlayerIds)) {
        for (const tid of awards.teamOfTheSeasonPlayerIds) {
          pushAward("TEAM_OF_THE_SEASON", tid);
        }
      }

      if (awardRecords.length > 0) {
        await prisma.season_awards.createMany({ data: awardRecords });
        counts.awards += awardRecords.length;
        logs.push(`Saved ${awardRecords.length} season awards`);
      }
    }

    // Log the bulk action
    await prisma.audit_logs.create({
      data: {
        id: await generateAuditId(),
        userId: session.user.id,
        userEmail: session.user.email!,
        userRole: session.user.role,
        action: "historical_data_bulk_import",
        entityType: "seasons",
        entityId: seasonId,
        entityName: season.name || "Bulk Season",
        seasonId: seasonId,
        details: `Imported historical data for ${sTeams.length} teams in season ${season.name || seasonId}`,
      },
    });

    return NextResponse.json({ success: true, seasonId, saved: counts, logs });
  } catch (error: any) {
    console.error("Error saving bulk historical data:", error);
    return NextResponse.json(
      { error: "Failed to save historical data", details: error.message },
      { status: 500 }
    );
  }
}
