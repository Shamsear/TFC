-- Add REFUND to TransactionType enum if it doesn't exist

-- Check if REFUND already exists in the enum
DO $$
BEGIN
    -- Try to add REFUND to the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'REFUND' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'TransactionType'
        )
    ) THEN
        ALTER TYPE "TransactionType" ADD VALUE 'REFUND';
        RAISE NOTICE 'Added REFUND to TransactionType enum';
    ELSE
        RAISE NOTICE 'REFUND already exists in TransactionType enum';
    END IF;
END$$;
