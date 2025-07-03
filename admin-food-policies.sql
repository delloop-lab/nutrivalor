-- Admin Food Management Policies
-- Run this in Supabase SQL Editor to allow admins to manage all food items

-- Add policy for admins to view all foods
CREATE POLICY "Admins can view all foods" ON foods 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('admin', 'super_admin')
        )
    );

-- Add policy for admins to insert foods
CREATE POLICY "Admins can insert any foods" ON foods 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('admin', 'super_admin')
        )
    );

-- Add policy for admins to update any foods
CREATE POLICY "Admins can update any foods" ON foods 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('admin', 'super_admin')
        )
    );

-- Add policy for admins to delete any foods
CREATE POLICY "Admins can delete any foods" ON foods 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('admin', 'super_admin')
        )
    );

-- Verify current policies
SELECT 'Current food policies:' as status;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'foods'; 