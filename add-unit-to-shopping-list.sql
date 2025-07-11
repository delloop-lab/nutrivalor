-- Add unit column to shopping_list table
ALTER TABLE shopping_list
ADD COLUMN unit TEXT;

-- Update existing rows to have default unit
UPDATE shopping_list
SET unit = 'EACH'
WHERE unit IS NULL; 