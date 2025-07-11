-- Check all foods starting with "C" and their serving units
-- This will show if foods starting with C have been standardized to GRAMS, EACH, or SLICE

-- 1. List all foods starting with "C"
SELECT 
    id,
    name,
    carbs,
    fat,
    protein,
    category
FROM foods 
WHERE name ILIKE 'c%'
ORDER BY name;

-- 2. Check serving units for all foods starting with "C"
SELECT 
    su.id,
    su.food_id,
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default,
    su.created_at
FROM serving_units su
LEFT JOIN foods f ON su.food_id = f.id
WHERE f.name ILIKE 'c%'
ORDER BY f.name, su.unit_name;

-- 3. Summary of serving units for foods starting with "C"
SELECT 
    f.name as food_name,
    COUNT(su.id) as serving_unit_count,
    STRING_AGG(su.unit_name, ', ' ORDER BY su.unit_name) as units,
    STRING_AGG(CASE WHEN su.is_default THEN su.unit_name ELSE NULL END, ', ') as default_units
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE 'c%'
GROUP BY f.id, f.name
ORDER BY f.name;

-- 4. Standardization status for foods starting with "C"
SELECT 
    f.name as food_name,
    COALESCE(su.unit_name, 'NO UNIT') as unit_name,
    su.grams_per_unit,
    su.is_default,
    CASE 
        WHEN su.unit_name IS NULL THEN 'NO SERVING UNITS'
        WHEN su.unit_name IN ('GRAMS', 'EACH', 'SLICE') THEN 'STANDARDIZED'
        WHEN su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE') THEN 'NEEDS STANDARDIZATION'
        ELSE 'UNKNOWN'
    END as status
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE 'c%'
ORDER BY f.name, su.unit_name;

-- 5. Count of standardization status for foods starting with "C"
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
WHERE f.name ILIKE 'c%'
GROUP BY 
    CASE 
        WHEN su.unit_name IS NULL THEN 'NO SERVING UNITS'
        WHEN su.unit_name IN ('GRAMS', 'EACH', 'SLICE') THEN 'STANDARDIZED'
        WHEN su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE') THEN 'NEEDS STANDARDIZATION'
        ELSE 'UNKNOWN'
    END
ORDER BY count DESC;

-- 6. Simple list of foods and their units (most readable)
SELECT 
    f.name as food_name,
    COALESCE(su.unit_name, 'NO UNIT') as unit_name,
    su.grams_per_unit,
    CASE WHEN su.is_default THEN 'YES' ELSE 'NO' END as is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE 'c%'
ORDER BY f.name; 