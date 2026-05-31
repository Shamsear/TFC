import { prisma } from '@/lib/prisma';
import {
  XP_VALUES,
  BADGE_DEFINITIONS,
  calculateLevelFromXP,
  getCumulativeXPForLevel,
  getXPForNextLevel,
  getRankDetails,
  BadgeDef
} from '@/lib/achievements-math';

export {
  XP_VALUES,
  BADGE_DEFINITIONS,
  calculateLevelFromXP,
  getCumulativeXPForLevel,
  getXPForNextLevel,
  getRankDetails
};
export type { BadgeDef };

/**
 * Evaluates and updates XP, Level, and Badges for a given team based on their match history.
 * Designed to be run either as a trigger on match completion, or retroactively for all teams.
 */
/**
 * Evaluates and updates XP, Level, and Badges for a given team based on their match history.
 * Designed to be run either as a trigger on match completion, or retroactively for all teams.
 * Tracks and saves a detailed XP ledger record (team_xp_history) for every single XP gain.
 */
export async function evaluateTeamAchievements(teamId: string, txClient?: any) {
  const db = txClient || prisma;

  // 1. Get all season_teams for the base team
  const seasonTeams = await db.season_teams.findMany({
    where: { teamId },
    select: { id: true, seasonId: true, trophiesWon: true },
  });
  const seasonTeamIds = seasonTeams.map((st: any) => st.id);

  if (seasonTeamIds.length === 0) {
    // No season participation yet, level stays at default
    return;
  }

  // 2. Fetch all completed matches chronologically with full names and tournament details
  const completedMatches = await db.matches.findMany({
    where: {
      status: 'COMPLETED',
      OR: [
        { homeTeamId: { in: seasonTeamIds } },
        { awayTeamId: { in: seasonTeamIds } },
      ],
    },
    orderBy: { matchDate: 'asc' },
    include: {
      homeTeam: { 
        select: { 
          id: true, 
          teamId: true,
          team: { select: { name: true } }
        } 
      },
      awayTeam: { 
        select: { 
          id: true, 
          teamId: true,
          team: { select: { name: true } }
        } 
      },
      tournament: { select: { name: true, seasonId: true } }
    },
  });

  // Keep track of accumulated stats, badges, and detailed XP ledger logs
  const badgesToAward: Array<{ key: string; seasonId: string | null }> = [];
  const xpLogs: Array<{
    amount: number;
    xpType: string;
    description: string;
    matchId?: string;
    badgeKey?: string;
  }> = [];

  // Streak variables
  let currentWinStreak = 0;
  let currentUnbeatenStreak = 0;
  const concededHistory: number[] = [];
  let lastLossMargin = 0;

  // Head-to-head tracking for Double Jeopardy
  const h2hRecord: Record<string, { wins: number; matches: number }> = {};

  let totalGoalsFor = 0;

  for (const match of completedMatches) {
    const isHome = match.homeTeam.teamId === teamId;
    const mySeasonTeamId = isHome ? match.homeTeamId : match.awayTeamId;
    const opponentSeasonTeamId = isHome ? match.awayTeamId : match.homeTeamId;
    const opponentBaseTeamId = isHome ? match.awayTeam.teamId : match.homeTeam.teamId;
    const opponentName = isHome ? match.awayTeam.team.name : match.homeTeam.team.name;
    const tournamentName = match.tournament?.name || 'Tournament';

    const myScore = isHome ? match.homeScore! : match.awayScore!;
    const opponentScore = isHome ? match.awayScore! : match.homeScore!;
    const myResult = myScore > opponentScore ? 'win' : myScore === opponentScore ? 'draw' : 'loss';

    totalGoalsFor += myScore;

    // A. Base XP calculations and trace logging
    xpLogs.push({
      amount: XP_VALUES.MATCH_PLAYED,
      xpType: 'MATCH_PLAYED',
      description: `Match played vs ${opponentName} (${myScore}-${opponentScore}) in ${tournamentName}`,
      matchId: match.id
    });

    if (myResult === 'win') {
      xpLogs.push({
        amount: XP_VALUES.MATCH_WON,
        xpType: 'MATCH_WON',
        description: `Match won vs ${opponentName} (${myScore}-${opponentScore}) in ${tournamentName}`,
        matchId: match.id
      });
    } else if (myResult === 'draw') {
      xpLogs.push({
        amount: XP_VALUES.MATCH_DRAWN,
        xpType: 'MATCH_DRAWN',
        description: `Match drawn vs ${opponentName} (${myScore}-${opponentScore}) in ${tournamentName}`,
        matchId: match.id
      });
    }

    if (myScore > 0) {
      xpLogs.push({
        amount: myScore * XP_VALUES.GOAL_SCORED,
        xpType: 'GOAL_SCORED',
        description: `Goals scored: ${myScore} goal(s) vs ${opponentName} (${myScore}-${opponentScore})`,
        matchId: match.id
      });
    }

    // B. Evaluate Match-Level Badges
    if (opponentScore === 0) {
      badgesToAward.push({ key: 'IRON_CURTAIN', seasonId: match.tournament?.seasonId || null });
    }
    if (myResult === 'win' && myScore - opponentScore === 1) {
      badgesToAward.push({ key: 'SQUEAKY_BUM_TIME', seasonId: null });
    }
    if (myScore === 0 && opponentScore === 0) {
      badgesToAward.push({ key: 'SLEEPING_PILLS', seasonId: null });
    }
    if (myResult === 'draw' && myScore >= 2) {
      badgesToAward.push({ key: 'PERFECT_BALANCE', seasonId: null });
    }
    if (myResult === 'win' && opponentScore >= 3) {
      badgesToAward.push({ key: 'HIGHSCORE_THRILLER', seasonId: null });
    }
    if (myResult === 'win' && myScore - opponentScore >= 4) {
      badgesToAward.push({ key: 'DEMOLITION_JOB', seasonId: null });
    }
    if (myScore >= 5) {
      badgesToAward.push({ key: 'GALE_FORCE', seasonId: null });
    }
    if (myScore + opponentScore >= 6) {
      badgesToAward.push({ key: 'THE_ENTERTAINERS', seasonId: null });
    }
    if (myResult === 'win' && myScore >= 4 && opponentScore === 0) {
      badgesToAward.push({ key: 'APEX_PREDATOR', seasonId: null });
    }
    if (myResult === 'win' && myScore >= 3 && opponentScore === 0) {
      badgesToAward.push({ key: 'FLAWLESS_VICTORY', seasonId: null });
    }

    // C. Evaluate Streaks
    if (myResult === 'win') {
      currentWinStreak++;
      currentUnbeatenStreak++;
    } else if (myResult === 'draw') {
      currentWinStreak = 0;
      currentUnbeatenStreak++;
    } else {
      currentWinStreak = 0;
      currentUnbeatenStreak = 0;
    }

    if (currentWinStreak >= 3) badgesToAward.push({ key: 'UNSTOPPABLE_1', seasonId: null });
    if (currentWinStreak >= 5) badgesToAward.push({ key: 'UNSTOPPABLE_2', seasonId: null });
    if (currentWinStreak >= 8) badgesToAward.push({ key: 'UNSTOPPABLE_3', seasonId: null });

    if (currentUnbeatenStreak >= 5) badgesToAward.push({ key: 'INVINCIBLE_1', seasonId: null });
    if (currentUnbeatenStreak >= 10) badgesToAward.push({ key: 'INVINCIBLE_2', seasonId: null });
    if (currentUnbeatenStreak >= 15) badgesToAward.push({ key: 'INVINCIBLE_3', seasonId: null });

    // Conceded slider for Guard Dog (concede max 1 in 5 matches)
    concededHistory.push(opponentScore);
    if (concededHistory.length > 5) concededHistory.shift();
    if (concededHistory.length === 5 && concededHistory.reduce((a, b) => a + b, 0) <= 1) {
      badgesToAward.push({ key: 'GUARD_DOG', seasonId: null });
    }

    // D. Evaluate Tactical Achievements

    // Double Jeopardy (Beat home and away)
    const h2hKey = `${match.tournamentId}_${opponentBaseTeamId}`;
    if (!h2hRecord[h2hKey]) h2hRecord[h2hKey] = { wins: 0, matches: 0 };
    h2hRecord[h2hKey].matches++;
    if (myResult === 'win') h2hRecord[h2hKey].wins++;
    if (h2hRecord[h2hKey].wins >= 2) {
      badgesToAward.push({ key: 'DOUBLE_JEOPARDY', seasonId: null });
    }

    // Resilient Spirit (Win immediately after losing by >= 3 goals)
    if (myResult === 'win' && lastLossMargin >= 3) {
      badgesToAward.push({ key: 'RESILIENT_SPIRIT', seasonId: null });
    }
    if (myResult === 'loss') {
      lastLossMargin = opponentScore - myScore;
    } else {
      lastLossMargin = 0;
    }

    // Giant Killer (Win against a top-3 team while bottom-half)
    if (myResult === 'win') {
      const standings = await db.standings.findMany({
        where: { tournamentId: match.tournamentId },
        orderBy: { points: 'desc' },
        select: { teamId: true },
      });

      const totalTeams = standings.length;
      const ourIndex = standings.findIndex((s: any) => s.teamId === mySeasonTeamId);
      const opponentIndex = standings.findIndex((s: any) => s.teamId === opponentSeasonTeamId);

      const ourStanding = ourIndex !== -1 ? ourIndex + 1 : totalTeams;
      const opponentStanding = opponentIndex !== -1 ? opponentIndex + 1 : 100;

      const isBottomHalf = ourStanding > totalTeams / 2;
      const isTopThree = opponentStanding <= 3;

      if (isBottomHalf && isTopThree) {
        badgesToAward.push({ key: 'GIANT_KILLER', seasonId: null });
      }
    }

    // Streak Buster (Ended opponent's 5+ game win streak)
    if (myResult === 'win' || myResult === 'draw') {
      const oppCompletedMatches = await db.matches.findMany({
        where: {
          status: 'COMPLETED',
          matchDate: { lt: match.matchDate },
          OR: [
            { homeTeamId: opponentSeasonTeamId },
            { awayTeamId: opponentSeasonTeamId },
          ],
        },
        orderBy: { matchDate: 'desc' },
        take: 5,
        include: {
          homeTeam: { select: { id: true, teamId: true } },
          awayTeam: { select: { id: true, teamId: true } },
        },
      });

      if (oppCompletedMatches.length === 5) {
        const isOpponentWin = (m: any) => {
          const isOppHome = m.homeTeam.id === opponentSeasonTeamId;
          return isOppHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
        };
        const wasOnWinStreak = oppCompletedMatches.every((m: any) => isOpponentWin(m));
        if (wasOnWinStreak) {
          badgesToAward.push({ key: 'STREAK_BUSTER', seasonId: null });
        }
      }
    }
  }

  // E. Evaluate Cumulative Milestones
  if (totalGoalsFor >= 50) badgesToAward.push({ key: 'GOAL_BARON', seasonId: null });
  if (totalGoalsFor >= 100) badgesToAward.push({ key: 'CENTURION', seasonId: null });

  const totalTrophies = seasonTeams.reduce((sum: number, st: any) => sum + (st.trophiesWon || 0), 0);
  if (totalTrophies >= 3) badgesToAward.push({ key: 'TROPHY_HOARDER', seasonId: null });

  // F. Evaluate Completed Standings/Seasonal Badges
  const standingsRecords = await db.standings.findMany({
    where: { teamId: { in: seasonTeamIds } },
    include: { tournament: true },
  });

  for (const standing of standingsRecords) {
    if (standing.tournament?.status === 'COMPLETED') {
      if (standing.played > 0 && standing.lost === 0) {
        badgesToAward.push({ key: 'GOLDEN_INVINCIBLES', seasonId: standing.tournament.seasonId });
      }

      const allTournamentStandings = await db.standings.findMany({
        where: { tournamentId: standing.tournamentId },
        orderBy: [{ points: 'desc' }],
      });

      if (allTournamentStandings.length > 0) {
        const maxGoals = Math.max(...allTournamentStandings.map((s: any) => s.goalsFor));
        const minGoalsConceded = Math.min(...allTournamentStandings.map((s: any) => s.goalsAgainst));

        if (standing.goalsFor === maxGoals && standing.played >= 5) {
          badgesToAward.push({ key: 'GOLDEN_BOOT', seasonId: standing.tournament.seasonId });
        }
        if (standing.goalsAgainst === minGoalsConceded && standing.played >= 5) {
          badgesToAward.push({ key: 'GOLDEN_GLOVE', seasonId: standing.tournament.seasonId });
        }
      }
    }
  }

  // G. Filter out duplicate badges we intend to award, keeping unique awards by [badgeKey, seasonId]
  const uniqueAwardsMap = new Map<string, { key: string; seasonId: string | null }>();
  for (const b of badgesToAward) {
    const compoundKey = `${b.key}_${b.seasonId || 'null'}`;
    uniqueAwardsMap.set(compoundKey, b);
  }
  const uniqueAwards = Array.from(uniqueAwardsMap.values());

  // Add Badge Unlock XP to the total XP and log it
  for (const award of uniqueAwards) {
    const def = BADGE_DEFINITIONS[award.key];
    if (def) {
      xpLogs.push({
        amount: def.xpAward,
        xpType: 'BADGE_UNLOCKED',
        description: `Unlocked Badge: '${def.name}' (${def.tier} Tier)`,
        badgeKey: award.key
      });
    }
  }

  // Calculate final team level
  const finalCalculatedXP = xpLogs.reduce((sum, log) => sum + log.amount, 0);
  const finalLevel = calculateLevelFromXP(finalCalculatedXP);

  // H. Database Sync: Upsert Badges, update team level, and save chronological XP ledger transaction-safely
  const runSync = async (tx: any) => {
    // 1. Delete all existing XP history for this team to prevent duplicates on recalculation
    await tx.team_xp_history.deleteMany({
      where: { teamId }
    });

    // 2. Insert all new XP history records chronologically
    if (xpLogs.length > 0) {
      await tx.team_xp_history.createMany({
        data: xpLogs.map(log => ({
          teamId,
          amount: log.amount,
          xpType: log.xpType,
          description: log.description,
          matchId: log.matchId || null,
          badgeKey: log.badgeKey || null
        }))
      });
    }

    // 3. Get existing badges in DB to avoid SQL constraint violations
    const existingBadges = await tx.team_badges.findMany({
      where: { teamId },
      select: { badgeKey: true, seasonId: true },
    });

    const isDuplicate = (award: any) => {
      return existingBadges.some(
        (eb: any) => eb.badgeKey === award.key && eb.seasonId === award.seasonId
      );
    };

    // 4. Insert new badges only
    for (const award of uniqueAwards) {
      if (!isDuplicate(award)) {
        const def = BADGE_DEFINITIONS[award.key];
        await tx.team_badges.create({
          data: {
            teamId,
            badgeKey: award.key,
            badgeName: def?.name || award.key,
            tier: def?.tier || 'BRONZE',
            seasonId: award.seasonId,
          },
        });
      }
    }

    // 5. Update the team progression values
    await tx.teams.update({
      where: { id: teamId },
      data: {
        xp: finalCalculatedXP,
        level: finalLevel,
      },
    });
  };

  // If we received a transaction client, we're already inside a transaction — use it directly.
  // Otherwise wrap in a new $transaction.
  if (txClient) {
    await runSync(db);
  } else {
    await prisma.$transaction(runSync);
  }
}
