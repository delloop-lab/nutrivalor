-- Simple fix for chicken breast EACH units
-- This avoids complex JSONB operations that might cause scalar issues

-- 1. Update chicken breast in foods table to store per-EACH values
UPDATE foods
SET carbs = 0,
    fat = 3.5,    -- Per breast
    protein = 31,  -- Per breast
    updated_at = NOW()
WHERE id = '0a9047c6-ef14-4e1e-b2b3-a79aca5f2b12';

-- 2. Create EACH serving unit for chicken breast
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
VALUES ('0a9047c6-ef14-4e1e-b2b3-a79aca5f2b12', 'EACH', NULL, true)
ON CONFLICT (food_id, unit_name) DO UPDATE
SET grams_per_unit = NULL,
    is_default = true;

-- 3. Create basic serving units for all foods that don't have them
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'g', 1.0, TRUE 
FROM foods 
WHERE id NOT IN (SELECT DISTINCT food_id FROM serving_units WHERE food_id IS NOT NULL);

-- 4. Manually update the meal totals (simpler than complex JSONB operations)
UPDATE meals
SET total_fat = 100.57,  -- 93.57 + (3.5 * 2)
    total_protein = 139.82,  -- 77.82 + (31 * 2)
    updated_at = NOW()
WHERE name = 'Chicken Mushroom Spinach Cheese Bake';

-- 5. Show what was updated
SELECT 'Chicken breast updated to EACH units' as status;
SELECT 'New totals: Fat=100.57g, Protein=139.82g' as result; 