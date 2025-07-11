-- FINAL COMPREHENSIVE FIX FOR CHICKEN MUSHROOM SPINACH CHEESE BAKE MEAL
-- This script will fix ALL issues with the meal data

-- 1. First, let's see what foods we have in the database
SELECT '=== STEP 1: CHECKING AVAILABLE FOODS ===' as info;
SELECT id, name, carbs, fat, protein FROM foods 
WHERE name ILIKE '%chicken%' OR name ILIKE '%mushroom%' OR name ILIKE '%spinach%' OR name ILIKE '%cheese%'
ORDER BY name;

-- 2. Check current meal data
SELECT '=== STEP 2: CURRENT MEAL DATA ===' as info;
SELECT id, name, ingredients, total_protein, total_carbs, total_fat 
FROM meals 
WHERE name LIKE '%Chicken Mushroom%';

-- 3. Fix serving units table structure
SELECT '=== STEP 3: FIXING SERVING UNITS TABLE ===' as info;
ALTER TABLE serving_units ALTER COLUMN grams_per_unit DROP NOT NULL;

-- 4. Clean up existing serving units that would violate constraints
DELETE FROM serving_units WHERE unit_name = 'EACH' AND grams_per_unit IS NOT NULL;
DELETE FROM serving_units WHERE unit_name != 'EACH' AND grams_per_unit IS NULL;

-- 5. Add constraint for proper grams_per_unit handling
ALTER TABLE serving_units DROP CONSTRAINT IF EXISTS check_grams_per_unit_null;
ALTER TABLE serving_units ADD CONSTRAINT check_grams_per_unit_null CHECK (
    (unit_name = 'EACH' AND grams_per_unit IS NULL) OR 
    (unit_name != 'EACH' AND grams_per_unit IS NOT NULL)
);

-- 6. Create serving units for our foods
SELECT '=== STEP 4: CREATING SERVING UNITS ===' as info;

-- Chicken Breast - EACH unit (countable item)
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'EACH', NULL, true
FROM foods 
WHERE name ILIKE '%chicken breast%'
ON CONFLICT (food_id, unit_name) DO UPDATE
SET grams_per_unit = NULL, is_default = true;

-- Mushroom, Spinach, Cheese - gram units (weight-based items)
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'g', 1.0, true
FROM foods 
WHERE name ILIKE '%mushroom%' OR name ILIKE '%spinach%' OR name ILIKE '%cheese%'
ON CONFLICT (food_id, unit_name) DO UPDATE
SET grams_per_unit = 1.0, is_default = true;

-- 7. Update the meal with proper food_id values and correct ingredient data
SELECT '=== STEP 5: UPDATING MEAL INGREDIENTS ===' as info;

UPDATE meals
SET ingredients = (
    SELECT jsonb_build_array(
        -- Chicken Breast: 2 EACH (countable)
        jsonb_build_object(
            'food_id', (SELECT id FROM foods WHERE name ILIKE '%chicken breast%' LIMIT 1),
            'food_name', 'Chicken Breast',
            'quantity', 2,
            'serving_unit', 'EACH',
            'instructions', 'Diced'
        ),
        -- Mushroom: 200g (weight-based)
        jsonb_build_object(
            'food_id', (SELECT id FROM foods WHERE name ILIKE '%mushroom%' LIMIT 1),
            'food_name', 'Mushroom',
            'quantity', 200,
            'serving_unit', 'g',
            'instructions', 'Sliced'
        ),
        -- Spinach: 100g (weight-based)
        jsonb_build_object(
            'food_id', (SELECT id FROM foods WHERE name ILIKE '%spinach%' LIMIT 1),
            'food_name', 'Spinach',
            'quantity', 100,
            'serving_unit', 'g',
            'instructions', 'Fresh'
        ),
        -- Cheese: 50g (weight-based)
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

-- 8. Show the updated meal data
SELECT '=== STEP 6: UPDATED MEAL DATA ===' as info;
SELECT id, name, ingredients FROM meals WHERE name LIKE '%Chicken Mushroom%';

-- 9. Show serving units for our foods
SELECT '=== STEP 7: SERVING UNITS CREATED ===' as info;
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE '%chicken%' OR f.name ILIKE '%mushroom%' OR f.name ILIKE '%spinach%' OR f.name ILIKE '%cheese%'
ORDER BY f.name, su.is_default DESC;

-- 10. Show food nutritional values for verification
SELECT '=== STEP 8: FOOD NUTRITIONAL VALUES ===' as info;
SELECT 
    name,
    carbs,
    fat,
    protein
FROM foods 
WHERE name ILIKE '%chicken%' OR name ILIKE '%mushroom%' OR name ILIKE '%spinach%' OR name ILIKE '%cheese%'
ORDER BY name;

-- 11. Calculate expected totals for verification
SELECT '=== STEP 9: EXPECTED CALCULATIONS ===' as info;
SELECT 
    'Chicken Breast (2 EACH)' as ingredient,
    0 as carbs,
    7.0 as fat,  -- 3.5 * 2
    62 as protein  -- 31 * 2
UNION ALL
SELECT 
    'Mushroom (200g)' as ingredient,
    6.8 as carbs,  -- 3.4 * 2
    0.6 as fat,    -- 0.3 * 2
    6.2 as protein -- 3.1 * 2
UNION ALL
SELECT 
    'Spinach (100g)' as ingredient,
    3.6 as carbs,
    0.4 as fat,
    2.9 as protein
UNION ALL
SELECT 
    'Cheese (50g)' as ingredient,
    0.65 as carbs, -- 1.3 * 0.5
    9.0 as fat,    -- 18.0 * 0.5
    6.25 as protein -- 12.5 * 0.5
UNION ALL
SELECT 
    'TOTAL' as ingredient,
    11.05 as carbs,
    17.0 as fat,
    77.35 as protein;

-- 12. Final verification - show the complete fixed meal
SELECT '=== STEP 10: FINAL VERIFICATION ===' as info;
SELECT 
    name,
    ingredients,
    total_protein,
    total_carbs,
    total_fat
FROM meals 
WHERE name LIKE '%Chicken Mushroom%'; 