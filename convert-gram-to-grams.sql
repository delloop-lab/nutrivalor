-- Convert all "gram" units to "GRAMS"
-- This will fix the 3 foods that still have lowercase "gram" units

-- 1. Show current foods with "gram" units
SELECT 'BEFORE CONVERSION - Foods with "gram" units:' as info;
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name = 'gram'
ORDER BY f.name;

-- 2. Count how many "gram" units we have
SELECT 'Total foods with "gram" units:' as info, COUNT(*) as count
FROM serving_units 
WHERE unit_name = 'gram';

-- 3. Convert all "gram" to "GRAMS"
UPDATE serving_units 
SET unit_name = 'GRAMS'
WHERE unit_name = 'gram';

-- 4. Verify the conversion worked
SELECT 'AFTER CONVERSION - Foods now with "GRAMS" units:' as info;
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name = 'GRAMS'
  AND f.name IN (
    SELECT f2.name 
    FROM foods f2 
    LEFT JOIN serving_units su2 ON f2.id = su2.food_id 
    WHERE su2.unit_name = 'GRAMS'
  )
ORDER BY f.name;

-- 5. Count how many "GRAMS" units we now have
SELECT 'Total foods with "GRAMS" units:' as info, COUNT(*) as count
FROM serving_units 
WHERE unit_name = 'GRAMS';

-- 6. Check if any "gram" units remain (should be 0)
SELECT 'Remaining "gram" units (should be 0):' as info, COUNT(*) as count
FROM serving_units 
WHERE unit_name = 'gram';

-- 7. Final summary - show current unit distribution
SELECT 'FINAL UNIT DISTRIBUTION:' as info;
SELECT 
    su.unit_name,
    COUNT(*) as count
FROM serving_units su
GROUP BY su.unit_name
ORDER BY count DESC; 