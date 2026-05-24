-- Migration: Convert bulk tiebreakers to sealed bid model
-- Date: 2026-05-25
-- Description: Add fields for sealed bid submission (like normal tiebreakers)

-- Add new fields to bulk_tiebreaker_participants for sealed bids
ALTER TABLE bulk_tiebreaker_participants 
ADD COLUMN IF NOT EXISTS new_bid_amount INT,
ADD COLUMN IF NOT EXISTS submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN bulk_tiebreaker_participants.new_bid_amount IS 'Sealed bid amount (hidden from other teams until all submit)';
COMMENT ON COLUMN bulk_tiebreaker_participants.submitted IS 'Whether team has submitted their sealed bid';
COMMENT ON COLUMN bulk_tiebreaker_participants.submitted_at IS 'When the sealed bid was submitted';

-- Note: We keep existing columns for backwards compatibility:
-- - current_bid: Now represents the original/base bid amount
-- - last_bid_time: Can be repurposed or kept for history
-- - bid_history table: Kept for audit trail but won't be used for live bidding

