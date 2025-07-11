-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    date_of_birth DATE,
    age INTEGER,
    gender TEXT,
    height DECIMAL,
    height_unit TEXT DEFAULT 'cm',
    weight DECIMAL,
    ideal_weight DECIMAL,
    weight_unit TEXT DEFAULT 'kg',
    country TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id)
);

-- Create foods table if it doesn't exist
CREATE TABLE IF NOT EXISTS foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    calories DECIMAL,
    protein DECIMAL,
    carbs DECIMAL,
    fat DECIMAL,
    serving_size DECIMAL,
    serving_unit TEXT DEFAULT 'g',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meals table if it doesn't exist
CREATE TABLE IF NOT EXISTS meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    ingredients JSONB NOT NULL DEFAULT '[]',
    total_calories DECIMAL,
    total_protein DECIMAL,
    total_carbs DECIMAL,
    total_fat DECIMAL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meal_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopping_list table if it doesn't exist
CREATE TABLE IF NOT EXISTS shopping_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id UUID REFERENCES foods(id) ON DELETE CASCADE,
    quantity DECIMAL NOT NULL,
    unit TEXT NOT NULL,
    checked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create serving_units table if it doesn't exist
CREATE TABLE IF NOT EXISTS serving_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_id UUID REFERENCES foods(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grams_per_unit DECIMAL NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create weight_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS weight_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    weight DECIMAL NOT NULL,
    entry_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE serving_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for foods
CREATE POLICY "Users can view own foods" ON foods
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own foods" ON foods
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own foods" ON foods
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own foods" ON foods
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for meals
CREATE POLICY "Users can view own meals" ON meals
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own meals" ON meals
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meals" ON meals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own meals" ON meals
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for meal_plans
CREATE POLICY "Users can view own meal plans" ON meal_plans
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own meal plans" ON meal_plans
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal plans" ON meal_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal plans" ON meal_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for shopping_list
CREATE POLICY "Users can view own shopping list" ON shopping_list
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own shopping list" ON shopping_list
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shopping list" ON shopping_list
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own shopping list" ON shopping_list
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for serving_units
CREATE POLICY "Users can view serving units" ON serving_units
    FOR SELECT USING (true);
CREATE POLICY "Users can update own serving units" ON serving_units
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM foods WHERE foods.id = serving_units.food_id AND foods.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert serving units" ON serving_units
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM foods WHERE foods.id = serving_units.food_id AND foods.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete own serving units" ON serving_units
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM foods WHERE foods.id = serving_units.food_id AND foods.user_id = auth.uid()
    ));

-- Create policies for weight_entries
CREATE POLICY "Users can view own weight entries" ON weight_entries
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own weight entries" ON weight_entries
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weight entries" ON weight_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own weight entries" ON weight_entries
    FOR DELETE USING (auth.uid() = user_id); 