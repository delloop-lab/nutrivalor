-- Create a simple function to get user roles for super admins
-- This avoids the auth.users table access issues

CREATE OR REPLACE FUNCTION get_user_roles_for_admin()
RETURNS TABLE (
    user_id UUID,
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
    
    -- Return user roles
    RETURN QUERY
    SELECT 
        ur.user_id,
        ur.role,
        ur.granted_at,
        ur.granted_by
    FROM user_roles ur
    ORDER BY ur.granted_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_roles_for_admin() TO authenticated; 