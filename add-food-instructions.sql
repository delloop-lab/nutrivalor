-- Add instructions column to foods table
-- This script adds an instructions column to store preparation or usage notes for food items

-- First, verify if the foods table exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'foods'
    ) THEN
        RAISE EXCEPTION 'The foods table does not exist!';
    END IF;
END $$;

-- Then check if the instructions column already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'foods' 
        AND column_name = 'instructions'
    ) THEN
        -- Add the instructions column
        ALTER TABLE foods ADD COLUMN instructions TEXT;
        
        -- Add a comment to the column
        COMMENT ON COLUMN foods.instructions IS 'Preparation or usage instructions for the food item';
    END IF;
END $$;

-- Create a policy to allow users to update their own food instructions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'foods'
        AND policyname = 'foods_update_instructions_policy'
    ) THEN
        CREATE POLICY foods_update_instructions_policy ON foods
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Update the updated_at trigger to include the new column
DROP TRIGGER IF EXISTS set_timestamp ON foods;

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON foods
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE (
    name, 
    brand, 
    carbs, 
    fat, 
    protein, 
    category, 
    instructions, 
    updated_at
) ON foods TO authenticated;

-- Verify the column was added
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'foods' 
        AND column_name = 'instructions'
    ) THEN
        RAISE NOTICE 'Successfully added instructions column to foods table.';
    ELSE
        RAISE EXCEPTION 'Failed to add instructions column to foods table!';
    END IF;
END $$; 