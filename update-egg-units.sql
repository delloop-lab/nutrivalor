-- Update any existing egg serving units to use 'EACH' consistently
UPDATE serving_units
SET unit_name = 'EACH'
WHERE food_id IN (
    SELECT id 
    FROM foods 
    WHERE name ILIKE '%egg%' 
    AND name NOT ILIKE '%eggplant%'
)
AND unit_name IN ('piece', 'each');

-- Make sure we have the EACH unit for eggs
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'EACH', 50.0, FALSE
FROM foods 
WHERE name ILIKE '%egg%' 
AND name NOT ILIKE '%eggplant%'
AND id NOT IN (
    SELECT food_id 
    FROM serving_units 
    WHERE unit_name = 'EACH'
); 