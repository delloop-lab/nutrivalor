-- Script to set up SUPER ADMIN role for lou@schillaci.me
-- This script should be run after the user has logged in at least once

-- First, let's check if the user_roles table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        RAISE EXCEPTION 'user_roles table does not exist. Please run create-user-roles-table.sql first.';
    END IF;
END $$;

-- Find the user ID for lou@schillaci.me
DO $$
DECLARE
    user_id UUID;
BEGIN
    -- Get the user ID for lou@schillaci.me
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = 'lou@schillaci.me';
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'User lou@schillaci.me not found. Please ensure the user has logged in at least once.';
    ELSE
        -- Insert or update the SUPER ADMIN role
        INSERT INTO user_roles (user_id, role, granted_by, granted_at)
        VALUES (user_id, 'super_admin', user_id, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            role = 'super_admin',
            granted_by = user_id,
            granted_at = NOW(),
            updated_at = NOW();
            
        RAISE NOTICE 'SUPER ADMIN role granted to lou@schillaci.me (user_id: %)', user_id;
    END IF;
END $$;

-- Verify the setup
SELECT 
    u.email,
    ur.role,
    ur.granted_at,
    ur.granted_by
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'lou@schillaci.me'; 