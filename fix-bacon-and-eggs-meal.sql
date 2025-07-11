-- First, let's see the current structure of the "Bacon and Eggs" meal
SELECT name, ingredients 
FROM meals 
WHERE name = 'Bacon and Eggs';

-- Check the data type and structure (ingredients stored as TEXT/JSON, not JSONB)
SELECT name, 
       ingredients,
       json_array_length(ingredients::json) as ingredient_count
FROM meals 
WHERE name = 'Bacon and Eggs';

-- Find the egg ingredient (parsing as JSON string first)
SELECT name,
       ingredient.value->>'food_name' as food_name,
       ingredient.value->>'serving_unit' as serving_unit,
       ingredient.value->>'quantity' as quantity,
       ingredient.ordinality - 1 as array_index
FROM meals m,
     json_array_elements(m.ingredients::json) WITH ORDINALITY ingredient
WHERE m.name = 'Bacon and Eggs'
AND ingredient.value->>'food_name' = 'Egg';

-- Update the meal ingredients to use correct units and quantities
UPDATE meals
SET ingredients = json_build_array(
    json_build_object(
        'food_id', (SELECT id FROM foods WHERE name = 'Bacon'),
        'food_name', 'Bacon',
        'quantity', 2,
        'serving_unit', 'SLICE',
        'instructions', ''
    ),
    json_build_object(
        'food_id', (SELECT id FROM foods WHERE name = 'Egg'),
        'food_name', 'Egg',
        'quantity', 2,
        'serving_unit', 'EACH',
        'instructions', ''
    )
)::text
WHERE name = 'Bacon and Eggs';

-- Verify the update
SELECT name, ingredients 
FROM meals 
WHERE name = 'Bacon and Eggs'; 