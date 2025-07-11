-- List all non-standardized foods
-- Shows foods that don't have GRAMS, EACH, or SLICE units

-- 1. Foods with non-standard units (g, gram, slice, etc.)
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default,
    'NON-STANDARD UNIT' as issue
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name IS NOT NULL 
  AND su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE')
ORDER BY f.name;

-- 2. Foods with no serving units at all
SELECT 
    f.name as food_name,
    'NO UNIT' as unit_name,
    NULL as grams_per_unit,
    NULL as is_default,
    'NO SERVING UNITS' as issue
FROM foods f
WHERE f.id NOT IN (
    SELECT DISTINCT food_id 
    FROM serving_units 
    WHERE food_id IS NOT NULL
)
ORDER BY f.name;

-- 3. Summary count of non-standardized foods
SELECT 
    'NON-STANDARD UNITS' as category,
    COUNT(*) as count
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name IS NOT NULL 
  AND su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE')

UNION ALL

SELECT 
    'NO SERVING UNITS' as category,
    COUNT(*) as count
FROM foods f
WHERE f.id NOT IN (
    SELECT DISTINCT food_id 
    FROM serving_units 
    WHERE food_id IS NOT NULL
)

UNION ALL

SELECT 
    'TOTAL NON-STANDARDIZED' as category,
    COUNT(*) as count
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE (su.unit_name IS NOT NULL 
       AND su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE'))
   OR (su.unit_name IS NULL 
       AND f.id NOT IN (
           SELECT DISTINCT food_id 
           FROM serving_units 
           WHERE food_id IS NOT NULL
       ));

-- 4. Complete list of all non-standardized foods (combined)
SELECT 
    f.name as food_name,
    COALESCE(su.unit_name, 'NO UNIT') as unit_name,
    su.grams_per_unit,
    su.is_default,
    CASE 
        WHEN su.unit_name IS NULL THEN 'NO SERVING UNITS'
        WHEN su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE') THEN 'NON-STANDARD UNIT'
        ELSE 'STANDARDIZED'
    END as issue
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE (su.unit_name IS NOT NULL 
       AND su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE'))
   OR (su.unit_name IS NULL 
       AND f.id NOT IN (
           SELECT DISTINCT food_id 
           FROM serving_units 
           WHERE food_id IS NOT NULL
       ))
ORDER BY f.name; 