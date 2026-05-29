// XP bounty values
export const XP_VALUES = {
  MATCH_PLAYED: 20,
  MATCH_WON: 100,
  MATCH_DRAWN: 40,
  GOAL_SCORED: 10,
  BADGE_BRONZE: 50,
  BADGE_SILVER: 150,
  BADGE_GOLD: 300,
  BADGE_PLATINUM: 600,
};

// Custom badge type interface
export interface BadgeDef {
  key: string;
  name: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  description: string;
  image: string;
  xpAward: number;
}

// 22 custom badges definitions
export const BADGE_DEFINITIONS: Record<string, BadgeDef> = {
  // Match-Level
  IRON_CURTAIN: { key: 'IRON_CURTAIN', name: 'Iron Curtain', tier: 'BRONZE', description: 'Keep a clean sheet (concede 0 goals).', image: '/badges/iron_curtain.png', xpAward: XP_VALUES.BADGE_BRONZE },
  SQUEAKY_BUM_TIME: { key: 'SQUEAKY_BUM_TIME', name: 'Squeaky Bum Time', tier: 'BRONZE', description: 'Win a match by a tight margin of exactly 1 goal.', image: '/badges/squeaky_bum_time.png', xpAward: XP_VALUES.BADGE_BRONZE },
  SLEEPING_PILLS: { key: 'SLEEPING_PILLS', name: 'Sleeping Pills', tier: 'BRONZE', description: 'Participate in a dull 0-0 draw.', image: '/badges/sleeping_pills.png', xpAward: XP_VALUES.BADGE_BRONZE },
  PERFECT_BALANCE: { key: 'PERFECT_BALANCE', name: 'Perfect Balance', tier: 'SILVER', description: 'Draw a match where both teams score 2 or more goals.', image: '/badges/perfect_balance.png', xpAward: XP_VALUES.BADGE_SILVER },
  HIGHSCORE_THRILLER: { key: 'HIGHSCORE_THRILLER', name: 'High-Score Thriller', tier: 'SILVER', description: 'Win a match where you concede 3 or more goals.', image: '/badges/highscore_thriller.png', xpAward: XP_VALUES.BADGE_SILVER },
  DEMOLITION_JOB: { key: 'DEMOLITION_JOB', name: 'Demolition Job', tier: 'SILVER', description: 'Win a match by a margin of 4 or more goals.', image: '/badges/demolition_job.png', xpAward: XP_VALUES.BADGE_SILVER },
  GALE_FORCE: { key: 'GALE_FORCE', name: 'Gale Force', tier: 'SILVER', description: 'Score 5 or more goals in a single match.', image: '/badges/gale_force.png', xpAward: XP_VALUES.BADGE_SILVER },
  THE_ENTERTAINERS: { key: 'THE_ENTERTAINERS', name: 'The Entertainers', tier: 'SILVER', description: 'Play in a match with 6 or more total goals combined.', image: '/badges/the_entertainers.png', xpAward: XP_VALUES.BADGE_SILVER },
  APEX_PREDATOR: { key: 'APEX_PREDATOR', name: 'Apex Predator', tier: 'GOLD', description: 'Win a match scoring 4 or more goals with a clean sheet.', image: '/badges/apex_predator.png', xpAward: XP_VALUES.BADGE_GOLD },
  FLAWLESS_VICTORY: { key: 'FLAWLESS_VICTORY', name: 'Flawless Victory', tier: 'GOLD', description: 'Win a match scoring 3 or more goals with a clean sheet.', image: '/badges/flawless_victory.png', xpAward: XP_VALUES.BADGE_GOLD },

  // Tactical
  DOUBLE_JEOPARDY: { key: 'DOUBLE_JEOPARDY', name: 'Double Jeopardy', tier: 'SILVER', description: 'Beat the same opponent home and away in the same season.', image: '/badges/double_jeopardy.png', xpAward: XP_VALUES.BADGE_SILVER },
  GIANT_KILLER: { key: 'GIANT_KILLER', name: 'Giant Killer', tier: 'GOLD', description: 'Defeat a top-3 team when your team is in the bottom half of the standings.', image: '/badges/giant_killer.png', xpAward: XP_VALUES.BADGE_GOLD },
  STREAK_BUSTER: { key: 'STREAK_BUSTER', name: 'Streak Buster', tier: 'SILVER', description: 'End another team\'s 5+ game winning streak by winning or drawing.', image: '/badges/streak_buster.png', xpAward: XP_VALUES.BADGE_SILVER },
  RESILIENT_SPIRIT: { key: 'RESILIENT_SPIRIT', name: 'Resilient Spirit', tier: 'SILVER', description: 'Win a match immediately after losing your previous match by 3 or more goals.', image: '/badges/resilient_spirit.png', xpAward: XP_VALUES.BADGE_SILVER },
  GUARD_DOG: { key: 'GUARD_DOG', name: 'Guard Dog', tier: 'SILVER', description: 'Concede a maximum of 1 goal across 5 consecutive matches.', image: '/badges/guard_dog.png', xpAward: XP_VALUES.BADGE_SILVER },

  // Streaks
  UNSTOPPABLE_1: { key: 'UNSTOPPABLE_1', name: 'Unstoppable I', tier: 'SILVER', description: 'Win 3 consecutive matches.', image: '/badges/unstoppable.png', xpAward: XP_VALUES.BADGE_SILVER },
  UNSTOPPABLE_2: { key: 'UNSTOPPABLE_2', name: 'Unstoppable II', tier: 'GOLD', description: 'Win 5 consecutive matches.', image: '/badges/unstoppable.png', xpAward: XP_VALUES.BADGE_GOLD },
  UNSTOPPABLE_3: { key: 'UNSTOPPABLE_3', name: 'Unstoppable III', tier: 'PLATINUM', description: 'Win 8 consecutive matches.', image: '/badges/unstoppable.png', xpAward: XP_VALUES.BADGE_PLATINUM },
  INVINCIBLE_1: { key: 'INVINCIBLE_1', name: 'Invincible I', tier: 'SILVER', description: 'Remain unbeaten for 5 consecutive matches.', image: '/badges/invincible.png', xpAward: XP_VALUES.BADGE_SILVER },
  INVINCIBLE_2: { key: 'INVINCIBLE_2', name: 'Invincible II', tier: 'GOLD', description: 'Remain unbeaten for 10 consecutive matches.', image: '/badges/invincible.png', xpAward: XP_VALUES.BADGE_GOLD },
  INVINCIBLE_3: { key: 'INVINCIBLE_3', name: 'Invincible III', tier: 'PLATINUM', description: 'Remain unbeaten for 15 consecutive matches.', image: '/badges/invincible.png', xpAward: XP_VALUES.BADGE_PLATINUM },

  // Cumulative
  GOAL_BARON: { key: 'GOAL_BARON', name: 'Goal Baron', tier: 'SILVER', description: 'Score 50 total goals across your team\'s lifetime.', image: '/badges/goal_baron.png', xpAward: XP_VALUES.BADGE_SILVER },
  CENTURION: { key: 'CENTURION', name: 'Centurion', tier: 'GOLD', description: 'Score 100 total goals across your team\'s lifetime.', image: '/badges/centurion.png', xpAward: XP_VALUES.BADGE_GOLD },
  GOLDEN_BOOT: { key: 'GOLDEN_BOOT', name: 'Golden Boot Team', tier: 'PLATINUM', description: 'Finish a season with the highest goals scored in the league.', image: '/badges/golden_boot.png', xpAward: XP_VALUES.BADGE_PLATINUM },
  GOLDEN_GLOVE: { key: 'GOLDEN_GLOVE', name: 'Golden Glove Team', tier: 'PLATINUM', description: 'Finish a season with the fewest goals conceded in the league.', image: '/badges/golden_glove.png', xpAward: XP_VALUES.BADGE_PLATINUM },
  GOLDEN_INVINCIBLES: { key: 'GOLDEN_INVINCIBLES', name: 'Golden Invincibles', tier: 'PLATINUM', description: 'Complete a whole season/tournament without a single loss.', image: '/badges/golden_invincibles.png', xpAward: XP_VALUES.BADGE_PLATINUM },
  TROPHY_HOARDER: { key: 'TROPHY_HOARDER', name: 'Trophy Hoarder', tier: 'PLATINUM', description: 'Win 3 league titles/tournaments all-time.', image: '/badges/golden_invincibles.png', xpAward: XP_VALUES.BADGE_PLATINUM },
};

/**
 * Calculates a team's level based on cumulative XP using the exponential curve:
 * XP Required = Level * 500
 * Cumulative XP = 250 * (Level - 1) * Level
 * Reversing this quadratic formula: Level = Math.floor((1 + Math.sqrt(1 + XP / 62.5)) / 2)
 */
export function calculateLevelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  const level = Math.floor((1 + Math.sqrt(1 + xp / 62.5)) / 2);
  return Math.max(1, level);
}

/**
 * Returns the total cumulative XP needed to reach a specific level.
 */
export function getCumulativeXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return 250 * (level - 1) * level;
}

/**
 * Returns the XP needed to progress from current level to the next level.
 */
export function getXPForNextLevel(level: number): number {
  return level * 500;
}

/**
 * Returns the level bracket rank metadata including title, style classes, and color.
 */
export function getRankDetails(level: number) {
  if (level >= 20) {
    return {
      title: 'Legend of TFC',
      themeClass: 'rank-legend',
      color: '#ef4444',
      badgePath: '/badges/ranks/rank_legend.png',
    };
  } else if (level >= 15) {
    return {
      title: 'World Class Competitor',
      themeClass: 'rank-worldclass',
      color: '#eab308',
      badgePath: '/badges/ranks/rank_worldclass.png',
    };
  } else if (level >= 10) {
    return {
      title: 'Professional Tactician',
      themeClass: 'rank-tactician',
      color: '#a855f7',
      badgePath: '/badges/ranks/rank_tactician.png',
    };
  } else if (level >= 5) {
    return {
      title: 'Rising Contender',
      themeClass: 'rank-contender',
      color: '#3b82f6',
      badgePath: '/badges/ranks/rank_contender.png',
    };
  } else {
    return {
      title: 'Rookie Manager',
      themeClass: 'rank-rookie',
      color: '#10b981',
      badgePath: '/badges/ranks/rank_rookie.png',
    };
  }
}
