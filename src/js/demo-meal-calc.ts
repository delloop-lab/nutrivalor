import { supabase, initializeSupabase } from './supabase-client';
import { calculateMealTotals, initializeDatabase } from './database';

export async function demoBaconAndEggs() {
    // Initialize Supabase
    initializeSupabase();
    
    console.log('🍳 Demo: Calculating nutrients for Bacon and Eggs');
    
    // Get bacon and eggs from database
    const { data: foods, error } = await supabase
        .from('foods')
        .select('*')
        .or('id.eq.2296f10c-ee43-4188-9a04-36d465f4e3b8,id.eq.baa0d3ac-5b34-4f0b-8c03-6582c0e684cc')
        .order('name');
        
    if (error || !foods || foods.length < 2) {
        console.error('Error fetching foods:', error?.message || 'Foods not found');
        return;
    }

    const bacon = foods.find(f => f.name === 'Bacon');
    const egg = foods.find(f => f.name === 'Egg');

    if (!bacon || !egg) {
        console.error('Could not find bacon or egg');
        return;
    }

    // Get serving units
    const { data: servingUnits } = await supabase
        .from('serving_units')
        .select('*')
        .in('food_id', [bacon.id, egg.id]);

    if (!servingUnits) {
        console.error('Could not find serving units');
        return;
    }

    const baconSlice = servingUnits.find(u => u.food_id === bacon.id && u.unit_name.toLowerCase() === 'slice');
    const eggEach = servingUnits.find(u => u.food_id === egg.id && u.unit_name.toUpperCase() === 'EACH');

    if (!baconSlice || !eggEach) {
        console.error('Could not find proper serving units');
        return;
    }

    // Calculate nutrients for 2 slices of bacon (17g per slice)
    const baconGrams = 2 * baconSlice.grams_per_unit;
    const baconMultiplier = baconGrams / 100; // Convert from per 100g to actual grams

    const baconNutrients = {
        protein: bacon.protein * baconMultiplier,
        fat: bacon.fat * baconMultiplier,
        carbs: bacon.carbs * baconMultiplier,
        grams: baconGrams
    };

    // Calculate nutrients for 2 eggs (using direct values since EACH unit)
    const eggNutrients = {
        protein: egg.protein * 2, // Multiply by number of eggs
        fat: egg.fat * 2,
        carbs: egg.carbs * 2
    };

    // Calculate totals
    const mealTotals = {
        totalProtein: baconNutrients.protein + eggNutrients.protein,
        totalFat: baconNutrients.fat + eggNutrients.fat,
        totalCarbs: baconNutrients.carbs + eggNutrients.carbs,
        totalGrams: baconNutrients.grams, // Only track grams for weight-based units
        perFoodBreakdown: [
            {
                name: 'Bacon',
                ...baconNutrients
            },
            {
                name: 'Egg',
                ...eggNutrients,
                grams: null // EACH units don't use grams
            }
        ]
    };

    // Log results
    console.log('\n📊 Meal Totals:');
    console.log(`Total Protein: ${mealTotals.totalProtein.toFixed(1)}g`);
    console.log(`Total Fat: ${mealTotals.totalFat.toFixed(1)}g`);
    console.log(`Total Carbs: ${mealTotals.totalCarbs.toFixed(1)}g`);
    console.log(`Total Weight: ${mealTotals.totalGrams.toFixed(1)}g`);
    
    console.log('\n🔍 Per Food Breakdown:');
    mealTotals.perFoodBreakdown.forEach(food => {
        console.log(`\n${food.name}:`);
        console.log(`  Protein: ${food.protein.toFixed(1)}g`);
        console.log(`  Fat: ${food.fat.toFixed(1)}g`);
        console.log(`  Carbs: ${food.carbs.toFixed(1)}g`);
        console.log(`  Weight: ${food.grams?.toFixed(1) || 'N/A'}g`);
    });
    
    return mealTotals;
}

// Run the demo when this module loads
demoBaconAndEggs().catch(console.error); 