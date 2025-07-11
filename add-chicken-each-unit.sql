-- Add 'EACH' unit for chicken breasts
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'EACH', 1.0, TRUE
FROM foods 
WHERE name ILIKE '%chicken breast%'
ON CONFLICT (food_id, unit_name) DO UPDATE 
SET grams_per_unit = 1.0, is_default = TRUE; 