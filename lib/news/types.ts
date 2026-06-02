/**
 * News AI System Types
 */

export type NewsTone = 'neutral' | 'dramatic' | 'funny' | 'harsh';

export type NewsCategory = 
  | 'season'
  | 'team'
  | 'auction'
  | 'transfer'
  | 'tournament'
  | 'match'
  | 'achievement'
  | 'admin'
  | 'financial';

export type NewsEventType =
  // Season Events
  | 'season_created'
  | 'season_activated'
  | 'season_completed'
  | 'season_milestone'
  // Team Events
  | 'team_registered'
  | 'team_squad_complete'
  | 'team_level_up'
  | 'team_badge_unlocked'
  | 'team_xp_milestone'
  // Auction Events
  | 'auction_calendar_created'
  | 'auction_round_scheduled'
  | 'auction_round_started'
  | 'auction_round_completed'
  | 'normal_round_result'
  | 'bulk_round_result'
  | 'tiebreaker_created'
  | 'tiebreaker_resolved'
  | 'bulk_tiebreaker_created'
  | 'bulk_tiebreaker_resolved'
  | 'record_breaking_bid'
  | 'bargain_signing'
  | 'expensive_signing'
  // Transfer Events
  | 'player_sold'
  | 'player_released'
  | 'player_swap'
  | 'release_request_submitted'
  | 'release_request_approved'
  | 'release_request_rejected'
  | 'swap_request_submitted'
  | 'swap_request_approved'
  | 'swap_request_rejected'
  | 'release_window_opened'
  | 'release_window_closed'
  | 'swap_window_opened'
  | 'swap_window_closed'
  // Tournament Events
  | 'tournament_created'
  | 'tournament_started'
  | 'tournament_completed'
  | 'knockout_round_started'
  | 'semifinals_started'
  | 'finals_started'
  // Match Events
  | 'match_scheduled'
  | 'matchday_started'
  | 'matchday_completed'
  | 'match_completed'
  | 'match_rescheduled'
  | 'matchday_opener'
  | 'thrashing'
  | 'close_match'
  | 'boring_draw'
  | 'high_scoring'
  | 'comeback_victory'
  | 'clean_sheet'
  | 'penalty_shootout'
  // Achievement Events
  | 'badge_unlocked'
  | 'season_awards_announced'
  | 'golden_boot_winner'
  | 'golden_glove_winner'
  | 'best_manager_winner'
  // Admin Events
  | 'sub_admin_created'
  | 'team_manager_created'
  | 'notification_sent'
  // Financial Events
  | 'budget_refund'
  | 'budget_adjustment';

export interface NewsGenerationInput {
  event_type: NewsEventType;
  category: NewsCategory;
  season_id: string;
  season_name?: string;
  metadata?: Record<string, any>;
  context?: string;
  tone?: NewsTone;
}

export interface NewsContent {
  title: string;
  content: string;
  summary: string;
  tone: NewsTone;
  reporter: string;
}

export interface BilingualNewsResult {
  en: NewsContent;
  ml: NewsContent;
  image_url?: string;
}

export interface NewsRecord {
  id: string;
  title_en: string;
  title_ml?: string;
  content_en: string;
  content_ml?: string;
  summary_en?: string;
  summary_ml?: string;
  category: string;
  event_type: string;
  season_id?: string;
  season_name?: string;
  is_published: boolean;
  generated_by: string;
  tone?: string;
  reporter_en?: string;
  reporter_ml?: string;
  metadata?: any;
  image_url?: string;
  created_at: Date;
}
