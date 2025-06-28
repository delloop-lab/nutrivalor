import { supabase } from './supabase-client';
import { 
  saveMealToDatabase, 
  loadMealsFromDatabase, 
  updateMealInDatabase, 
  deleteMealFromDatabase 
} from './database';

// Meals Module for Nutrivalor
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
export function filterMealsByCategory(category: string): void {
    // Implementation for filtering meals
    console.log('Filtering meals by category:', category);
}

// Add meal to meal plan
export function addToMealPlan(mealId: string): void {
    const meal = mealData.find((m: any) => m.id === mealId);
    
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
    const currentSection = 'meal-plan'; // This should come from a global state
    if (currentSection === 'meal-plan') {
        displayMealPlan();
    }
}

// Display meal plan
export function displayMealPlan(): void {
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
                const totalCarbs = meals.reduce((sum: number, meal: any) => sum + (meal.carbs || 0), 0);
                const totalFat = meals.reduce((sum: number, meal: any) => sum + (meal.fat || 0), 0);
                const totalProtein = meals.reduce((sum: number, meal: any) => sum + (meal.protein || 0), 0);
                
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
                            ${meals.map((meal: any) => `
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

export function removePlannedMeal(date: string, mealType: string, mealId: string): void {
    if (mealPlan[date] && mealPlan[date][mealType]) {
        mealPlan[date][mealType] = mealPlan[date][mealType].filter((meal: any) => meal.id !== mealId);
        localStorage.setItem('nutrime_meal_plan', JSON.stringify(mealPlan));
        displayMealPlan();
        showMessage('Removed meal from plan', 'success');
    }
}

export function generateMealPlan(): void {
    // Simple meal plan generation
    const today = new Date().toISOString().split('T')[0];
    
    if (mealData.length === 0) {
        showMessage('Please upload meal data first', 'error');
        return;
    }
    
    // Generate a simple plan with random meals
    if (!mealPlan[today]) {
        mealPlan[today] = {
            breakfast: [],
            lunch: [], 
            dinner: [],
            snacks: []
        };
    }
    
    // Add random meals to each meal type
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    mealTypes.forEach(mealType => {
        if (mealPlan[today][mealType].length === 0 && mealData.length > 0) {
            const randomMeal = mealData[Math.floor(Math.random() * mealData.length)];
            mealPlan[today][mealType].push(randomMeal);
        }
    });
    
    localStorage.setItem('nutrime_meal_plan', JSON.stringify(mealPlan));
    displayMealPlan();
    showMessage('Meal plan generated!', 'success');
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

// Meals Module
export async function initializeMeals(): Promise<void> {
  console.log('🍽️ Initializing meals...');
  setupMealsEventListeners();
  await loadAndDisplayMeals();
}

function setupMealsEventListeners(): void {
  const mealFileInput = document.getElementById('mealFileInput');
  if (mealFileInput) {
    mealFileInput.addEventListener('change', handleMealFileUpload);
  }
}

export async function loadAndDisplayMeals(): Promise<void> {
  try {
    const meals = await loadMealsFromDatabase();
    displayMeals(meals);
  } catch (error) {
    console.error('Error loading meals:', error);
    showMessage('Error loading meals', 'error');
  }
}

export function displayMeals(meals: any[]): void {
  const mealGrid = document.getElementById('mealGrid');
  if (!mealGrid) return;

  if (meals.length === 0) {
    mealGrid.innerHTML = '<p class="empty-state">No meals found. Upload your meal data to get started!</p>';
    return;
  }

  // Generate HTML for meal cards
  mealGrid.innerHTML = meals.map(meal => `
    <div class="meal-card">
      <h4>${meal.name}</h4>
      ${meal.image_url ? `<img src="${meal.image_url}" alt="${meal.name}" class="meal-image">` : ''}
      <div class="nutrition-info">
        <span>Carbs: ${formatNutrition(meal.carbs)}g</span>
        <span>Fat: ${formatNutrition(meal.fat)}g</span>
        <span>Protein: ${formatNutrition(meal.protein)}g</span>
      </div>
      <div class="meal-actions">
        <button class="edit-btn" onclick="editMeal('${meal.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteMeal('${meal.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function formatNutrition(value: any): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  return isNaN(num) ? '0' : num.toFixed(1);
}

export async function handleMealFileUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  
  try {
    showMessage('Processing meal file...', 'success');
    
    // Basic file validation
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      throw new Error('Please upload an Excel file (.xlsx or .xls)');
    }

    // File processing will be implemented here
    console.log('Processing meal file:', file.name);
    showMessage('Meal file upload functionality will be implemented', 'success');
    
  } catch (error) {
    console.error('Error processing meal file:', error);
    showMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
}

export async function addMeal(mealData: any): Promise<void> {
  try {
    await saveMealToDatabase(mealData);
    await loadAndDisplayMeals(); // Refresh the display
    showMessage('Meal added successfully', 'success');
  } catch (error) {
    console.error('Error adding meal:', error);
    showMessage('Error adding meal', 'error');
  }
}

function showMessage(message: string, type: 'success' | 'error' = 'success'): void {
  // Create or update message element
  let messageEl = document.getElementById('meals-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'meals-message';
    messageEl.className = 'message';
    const container = document.querySelector('.meals-section') || document.body;
    container.insertBefore(messageEl, container.firstChild);
  }
  
  messageEl.textContent = message;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  
  // Hide after 3 seconds
  setTimeout(() => {
    if (messageEl) messageEl.style.display = 'none';
  }, 3000);
}

export function editMeal(mealId: string): void {
    console.log('Edit meal:', mealId);
    showMessage('Edit meal functionality coming soon', 'success');
}

export function deleteMeal(mealId: string): void {
    const mealIndex = mealData.findIndex((m: any) => m.id === mealId);
    if (mealIndex !== -1) {
        mealData.splice(mealIndex, 1);
        localStorage.setItem('nutrime_meals', JSON.stringify(mealData));
        displayMeals(mealData);
        showMessage('Meal deleted', 'success');
    }
}
