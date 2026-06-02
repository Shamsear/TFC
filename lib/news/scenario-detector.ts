import { prisma } from '@/lib/prisma';

/**
 * Advanced scenario detection for news generation
 * Detects special match situations and patterns
 */

export interface ScenarioResult {
  eventType: string;
  priority: number; // Higher = more important
  metadata: Record<string, any>;
}

/**
 * Detect all applicable scenarios for a match
 * Returns the highest priority scenario
 */
export async function detectMatchScenarios(
  matchId: string,
  tournamentId: string,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
  round: number,
  isFirstMatch: boolean,
  homePenalty: number | null,
  awayPenalty: number | null
): Promise<ScenarioResult | null> {
  const scenarios: ScenarioResult[] = [];

  // Get historical data for both teams
  const [homeHistory, awayHistory, tournament] = await Promise.all([
    getTeamHistory(tournamentId, homeTeamId, matchId),
    getTeamHistory(tournamentId, awayTeamId, matchId),
    prisma.tournaments.findUnique({
      where: { id: tournamentId },
      select: { 
        name: true, 
        tournamentType: true
      }
    })
  ]);

  if (!tournament) return null;

  const goalDiff = Math.abs(homeScore - awayScore);
  const totalGoals = homeScore + awayScore;
  const winner = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : null;

  // Priority 10: Matchday Opener (highest)
  if (isFirstMatch) {
    scenarios.push({
      eventType: 'matchday_opener',
      priority: 10,
      metadata: {}
    });
  }

  // Priority 9: Final Day Drama
  const completedRounds = await getCompletedRounds(tournamentId);
  const allMatches = await prisma.matches.findMany({
    where: { tournamentId },
    select: { round: true },
    distinct: ['round']
  });
  const totalRounds = allMatches.length;
  
  if (round === totalRounds && completedRounds === totalRounds) {
    const standings = await prisma.standings.findMany({
      where: { tournamentId },
      orderBy: [{ points: 'desc' }, { goalDiff: 'desc' }]
    });

    const top3 = standings.slice(0, 3);
    const pointsGap = top3.length >= 2 ? top3[0].points - top3[1].points : 999;

    if (pointsGap <= 3) {
      scenarios.push({
        eventType: 'final_day_drama',
        priority: 9,
        metadata: {
          is_final_round: true,
          title_undecided: pointsGap <= 3
        }
      });
    }
  }

  // Priority 8: Title Secured
  if (winner) {
    const winnerTeamId = winner === 'home' ? homeTeamId : awayTeamId;
    const secured = await checkTitleSecured(tournamentId, winnerTeamId);
    if (secured.isSecured) {
      scenarios.push({
        eventType: 'title_secured',
        priority: 8,
        metadata: {
          games_remaining: secured.gamesRemaining,
          secured_early: secured.gamesRemaining > 0
        }
      });
    }
  }

  // Priority 7: Title Dream Over (Elimination)
  const loserTeamId = winner === 'home' ? awayTeamId : winner === 'away' ? homeTeamId : null;
  if (loserTeamId) {
    const eliminated = await checkTitleEliminated(tournamentId, loserTeamId);
    if (eliminated.isEliminated && eliminated.justEliminated) {
      scenarios.push({
        eventType: 'title_dream_over',
        priority: 7,
        metadata: {
          points_behind: eliminated.pointsBehind,
          games_remaining: eliminated.gamesRemaining
        }
      });
    }
  }

  // Priority 6: Must-Win for Title
  const mustWinCheck = await checkMustWinForTitle(tournamentId, homeTeamId, awayTeamId);
  if (mustWinCheck.isMustWin) {
    scenarios.push({
      eventType: 'must_win_title',
      priority: 6,
      metadata: {
        team: mustWinCheck.team,
        points_behind: mustWinCheck.pointsBehind
      }
    });
  }

  // Priority 5: Title Race Heats Up
  const titleRace = await checkTitleRace(tournamentId);
  if (titleRace.isHeated) {
    scenarios.push({
      eventType: 'title_race_heating',
      priority: 5,
      metadata: {
        contenders: titleRace.contenders,
        points_gap: titleRace.pointsGap
      }
    });
  }

  // Priority 4: Unbeaten/Losing Streaks
  if (winner === 'home') {
    const homeStreak = calculateStreak(homeHistory, 'unbeaten');
    if (homeStreak >= 5) {
      scenarios.push({
        eventType: 'unbeaten_streak',
        priority: 4,
        metadata: { streak_length: homeStreak, team: 'home' }
      });
    }

    const awayLosses = calculateStreak(awayHistory, 'losing');
    if (awayLosses >= 3) {
      scenarios.push({
        eventType: 'losing_streak',
        priority: 4,
        metadata: { streak_length: awayLosses, team: 'away' }
      });
    }
  } else if (winner === 'away') {
    const awayStreak = calculateStreak(awayHistory, 'unbeaten');
    if (awayStreak >= 5) {
      scenarios.push({
        eventType: 'unbeaten_streak',
        priority: 4,
        metadata: { streak_length: awayStreak, team: 'away' }
      });
    }

    const homeLosses = calculateStreak(homeHistory, 'losing');
    if (homeLosses >= 3) {
      scenarios.push({
        eventType: 'losing_streak',
        priority: 4,
        metadata: { streak_length: homeLosses, team: 'home' }
      });
    }
  }

  // Priority 3: Perfect Start
  const homeMatches = homeHistory.results.length + 1;
  const awayMatches = awayHistory.results.length + 1;
  
  if (winner === 'home' && homeMatches <= 5) {
    const allWins = homeHistory.results.every((r: string) => r === 'W');
    if (allWins && homeMatches >= 3) {
      scenarios.push({
        eventType: 'perfect_start',
        priority: 3,
        metadata: { matches: homeMatches, team: 'home' }
      });
    }
  } else if (winner === 'away' && awayMatches <= 5) {
    const allWins = awayHistory.results.every((r: string) => r === 'W');
    if (allWins && awayMatches >= 3) {
      scenarios.push({
        eventType: 'perfect_start',
        priority: 3,
        metadata: { matches: awayMatches, team: 'away' }
      });
    }
  }

  // Priority 3: Winless Drought Ends
  if (winner === 'home') {
    const homeWinless = calculateWinlessDrought(homeHistory);
    if (homeWinless >= 5) {
      scenarios.push({
        eventType: 'winless_drought_ends',
        priority: 3,
        metadata: { drought_length: homeWinless, team: 'home' }
      });
    }
  } else if (winner === 'away') {
    const awayWinless = calculateWinlessDrought(awayHistory);
    if (awayWinless >= 5) {
      scenarios.push({
        eventType: 'winless_drought_ends',
        priority: 3,
        metadata: { drought_length: awayWinless, team: 'away' }
      });
    }
  }

  // Priority 3: Clean Sheet Master
  if (winner === 'home' && awayScore === 0) {
    const cleanSheets = calculateCleanSheetStreak(homeHistory);
    if (cleanSheets >= 3) {
      scenarios.push({
        eventType: 'clean_sheet_master',
        priority: 3,
        metadata: { clean_sheets: cleanSheets + 1, team: 'home' }
      });
    }
  } else if (winner === 'away' && homeScore === 0) {
    const cleanSheets = calculateCleanSheetStreak(awayHistory);
    if (cleanSheets >= 3) {
      scenarios.push({
        eventType: 'clean_sheet_master',
        priority: 3,
        metadata: { clean_sheets: cleanSheets + 1, team: 'away' }
      });
    }
  }

  // Priority 2: Position-based scenarios
  const standings = await prisma.standings.findMany({
    where: { tournamentId },
    orderBy: [{ points: 'desc' }, { goalDiff: 'desc' }],
    include: {
      seasonTeam: {
        include: { team: true }
      }
    }
  });

  const homeStanding = standings.find(s => s.teamId === homeTeamId);
  const awayStanding = standings.find(s => s.teamId === awayTeamId);

  if (homeStanding && awayStanding) {
    const homePos = standings.indexOf(homeStanding) + 1;
    const awayPos = standings.indexOf(awayStanding) + 1;
    const totalTeams = standings.length;

    // Top of Table Takeover
    if (winner && homePos === 1 && homeStanding.points > standings[1]?.points) {
      scenarios.push({
        eventType: 'top_of_table_takeover',
        priority: 2,
        metadata: { team: 'home', new_leader: true }
      });
    } else if (winner && awayPos === 1 && awayStanding.points > standings[1]?.points) {
      scenarios.push({
        eventType: 'top_of_table_takeover',
        priority: 2,
        metadata: { team: 'away', new_leader: true }
      });
    }

    // Giant Slayer (bottom half beats top 3)
    if (winner === 'home' && homePos > Math.ceil(totalTeams / 2) && awayPos <= 3) {
      scenarios.push({
        eventType: 'giant_slayer',
        priority: 2,
        metadata: { 
          underdog: 'home',
          underdog_position: homePos,
          favorite_position: awayPos
        }
      });
    } else if (winner === 'away' && awayPos > Math.ceil(totalTeams / 2) && homePos <= 3) {
      scenarios.push({
        eventType: 'giant_slayer',
        priority: 2,
        metadata: { 
          underdog: 'away',
          underdog_position: awayPos,
          favorite_position: homePos
        }
      });
    }

    // Basement Battle (both in bottom 2)
    if (homePos >= totalTeams - 1 && awayPos >= totalTeams - 1) {
      scenarios.push({
        eventType: 'basement_battle',
        priority: 2,
        metadata: {
          home_position: homePos,
          away_position: awayPos
        }
      });
    }

    // Mid-Table Mediocrity (stuck in 5th-8th for 5+ rounds)
    if (round >= 5 && homePos >= 5 && homePos <= 8) {
      const stuck = await checkPositionStagnation(tournamentId, homeTeamId, 5, 8, 5);
      if (stuck) {
        scenarios.push({
          eventType: 'mid_table_mediocrity',
          priority: 1,
          metadata: { team: 'home', position: homePos, rounds_stuck: 5 }
        });
      }
    }
  }

  // Priority 2: Goal-based scenarios
  // Century of Goals
  const homeTotalGoals = await getTotalGoals(tournamentId, homeTeamId);
  const awayTotalGoals = await getTotalGoals(tournamentId, awayTeamId);

  if (homeTotalGoals >= 100 && homeTotalGoals - homeScore < 100) {
    scenarios.push({
      eventType: 'century_of_goals',
      priority: 2,
      metadata: { team: 'home', total_goals: homeTotalGoals }
    });
  } else if (awayTotalGoals >= 100 && awayTotalGoals - awayScore < 100) {
    scenarios.push({
      eventType: 'century_of_goals',
      priority: 2,
      metadata: { team: 'away', total_goals: awayTotalGoals }
    });
  }

  // Defensive Nightmare (3+ goals conceded for 3rd consecutive match)
  const homeConceeded = calculateConcededStreak(homeHistory, 3);
  if (homeConceeded >= 2 && awayScore >= 3) {
    scenarios.push({
      eventType: 'defensive_nightmare',
      priority: 2,
      metadata: { team: 'home', streak: homeConceeded + 1, conceded: awayScore }
    });
  }

  const awayConceeded = calculateConcededStreak(awayHistory, 3);
  if (awayConceeded >= 2 && homeScore >= 3) {
    scenarios.push({
      eventType: 'defensive_nightmare',
      priority: 2,
      metadata: { team: 'away', streak: awayConceeded + 1, conceded: homeScore }
    });
  }

  // Goal Drought Ends (team scores after 3+ matches without goal)
  const homeDrought = calculateGoalDrought(homeHistory);
  if (homeDrought >= 3 && homeScore > 0) {
    scenarios.push({
      eventType: 'goal_drought_ends',
      priority: 2,
      metadata: { team: 'home', drought_length: homeDrought, goals_scored: homeScore }
    });
  }

  const awayDrought = calculateGoalDrought(awayHistory);
  if (awayDrought >= 3 && awayScore > 0) {
    scenarios.push({
      eventType: 'goal_drought_ends',
      priority: 2,
      metadata: { team: 'away', drought_length: awayDrought, goals_scored: awayScore }
    });
  }

  // Priority 1: Manager scenarios
  const homeManagerFirstMatch = homeHistory.results.length === 0;
  const awayManagerFirstMatch = awayHistory.results.length === 0;

  if (homeManagerFirstMatch) {
    scenarios.push({
      eventType: 'manager_first_match',
      priority: 1,
      metadata: { 
        team: 'home', 
        result: winner === 'home' ? 'win' : winner === 'away' ? 'loss' : 'draw'
      }
    });
  }

  if (awayManagerFirstMatch) {
    scenarios.push({
      eventType: 'manager_first_match',
      priority: 1,
      metadata: { 
        team: 'away', 
        result: winner === 'away' ? 'win' : winner === 'home' ? 'loss' : 'draw'
      }
    });
  }

  // Priority 1: Basic match type (fallback)
  if (scenarios.length === 0) {
    if (goalDiff >= 5) {
      scenarios.push({
        eventType: 'thrashing',
        priority: 1,
        metadata: {}
      });
    } else if (goalDiff === 1) {
      scenarios.push({
        eventType: 'close_match',
        priority: 1,
        metadata: {}
      });
    } else if (homeScore === 0 && awayScore === 0) {
      scenarios.push({
        eventType: 'boring_draw',
        priority: 1,
        metadata: {}
      });
    } else if (totalGoals >= 6) {
      scenarios.push({
        eventType: 'high_scoring',
        priority: 1,
        metadata: {}
      });
    } else if (homePenalty !== null && awayPenalty !== null) {
      scenarios.push({
        eventType: 'penalty_shootout',
        priority: 1,
        metadata: {}
      });
    } else {
      scenarios.push({
        eventType: 'match_completed',
        priority: 0,
        metadata: {}
      });
    }
  }

  // Return highest priority scenario
  scenarios.sort((a, b) => b.priority - a.priority);
  return scenarios[0] || null;
}

// Helper functions

async function getTeamHistory(tournamentId: string, teamId: string, excludeMatchId: string) {
  const matches = await prisma.matches.findMany({
    where: {
      tournamentId,
      status: 'COMPLETED',
      id: { not: excludeMatchId },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }]
    },
    orderBy: { matchDate: 'asc' },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true
    }
  });

  const results = matches.map(m => {
    const isHome = m.homeTeamId === teamId;
    const scored = isHome ? m.homeScore! : m.awayScore!;
    const conceded = isHome ? m.awayScore! : m.homeScore!;
    
    return {
      result: scored > conceded ? 'W' : scored < conceded ? 'L' : 'D',
      scored,
      conceded,
      cleanSheet: conceded === 0
    };
  });

  return { results: results.map(r => r.result), details: results };
}

function calculateStreak(history: any, type: 'unbeaten' | 'losing'): number {
  if (history.results.length === 0) return 0;
  
  let streak = 0;
  for (let i = history.results.length - 1; i >= 0; i--) {
    const result = history.results[i];
    if (type === 'unbeaten' && (result === 'W' || result === 'D')) {
      streak++;
    } else if (type === 'losing' && result === 'L') {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calculateWinlessDrought(history: any): number {
  if (history.results.length === 0) return 0;
  
  let drought = 0;
  for (let i = history.results.length - 1; i >= 0; i--) {
    if (history.results[i] !== 'W') {
      drought++;
    } else {
      break;
    }
  }
  return drought;
}

function calculateCleanSheetStreak(history: any): number {
  if (history.details.length === 0) return 0;
  
  let streak = 0;
  for (let i = history.details.length - 1; i >= 0; i--) {
    if (history.details[i].cleanSheet) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calculateConcededStreak(history: any, threshold: number): number {
  if (history.details.length === 0) return 0;
  
  let streak = 0;
  for (let i = history.details.length - 1; i >= 0; i--) {
    if (history.details[i].conceded >= threshold) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calculateGoalDrought(history: any): number {
  if (history.details.length === 0) return 0;
  
  let drought = 0;
  for (let i = history.details.length - 1; i >= 0; i--) {
    if (history.details[i].scored === 0) {
      drought++;
    } else {
      break;
    }
  }
  return drought;
}

async function getTotalGoals(tournamentId: string, teamId: string): Promise<number> {
  const standing = await prisma.standings.findFirst({
    where: { tournamentId, teamId },
    select: { goalsFor: true }
  });
  return standing?.goalsFor || 0;
}

async function getCompletedRounds(tournamentId: string): Promise<number> {
  const matches = await prisma.matches.findMany({
    where: { tournamentId, status: 'COMPLETED' },
    select: { round: true },
    distinct: ['round']
  });
  return matches.length;
}

async function checkPositionStagnation(
  tournamentId: string,
  teamId: string,
  minPos: number,
  maxPos: number,
  minRounds: number
): Promise<boolean> {
  // Simplified check - in production, you'd track position history
  return true; // Placeholder
}

async function checkTitleRace(tournamentId: string) {
  const standings = await prisma.standings.findMany({
    where: { tournamentId },
    orderBy: [{ points: 'desc' }, { goalDiff: 'desc' }],
    take: 4,
    include: {
      seasonTeam: {
        include: { team: true }
      }
    }
  });

  if (standings.length < 2) return { isHeated: false, contenders: [], pointsGap: 999 };

  const leader = standings[0];
  const contenders = standings.slice(1, 4).filter(s => leader.points - s.points <= 5);

  return {
    isHeated: contenders.length >= 2,
    contenders: contenders.map(c => ({
      name: c.seasonTeam.team.name,
      points: c.points,
      gap: leader.points - c.points
    })),
    pointsGap: contenders.length > 0 ? leader.points - contenders[0].points : 999
  };
}

async function checkTitleSecured(tournamentId: string, teamId: string) {
  const standings = await prisma.standings.findMany({
    where: { tournamentId },
    orderBy: [{ points: 'desc' }, { goalDiff: 'desc' }]
  });

  const teamStanding = standings.find(s => s.teamId === teamId);
  if (!teamStanding || standings.indexOf(teamStanding) !== 0) {
    return { isSecured: false, gamesRemaining: 0 };
  }

  const secondPlace = standings[1];
  if (!secondPlace) return { isSecured: true, gamesRemaining: 0 };

  // Get remaining matches for second place
  const remainingMatches = await prisma.matches.count({
    where: {
      tournamentId,
      status: { notIn: ['COMPLETED', 'WALKOVER'] },
      OR: [
        { homeTeamId: secondPlace.teamId },
        { awayTeamId: secondPlace.teamId }
      ]
    }
  });

  const maxPossiblePoints = secondPlace.points + (remainingMatches * 3);
  const isSecured = teamStanding.points > maxPossiblePoints;

  return { isSecured, gamesRemaining: remainingMatches };
}

async function checkTitleEliminated(tournamentId: string, teamId: string) {
  const standings = await prisma.standings.findMany({
    where: { tournamentId },
    orderBy: [{ points: 'desc' }, { goalDiff: 'desc' }]
  });

  const teamStanding = standings.find(s => s.teamId === teamId);
  if (!teamStanding) return { isEliminated: false, justEliminated: false, pointsBehind: 0, gamesRemaining: 0 };

  const leader = standings[0];
  
  // Get remaining matches for team
  const remainingMatches = await prisma.matches.count({
    where: {
      tournamentId,
      status: { notIn: ['COMPLETED', 'WALKOVER'] },
      OR: [
        { homeTeamId: teamId },
        { awayTeamId: teamId }
      ]
    }
  });

  const maxPossiblePoints = teamStanding.points + (remainingMatches * 3);
  const isEliminated = maxPossiblePoints < leader.points;

  // Check if just eliminated (had 1 match remaining before)
  const justEliminated = isEliminated && remainingMatches > 0 && remainingMatches <= 3;

  return {
    isEliminated,
    justEliminated,
    pointsBehind: leader.points - teamStanding.points,
    gamesRemaining: remainingMatches
  };
}

async function checkMustWinForTitle(tournamentId: string, homeTeamId: string, awayTeamId: string) {
  const standings = await prisma.standings.findMany({
    where: { tournamentId },
    orderBy: [{ points: 'desc' }, { goalDiff: 'desc' }],
    include: {
      seasonTeam: {
        include: { team: true }
      }
    }
  });

  const leader = standings[0];
  
  for (const teamId of [homeTeamId, awayTeamId]) {
    const teamStanding = standings.find(s => s.teamId === teamId);
    if (!teamStanding || teamStanding.teamId === leader.teamId) continue;

    const remainingMatches = await prisma.matches.count({
      where: {
        tournamentId,
        status: { notIn: ['COMPLETED', 'WALKOVER'] },
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ]
      }
    });

    const pointsBehind = leader.points - teamStanding.points;
    const maxPossiblePoints = teamStanding.points + (remainingMatches * 3);

    // Must win all remaining to have a chance
    if (remainingMatches > 0 && maxPossiblePoints >= leader.points && maxPossiblePoints - remainingMatches * 3 < leader.points) {
      return {
        isMustWin: true,
        team: teamId === homeTeamId ? 'home' : 'away',
        teamName: teamStanding.seasonTeam.team.name,
        pointsBehind,
        remainingMatches
      };
    }
  }

  return { isMustWin: false, team: null, teamName: null, pointsBehind: 0, remainingMatches: 0 };
}
