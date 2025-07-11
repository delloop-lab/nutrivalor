-- Add 'each' unit for eggs
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'each', 50.0, FALSE
FROM foods 
WHERE id = 'baa0d3ac-5b34-4f0b-8c03-6582c0e684cc'
ON CONFLICT (food_id, unit_name) DO UPDATE 
SET grams_per_unit = 50.0; 