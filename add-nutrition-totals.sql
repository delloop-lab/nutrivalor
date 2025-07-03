-- Add nutrition total columns to meals table
-- This migration adds total_fat and total_protein columns to store calculated nutrition totals

-- Add total_fat column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'meals' AND column_name = 'total_fat') THEN
        ALTER TABLE meals ADD COLUMN total_fat DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added total_fat column to meals table';
    ELSE
        RAISE NOTICE 'total_fat column already exists in meals table';
    END IF;
END $$;

-- Add total_protein column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'meals' AND column_name = 'total_protein') THEN
        ALTER TABLE meals ADD COLUMN total_protein DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added total_protein column to meals table';
    ELSE
        RAISE NOTICE 'total_protein column already exists in meals table';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'meals' 
AND column_name IN ('total_carbs', 'total_fat', 'total_protein')
ORDER BY column_name; 