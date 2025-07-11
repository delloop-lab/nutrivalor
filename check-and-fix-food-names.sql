-- Check what foods exist in the database
SELECT id, name FROM foods WHERE name ILIKE '%chicken%' OR name ILIKE '%mushroom%' OR name ILIKE '%spinach%' OR name ILIKE '%cheese%' OR name ILIKE '%bacon%' OR name ILIKE '%egg%' ORDER BY name;

-- Check the current meal ingredients
SELECT 
    name,
    ingredients,
    total_protein,
    total_carbs,
    total_fat
FROM meals 
WHERE name LIKE '%Chicken Mushroom%'; 