-- Add serving_unit_id column to shopping_list table
ALTER TABLE shopping_list ADD COLUMN serving_unit_id UUID REFERENCES serving_units(id);

-- Add index for better performance
CREATE INDEX idx_shopping_list_serving_unit ON shopping_list(serving_unit_id);

COMMENT ON COLUMN shopping_list.serving_unit_id IS 'Reference to the serving unit used when adding to shopping list'; 