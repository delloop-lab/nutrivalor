-- Test script for serving units system
-- This script tests the serving units functionality

-- 1. Test that default serving units are created for existing foods
SELECT f.name, su.unit_name, su.grams_per_unit, su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
ORDER BY f.name, su.is_default DESC;

-- 2. Test adding custom serving units for a food (example: bacon)
-- First, find a food to test with
SELECT id, name FROM foods WHERE name ILIKE '%bacon%' LIMIT 1;

-- Add custom serving units for bacon (assuming we have bacon in our foods)
-- This would typically be done through the admin interface
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'slice', 15.0, FALSE
FROM foods 
WHERE name ILIKE '%bacon%' 
LIMIT 1
ON CONFLICT (food_id, unit_name) DO NOTHING;

INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'cup', 120.0, FALSE
FROM foods 
WHERE name ILIKE '%cheese%' 
LIMIT 1
ON CONFLICT (food_id, unit_name) DO NOTHING;

-- 3. Test macro calculations
-- For bacon with 541 kcal per 100g and a 15g slice:
-- calories per slice = (15 / 100) * 541 = 81.15 kcal
SELECT 
    f.name,
    f.calories as calories_per_100g,
    su.unit_name,
    su.grams_per_unit,
    ROUND((su.grams_per_unit / 100.0) * f.calories, 2) as calories_per_unit,
    ROUND((su.grams_per_unit / 100.0) * f.protein, 2) as protein_per_unit,
    ROUND((su.grams_per_unit / 100.0) * f.fat, 2) as fat_per_unit,
    ROUND((su.grams_per_unit / 100.0) * f.carbs, 2) as carbs_per_unit
FROM foods f
JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE '%bacon%' OR f.name ILIKE '%cheese%'
ORDER BY f.name, su.is_default DESC;

-- 4. Test that triggers work for new foods
-- Insert a test food and verify default serving unit is created
INSERT INTO foods (name, brand, carbs, fat, protein, calories, category, created_by)
VALUES ('Test Food', 'Test Brand', 10.0, 5.0, 15.0, 150.0, 'TEST', 'System Test')
ON CONFLICT (name) DO NOTHING;

-- Check that the trigger created the default serving unit
SELECT f.name, su.unit_name, su.grams_per_unit, su.is_default
FROM foods f
JOIN serving_units su ON f.id = su.food_id
WHERE f.name = 'Test Food';

-- 5. Cleanup test data
DELETE FROM foods WHERE name = 'Test Food' AND created_by = 'System Test';

-- 6. Check serving units counts
SELECT 
    COUNT(*) as total_foods,
    COUNT(DISTINCT su.food_id) as foods_with_serving_units,
    COUNT(*) FILTER (WHERE su.is_default = TRUE) as default_units,
    COUNT(*) FILTER (WHERE su.is_default = FALSE) as custom_units
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id; 