-- Check serving units for specific foods: ALMONDS, ASPARAGUS, AVOCADO
-- This will show if these foods have been edited to use standardized units

-- 1. Check if these foods exist in the database
SELECT 
    id,
    name,
    carbs,
    fat,
    protein,
    category
FROM foods 
WHERE name ILIKE '%almond%' 
   OR name ILIKE '%asparagus%' 
   OR name ILIKE '%avocado%'
ORDER BY name;

-- 2. Check serving units for these specific foods
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
WHERE f.name ILIKE '%almond%' 
   OR f.name ILIKE '%asparagus%' 
   OR f.name ILIKE '%avocado%'
ORDER BY f.name, su.unit_name;

-- 3. Check if these foods have any serving units at all
SELECT 
    f.name as food_name,
    COUNT(su.id) as serving_unit_count,
    STRING_AGG(su.unit_name, ', ' ORDER BY su.unit_name) as units,
    STRING_AGG(CASE WHEN su.is_default THEN su.unit_name ELSE NULL END, ', ') as default_units
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE '%almond%' 
   OR f.name ILIKE '%asparagus%' 
   OR f.name ILIKE '%avocado%'
GROUP BY f.id, f.name
ORDER BY f.name;

-- 4. Show foods that need standardization (non-standard unit names)
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default,
    CASE 
        WHEN su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE') THEN 'NEEDS STANDARDIZATION'
        ELSE 'STANDARDIZED'
    END as status
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE (f.name ILIKE '%almond%' 
   OR f.name ILIKE '%asparagus%' 
   OR f.name ILIKE '%avocado%')
   AND su.unit_name IS NOT NULL
ORDER BY f.name, su.unit_name; 