-- Drop existing RLS policies for foods table
DROP POLICY IF EXISTS "Users can view own foods" ON foods;
DROP POLICY IF EXISTS "Users can insert own foods" ON foods;
DROP POLICY IF EXISTS "Users can update own foods" ON foods;
DROP POLICY IF EXISTS "Users can delete own foods" ON foods;

-- Create new RLS policies that handle both user-specific and global foods
CREATE POLICY "Users can view own and global foods" ON foods
    FOR SELECT USING (
        auth.uid() = user_id  -- User's own foods
        OR 
        user_id IS NULL      -- Global foods
    );

CREATE POLICY "Users can insert own foods" ON foods
    FOR INSERT WITH CHECK (
        auth.uid() = user_id  -- Users can only insert their own foods
        OR 
        (auth.uid() IN (     -- Admins can insert global foods
            SELECT user_id FROM user_profiles WHERE role = 'admin'
        ) AND user_id IS NULL)
    );

CREATE POLICY "Users can update own foods" ON foods
    FOR UPDATE USING (
        auth.uid() = user_id  -- Users can update their own foods
        OR 
        (auth.uid() IN (     -- Admins can update global foods
            SELECT user_id FROM user_profiles WHERE role = 'admin'
        ) AND user_id IS NULL)
    );

CREATE POLICY "Users can delete own foods" ON foods
    FOR DELETE USING (
        auth.uid() = user_id  -- Users can delete their own foods
        OR 
        (auth.uid() IN (     -- Admins can delete global foods
            SELECT user_id FROM user_profiles WHERE role = 'admin'
        ) AND user_id IS NULL)
    ); 