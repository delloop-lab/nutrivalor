-- Check current serving units in the database
-- This script will show us what serving units currently exist

-- 1. Check if serving_units table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'serving_units'
) as table_exists;

-- 2. If table exists, show all current serving units
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
ORDER BY f.name, su.unit_name;

-- 3. Count serving units by type
SELECT 
    unit_name,
    COUNT(*) as count,
    COUNT(CASE WHEN is_default = true THEN 1 END) as default_count
FROM serving_units 
GROUP BY unit_name 
ORDER BY unit_name;

-- 4. Show foods that don't have any serving units
SELECT 
    f.id,
    f.name,
    f.carbs,
    f.fat,
    f.protein
FROM foods f
WHERE f.id NOT IN (
    SELECT DISTINCT food_id 
    FROM serving_units 
    WHERE food_id IS NOT NULL
)
ORDER BY f.name;

-- 5. Show foods with multiple serving units
SELECT 
    f.name as food_name,
    COUNT(su.id) as unit_count,
    STRING_AGG(su.unit_name, ', ' ORDER BY su.unit_name) as units
FROM foods f
JOIN serving_units su ON f.id = su.food_id
GROUP BY f.id, f.name
HAVING COUNT(su.id) > 1
ORDER BY f.name; 