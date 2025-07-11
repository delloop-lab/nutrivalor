-- Fix specific foods: ALMONDS, ASPARAGUS, AVOCADO
-- Convert their "g" units to "GRAMS"

-- 1. Show current state
SELECT 'BEFORE FIX:' as info;
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name IN ('Almonds', 'Asparagus', 'Avocado')
ORDER BY f.name;

-- 2. Convert "g" to "GRAMS" for these specific foods
UPDATE serving_units 
SET unit_name = 'GRAMS'
WHERE unit_name = 'g' 
  AND food_id IN (
    SELECT id FROM foods 
    WHERE name IN ('Almonds', 'Asparagus', 'Avocado')
  );

-- 3. Show after fix
SELECT 'AFTER FIX:' as info;
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name IN ('Almonds', 'Asparagus', 'Avocado')
ORDER BY f.name;

-- 4. Verify all "g" units are now "GRAMS"
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default,
    CASE 
        WHEN su.unit_name = 'GRAMS' THEN '✅ STANDARDIZED'
        WHEN su.unit_name = 'g' THEN '❌ NEEDS FIX'
        ELSE '⚠️ UNKNOWN'
    END as status
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name IN ('Almonds', 'Asparagus', 'Avocado')
ORDER BY f.name; 