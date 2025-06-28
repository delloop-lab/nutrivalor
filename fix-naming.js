// Fix all localStorage keys from nutrime to nutrivalor
// This is a helper script to identify what needs to be changed

const fs = require('fs');
const path = require('path');

const files = [
    'src/js/supabase-client.js',
    'src/js/auth.js', 
    'src/js/database.js',
    'src/js/food-tracker.js',
    'src/js/meals.js',
    'src/js/main.js',
    'src/js/analytics.js'
];

// Manual fix list for localStorage keys:
// nutrime_users -> nutrivalor_users
// nutrime_current_user -> nutrivalor_current_user  
// nutrime_foods -> nutrivalor_foods
// nutrime_meals -> nutrivalor_meals
// nutrime_shopping_list -> nutrivalor_shopping_list
// nutrime_meal_plan -> nutrivalor_meal_plan
// nutrime_images -> nutrivalor_images
// nutrime_ -> nutrivalor_

console.log('Files that need localStorage key updates:');
files.forEach(file => {
    console.log(`- ${file}`);
});

console.log('\nKey changes needed:');
console.log('nutrime_users -> nutrivalor_users');
console.log('nutrime_current_user -> nutrivalor_current_user');
console.log('nutrime_foods -> nutrivalor_foods');
console.log('nutrime_meals -> nutrivalor_meals');
console.log('nutrime_shopping_list -> nutrivalor_shopping_list');
console.log('nutrime_meal_plan -> nutrivalor_meal_plan');
console.log('nutrime_images -> nutrivalor_images');
console.log('nutrime_ -> nutrivalor_'); 