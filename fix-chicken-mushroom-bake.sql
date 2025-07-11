-- First, modify the serving_units table to allow NULL grams_per_unit for EACH units
ALTER TABLE serving_units ALTER COLUMN grams_per_unit DROP NOT NULL;

-- Clean up existing data that would violate the new constraint
-- Set grams_per_unit to NULL for any EACH units that have non-NULL values
UPDATE serving_units 
SET grams_per_unit = NULL 
WHERE unit_name = 'EACH' AND grams_per_unit IS NOT NULL;

-- Set grams_per_unit to 1.0 for any non-EACH units that have NULL values
UPDATE serving_units 
SET grams_per_unit = 1.0 
WHERE unit_name != 'EACH' AND grams_per_unit IS NULL;

-- Now we can safely add the check constraint
ALTER TABLE serving_units 
ADD CONSTRAINT check_grams_per_unit_null 
CHECK (
    (unit_name = 'EACH' AND grams_per_unit IS NULL) OR 
    (unit_name != 'EACH' AND grams_per_unit IS NOT NULL)
);

-- First update the chicken breast in foods table to store per-EACH values
UPDATE foods
SET carbs = 0,
    fat = 3.5,    -- Per breast
    protein = 31,  -- Per breast
    updated_at = NOW()
WHERE id = '0a9047c6-ef14-4e1e-b2b3-a79aca5f2b12';

-- Now we can safely add the EACH serving unit for chicken breast
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
VALUES ('0a9047c6-ef14-4e1e-b2b3-a79aca5f2b12', 'EACH', NULL, true)
ON CONFLICT (food_id, unit_name) DO UPDATE
SET grams_per_unit = NULL,
    is_default = true;

-- Update the chicken breast ingredient in the meal to use EACH units
UPDATE meals
SET ingredients = jsonb_set(
    ingredients::jsonb,
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

-- Update the total macros for the meal
-- Note: Other ingredients' values remain the same, we just update the chicken contribution
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