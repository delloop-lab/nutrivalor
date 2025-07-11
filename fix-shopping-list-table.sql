-- Drop existing columns if they exist
ALTER TABLE shopping_list 
DROP COLUMN IF EXISTS serving_unit_id,
DROP COLUMN IF EXISTS serving_unit_name,
DROP COLUMN IF EXISTS grams_per_unit;

-- Add the correct columns
ALTER TABLE shopping_list
ADD COLUMN serving_unit_name TEXT NOT NULL DEFAULT 'g',
ADD COLUMN grams_per_unit REAL NOT NULL DEFAULT 1.0;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_shopping_list_serving_unit ON shopping_list(serving_unit_name);

-- Add comment
COMMENT ON COLUMN shopping_list.serving_unit_name IS 'Name of the serving unit used (e.g., slice, cup)';
COMMENT ON COLUMN shopping_list.grams_per_unit IS 'How many grams this serving unit represents'; 