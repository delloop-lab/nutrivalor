-- Admin Meal Management Policies
-- Run this in Supabase SQL Editor to allow admins to manage all meals

-- Admin policy to view all meals
CREATE POLICY "Admins can view all meals" ON meals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
  )
);

-- Admin policy to insert any meals
CREATE POLICY "Admins can insert any meals" ON meals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
  )
);

-- Admin policy to update any meals
CREATE POLICY "Admins can update any meals" ON meals
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
  )
);

-- Admin policy to delete any meals
CREATE POLICY "Admins can delete any meals" ON meals
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
  )
);

-- Show all policies for verification
SELECT 'Meal policies after update:' as status;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'meals'; 