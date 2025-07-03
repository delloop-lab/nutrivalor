-- NutriValor Database Setup Script
-- Run this in your Supabase SQL Editor

-- Foods table
CREATE TABLE IF NOT EXISTS foods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    brand TEXT,
    carbs DECIMAL DEFAULT 0,
    fat DECIMAL DEFAULT 0,
    protein DECIMAL DEFAULT 0,
    category TEXT DEFAULT 'General',
    created_by TEXT DEFAULT 'Unknown User',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meals table - Updated for carfabio meal structure
CREATE TABLE IF NOT EXISTS meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    name TEXT NOT NULL,
    meal_type TEXT DEFAULT 'OTHER',
    ingredients JSONB,
    total_carbs DECIMAL DEFAULT 0,
    total_fat DECIMAL DEFAULT 0,
    total_protein DECIMAL DEFAULT 0,
    picture TEXT,
    start_row INTEGER,
    end_row INTEGER,
    cooking_instructions TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping List table
CREATE TABLE IF NOT EXISTS shopping_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id UUID REFERENCES foods(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT,
    carbs DECIMAL DEFAULT 0,
    fat DECIMAL DEFAULT 0,
    protein DECIMAL DEFAULT 0,
    category TEXT,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

-- Create policies for foods table
CREATE POLICY "Users can view all foods" ON foods 
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own foods" ON foods 
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own foods" ON foods 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own foods" ON foods 
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Create policies for meals table
CREATE POLICY "Users can view own meals" ON meals 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meals" ON meals 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meals" ON meals 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meals" ON meals 
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for shopping_list table
CREATE POLICY "Users can view own shopping_list" ON shopping_list 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping_list" ON shopping_list 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping_list" ON shopping_list 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping_list" ON shopping_list 
    FOR DELETE USING (auth.uid() = user_id);

-- User Profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    name TEXT,
    date_of_birth DATE,
    age INTEGER,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    height DECIMAL,
    height_unit TEXT DEFAULT 'cm' CHECK (height_unit IN ('cm', 'ft')),
    ideal_weight DECIMAL,
    weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
    country TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weight Tracker table
CREATE TABLE IF NOT EXISTS weight_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    weight DECIMAL NOT NULL,
    entry_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal Planning table
CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
    planned_date DATE NOT NULL,
    meal_time TEXT NOT NULL CHECK (meal_time IN ('breakfast', 'lunch', 'dinner', 'snack')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles table
CREATE POLICY "Users can view own profile" ON user_profiles 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON user_profiles 
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for weight_entries table
CREATE POLICY "Users can view own weight entries" ON weight_entries 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight entries" ON weight_entries 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight entries" ON weight_entries 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight entries" ON weight_entries 
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for meal_plans table
CREATE POLICY "Users can view own meal plans" ON meal_plans 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal plans" ON meal_plans 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans" ON meal_plans 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal plans" ON meal_plans 
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS foods_user_id_idx ON foods(user_id);
CREATE INDEX IF NOT EXISTS foods_category_idx ON foods(category);
CREATE INDEX IF NOT EXISTS meals_user_id_idx ON meals(user_id);
CREATE INDEX IF NOT EXISTS meals_meal_type_idx ON meals(meal_type);
CREATE INDEX IF NOT EXISTS shopping_list_user_id_idx ON shopping_list(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS weight_entries_user_id_idx ON weight_entries(user_id);
CREATE INDEX IF NOT EXISTS weight_entries_date_idx ON weight_entries(entry_date);
CREATE INDEX IF NOT EXISTS meal_plans_user_id_idx ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS meal_plans_date_idx ON meal_plans(planned_date);

-- Add weight_unit column to existing user_profiles table (for existing installations)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'weight_unit'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs'));
    END IF;
END $$; 

-- =====================================================
-- ADMIN SYSTEM TABLES
-- =====================================================

-- User Roles table for admin system
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Management view for admin panel (combines auth.users with additional info)
CREATE OR REPLACE VIEW user_management AS
SELECT 
    u.id,
    u.email,
    u.created_at as user_created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    COALESCE(ur.role, 'user') as role,
    ur.granted_at as role_granted_at,
    ur.granted_by as role_granted_by
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;

-- Enable Row Level Security for user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Simple policies for user_roles table (no recursion)
-- Allow all authenticated users to read all roles (admin checks will be done in app)
CREATE POLICY "Authenticated users can view user roles" ON user_roles 
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow all authenticated users to insert/update roles (admin checks will be done in app)
CREATE POLICY "Authenticated users can insert user roles" ON user_roles 
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update user roles" ON user_roles 
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create index for user_roles
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role);

-- Insert super admin role for lou@schillaci.me
-- This will only run if the user exists and doesn't already have a role
INSERT INTO user_roles (user_id, role, granted_by)
SELECT 
    u.id, 
    'super_admin', 
    u.id
FROM auth.users u
WHERE u.email = 'lou@schillaci.me'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING; 

-- Add missing columns to meals table if they don't exist
DO $$ 
BEGIN 
    -- Add cooking_instructions column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meals' AND column_name = 'cooking_instructions'
    ) THEN
        ALTER TABLE meals ADD COLUMN cooking_instructions TEXT;
        COMMENT ON COLUMN meals.cooking_instructions IS 'Rich text cooking instructions with HTML formatting';
    END IF;
    
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meals' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE meals ADD COLUMN created_by TEXT;
        COMMENT ON COLUMN meals.created_by IS 'Email or name of the user who created this meal';
    END IF;
END $$; 

-- Add instructions column to foods table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'foods' AND column_name = 'instructions'
    ) THEN
        ALTER TABLE foods ADD COLUMN instructions TEXT;
    END IF;
END $$; 