-- Check current slice weights in the database
-- This will show us the actual grams_per_unit for SLICE units

-- 1. Check all SLICE units and their weights
SELECT 
    su.id,
    su.food_id,
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default,
    su.created_at
FROM serving_units su
LEFT JOIN foods f ON su.food_id = f.id
WHERE su.unit_name ILIKE '%slice%'
ORDER BY f.name;

-- 2. Check foods that might have slice-related serving units
SELECT 
    su.id,
    su.food_id,
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM serving_units su
LEFT JOIN foods f ON su.food_id = f.id
WHERE f.name ILIKE '%bacon%' 
   OR f.name ILIKE '%bread%'
   OR f.name ILIKE '%cheese%'
   OR f.name ILIKE '%tomato%'
   OR f.name ILIKE '%cucumber%'
   OR f.name ILIKE '%onion%'
   OR su.unit_name ILIKE '%slice%'
ORDER BY f.name, su.unit_name;

-- 3. Check if there are any foods with 'slice' in the name
SELECT 
    id,
    name,
    carbs,
    fat,
    protein
FROM foods 
WHERE name ILIKE '%slice%' 
   OR name ILIKE '%bacon%'
   OR name ILIKE '%bread%'
   OR name ILIKE '%cheese%'
ORDER BY name;

-- 4. Show all serving units for bacon specifically
SELECT 
    su.id,
    su.food_id,
    f.name as food_name,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM serving_units su
LEFT JOIN foods f ON su.food_id = f.id
WHERE f.name ILIKE '%bacon%'
ORDER BY su.unit_name; 