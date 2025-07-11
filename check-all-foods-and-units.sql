-- Check ALL foods and their serving units
-- This will show your progress on standardizing all foods

-- 1. All foods with their serving units (most readable)
SELECT 
    f.name as food_name,
    COALESCE(su.unit_name, 'NO UNIT') as unit_name,
    su.grams_per_unit,
    CASE WHEN su.is_default THEN 'YES' ELSE 'NO' END as is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
ORDER BY f.name;

-- 2. Summary by food (how many units each food has)
SELECT 
    f.name as food_name,
    COUNT(su.id) as serving_unit_count,
    STRING_AGG(COALESCE(su.unit_name, 'NO UNIT'), ', ' ORDER BY su.unit_name) as units,
    STRING_AGG(CASE WHEN su.is_default THEN su.unit_name ELSE NULL END, ', ') as default_units
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
GROUP BY f.id, f.name
ORDER BY f.name;

-- 3. Standardization status for all foods
SELECT 
    f.name as food_name,
    COALESCE(su.unit_name, 'NO UNIT') as unit_name,
    su.grams_per_unit,
    CASE 
        WHEN su.unit_name IS NULL THEN 'NO SERVING UNITS'
        WHEN su.unit_name IN ('GRAMS', 'EACH', 'SLICE') THEN 'STANDARDIZED'
        WHEN su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE') THEN 'NEEDS STANDARDIZATION'
        ELSE 'UNKNOWN'
    END as status
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
ORDER BY f.name, su.unit_name;

-- 4. Count summary - how many are standardized vs need work
SELECT 
    CASE 
        WHEN su.unit_name IS NULL THEN 'NO SERVING UNITS'
        WHEN su.unit_name IN ('GRAMS', 'EACH', 'SLICE') THEN 'STANDARDIZED'
        WHEN su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE') THEN 'NEEDS STANDARDIZATION'
        ELSE 'UNKNOWN'
    END as status,
    COUNT(*) as count
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
GROUP BY 
    CASE 
        WHEN su.unit_name IS NULL THEN 'NO SERVING UNITS'
        WHEN su.unit_name IN ('GRAMS', 'EACH', 'SLICE') THEN 'STANDARDIZED'
        WHEN su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE') THEN 'NEEDS STANDARDIZATION'
        ELSE 'UNKNOWN'
    END
ORDER BY count DESC;

-- 5. Foods that still need standardization (non-standard units)
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name IS NOT NULL 
  AND su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE')
ORDER BY f.name; 