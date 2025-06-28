// Database Module for Nutrivalor
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

export async function loadFoodsFromDatabase(): Promise<any[]> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('foods')
        .select('*')
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
    
    const { data, error } = await supabase
        .from('shopping_list')
        .insert([{ food_id: foodId, quantity }])
        .select();
        
    if (error) throw error;
    return data[0];
}

export async function loadShoppingListFromDatabase(): Promise<any[]> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('shopping_list')
        .select(`
            *,
            foods (
                id,
                name,
                brand,
                category
            )
        `)
        .order('created_at');
        
    if (error) throw error;
    return data || [];
}

export async function removeFromShoppingList(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('id', id);
        
    if (error) throw error;
}

export async function updateShoppingListQuantity(id: string, quantity: number): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('shopping_list')
        .update({ quantity })
        .eq('id', id)
        .select();
        
    if (error) throw error;
    return data[0];
}
