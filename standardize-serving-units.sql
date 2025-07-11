-- Standardize all serving units to only GRAMS, EACH, and SLICE
-- This script will clean up the database and ensure only these three unit types exist

-- 1. First, let's see what we're working with
SELECT 'Current serving units before standardization:' as info;
SELECT unit_name, COUNT(*) as count FROM serving_units GROUP BY unit_name ORDER BY unit_name;

-- 2. Clean up existing serving units - remove all non-standard units
DELETE FROM serving_units 
WHERE unit_name NOT IN ('GRAMS', 'EACH', 'SLICE', 'g', 'each', 'slice', 'gram', 'grams');

-- 3. Standardize unit names to uppercase
UPDATE serving_units 
SET unit_name = UPPER(unit_name)
WHERE unit_name IN ('g', 'gram', 'grams', 'each', 'slice');

-- 4. Handle GRAMS units (convert 'g' to 'GRAMS')
UPDATE serving_units 
SET unit_name = 'GRAMS'
WHERE unit_name = 'G';

-- 5. Ensure proper grams_per_unit values
-- GRAMS units should have grams_per_unit = 1
UPDATE serving_units 
SET grams_per_unit = 1.0
WHERE unit_name = 'GRAMS' AND (grams_per_unit IS NULL OR grams_per_unit != 1.0);

-- EACH units should have grams_per_unit = NULL
UPDATE serving_units 
SET grams_per_unit = NULL
WHERE unit_name = 'EACH' AND grams_per_unit IS NOT NULL;

-- SLICE units should preserve their existing grams_per_unit values
-- Only set to 15.0 if grams_per_unit is NULL (no existing data)
UPDATE serving_units 
SET grams_per_unit = 15.0
WHERE unit_name = 'SLICE' AND grams_per_unit IS NULL;

-- 6. Create serving units for foods that don't have any
-- First, identify foods that need EACH units (countable items)
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
    name ILIKE '%aubergine%' OR
    name ILIKE '%tomato%' OR
    name ILIKE '%onion%' OR
    name ILIKE '%potato%' OR
    name ILIKE '%carrot%'
);

-- Then create GRAMS units for all other foods
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'GRAMS', 1.0, TRUE
FROM foods 
WHERE id NOT IN (SELECT DISTINCT food_id FROM serving_units WHERE food_id IS NOT NULL);

-- 7. Add SLICE units for foods that are typically sliced
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'SLICE', 15.0, FALSE
FROM foods 
WHERE name ILIKE '%bacon%' OR
      name ILIKE '%bread%' OR
      name ILIKE '%cheese%' OR
      name ILIKE '%tomato%' OR
      name ILIKE '%cucumber%' OR
      name ILIKE '%onion%'
ON CONFLICT (food_id, unit_name) DO NOTHING;

-- 8. Ensure only one default unit per food
-- If a food has multiple units, make sure only one is default
UPDATE serving_units 
SET is_default = FALSE
WHERE id IN (
    SELECT su.id
    FROM serving_units su
    WHERE su.is_default = TRUE
    AND EXISTS (
        SELECT 1 
        FROM serving_units su2 
        WHERE su2.food_id = su.food_id 
        AND su2.id != su.id 
        AND su2.is_default = TRUE
    )
);

-- 9. Show final result
SELECT 'Final serving units after standardization:' as info;
SELECT unit_name, COUNT(*) as count FROM serving_units GROUP BY unit_name ORDER BY unit_name;

-- 10. Show foods with their serving units
SELECT 
    f.name as food_name,
    STRING_AGG(su.unit_name || CASE WHEN su.is_default THEN ' (default)' ELSE '' END, ', ' ORDER BY su.unit_name) as units
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
GROUP BY f.id, f.name
ORDER BY f.name; 