-- Add additional columns to shopping_list table
ALTER TABLE shopping_list
ADD COLUMN name TEXT,
ADD COLUMN brand TEXT,
ADD COLUMN category TEXT,
ADD COLUMN carbs DECIMAL,
ADD COLUMN fat DECIMAL,
ADD COLUMN protein DECIMAL; 