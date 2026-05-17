-- Add updated_by column to auction_calendar table
-- This tracks which user last updated the calendar entry

ALTER TABLE auction_calendar 
ADD COLUMN updated_by TEXT;

-- Add foreign key constraint
ALTER TABLE auction_calendar
ADD CONSTRAINT fk_auction_calendar_updated_by 
FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX idx_auction_calendar_updated_by ON auction_calendar(updated_by);

-- Add comment
COMMENT ON COLUMN auction_calendar.updated_by IS 'User ID who last updated this calendar entry';
