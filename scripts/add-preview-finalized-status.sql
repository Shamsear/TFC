-- Migration: Add preview_finalized status to rounds table
-- Date: 2026-05-11
-- Description: Adds preview_finalized to the allowed status values for rounds

-- Drop the existing check constraint
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_status_check;

-- Add the new check constraint with preview_finalized included
ALTER TABLE rounds ADD CONSTRAINT rounds_status_check CHECK (status IN (
  'draft',
  'active',
  'finalizing',
  'completed',
  'expired_pending_finalization',
  'pending_finalization',
  'tiebreaker_pending',
  'preview_finalized',
  'cancelled'
));

-- Add comment
COMMENT ON CONSTRAINT rounds_status_check ON rounds IS 'Allowed round statuses including preview_finalized for manual finalization mode';
