-- Fix: Convert all "g" units to "GRAMS" - Working version
-- This will convert all the foods you listed that still have "g" units

-- 1. First, let's see exactly what we're working with
SELECT 'CURRENT STATE - Foods with "g" units:' as info;
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name = 'g'
ORDER BY f.name;

-- 2. Count how many "g" units we have
SELECT 'Total foods with "g" units:' as info, COUNT(*) as count
FROM serving_units 
WHERE unit_name = 'g';

-- 3. Convert all "g" to "GRAMS"
UPDATE serving_units 
SET unit_name = 'GRAMS'
WHERE unit_name = 'g';

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
ORDER BY f.name;

-- 5. Count how many "GRAMS" units we now have
SELECT 'Total foods with "GRAMS" units:' as info, COUNT(*) as count
FROM serving_units 
WHERE unit_name = 'GRAMS';

-- 6. Check if any "g" units remain (should be 0)
SELECT 'Remaining "g" units (should be 0):' as info, COUNT(*) as count
FROM serving_units 
WHERE unit_name = 'g';

-- 7. Final verification - show a sample of converted foods
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default,
    'CONVERTED SUCCESSFULLY' as status
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE su.unit_name = 'GRAMS'
  AND f.name IN ('Butter', 'Cauliflower', 'Celery', 'Cream', 'Spinach Fresh')
ORDER BY f.name; 