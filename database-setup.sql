-- Update shopping_list table to store serving unit information
ALTER TABLE shopping_list
DROP COLUMN IF EXISTS serving_unit_id,
ADD COLUMN IF NOT EXISTS serving_unit_name TEXT NOT NULL DEFAULT 'g',
ADD COLUMN IF NOT EXISTS grams_per_unit REAL NOT NULL DEFAULT 1.0; 