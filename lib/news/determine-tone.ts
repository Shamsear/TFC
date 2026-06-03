import { NewsTone, NewsEventType } from './types';

// Tone rotation counter stored in memory (resets on server restart)
// This ensures variety across multiple news generations
let toneRotationIndex = 0;

/**
 * Automatically determine appropriate tone for news event with rotation for variety
 */
export function determineTone(input: {
  event_type: NewsEventType;
  metadata?: Record<string, any>;
}): NewsTone {
  const { event_type, metadata = {} } = input;

  // Define tone pools for different event types
  // Each event type gets multiple possible tones that rotate
  
  // Harsh tone - Critical/roasting (for poor performances)
  if (event_type === 'thrashing' && metadata.goal_margin >= 5) return 'harsh';
  if (event_type === 'defensive_nightmare') return 'harsh';
  if (event_type === 'losing_streak' && metadata.streak_length >= 4) return 'harsh';
  if (event_type === 'title_dream_over') return 'harsh';
  if (event_type === 'basement_battle') return rotateTone(['harsh', 'funny', 'dramatic']);
  
  // Hype tone - Over-the-top excitement (for big wins and achievements)
  if (event_type === 'perfect_start') return 'hype';
  if (event_type === 'title_secured') return 'hype';
  if (event_type === 'unbeaten_streak' && metadata.streak_length >= 7) return 'hype';
  if (event_type === 'century_of_goals') return 'hype';
  if (event_type === 'team_level_up') return 'hype';
  if (event_type === 'dominant_win' && metadata.goal_margin >= 4) return 'hype';
  
  // Funny tone - Witty/entertaining (for quirky situations)
  if (event_type === 'boring_draw') return 'funny';
  if (event_type === 'mid_table_mediocrity') return 'funny';
  if (event_type === 'bargain_signing') return 'funny';
  if (event_type === 'badge_unlocked') return rotateTone(['funny', 'hype']);
  
  // Dramatic tone - Exciting/intense (for close contests)
  if (event_type === 'close_match') return rotateTone(['dramatic', 'analytical', 'neutral']);
  if (event_type === 'thriller') return 'dramatic';
  if (event_type === 'comeback_victory') return 'dramatic';
  if (event_type === 'tiebreaker_resolved') return 'dramatic';
  if (event_type === 'bulk_tiebreaker_resolved') return 'dramatic';
  if (event_type === 'penalty_shootout') return 'dramatic';
  if (event_type === 'must_win_title') return 'dramatic';
  if (event_type === 'final_day_drama') return 'dramatic';
  
  // Analytical tone - Tactical/cerebral (for title races and strategic matches)
  if (event_type === 'title_race_heating') return rotateTone(['analytical', 'dramatic', 'neutral']);
  if (event_type === 'top_of_table_takeover') return rotateTone(['analytical', 'hype', 'dramatic']);
  if (event_type === 'giant_slayer') return rotateTone(['dramatic', 'hype', 'funny']);
  
  // High-scoring matches - variety of tones
  if (event_type === 'goal_fest' || event_type === 'entertaining_draw') {
    return rotateTone(['dramatic', 'hype', 'funny', 'neutral']);
  }
  
  // Milestone events - celebratory tones
  if (event_type === 'winless_drought_ends') return rotateTone(['hype', 'dramatic', 'funny']);
  if (event_type === 'goal_drought_ends') return rotateTone(['hype', 'funny']);
  if (event_type === 'clean_sheet_master') return rotateTone(['hype', 'analytical']);
  
  // Manager first match - variety based on result
  if (event_type === 'manager_first_match') {
    if (metadata.result === 'win') return rotateTone(['hype', 'dramatic', 'neutral']);
    if (metadata.result === 'loss') return rotateTone(['harsh', 'funny', 'neutral']);
    return rotateTone(['neutral', 'analytical', 'funny']);
  }
  
  // Matchday opener - set the tone for the round
  if (event_type === 'matchday_opener') return rotateTone(['hype', 'dramatic', 'neutral']);
  
  // Tournament events
  if (event_type === 'knockout_round_started') return 'dramatic';
  if (event_type === 'semifinals_started') return rotateTone(['dramatic', 'hype']);
  if (event_type === 'finals_started') return 'hype';
  if (event_type === 'tournament_completed') return rotateTone(['hype', 'dramatic', 'analytical']);
  if (event_type === 'season_completed') return rotateTone(['analytical', 'dramatic', 'hype']);
  
  // Auction events
  if (event_type === 'record_breaking_bid') return rotateTone(['hype', 'funny', 'dramatic']);
  
  // Generic match completion - rotate through all tones for maximum variety
  if (event_type === 'match_completed' || event_type === 'draw' || event_type === 'dominant_win') {
    return rotateTone(['neutral', 'dramatic', 'analytical', 'funny', 'hype']);
  }

  // Default - rotate between neutral and analytical for variety
  return rotateTone(['neutral', 'analytical']);
}

/**
 * Rotate through available tones to ensure variety
 */
function rotateTone(tones: NewsTone[]): NewsTone {
  const tone = tones[toneRotationIndex % tones.length];
  toneRotationIndex++;
  return tone;
}
