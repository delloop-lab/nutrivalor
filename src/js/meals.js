// Meals Module for Nutrime
let mealData = [];
let mealPlan = {};

// Load meals from database
async function loadMealsFromDatabase() {
    try {
        if (!currentUser) return;
        
        // For localStorage fallback
        const storedMeals = localStorage.getItem('nutrime_meals');
        if (storedMeals) {
            mealData = JSON.parse(storedMeals);
            displayMeals();
            return;
        }
        
        // For Supabase (when configured)
        if (supabase && supabase.from) {
            const { data, error } = await supabase
                .from('meals')
                .select('*')
                .eq('user_id', currentUser.id);
            
            if (error) {
                console.error('Error loading meals:', error);
                return;
            }
            
            mealData = data || [];
            displayMeals();
        }
        
    } catch (error) {
        console.error('Error loading meals from database:', error);
    }
}

// Save meals to database
async function saveMealsToDatabase(meals) {
    try {
        if (!currentUser) return;
        
        // Add user ID to each meal item
        const mealsWithUserId = meals.map(meal => ({
            ...meal,
            user_id: currentUser.id,
            id: generateId()
        }));
        
        // For localStorage fallback
        const existingMeals = JSON.parse(localStorage.getItem('nutrime_meals') || '[]');
        const updatedMeals = [...existingMeals, ...mealsWithUserId];
        localStorage.setItem('nutrime_meals', JSON.stringify(updatedMeals));
        mealData = updatedMeals;
        
        // For Supabase (when configured)
        if (supabase && supabase.from) {
            const { data, error } = await supabase
                .from('meals')
                .insert(mealsWithUserId)
                .select();
            
            if (error) {
                console.error('Error saving meals:', error);
                throw error;
            }
            
            mealData = [...mealData, ...(data || [])];
        }
        
        displayMeals();
        
    } catch (error) {
        console.error('Error saving meals to database:', error);
        throw error;
    }
}

// Display meals in the grid
function displayMeals() {
    const mealGrid = document.getElementById('mealGrid');
    if (!mealGrid) return;
    
    if (mealData.length === 0) {
        mealGrid.innerHTML = '<p class="empty-state">No meals found. Upload your meal data to get started!</p>';
        return;
    }
    
    // Sort meals alphabetically
    mealData.sort((a, b) => a.name.localeCompare(b.name));
    
    // Generate HTML for meal cards
    mealGrid.innerHTML = mealData.map(meal => {
        return `
            <div class="meal-card">
                ${meal.image_url ? `<img src="${meal.image_url}" alt="${meal.name}" class="meal-image">` : ''}
                <h4>${meal.name}</h4>
                <div class="nutrition-info">
                    <span>Carbs: ${formatNutrition(meal.carbs)}g</span>
                    <span>Fat: ${formatNutrition(meal.fat)}g</span>
                    <span>Protein: ${formatNutrition(meal.protein)}g</span>
                </div>
                <div class="meal-actions">
                    <button class="add-btn" onclick="addToMealPlan('${meal.id}')">
                        Add to Plan
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter meals by category
function filterMealsByCategory(category) {
    // Implementation for filtering meals
    console.log('Filtering meals by category:', category);
}

// Add meal to meal plan
function addToMealPlan(mealId) {
    const meal = mealData.find(m => m.id === mealId);
    
    if (!meal) {
        showMessage('Meal not found', 'error');
        return;
    }
    
    // For now, add to today's breakfast
    const today = new Date().toISOString().split('T')[0];
    
    if (!mealPlan[today]) {
        mealPlan[today] = {
            breakfast: [],
            lunch: [],
            dinner: [],
            snacks: []
        };
    }
    
    mealPlan[today].breakfast.push(meal);
    
    // Save to localStorage
    localStorage.setItem('nutrime_meal_plan', JSON.stringify(mealPlan));
    
    showMessage(`Added ${meal.name} to today's breakfast`, 'success');
    
    // Update meal plan display if we're on that section
    if (currentSection === 'meal-plan') {
        displayMealPlan();
    }
}

// Display meal plan
function displayMealPlan() {
    const mealPlanGrid = document.getElementById('mealPlanGrid');
    if (!mealPlanGrid) return;
    
    const today = new Date().toISOString().split('T')[0];
    const todaysPlan = mealPlan[today];
    
    if (!todaysPlan) {
        mealPlanGrid.innerHTML = '<p class="empty-state">No meal plan for today. Add meals from the Meals section!</p>';
        return;
    }
    
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    
    mealPlanGrid.innerHTML = `
        <div class="meal-plan-day">
            <h3>Today's Meal Plan - ${new Date().toLocaleDateString()}</h3>
            ${mealTypes.map(mealType => {
                const meals = todaysPlan[mealType] || [];
                const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
                const totalFat = meals.reduce((sum, meal) => sum + (meal.fat || 0), 0);
                const totalProtein = meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
                
                return `
                    <div class="meal-type-section">
                        <h4>${mealType.charAt(0).toUpperCase() + mealType.slice(1)}</h4>
                        <div class="meal-type-totals">
                            <span>Carbs: ${formatNutrition(totalCarbs)}g</span>
                            <span>Fat: ${formatNutrition(totalFat)}g</span>
                            <span>Protein: ${formatNutrition(totalProtein)}g</span>
                        </div>
                        <div class="planned-meals">
                            ${meals.length === 0 ? '<p class="empty-meal-type">No meals planned</p>' : ''}
                            ${meals.map(meal => `
                                <div class="planned-meal-item">
                                    <span class="meal-name">${meal.name}</span>
                                    <button onclick="removePlannedMeal('${today}', '${mealType}', '${meal.id}')" class="remove-btn-small">×</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Remove planned meal
function removePlannedMeal(date, mealType, mealId) {
    if (mealPlan[date] && mealPlan[date][mealType]) {
        mealPlan[date][mealType] = mealPlan[date][mealType].filter(meal => meal.id !== mealId);
        localStorage.setItem('nutrime_meal_plan', JSON.stringify(mealPlan));
        displayMealPlan();
        showMessage('Meal removed from plan', 'success');
    }
}

// Generate meal plan
function generateMealPlan() {
    if (mealData.length === 0) {
        showMessage('No meals available. Please upload meal data first.', 'error');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Simple meal plan generation - randomly select meals
    const breakfast = mealData[Math.floor(Math.random() * mealData.length)];
    const lunch = mealData[Math.floor(Math.random() * mealData.length)];
    const dinner = mealData[Math.floor(Math.random() * mealData.length)];
    
    mealPlan[today] = {
        breakfast: [breakfast],
        lunch: [lunch],
        dinner: [dinner],
        snacks: []
    };
    
    localStorage.setItem('nutrime_meal_plan', JSON.stringify(mealPlan));
    displayMealPlan();
    showMessage('Meal plan generated for today!', 'success');
}

// Load meal plan from storage
function loadMealPlan() {
    try {
        const storedPlan = localStorage.getItem('nutrime_meal_plan');
        if (storedPlan) {
            mealPlan = JSON.parse(storedPlan);
        }
    } catch (error) {
        console.error('Error loading meal plan:', error);
    }
}
