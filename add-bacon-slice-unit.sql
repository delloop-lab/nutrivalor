-- Add slice unit for bacon
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'slice', 17.0, FALSE
FROM foods 
WHERE name = 'Bacon' AND brand = 'Any'
ON CONFLICT (food_id, unit_name) DO UPDATE 
SET grams_per_unit = 17.0; 