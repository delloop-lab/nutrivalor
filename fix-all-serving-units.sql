-- Comprehensive fix for serving units and EACH unit handling
-- Run this script to fix all serving unit issues

-- 1. First, modify the serving_units table to allow NULL grams_per_unit for EACH units
ALTER TABLE serving_units ALTER COLUMN grams_per_unit DROP NOT NULL;

-- 2. Clean up existing data that would violate the new constraint
-- Set grams_per_unit to NULL for any EACH units that have non-NULL values
UPDATE serving_units 
SET grams_per_unit = NULL 
WHERE unit_name = 'EACH' AND grams_per_unit IS NOT NULL;

-- Set grams_per_unit to 1.0 for any non-EACH units that have NULL values
UPDATE serving_units 
SET grams_per_unit = 1.0 
WHERE unit_name != 'EACH' AND grams_per_unit IS NULL;

-- 3. Add the check constraint
ALTER TABLE serving_units 
ADD CONSTRAINT check_grams_per_unit_null 
CHECK (
    (unit_name = 'EACH' AND grams_per_unit IS NULL) OR 
    (unit_name != 'EACH' AND grams_per_unit IS NOT NULL)
);

-- 4. Update chicken breast in foods table to store per-EACH values
UPDATE foods
SET carbs = 0,
    fat = 3.5,    -- Per breast
    protein = 31,  -- Per breast
    updated_at = NOW()
WHERE id = '0a9047c6-ef14-4e1e-b2b3-a79aca5f2b12';

-- 5. Create serving units for all foods that don't have them
-- First, create EACH units for countable foods
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'EACH', NULL, TRUE 
FROM foods 
WHERE id NOT IN (SELECT DISTINCT food_id FROM serving_units WHERE food_id IS NOT NULL)
AND (
  name ILIKE '%egg%' OR 
  name ILIKE '%chicken breast%' OR
  name ILIKE '%banana%' OR
  name ILIKE '%apple%' OR
  name ILIKE '%orange%' OR
  name ILIKE '%eggplant%' OR
  name ILIKE '%aubergine%'
);

-- Then create gram units for all other foods
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'g', 1.0, TRUE 
FROM foods 
WHERE id NOT IN (SELECT DISTINCT food_id FROM serving_units WHERE food_id IS NOT NULL)
AND NOT (
  name ILIKE '%egg%' OR 
  name ILIKE '%chicken breast%' OR
  name ILIKE '%banana%' OR
  name ILIKE '%apple%' OR
  name ILIKE '%orange%' OR
  name ILIKE '%eggplant%' OR
  name ILIKE '%aubergine%'
);

-- 6. Add SLICE units for bacon and other sliced items
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'SLICE', 15.0, FALSE  -- 15g per slice
FROM foods 
WHERE name ILIKE '%bacon%' 
AND id NOT IN (
    SELECT food_id FROM serving_units WHERE unit_name = 'SLICE'
);

-- 7. Update the chicken breast ingredient in the meal to use EACH units
UPDATE meals
SET ingredients = jsonb_set(
    ingredients,  -- No cast needed, it's already JSONB
    '{0}',  -- First ingredient (chicken breast)
    jsonb_build_object(
        'food_id', '0a9047c6-ef14-4e1e-b2b3-a79aca5f2b12',
        'food_name', 'Chicken Breast',
        'quantity', 2,
        'serving_unit', 'EACH',
        'instructions', '',
        'carbs', 0,
        'fat', 3.5,  -- Per breast (will be multiplied by quantity in code)
        'protein', 31  -- Per breast (will be multiplied by quantity in code)
    )
),
updated_at = NOW()
WHERE name = 'Chicken Mushroom Spinach Cheese Bake';

-- 8. Recalculate total macros for the meal using proper EACH unit handling
UPDATE meals
SET total_fat = (
    SELECT COALESCE(SUM(CASE 
        WHEN (value->>'serving_unit')::text = 'EACH' 
        THEN (value->>'fat')::decimal * (value->>'quantity')::decimal
        ELSE (value->>'fat')::decimal
    END), 0)
    FROM jsonb_array_elements(ingredients) as value
),
total_protein = (
    SELECT COALESCE(SUM(CASE 
        WHEN (value->>'serving_unit')::text = 'EACH' 
        THEN (value->>'protein')::decimal * (value->>'quantity')::decimal
        ELSE (value->>'protein')::decimal
    END), 0)
    FROM jsonb_array_elements(ingredients) as value
),
updated_at = NOW()
WHERE name = 'Chicken Mushroom Spinach Cheese Bake';

-- 9. Show summary of what was fixed
SELECT 'Serving units created:' as info, COUNT(*) as count
FROM serving_units 
WHERE created_at >= NOW() - INTERVAL '1 minute';

SELECT 'Foods with EACH units:' as info, COUNT(*) as count
FROM serving_units 
WHERE unit_name = 'EACH';

SELECT 'Foods with SLICE units:' as info, COUNT(*) as count
FROM serving_units 
WHERE unit_name = 'SLICE';

SELECT 'Total serving units:' as info, COUNT(*) as count
FROM serving_units; 