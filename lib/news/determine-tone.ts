import { NewsTone, NewsEventType } from './types';

/**
 * Automatically determine appropriate tone for news event
 */
export function determineTone(input: {
  event_type: NewsEventType;
  metadata?: Record<string, any>;
}): NewsTone {
  const { event_type, metadata = {} } = input;

  // Harsh tone - Critical/roasting
  if (event_type === 'thrashing') return 'harsh';
  if (event_type === 'release_request_rejected') return 'harsh';
  if (event_type === 'swap_request_rejected') return 'harsh';
  if (event_type === 'match_completed' && metadata.goal_diff >= 5) return 'harsh';

  // Funny tone - Witty/entertaining
  if (event_type === 'boring_draw') return 'funny';
  if (event_type === 'bargain_signing') return 'funny';
  if (event_type === 'badge_unlocked') return 'funny';
  if (event_type === 'match_completed' && metadata.home_score === 0 && metadata.away_score === 0) return 'funny';

  // Dramatic tone - Exciting/intense
  if (event_type === 'close_match') return 'dramatic';
  if (event_type === 'comeback_victory') return 'dramatic';
  if (event_type === 'tiebreaker_resolved') return 'dramatic';
  if (event_type === 'bulk_tiebreaker_resolved') return 'dramatic';
  if (event_type === 'knockout_round_started') return 'dramatic';
  if (event_type === 'semifinals_started') return 'dramatic';
  if (event_type === 'finals_started') return 'dramatic';
  if (event_type === 'penalty_shootout') return 'dramatic';
  if (event_type === 'record_breaking_bid') return 'dramatic';
  if (event_type === 'tournament_completed') return 'dramatic';
  if (event_type === 'season_completed') return 'dramatic';
  if (event_type === 'match_completed' && metadata.goal_diff === 1) return 'dramatic';

  // Neutral tone - Professional/factual (default)
  return 'neutral';
}
