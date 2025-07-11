-- Comprehensive fix for serving units and meal data
-- This script properly handles the grams_per_unit constraint

-- 1. First, ensure grams_per_unit can be NULL for EACH units
ALTER TABLE serving_units ALTER COLUMN grams_per_unit DROP NOT NULL;

-- 2. Clean up existing data that would violate the constraint
-- Remove any EACH units that have non-NULL grams_per_unit
DELETE FROM serving_units WHERE unit_name = 'EACH' AND grams_per_unit IS NOT NULL;

-- Remove any non-EACH units that have NULL grams_per_unit
DELETE FROM serving_units WHERE unit_name != 'EACH' AND grams_per_unit IS NULL;

-- 3. Now add the constraint after cleaning up the data
ALTER TABLE serving_units DROP CONSTRAINT IF EXISTS check_grams_per_unit_null;
ALTER TABLE serving_units ADD CONSTRAINT check_grams_per_unit_null CHECK (
    (unit_name = 'EACH' AND grams_per_unit IS NULL) OR 
    (unit_name != 'EACH' AND grams_per_unit IS NOT NULL)
);

-- 4. Clean up any existing serving units for our target foods to avoid conflicts
DELETE FROM serving_units WHERE food_id IN (
    SELECT id FROM foods WHERE name IN ('Chicken Breast', 'Bacon', 'Egg', 'Mushroom', 'Spinach', 'Cheese')
);

-- 5. Create serving units for all foods that need them
INSERT INTO serving_units (food_id, unit_name, grams_per_unit) VALUES
-- Chicken Breast - EACH unit (NULL grams_per_unit for countable items)
((SELECT id FROM foods WHERE name = 'Chicken Breast'), 'EACH', NULL),
-- Bacon - SLICE unit
((SELECT id FROM foods WHERE name = 'Bacon'), 'SLICE', 15),
-- Egg - EACH unit
((SELECT id FROM foods WHERE name = 'Egg'), 'EACH', NULL),
-- Mushroom - gram unit
((SELECT id FROM foods WHERE name = 'Mushroom'), 'gram', 1),
-- Spinach - gram unit
((SELECT id FROM foods WHERE name = 'Spinach'), 'gram', 1),
-- Cheese - gram unit
((SELECT id FROM foods WHERE name = 'Cheese'), 'gram', 1);

-- 6. Fix the Chicken Mushroom Spinach Cheese Bake meal
-- First, let's see what the current meal data looks like
SELECT id, name, ingredients FROM meals WHERE name LIKE '%Chicken Mushroom%';

-- 7. Get the food IDs we need
DO $$
DECLARE
    chicken_id UUID;
    mushroom_id UUID;
    spinach_id UUID;
    cheese_id UUID;
BEGIN
    -- Get the food IDs
    SELECT id INTO chicken_id FROM foods WHERE name = 'Chicken Breast';
    SELECT id INTO mushroom_id FROM foods WHERE name = 'Mushroom';
    SELECT id INTO spinach_id FROM foods WHERE name = 'Spinach';
    SELECT id INTO cheese_id FROM foods WHERE name = 'Cheese';
    
    -- Update the meal with correct ingredient data
    UPDATE meals SET 
        ingredients = jsonb_build_array(
            jsonb_build_object('food_id', chicken_id, 'quantity', 2, 'unit', 'EACH'),
            jsonb_build_object('food_id', mushroom_id, 'quantity', 200, 'unit', 'gram'),
            jsonb_build_object('food_id', spinach_id, 'quantity', 100, 'unit', 'gram'),
            jsonb_build_object('food_id', cheese_id, 'quantity', 50, 'unit', 'gram')
        )
    WHERE name LIKE '%Chicken Mushroom%';
END $$;

-- 8. Recalculate meal totals (this will be done by the application)
-- The application will recalculate when meals are loaded

-- 9. Verify the fixes
SELECT 
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name IN ('Chicken Breast', 'Bacon', 'Egg', 'Mushroom', 'Spinach', 'Cheese')
ORDER BY f.name;

-- 10. Check the updated meal
SELECT 
    name,
    ingredients,
    total_protein,
    total_carbs,
    total_fat
FROM meals 
WHERE name LIKE '%Chicken Mushroom%'; 