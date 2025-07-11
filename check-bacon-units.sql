-- Check bacon's serving units
SELECT 
    f.name,
    f.brand,
    su.unit_name,
    su.grams_per_unit,
    su.is_default
FROM foods f
LEFT JOIN serving_units su ON f.id = su.food_id
WHERE f.name ILIKE '%bacon%'
ORDER BY f.name, su.is_default DESC; 