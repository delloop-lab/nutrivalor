// Database Module for NutriValor
// This module handles database operations and provides a unified interface

import { supabase } from './supabase-client';
import { getCurrentAuthUser } from './auth';

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

// Serving Units operations
export async function loadServingUnitsForFood(foodId: string): Promise<any[]> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('serving_units')
        .select('*')
        .eq('food_id', foodId)
        .order('is_default', { ascending: false })
        .order('unit_name');
        
    if (error) throw error;
    return data || [];
}

export async function saveServingUnitToDatabase(servingUnit: any): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('serving_units')
        .insert([servingUnit])
        .select();
        
    if (error) throw error;
    return data[0];
}

export async function updateServingUnitInDatabase(id: string, updates: any): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('serving_units')
        .update(updates)
        .eq('id', id)
        .select();
        
    if (error) throw error;
    return data[0];
}

export async function deleteServingUnitFromDatabase(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { error } = await supabase
        .from('serving_units')
        .delete()
        .eq('id', id);
        
    if (error) throw error;
}

// Get default serving unit for a food
export async function getDefaultServingUnit(foodId: string): Promise<any | null> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase
        .from('serving_units')
        .select('*')
        .eq('food_id', foodId)
        .eq('is_default', true)
        .single();
        
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

// Calculate macros for a serving of food
export function calculateMacrosForServing(food: any, servingUnit: any, quantity: number) {
    // For EACH units, use direct multiplication (no grams calculation needed)
    if (servingUnit.unit_name.toUpperCase() === 'EACH') {
        return {
            calories: Math.round((food.calories || 0) * quantity * 10) / 10,
            protein: Math.round(food.protein * quantity * 10) / 10,
            fat: Math.round(food.fat * quantity * 10) / 10,
            carbs: Math.round(food.carbs * quantity * 10) / 10,
            totalGrams: null // Don't track grams for EACH units
        };
    }

    // For all other units, calculate based on grams
    const totalGrams = servingUnit.grams_per_unit * quantity;
    const factor = totalGrams / 100;

    return {
        calories: Math.round((food.calories || 0) * factor * 10) / 10,
        protein: Math.round(food.protein * factor * 10) / 10,
        fat: Math.round(food.fat * factor * 10) / 10,
        carbs: Math.round(food.carbs * factor * 10) / 10,
        totalGrams: Math.round(totalGrams * 10) / 10
    };
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
export async function addToShoppingList(foodId: string, quantity: number = 1, unit: string = 'EACH'): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('No authenticated user');
    
    // Add to shopping list with minimal fields first
    const shoppingItem = {
        food_id: foodId,
        user_id: user.id,
        quantity: quantity,
        unit: unit
    };
    
    const { data, error } = await supabase
        .from('shopping_list')
        .insert([shoppingItem])
        .select();
        
    if (error) throw error;
    return data[0];
}

export async function loadShoppingListFromDatabase(): Promise<any[]> {
    const user = await getCurrentAuthUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('shopping_list')
        .select(`
            *,
            food:food_id (
                name,
                brand,
                category,
                carbs,
                fat,
                protein
            )
        `)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error loading shopping list:', error.message);
        return null;
    }

    const transformedData = data.map(item => ({
        ...item,
        checked: item.checked || false
    }));

    return transformedData;
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

// Calculate total macros for a meal based on its ingredients
export async function calculateMealTotals(
    ingredients: Array<{
        food_id: string;
        quantity: number;
        serving_unit_id?: string;
    }>
): Promise<{
    totalCalories: number;
    totalProtein: number;
    totalFat: number;
    totalCarbs: number;
    totalGrams: number;
    perFoodBreakdown: Array<{
        food_id: string;
        name: string;
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
        grams: number;
    }>;
}> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const totals = {
        totalCalories: 0,
        totalProtein: 0,
        totalFat: 0,
        totalCarbs: 0,
        totalGrams: 0,
        perFoodBreakdown: [] as any[]
    };
    
    // Process each ingredient
    for (const ingredient of ingredients) {
        // Get food data
        const { data: food } = await supabase
            .from('foods')
            .select('*')
            .eq('id', ingredient.food_id)
            .single();
            
        if (!food) continue;
        
        // Get serving unit (default or specified)
        let servingUnit;
        if (ingredient.serving_unit_id) {
            const { data } = await supabase
                .from('serving_units')
                .select('*')
                .eq('id', ingredient.serving_unit_id)
                .single();
            servingUnit = data;
        } else {
            servingUnit = await getDefaultServingUnit(ingredient.food_id);
        }
        
        // If no serving unit found, assume grams (1g per unit)
        if (!servingUnit) {
            servingUnit = { unit_name: 'g', grams_per_unit: 1 };
        }
        
        // Calculate macros for this ingredient
        const macros = calculateMacrosForServing(food, servingUnit, ingredient.quantity);
        
        // Add to totals
        totals.totalCalories += macros.calories;
        totals.totalProtein += macros.protein;
        totals.totalFat += macros.fat;
        totals.totalCarbs += macros.carbs;
        totals.totalGrams += macros.totalGrams;
        
        // Add to per-food breakdown
        totals.perFoodBreakdown.push({
            food_id: ingredient.food_id,
            name: food.name,
            calories: macros.calories,
            protein: macros.protein,
            fat: macros.fat,
            carbs: macros.carbs,
            grams: macros.totalGrams
        });
    }
    
    // Round all numbers to 2 decimal places
    totals.totalCalories = Math.round(totals.totalCalories * 100) / 100;
    totals.totalProtein = Math.round(totals.totalProtein * 100) / 100;
    totals.totalFat = Math.round(totals.totalFat * 100) / 100;
    totals.totalCarbs = Math.round(totals.totalCarbs * 100) / 100;
    totals.totalGrams = Math.round(totals.totalGrams * 100) / 100;
    
    return totals;
}

// Add non-food item to SUNDRIES section of shopping list
export async function addToSundries(ingredient: any, quantity: number = 1): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('No authenticated user');
    
    // Add to shopping list with SUNDRIES category
    const shoppingItem = {
        name: ingredient.name,
        user_id: user.id,
        quantity: quantity,
        unit: 'EACH',
        category: 'SUNDRIES'
    };
    
    const { data, error } = await supabase
        .from('shopping_list')
        .insert([shoppingItem])
        .select();
        
    if (error) throw error;
    return data[0];
}
