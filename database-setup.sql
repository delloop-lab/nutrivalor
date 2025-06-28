-- Nutrime Database Setup Script
-- Run this in your Supabase SQL Editor

-- Foods table
CREATE TABLE IF NOT EXISTS foods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT,
    carbs DECIMAL DEFAULT 0,
    fat DECIMAL DEFAULT 0,
    protein DECIMAL DEFAULT 0,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meals table
CREATE TABLE IF NOT EXISTS meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    carbs DECIMAL DEFAULT 0,
    fat DECIMAL DEFAULT 0,
    protein DECIMAL DEFAULT 0,
    image_url TEXT,
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
CREATE POLICY "Users can view own foods" ON foods 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own foods" ON foods 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own foods" ON foods 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own foods" ON foods 
    FOR DELETE USING (auth.uid() = user_id);

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS foods_user_id_idx ON foods(user_id);
CREATE INDEX IF NOT EXISTS foods_category_idx ON foods(category);
CREATE INDEX IF NOT EXISTS meals_user_id_idx ON meals(user_id);
CREATE INDEX IF NOT EXISTS shopping_list_user_id_idx ON shopping_list(user_id); 