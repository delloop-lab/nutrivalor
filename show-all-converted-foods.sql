-- Show ALL foods that were converted from "g" to "GRAMS"
-- This will show you the complete list of converted foods

-- 1. All foods now with "GRAMS" units (complete list)
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default,
    'CONVERTED FROM "g" TO "GRAMS"' as status
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name = 'GRAMS'
ORDER BY f.name;

-- 2. Count total converted foods
SELECT 
    'Total foods converted to GRAMS:' as info,
    COUNT(*) as count
FROM serving_units 
WHERE unit_name = 'GRAMS';

-- 3. Check if any "g" units still remain (should be 0)
SELECT 
    'Remaining "g" units (should be 0):' as info,
    COUNT(*) as count
FROM serving_units 
WHERE unit_name = 'g';

-- 4. Show foods that still need standardization (non-GRAMS, non-EACH, non-SLICE)
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default,
    'STILL NEEDS STANDARDIZATION' as status
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name IS NOT NULL 
  AND su.unit_name NOT IN ('GRAMS', 'EACH', 'SLICE')
ORDER BY f.name;

-- 5. Summary of current standardization status
SELECT 
    'STANDARDIZATION SUMMARY:' as info;
SELECT 
    su.unit_name,
    COUNT(*) as count
FROM serving_units su
GROUP BY su.unit_name
ORDER BY count DESC; 