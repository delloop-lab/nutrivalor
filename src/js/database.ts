// Database Module for NutriValor
// This module handles database operations and provides a unified interface

import { supabase } from './supabase-client';

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
    console.log('🗄️ Initializing database...');
    
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }
    
    // Verify connection by checking if we can access the database
    try {
        const { data, error } = await supabase.from('foods').select('count').limit(1);
        if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is expected
            console.warn('Database tables may not be created yet:', error.message);
            console.log('Please run the SQL script from database-setup.sql in your Supabase dashboard');
        } else {
            console.log('✅ Database connection verified');
        }
    } catch (error) {
        console.warn('Database verification failed:', error);
    }
}

// Food operations
export async function saveFoodToDatabase(food: any): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('foods')
        .insert([food])
        .select();
        
    if (error) throw error;
    return data[0];
}

// Bulk save multiple foods to database (much faster than individual saves)
export async function saveAllFoodsToDatabase(foods: any[]): Promise<any[]> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Supabase can handle bulk inserts efficiently
    const { data, error } = await supabase
        .from('foods')
        .insert(foods)
        .select();
        
    if (error) throw error;
    return data || [];
}

export async function loadFoodsFromDatabase(): Promise<any[]> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.log('No authenticated user, returning empty food list');
        return [];
    }
    
    const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
        
    if (error) throw error;
    return data || [];
}

export async function updateFoodInDatabase(id: string, updates: any): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('foods')
        .update(updates)
        .eq('id', id)
        .select();
        
    if (error) throw error;
    return data[0];
}

export async function deleteFoodFromDatabase(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', id);
        
    if (error) throw error;
}

// Clear all foods for the current user
export async function clearAllFoodsForUser(): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to clear foods');
    }
    
    // Delete all foods for this specific user
    const { error } = await supabase
        .from('foods')
        .delete()
        .eq('user_id', user.id);
        
    if (error) throw error;
    console.log('✅ Cleared all existing foods for user:', user.id);
}

// Meal operations
export async function saveMealToDatabase(meal: any): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('meals')
        .insert([meal])
        .select();
        
    if (error) throw error;
    return data[0];
}

export async function loadMealsFromDatabase(): Promise<any[]> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('name');
        
    if (error) throw error;
    return data || [];
}

export async function updateMealInDatabase(id: string, updates: any): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', id)
        .select();
        
    if (error) throw error;
    return data[0];
}

export async function deleteMealFromDatabase(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id);
        
    if (error) throw error;
}

// Shopping list operations
export async function addToShoppingList(foodId: string, quantity: number = 1): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to add to shopping list');
    }
    
    // First, get the food details to populate the shopping list entry
    const { data: food, error: foodError } = await supabase
        .from('foods')
        .select('*')
        .eq('id', foodId)
        .eq('user_id', user.id)
        .single();
    
    if (foodError || !food) {
        throw new Error('Food not found or access denied');
    }
    
    // Check if this food item already exists in the shopping list
    const { data: existingItem, error: existingError } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('food_id', foodId)
        .eq('user_id', user.id)
        .single();
    
    if (existingError && existingError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" - which is fine, means no existing item
        throw existingError;
    }
    
    if (existingItem) {
        // Item already exists, update the quantity
        console.log(`📦 Found existing item "${food.name}" with quantity ${existingItem.quantity}, adding ${quantity}`);
        const { data, error } = await supabase
            .from('shopping_list')
            .update({ 
                quantity: existingItem.quantity + quantity
            })
            .eq('id', existingItem.id)
            .eq('user_id', user.id)
            .select();
            
        if (error) throw error;
        console.log(`✅ Updated "${food.name}" quantity to ${existingItem.quantity + quantity}`);
        return data[0];
    } else {
        // Item doesn't exist, create new entry
        console.log(`📦 Adding new item "${food.name}" with quantity ${quantity}`);
        const { data, error } = await supabase
            .from('shopping_list')
            .insert([{ 
                food_id: foodId, 
                quantity, 
                user_id: user.id,
                name: food.name,
                brand: food.brand || '',
                carbs: food.carbs || 0,
                fat: food.fat || 0,
                protein: food.protein || 0,
                category: food.category || 'General'
            }])
            .select();
            
        if (error) throw error;
        console.log(`✅ Added new item "${food.name}" to shopping list`);
        return data[0];
    }
}

export async function loadShoppingListFromDatabase(): Promise<any[]> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to view shopping list');
    }
    
    const { data, error } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');
        
    if (error) throw error;
    return data || [];
}

export async function removeFromShoppingList(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to remove from shopping list');
    }
    
    const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
        
    if (error) throw error;
}

export async function updateShoppingListQuantity(id: string, quantity: number): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to update shopping list');
    }
    
    const { data, error } = await supabase
        .from('shopping_list')
        .update({ quantity })
        .eq('id', id)
        .eq('user_id', user.id)
        .select();
        
    if (error) throw error;
    return data[0];
}

export async function clearShoppingListFromDatabase(): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to clear shopping list');
    }
    
    const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('user_id', user.id);
        
    if (error) throw error;
    console.log('✅ Cleared shopping list for user:', user.id);
}
