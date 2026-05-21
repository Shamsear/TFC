-- Add position_hidden column to rounds table
-- This allows positions to be hidden initially and revealed later

ALTER TABLE rounds 
ADD COLUMN IF NOT EXISTS position_hidden BOOLEAN NOT NULL DEFAULT false;

-- Add position_hidden column to auction_slots table
ALTER TABLE auction_slots
ADD COLUMN IF NOT EXISTS "positionHidden" BOOLEAN NOT NULL DEFAULT false;

-- Add comments
COMMENT ON COLUMN rounds.position_hidden IS 'When true, the position is hidden from teams until revealed by admin';
COMMENT ON COLUMN auction_slots."positionHidden" IS 'When true, the position is hidden from teams until revealed by admin';
