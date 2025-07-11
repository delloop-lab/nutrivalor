-- Convert all "g" units to "GRAMS" to standardize
-- This will fix all foods that still have lowercase "g" units

-- 1. Show current state before conversion
SELECT 'BEFORE CONVERSION:' as info;
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name = 'g'
ORDER BY f.name;

-- 2. Convert all "g" units to "GRAMS"
UPDATE serving_units 
SET unit_name = 'GRAMS'
WHERE unit_name = 'g';

-- 3. Show after conversion
SELECT 'AFTER CONVERSION:' as info;
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name = 'GRAMS'
ORDER BY f.name;

-- 4. Verify conversion worked
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default,
    CASE 
        WHEN su.unit_name = 'GRAMS' THEN 'CONVERTED SUCCESSFULLY'
        WHEN su.unit_name = 'g' THEN 'STILL NEEDS CONVERSION'
        ELSE 'OTHER UNIT'
    END as status
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name IN ('g', 'GRAMS')
ORDER BY f.name;

-- 5. Count how many were converted
SELECT 
    'Total foods converted from "g" to "GRAMS":' as info,
    COUNT(*) as count
FROM serving_units 
WHERE unit_name = 'GRAMS'; 