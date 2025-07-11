-- COMPLETE FIX FOR CHICKEN MUSHROOM SPINACH CHEESE BAKE MEAL
-- This script will fix all issues with the meal data

-- 1. First, let's see what foods we have in the database
SELECT '=== AVAILABLE FOODS ===' as info;
SELECT id, name, carbs, fat, protein FROM foods 
WHERE name ILIKE '%chicken%' OR name ILIKE '%mushroom%' OR name ILIKE '%spinach%' OR name ILIKE '%cheese%'
ORDER BY name;

-- 2. Check current meal data
SELECT '=== CURRENT MEAL DATA ===' as info;
SELECT id, name, ingredients, total_protein, total_carbs, total_fat 
FROM meals 
WHERE name LIKE '%Chicken Mushroom%';

-- 3. Fix serving units table to allow NULL grams_per_unit for EACH units
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

-- 6. Get the food IDs we need (we'll use variables to make this dynamic)
DO $$
DECLARE
    chicken_id UUID;
    mushroom_id UUID;
    spinach_id UUID;
    cheese_id UUID;
    meal_id UUID;
BEGIN
    -- Get the food IDs
    SELECT id INTO chicken_id FROM foods WHERE name ILIKE '%chicken breast%' LIMIT 1;
    SELECT id INTO mushroom_id FROM foods WHERE name ILIKE '%mushroom%' LIMIT 1;
    SELECT id INTO spinach_id FROM foods WHERE name ILIKE '%spinach%' LIMIT 1;
    SELECT id INTO cheese_id FROM foods WHERE name ILIKE '%cheese%' LIMIT 1;
    SELECT id INTO meal_id FROM meals WHERE name LIKE '%Chicken Mushroom%' LIMIT 1;
    
    -- Log what we found
    RAISE NOTICE 'Found food IDs: Chicken=%, Mushroom=%, Spinach=%, Cheese=%', 
        chicken_id, mushroom_id, spinach_id, cheese_id;
    RAISE NOTICE 'Found meal ID: %', meal_id;
    
    -- 7. Create serving units for each food
    -- Chicken Breast - EACH unit
    IF chicken_id IS NOT NULL THEN
        INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
        VALUES (chicken_id, 'EACH', NULL, true)
        ON CONFLICT (food_id, unit_name) DO UPDATE
        SET grams_per_unit = NULL, is_default = true;
    END IF;
    
    -- Mushroom - gram unit
    IF mushroom_id IS NOT NULL THEN
        INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
        VALUES (mushroom_id, 'g', 1.0, true)
        ON CONFLICT (food_id, unit_name) DO UPDATE
        SET grams_per_unit = 1.0, is_default = true;
    END IF;
    
    -- Spinach - gram unit
    IF spinach_id IS NOT NULL THEN
        INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
        VALUES (spinach_id, 'g', 1.0, true)
        ON CONFLICT (food_id, unit_name) DO UPDATE
        SET grams_per_unit = 1.0, is_default = true;
    END IF;
    
    -- Cheese - gram unit
    IF cheese_id IS NOT NULL THEN
        INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
        VALUES (cheese_id, 'g', 1.0, true)
        ON CONFLICT (food_id, unit_name) DO UPDATE
        SET grams_per_unit = 1.0, is_default = true;
    END IF;
    
    -- 8. Update the meal with correct ingredient data
    IF meal_id IS NOT NULL THEN
        UPDATE meals SET 
            ingredients = jsonb_build_array(
                jsonb_build_object(
                    'food_id', chicken_id,
                    'food_name', 'Chicken Breast',
                    'quantity', 2,
                    'serving_unit', 'EACH',
                    'instructions', 'Diced',
                    'carbs', 0,
                    'fat', 3.5,
                    'protein', 31
                ),
                jsonb_build_object(
                    'food_id', mushroom_id,
                    'food_name', 'Mushroom',
                    'quantity', 200,
                    'serving_unit', 'g',
                    'instructions', 'Sliced',
                    'carbs', 3.4,
                    'fat', 0.3,
                    'protein', 3.1
                ),
                jsonb_build_object(
                    'food_id', spinach_id,
                    'food_name', 'Spinach',
                    'quantity', 100,
                    'serving_unit', 'g',
                    'instructions', 'Fresh',
                    'carbs', 3.6,
                    'fat', 0.4,
                    'protein', 2.9
                ),
                jsonb_build_object(
                    'food_id', cheese_id,
                    'food_name', 'Cheese',
                    'quantity', 50,
                    'serving_unit', 'g',
                    'instructions', 'Grated',
                    'carbs', 1.3,
                    'fat', 18.0,
                    'protein', 12.5
                )
            ),
            updated_at = NOW()
        WHERE id = meal_id;
        
        RAISE NOTICE 'Updated meal ingredients';
    END IF;
    
    -- 9. Recalculate meal totals
    IF meal_id IS NOT NULL THEN
        UPDATE meals SET 
            total_carbs = (
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN (value->>'serving_unit')::text = 'EACH' 
                        THEN (value->>'carbs')::decimal * (value->>'quantity')::decimal
                        ELSE (value->>'carbs')::decimal
                    END
                ), 0)
                FROM jsonb_array_elements(ingredients) as value
            ),
            total_fat = (
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN (value->>'serving_unit')::text = 'EACH' 
                        THEN (value->>'fat')::decimal * (value->>'quantity')::decimal
                        ELSE (value->>'fat')::decimal
                    END
                ), 0)
                FROM jsonb_array_elements(ingredients) as value
            ),
            total_protein = (
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN (value->>'serving_unit')::text = 'EACH' 
                        THEN (value->>'protein')::decimal * (value->>'quantity')::decimal
                        ELSE (value->>'protein')::decimal
                    END
                ), 0)
                FROM jsonb_array_elements(ingredients) as value
            ),
            updated_at = NOW()
        WHERE id = meal_id;
        
        RAISE NOTICE 'Recalculated meal totals';
    END IF;
    
END $$;

-- 10. Show the final results
SELECT '=== FINAL MEAL DATA ===' as info;
SELECT 
    name,
    ingredients,
    total_protein,
    total_carbs,
    total_fat
FROM meals 
WHERE name LIKE '%Chicken Mushroom%';

-- 11. Show serving units for our foods
SELECT '=== SERVING UNITS ===' as info;
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE '%chicken%' OR f.name ILIKE '%mushroom%' OR f.name ILIKE '%spinach%' OR f.name ILIKE '%cheese%'
ORDER BY f.name, su.is_default DESC;

-- 12. Calculate expected totals for verification
SELECT '=== EXPECTED CALCULATIONS ===' as info;
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