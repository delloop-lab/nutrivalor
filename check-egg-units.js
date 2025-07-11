const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration from supabase-client.ts
const SUPABASE_URL = 'https://ehutpsrutyiorhqrwstz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVodXRwc3J1dHlpb3JocXJ3c3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTMyNzQsImV4cCI6MjA2NjY4OTI3NH0.lcfz59Uc2S6q9Mn2lj2OC_WAMG5CncrNbEnHX7MFTeI';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkEggUnits() {
    try {
        // First get the egg food item
        const { data: foods, error: foodError } = await supabase
            .from('foods')
            .select('*')
            .ilike('name', '%egg%')
            .not('name', 'ilike', '%eggplant%');
            
        if (foodError) throw foodError;
        
        console.log('\nFound foods:', foods.map(f => f.name));
        
        // For each egg food item, get its serving units
        for (const food of foods) {
            const { data: units, error: unitsError } = await supabase
                .from('serving_units')
                .select('*')
                .eq('food_id', food.id)
                .order('is_default', { ascending: false });
                
            if (unitsError) throw unitsError;
            
            console.log(`\nServing units for ${food.name}:`);
            if (units && units.length > 0) {
                units.forEach(unit => {
                    console.log(`- ${unit.unit_name}: ${unit.grams_per_unit}g${unit.is_default ? ' (default)' : ''}`);
                });
            } else {
                console.log('No serving units found');
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkEggUnits(); 