-- Check foods starting with "C" - Simple version
-- Run each section separately

-- 1. All foods starting with C
SELECT name, carbs, fat, protein, category
FROM foods 
WHERE name ILIKE 'c%'
ORDER BY name;

-- 2. Serving units for foods starting with C
SELECT 
    f.name as food_name,
    COALESCE(su.unit_name, 'NO UNIT') as unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE 'c%'
ORDER BY f.name;

-- 3. Status check for foods starting with C
SELECT 
    f.name as food_name,
    COALESCE(su.unit_name, 'NO UNIT') as unit_name,
    CASE 
        WHEN su.unit_name IS NULL THEN 'NO SERVING UNITS'
        WHEN su.unit_name IN ('GRAMS', 'EACH', 'SLICE') THEN 'STANDARDIZED'
        WHEN su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE') THEN 'NEEDS STANDARDIZATION'
        ELSE 'UNKNOWN'
    END as status
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE 'c%'
ORDER BY f.name; 