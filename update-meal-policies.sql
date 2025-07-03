-- Drop existing meal policies
DROP POLICY IF EXISTS "Users can view own meals" ON meals;
DROP POLICY IF EXISTS "Users can insert own meals" ON meals;
DROP POLICY IF EXISTS "Users can update own meals" ON meals;
DROP POLICY IF EXISTS "Users can delete own meals" ON meals;

-- Create updated policies for meals table
CREATE POLICY "Users can view meals" ON meals 
    FOR SELECT USING (
        auth.uid() = user_id -- User's own meals
        OR 
        user_id IS NULL     -- Shared/default meals
    );

CREATE POLICY "Users can insert own meals" ON meals 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meals" ON meals 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meals" ON meals 
    FOR DELETE USING (auth.uid() = user_id);

-- Show all policies for verification
SELECT 'Meal policies after update:' as status;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'meals'; 