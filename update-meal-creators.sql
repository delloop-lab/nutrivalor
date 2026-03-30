-- Check for all meals created by lou@schillaci.me
SELECT 
    id,
    name,
    created_by,
    created_at
FROM meals 
WHERE created_by = 'lou@schillaci.me'
ORDER BY created_at DESC;

-- Update all meals created by lou@schillaci.me to show Lou Schillaci
UPDATE meals 
SET created_by = 'Lou Schillaci'
WHERE created_by = 'lou@schillaci.me';

-- Verify the update worked
SELECT 
    id,
    name,
    created_by,
    created_at
FROM meals 
WHERE created_by = 'Lou Schillaci'
ORDER BY created_at DESC; 