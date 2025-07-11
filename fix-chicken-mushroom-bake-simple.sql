-- SIMPLE FIX FOR CHICKEN MUSHROOM SPINACH CHEESE BAKE MEAL
-- This script focuses on the core issue: fixing null food_id values

-- 1. Check what foods exist
SELECT 'Available foods:' as info;
SELECT id, name FROM foods 
WHERE name ILIKE '%chicken%' OR name ILIKE '%mushroom%' OR name ILIKE '%spinach%' OR name ILIKE '%cheese%'
ORDER BY name;

-- 2. Check current meal state
SELECT 'Current meal data:' as info;
SELECT id, name, ingredients FROM meals WHERE name LIKE '%Chicken Mushroom%';

-- 3. Fix serving units table structure
ALTER TABLE serving_units ALTER COLUMN grams_per_unit DROP NOT NULL;

-- 4. Clean up invalid serving units
DELETE FROM serving_units WHERE unit_name = 'EACH' AND grams_per_unit IS NOT NULL;
DELETE FROM serving_units WHERE unit_name != 'EACH' AND grams_per_unit IS NULL;

-- 5. Add constraint
ALTER TABLE serving_units DROP CONSTRAINT IF EXISTS check_grams_per_unit_null;
ALTER TABLE serving_units ADD CONSTRAINT check_grams_per_unit_null CHECK (
    (unit_name = 'EACH' AND grams_per_unit IS NULL) OR 
    (unit_name != 'EACH' AND grams_per_unit IS NOT NULL)
);

-- 6. Create serving units for our foods
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'EACH', NULL, true
FROM foods 
WHERE name ILIKE '%chicken breast%'
ON CONFLICT (food_id, unit_name) DO UPDATE
SET grams_per_unit = NULL, is_default = true;

INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'g', 1.0, true
FROM foods 
WHERE name ILIKE '%mushroom%' OR name ILIKE '%spinach%' OR name ILIKE '%cheese%'
ON CONFLICT (food_id, unit_name) DO UPDATE
SET grams_per_unit = 1.0, is_default = true;

-- 7. Update the meal with proper food_id values
UPDATE meals
SET ingredients = (
    SELECT jsonb_build_array(
        jsonb_build_object(
            'food_id', (SELECT id FROM foods WHERE name ILIKE '%chicken breast%' LIMIT 1),
            'food_name', 'Chicken Breast',
            'quantity', 2,
            'serving_unit', 'EACH',
            'instructions', 'Diced'
        ),
        jsonb_build_object(
            'food_id', (SELECT id FROM foods WHERE name ILIKE '%mushroom%' LIMIT 1),
            'food_name', 'Mushroom',
            'quantity', 200,
            'serving_unit', 'g',
            'instructions', 'Sliced'
        ),
        jsonb_build_object(
            'food_id', (SELECT id FROM foods WHERE name ILIKE '%spinach%' LIMIT 1),
            'food_name', 'Spinach',
            'quantity', 100,
            'serving_unit', 'g',
            'instructions', 'Fresh'
        ),
        jsonb_build_object(
            'food_id', (SELECT id FROM foods WHERE name ILIKE '%cheese%' LIMIT 1),
            'food_name', 'Cheese',
            'quantity', 50,
            'serving_unit', 'g',
            'instructions', 'Grated'
        )
    )
),
updated_at = NOW()
WHERE name LIKE '%Chicken Mushroom%';

-- 8. Show the fixed meal
SELECT 'Fixed meal data:' as info;
SELECT id, name, ingredients FROM meals WHERE name LIKE '%Chicken Mushroom%';

-- 9. Show serving units
SELECT 'Serving units created:' as info;
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE '%chicken%' OR f.name ILIKE '%mushroom%' OR f.name ILIKE '%spinach%' OR f.name ILIKE '%cheese%'
ORDER BY f.name; 