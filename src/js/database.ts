// Database Module for NutriValor
// This module handles database operations and provides a unified interface

import { supabase } from './supabase-client';

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
    // Removed excessive logging for performance
    
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
            // Removed excessive logging for performance
        }
    } catch (error) {
        console.warn('Database verification failed:', error);
    }
}

// Food operations
export async function saveFoodToDatabase(food: any): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user to add attribution
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    let createdBy = 'Unknown User';
    
    if (!userError && user) {
        // Try to get user's display name from profile
        try {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('name')
                .eq('user_id', user.id)
                .single();
            
            createdBy = profile?.name || user.email || 'Unknown User';
        } catch (error) {
            // Fallback to email if profile doesn't exist
            createdBy = user.email || 'Unknown User';
        }
    }
    
    // Add creator attribution to food data
    const foodWithAttribution = {
        ...food,
        created_by: createdBy
    };
    
    const { data, error } = await supabase
        .from('foods')
        .insert([foodWithAttribution])
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
    
    // Get foods for current user and global foods (no user_id restriction for admin-added foods)
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
    console.log(`🗄️ DATABASE: addToShoppingList called with foodId="${foodId}", quantity=${quantity}`);
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to add to shopping list');
    }
    
    // First, get the food details to populate the shopping list entry
    // Note: Don't filter by user_id since foods can be global (user_id=null) or from other users
    const { data: food, error: foodError } = await supabase
        .from('foods')
        .select('*')
        .eq('id', foodId)
        .single();
    
    if (foodError || !food) {
        console.error('🗄️ DATABASE: Food lookup failed:', foodError);
        throw new Error(`Food not found with ID: ${foodId}`);
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
        console.log(`✅ DATABASE: Updated "${food.name}" quantity to ${existingItem.quantity + quantity}`);
        console.log(`🗄️ DATABASE: Update response:`, data[0]);
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
        console.log(`✅ DATABASE: Added new item "${food.name}" to shopping list`);
        console.log(`🗄️ DATABASE: Insert response:`, data[0]);
        return data[0];
    }
}

export async function loadShoppingListFromDatabase(): Promise<any[]> {
    // Removed excessive logging for performance
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to view shopping list');
    }
    
    // Removed excessive logging for performance
    const { data, error } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');
        
    if (error) {
        console.error('🗄️ DATABASE: Error querying shopping list:', error);
        throw error;
    }
    
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

// Profile operations
export async function saveProfileToDatabase(profileData: any): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to save profile');
    }
    
    const profileRecord = {
        user_id: user.id,
        name: profileData.name,
        date_of_birth: profileData.dateOfBirth,
        age: profileData.age ? parseInt(profileData.age) : null,
        gender: profileData.gender,
        height: profileData.height ? parseFloat(profileData.height) : null,
        height_unit: profileData.heightUnit || 'cm',
        ideal_weight: profileData.idealWeight ? parseFloat(profileData.idealWeight) : null,
        weight_unit: profileData.weightUnit || 'kg',
        country: profileData.country,
        avatar_url: profileData.avatar,
        updated_at: new Date().toISOString()
    };
    
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
    }
    
    if (existingProfile) {
        // Update existing profile
        const { data, error } = await supabase
            .from('user_profiles')
            .update(profileRecord)
            .eq('user_id', user.id)
            .select();
        
        if (error) throw error;
        return data[0];
    } else {
        // Insert new profile
        const { data, error } = await supabase
            .from('user_profiles')
            .insert([profileRecord])
            .select();
        
        if (error) throw error;
        return data[0];
    }
}

export async function loadProfileFromDatabase(): Promise<any | null> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.log('No authenticated user, returning null profile');
        return null;
    }
    
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') {
            // No profile found - this is normal for new users
            return null;
        }
        throw error;
    }
    
    return data;
}

export async function deleteProfileFromDatabase(): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to delete profile');
    }
    
    const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', user.id);
    
    if (error) throw error;
    console.log('✅ Deleted profile for user:', user.id);
}

// Weight tracking operations
export async function saveWeightEntryToDatabase(weight: number, entryDate: string, notes?: string): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to save weight entry');
    }
    
    const weightEntry = {
        user_id: user.id,
        weight: weight,
        entry_date: entryDate,
        notes: notes || null
    };
    
    const { data, error } = await supabase
        .from('weight_entries')
        .insert([weightEntry])
        .select();
    
    if (error) throw error;
    return data[0];
}

export async function loadWeightEntriesFromDatabase(): Promise<any[]> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.log('No authenticated user, returning empty weight entries');
        return [];
    }
    
    const { data, error } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: true });
    
    if (error) throw error;
    return data || [];
}

export async function deleteWeightEntryFromDatabase(entryId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { error } = await supabase
        .from('weight_entries')
        .delete()
        .eq('id', entryId);
    
    if (error) throw error;
}

export async function clearAllWeightEntriesFromDatabase(): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('User must be authenticated to clear weight entries');
    }
    
    const { error } = await supabase
        .from('weight_entries')
        .delete()
        .eq('user_id', user.id);
    
    if (error) throw error;
    console.log('✅ Cleared all weight entries for user:', user.id);
}
