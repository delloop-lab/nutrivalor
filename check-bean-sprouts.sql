-- Check serving units for Bean Sprouts
-- This will show if Bean Sprouts have been standardized to GRAMS, EACH, or SLICE

-- 1. Check if Bean Sprouts exists in the database
SELECT 
    id,
    name,
    carbs,
    fat,
    protein,
    category
FROM foods 
WHERE name ILIKE '%bean sprout%' 
   OR name ILIKE '%beansprout%'
ORDER BY name;

-- 2. Check serving units for Bean Sprouts
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
WHERE f.name ILIKE '%bean sprout%' 
   OR f.name ILIKE '%beansprout%'
ORDER BY f.name, su.unit_name;

-- 3. Check if Bean Sprouts have any serving units at all
SELECT 
    f.name as food_name,
    COUNT(su.id) as serving_unit_count,
    STRING_AGG(su.unit_name, ', ' ORDER BY su.unit_name) as units,
    STRING_AGG(CASE WHEN su.is_default THEN su.unit_name ELSE NULL END, ', ') as default_units
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE '%bean sprout%' 
   OR f.name ILIKE '%beansprout%'
GROUP BY f.id, f.name
ORDER BY f.name;

-- 4. Show standardization status for Bean Sprouts
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default,
    CASE 
        WHEN su.unit_name IS NULL THEN '❌ NO SERVING UNITS'
        WHEN su.unit_name IN ('GRAMS', 'EACH', 'SLICE') THEN '✅ STANDARDIZED'
        WHEN su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE') THEN '❌ NEEDS STANDARDIZATION'
        ELSE '⚠️ UNKNOWN'
    END as status
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE '%bean sprout%' 
   OR f.name ILIKE '%beansprout%'
ORDER BY f.name, su.unit_name; 