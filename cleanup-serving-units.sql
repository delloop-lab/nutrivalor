-- Cleanup script for serving_units table
-- Run this first to see what data needs to be fixed

-- Show current state of serving_units table
SELECT 
    id,
    food_id,
    unit_name,
    grams_per_unit,
    is_default,
    CASE 
        WHEN unit_name = 'EACH' AND grams_per_unit IS NOT NULL 
        THEN 'VIOLATION: EACH unit with non-NULL grams_per_unit'
        WHEN unit_name != 'EACH' AND grams_per_unit IS NULL 
        THEN 'VIOLATION: Non-EACH unit with NULL grams_per_unit'
        ELSE 'OK'
    END as status
FROM serving_units
ORDER BY unit_name, grams_per_unit;

-- Show foods that have EACH units
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name = 'EACH'
ORDER BY f.name;

-- Show foods that should probably have EACH units but don't
SELECT 
    f.name as food_name,
    f.id as food_id,
    'Should have EACH unit' as recommendation
FROM foods f
WHERE f.name ILIKE '%egg%' 
   OR f.name ILIKE '%chicken breast%'
   OR f.name ILIKE '%banana%'
   OR f.name ILIKE '%apple%'
   OR f.name ILIKE '%orange%'
   OR f.name ILIKE '%slice%'
   AND f.id NOT IN (
       SELECT DISTINCT food_id 
       FROM serving_units 
       WHERE unit_name = 'EACH'
   )
ORDER BY f.name; 