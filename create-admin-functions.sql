-- Create a function to get user details for super admins
-- This function can be called from the client side and will return user details
-- Only super admins can call this function

CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    email_confirmed_at TIMESTAMPTZ,
    role TEXT,
    granted_at TIMESTAMPTZ,
    granted_by UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the current user is a super admin
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Only super admins can access this function.';
    END IF;
    
    -- Return user details with roles
    RETURN QUERY
    SELECT 
        ur.user_id,
        au.email,
        au.created_at,
        au.last_sign_in_at,
        au.email_confirmed_at,
        ur.role,
        ur.granted_at,
        ur.granted_by
    FROM user_roles ur
    LEFT JOIN auth.users au ON ur.user_id = au.id
    ORDER BY ur.granted_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_users_with_roles() TO authenticated;

-- Create a function to get a single user's details
CREATE OR REPLACE FUNCTION get_user_details(user_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    email_confirmed_at TIMESTAMPTZ,
    role TEXT,
    granted_at TIMESTAMPTZ,
    granted_by UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the current user is a super admin
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Only super admins can access this function.';
    END IF;
    
    -- Return user details
    RETURN QUERY
    SELECT 
        ur.user_id,
        au.email,
        au.created_at,
        au.last_sign_in_at,
        au.email_confirmed_at,
        ur.role,
        ur.granted_at,
        ur.granted_by
    FROM user_roles ur
    LEFT JOIN auth.users au ON ur.user_id = au.id
    WHERE ur.user_id = user_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_details(UUID) TO authenticated; 