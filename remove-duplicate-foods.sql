-- Remove duplicate foods from the database
-- This script will keep the oldest entry for each unique name+category combination

-- First, let's see what duplicates we have
SELECT name, category, COUNT(*) as duplicate_count
FROM foods 
GROUP BY name, category 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, name;

-- Remove duplicates, keeping the oldest entry (smallest id) for each name+category combination
DELETE FROM foods 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM foods 
    GROUP BY LOWER(name), category
);

-- Verify cleanup
SELECT name, category, COUNT(*) as count_after_cleanup
FROM foods 
GROUP BY name, category 
HAVING COUNT(*) > 1
ORDER BY name; 