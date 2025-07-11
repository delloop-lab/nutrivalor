-- Drop any columns we don't want
ALTER TABLE shopping_list 
DROP COLUMN IF EXISTS serving_unit_id CASCADE,
DROP COLUMN IF EXISTS serving_unit_name CASCADE,
DROP COLUMN IF EXISTS grams_per_unit CASCADE,
DROP COLUMN IF EXISTS name CASCADE;

-- Make sure quantity column exists and has the right default
DO $$ 
BEGIN
    -- Check if quantity column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopping_list' 
        AND column_name = 'quantity'
    ) THEN
        -- Add quantity column if it doesn't exist
        ALTER TABLE shopping_list ADD COLUMN quantity INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE shopping_list IS 'Simple shopping list tracking quantities of foods to buy';
COMMENT ON COLUMN shopping_list.quantity IS 'Number of items to buy'; 