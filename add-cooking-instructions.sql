-- Add missing columns to meals table
-- Run this complete script in your Supabase SQL Editor

-- Add cooking_instructions column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meals' AND column_name = 'cooking_instructions'
    ) THEN
        ALTER TABLE meals ADD COLUMN cooking_instructions TEXT;
        COMMENT ON COLUMN meals.cooking_instructions IS 'Rich text cooking instructions with HTML formatting';
    END IF;
END $$;

-- Add created_by column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meals' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE meals ADD COLUMN created_by TEXT;
        COMMENT ON COLUMN meals.created_by IS 'Email or name of the user who created this meal';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'meals' 
AND column_name IN ('cooking_instructions', 'created_by')
ORDER BY column_name; 