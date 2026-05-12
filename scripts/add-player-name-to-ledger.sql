-- Add player_name column to financial_ledger table
ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS player_name TEXT;
