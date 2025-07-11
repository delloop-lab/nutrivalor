import { supabase } from './supabase-client.ts';
import { allFoods } from './food-tracker';
import { getDefaultServingUnit, updateMealInDatabase, addToShoppingList as addFoodToShoppingList, addToSundries } from './database';
import { calculateNutrientsFromInput } from '../utils/nutrition';

interface MealIngredient {
    name: string;
    carbs: number;
    fat?: number;
    protein?: number;
    instructions: string;
    row: number;
    // Additional fields from admin panel
    food_name?: string;
    food_id?: string;
    quantity?: number;
    serving_unit?: string;
    grams_per_unit?: number;
}

interface Meal {
    id?: string;
    number: string;
    name: string;
    meal_type: string;  // Changed from mealType to match database
    ingredients: MealIngredient[];
    totalCarbs: number;
    totalFat: number;
    totalProtein: number;
    picture: string;
    startRow: number;
    endRow: number;
    images: any[];
    user_id?: string;
    created_by?: string;
    cooking_instructions?: string;
    image_url?: string;
}

interface MealPlan {
    [date: string]: {
        [mealType: string]: Meal[]
    }
}

// Global state
let currentMeals: any[] = [];
export let allMeals = currentMeals;
let weeklyMealPlan: MealPlan = {};
let mealPlan: MealPlan = {};
let weeklyMealPlanLoaded = false;
let isUpdatingShoppingCheckboxes = false;

export async function initializeMeals() {
    // Removed excessive logging for performance
    await loadUserMeals();
    setupMealEventListeners();
    loadWeeklyMealPlan(); // Load saved weekly meal plan data
    updateWeeklyMealPlanDisplay(); // Initialize the weekly meal plan grid
    displayLastMealUploadDate(); // Display last meal update date
    // Removed excessive logging for performance
}

// Export function to reload meals (can be called from admin after creating new meals)
export async function reloadMeals() {
    await loadUserMeals();
}

function setupMealEventListeners(): void {
    // Setup meal plan event listeners
    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        
        // If click is not on dropdown or its trigger button, close all dropdowns
        if (!target.closest('.add-to-plan-container')) {
            document.querySelectorAll('.meal-plan-dropdown').forEach(dropdown => {
                (dropdown as HTMLElement).style.display = 'none';
            });
        }
    });

    // Make functions globally available
    (window as any).removeIngredientRow = removeIngredientRow;
    (window as any).addNewIngredientRow = addNewIngredientRow;
    (window as any).addToMealPlan = addToMealPlan;
    (window as any).toggleMealPlanDropdown = toggleMealPlanDropdown;
    (window as any).updateMealShoppingCheckboxes = updateMealShoppingCheckboxes;
}

// Make functions available globally for HTML onclick handlers
(window as any).showMealUploadModal = function() {
    showMealMessage('Meal upload functionality has been deprecated. Meals are now managed through the database.', 'info');
};

(window as any).closeMealUploadModal = function() {
    // No-op since modal is deprecated
};

// Excel file upload functionality has been deprecated
// Meals are now managed directly through the database

async function clearAllMealsForUser(userId: string) {
    try {
        if (!supabase) {
            throw new Error('Database not available');
        }
        
        const { error } = await supabase
            .from('meals')
            .delete()
            .eq('user_id', userId);
        
        if (error) {
            throw error;
        }
        
    } catch (error) {
        throw error;
    }
}

async function saveMealsToDatabase(meals: Meal[], userId: string) {
    try {
        if (!supabase) {
            throw new Error('Database not available');
        }
        
        const mealsToInsert = meals.map(meal => ({
            user_id: userId,
            number: meal.number,
            name: meal.name,
            meal_type: meal.meal_type,
            ingredients: JSON.stringify(meal.ingredients),
            total_carbs: meal.totalCarbs,
            // TODO: Add total_fat and total_protein when database schema is updated
            picture: meal.picture,
            start_row: meal.startRow,
            end_row: meal.endRow
        }));
        
        const { error } = await supabase
            .from('meals')
            .insert(mealsToInsert);
        
        if (error) {
            throw error;
        }
        
    } catch (error) {
        throw error;
    }
}

export async function loadUserMeals() {
    try {
        // Get user's meals
        const { data: meals, error: mealsError } = await supabase
            .from('meals')
            .select('*')
            .order('name');

        if (mealsError) throw mealsError;

        // Get all foods
        const { data: foods, error: foodsError } = await supabase
            .from('foods')
            .select('*');
            
        if (foodsError) throw foodsError;

        // Get all serving units
        const { data: servingUnits, error: unitsError } = await supabase
            .from('serving_units')
            .select('*');
            
        if (unitsError) throw unitsError;

        // Process each meal
        const mappedMeals = (meals || []).map(dbMeal => {
            // Parse ingredients if it's a string, otherwise use as is
            let rawIngredients;
            try {
                rawIngredients = typeof dbMeal.ingredients === 'string' 
                    ? JSON.parse(dbMeal.ingredients)
                    : dbMeal.ingredients || [];
            } catch (e) {
                // console.error(`Error parsing ingredients for meal ${dbMeal.name}:`, e);
                rawIngredients = [];
            }

            // Process ingredients and calculate nutrients
            const processedIngredients = rawIngredients.map((ing: any) => {
                const food = foods.find(f => f.id === ing.food_id);
                if (!food) return ing;

                const qty = ing.quantity ?? 1;
                const unit = (ing.serving_unit || '').toUpperCase();
                let calculatedCarbs = 0, calculatedFat = 0, calculatedProtein = 0;

                // For EACH units, use direct multiplication (no grams calculation needed)
                if (unit === 'EACH') {
                    calculatedCarbs = +(food.carbs * qty).toFixed(1);
                    calculatedFat = +(food.fat * qty).toFixed(1);
                    calculatedProtein = +(food.protein * qty).toFixed(1);
                } else {
                    // For all other units (including SLICE), use grams calculation
                    const suMatch = servingUnits.find(su => su.food_id === food.id && su.unit_name === unit);
                    if (suMatch && suMatch.grams_per_unit) {
                        const totalGrams = suMatch.grams_per_unit * qty;
                        const factor = totalGrams / 100;
                        calculatedCarbs = +(food.carbs * factor).toFixed(1);
                        calculatedFat = +(food.fat * factor).toFixed(1);
                        calculatedProtein = +(food.protein * factor).toFixed(1);
                    } else {
                        return ing;
                    }
                }

                return {
                    ...ing,
                    carbs: calculatedCarbs,
                    fat: calculatedFat,
                    protein: calculatedProtein
                };
            });

            return {
                ...dbMeal,
                ingredients: processedIngredients
            };
        });

        allMeals = mappedMeals;
        currentMeals = mappedMeals;
        await displayMeals(mappedMeals);

    } catch (error) {
        // console.error('Error loading meals:', error);
        showMealMessage('Error loading meals', 'error');
    }
}

function showNoMealsState() {
    const mealGrid = document.getElementById('mealGrid');
    const availableMealsGrid = document.getElementById('availableMealsGrid');
    if (mealGrid) mealGrid.innerHTML = '<p class="no-data">No meals found in database. Meals can be created through the admin interface.</p>';
    if (availableMealsGrid) availableMealsGrid.innerHTML = '<p class="no-data">No meals found in database. Meals can be created through the admin interface.</p>';
}

// Make displayMeals function available for other modules
export function displayMeals(meals: Meal[], skipFilterUpdate: boolean = false) {
    if (!meals || meals.length === 0) {
        showNoMealsState();
        return;
    }

    // Update category filters if needed
    if (!skipFilterUpdate) {
        updateMealCategoryFilters(meals);
    }

    // Get active category filter
    const activeFilterBtn = document.querySelector('.meal-filters .filter-btn.active');
    const activeCategory = activeFilterBtn?.getAttribute('data-category')?.toUpperCase() || 'ALL';

    // Filter meals if category is not ALL
    const filteredMeals = activeCategory === 'ALL' ? 
        meals : 
        meals.filter(meal => meal.meal_type === activeCategory);

    // Get container and update grid
    const container = document.getElementById('mealGrid');
    if (container) {
        updateMealGrid(container, filteredMeals);
    }
}

function updateMealCategoryFilters(meals: Meal[]): void {
    const mealFiltersContainers = document.querySelectorAll('.meal-filters');
    if (!mealFiltersContainers.length) {
        return;
    }

    // Extract unique meal types (case-insensitive) from loaded meals
    const availableMealTypes = [...new Set(meals.map(meal => meal.meal_type).filter(type => type))];
    const availableTypesUpper = availableMealTypes.map(t => t.toUpperCase());
    
    // Define the order of meal categories
    const mealTypeOrder = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SAUCES', 'OTHER'];
    
    // Start with ALL button, then add meal types in the specified order that exist in our data (case-insensitive match)
    const categories = ['all', ...mealTypeOrder.filter(type => availableTypesUpper.includes(type))];
    
    // Update all meal filter containers (both meals section and meal plan section)
    mealFiltersContainers.forEach((container, containerIndex) => {
        
        // Generate filter buttons (ALL button will be active by default)
        container.innerHTML = categories.map((category, index) => {
            const isActive = index === 0 ? 'active' : '';
            const displayName = category === 'all' ? 'All' : 
                               category === 'BREAKFAST' ? 'Breakfast' :
                               category === 'LUNCH' ? 'Lunch' :
                               category === 'DINNER' ? 'Dinner' :
                               category === 'SNACK' ? 'Snack' :
                               category === 'SAUCES' ? 'Sauces' :
                               category;
            return `
              <button class="filter-btn ${isActive}" onclick="filterMealsByCategory('${category}')" data-category="${category}">
                ${displayName}
              </button>
            `;
        }).join('');
    });
    
}

function updateMealGrid(container: HTMLElement, meals: Meal[]) {
    if (meals.length === 0) {
        container.innerHTML = '<p class="no-data">No meals found in database. Meals can be created through the admin interface.</p>';
        return;
    }
    
    // Sort meals by meal type in the desired order: Breakfast, Lunch, Dinner, then others
    const mealTypeOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Sauces'];
    const sortedMeals = [...meals].sort((a, b) => {
        const aIndex = mealTypeOrder.indexOf(a.meal_type);
        const bIndex = mealTypeOrder.indexOf(b.meal_type);
        
        // If both meal types are in our order array, sort by that order
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }
        // If only one is in our order array, it comes first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        // If neither is in our order array, sort alphabetically
        return a.meal_type.localeCompare(b.meal_type);
    });
    
    // Display all meals in a continuous 3-column grid
    let html = '';
    sortedMeals.forEach(meal => {
        html += generateMealCardHTML(meal);
    });
    
    container.innerHTML = html;
}

function generateMealCardHTML(meal: Meal): string {
    // Use stored total nutritional values, or calculate from ingredients as fallback
    const totalCarbs = meal.totalCarbs || meal.ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
    const totalFat = meal.totalFat || meal.ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
    const totalProtein = meal.totalProtein || meal.ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
    
    // Prepare image path - handle both base64 data and image filenames
    let imagePath = null;
    let imageDisplayName = meal.name;
    
    if (meal.picture) {
        if (meal.picture.startsWith('data:image/')) {
            imagePath = meal.picture;
            imageDisplayName = meal.name; // Always use meal name
        } else if (meal.picture.startsWith('http')) {
            imagePath = meal.picture;
            imageDisplayName = meal.picture.split('/').pop() || meal.name;
        } else {
            imagePath = `/images/${meal.picture}`;
            imageDisplayName = meal.picture;
        }
    } else {
        // Try using meal name as fallback for images folder
        const cleanName = meal.name.replace(/[^\w\s]/g, '').trim();
        imagePath = `/images/${cleanName}.jpg`;
        imageDisplayName = `${cleanName}.jpg`;
    }

    return `
        <div class="meal-card" data-meal-id="${meal.id || ''}" data-meal-name="${meal.name}">
            ${imagePath ? `
                <div class="meal-image-container">
                    <img src="${imagePath}" alt="${meal.name}" class="meal-image" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                         onload="this.style.display='block'; this.nextElementSibling.style.display='none';">
                    <div class="meal-image-fallback" style="display: none;">
                        <span class="image-icon">📷</span>
                        <div class="fallback-text">No Image</div>
                    </div>
                    <div class="meal-image-name">${imageDisplayName}</div>
                </div>
            ` : `
                <div class="meal-image-container">
                    <div class="meal-image-fallback">
                        <span class="image-icon">📷</span>
                        <div class="fallback-text">No Image</div>
                    </div>
                </div>
            `}
            <div class="meal-header">
                <h4 class="meal-name">${meal.name}</h4>
                <div class="meal-creator">Created By: ${meal.created_by}</div>
            </div>
            ${meal.cooking_instructions ? `
                <div class="cooking-instructions">
                    <h5>Cooking Instructions:</h5>
                    <div class="instructions-content">${meal.cooking_instructions}</div>
                </div>
            ` : ''}
            <div class="meal-ingredients">
                ${meal.ingredients.map(ing => {
                    // If ingredient is missing nutrition (no match), show 'ingredient missing'
                    const isMissing = (typeof ing.carbs !== 'number' && typeof ing.fat !== 'number' && typeof ing.protein !== 'number');
                    if (isMissing) {
                        return `
                            <div class="ingredient-item missing-ingredient">
                                <span class="ingredient-name">${ing.name || ing.food_name || 'Unknown Ingredient'} (ingredient missing)</span>
                            </div>
                        `;
                    }
                    const carbs = ing.carbs || 0;
                    const fat = ing.fat || 0;
                    const protein = ing.protein || 0;
                    // Insert line break after first two words in the ingredient name
                    const rawName = ing.name || ing.food_name || 'Unknown Ingredient';
                    const nameParts = rawName.split(' ');
                    let formattedName = rawName;
                    if (nameParts.length > 2) {
                        formattedName = nameParts.slice(0,2).join(' ') + '<br>' + nameParts.slice(2).join(' ');
                    }
                    return `
                        <div class="ingredient-item">
                            <span class="ingredient-name">${formattedName}</span>
                            <div class="ingredient-nutrition">
                                <span class="ingredient-carbs">${formatNutrition(carbs)}g carbs</span>
                                <span class="ingredient-fat">${formatNutrition(fat)}g fat</span>
                                <span class="ingredient-protein">${formatNutrition(protein)}g protein</span>
                            </div>
                            ${ing.instructions ? `<div class="ingredient-instructions">${ing.instructions}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="nutrition-info">
                <span>Carbs: ${formatNutrition(totalCarbs)}g</span>
                <span>Fat: ${formatNutrition(totalFat)}g</span>
                <span>Protein: ${formatNutrition(totalProtein)}g</span>
            </div>
            <div class="meal-actions">
                <div class="add-to-plan-container">
                    <button class="secondary-btn add-to-plan-btn" onclick="toggleMealPlanDropdown('${meal.id}')">
                        Add to Plan
                    </button>
                    <div class="meal-plan-dropdown" id="dropdown-${meal.id}" style="display: none;">
                        <div class="dropdown-content">
                            <div class="dropdown-section">
                                <label>Day:</label>
                                <select class="day-select" id="day-${meal.id}">
                                    <option value="Monday">Monday</option>
                                    <option value="Tuesday">Tuesday</option>
                                    <option value="Wednesday">Wednesday</option>
                                    <option value="Thursday">Thursday</option>
                                    <option value="Friday">Friday</option>
                                    <option value="Saturday">Saturday</option>
                                    <option value="Sunday">Sunday</option>
                                </select>
                            </div>
                            <div class="dropdown-section">
                                <label>Meal Time:</label>
                                <select class="meal-time-select" id="mealtime-${meal.id}">
                                    <option value="breakfast" ${meal.meal_type.toLowerCase() === 'breakfast' ? 'selected' : ''}>Breakfast</option>
                                    <option value="lunch" ${meal.meal_type.toLowerCase() === 'lunch' ? 'selected' : ''}>Lunch</option>
                                    <option value="dinner" ${meal.meal_type.toLowerCase() === 'dinner' ? 'selected' : ''}>Dinner</option>
                                    <option value="snack" ${meal.meal_type.toLowerCase() === 'snack' ? 'selected' : ''}>Snack</option>
                                </select>
                            </div>
                            <div class="dropdown-actions">
                                <button class="primary-btn" onclick="addMealToWeeklyPlan('${meal.id}', '${meal.name.replace(/'/g, "\\'")}')">Add</button>
                                <button class="secondary-btn" onclick="hideMealPlanDropdown('${meal.id}')">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initializeWeeklyMealPlan() {
    const weeklyPlanGrid = document.getElementById('weeklyMealPlan');
    if (!weeklyPlanGrid) return;
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    
    let html = '';
    days.forEach(day => {
        html += `
            <div class="day-plan">
                <h4 class="day-header">${day}</h4>
                ${mealTypes.map(mealType => `
                    <div class="meal-slot" data-day="${day}" data-meal-type="${mealType.toLowerCase()}">
                        <h5>${mealType}</h5>
                        <div class="meal-drop-zone">
                            <p class="drop-hint">Drag meals here or click to add</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    });
    
    weeklyPlanGrid.innerHTML = html;
}

function showMealMessage(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Use the global message system
    if ((window as any).showMessage) {
        (window as any).showMessage(message, type);
    }
}

// Meal plan functions
export function addToMealPlan(mealId: string): void {
    const meal = currentMeals.find((m: any) => m.id === mealId);
    
    if (!meal) {
        // console.error('Meal not found:', mealId);
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    if (!mealPlan[today]) {
        mealPlan[today] = {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: []
        };
    }
    
    // Add to the first available meal type or lunch by default
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    let added = false;
    
    for (const mealType of mealTypes) {
        if (mealPlan[today][mealType].length < 2) { // Max 2 meals per type
            mealPlan[today][mealType].push(meal);
            added = true;
            break;
        }
    }
    
    if (!added) {
        showMealMessage('Meal plan is full for today', 'error');
        return;
    }
    
    localStorage.setItem('nutrivalor_meal_plan', JSON.stringify(mealPlan));
    displayMealPlan();
    showMealMessage(`Added "${meal.name}" to meal plan!`, 'success');
}

function displayMealPlan() {
    const planContainer = document.getElementById('mealPlanGrid');
    if (!planContainer) return;
    
    // Load meal plan from localStorage if not already loaded
    if (Object.keys(mealPlan).length === 0) {
        const saved = localStorage.getItem('nutrivalor_meal_plan');
        if (saved) {
            try {
                mealPlan = JSON.parse(saved);
            } catch (error) {
                // console.error('Error loading daily meal plan:', error);
            }
        }
    }
    
    const today = new Date().toISOString().split('T')[0];
    const todaysPlan = mealPlan[today] || {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: []
    };
    
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    planContainer.innerHTML = `
        <div class="meal-plan-day">
            <h3>Today's Meal Plan</h3>
            ${mealTypes.map(mealType => {
                const meals = todaysPlan[mealType] || [];
                const totalCarbs = meals.reduce((sum: number, meal: any) => sum + (meal.totalCarbs || 0), 0);
                
                return `
                    <div class="meal-type-plan">
                        <h4>${mealType.charAt(0).toUpperCase() + mealType.slice(1)}</h4>
                        <div class="meal-type-totals">
                            <span>Carbs: ${formatNutrition(totalCarbs)}g</span>
                        </div>
                        <div class="planned-meals">
                            ${meals.map((meal: any) => `
                                <div class="planned-meal">
                                    <span>${meal.name}</span>
                                    <button onclick="removeMealFromPlan('${meal.id}', '${mealType}')" class="remove-btn">×</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function formatNutrition(value: any): string {
    if (value === null || value === undefined || value === '') return '0';
    const num = parseFloat(value);
    return isNaN(num) ? '0' : num.toFixed(1);
}

// Filter meals by category (for both meals section and meal plan section)
export function filterMealsByCategory(category: string): void {
    
    // Safety check: if no meals are loaded, show empty state
    if (!currentMeals || currentMeals.length === 0) {
        const mealGrid = document.getElementById('mealGrid');
        const availableMealsGrid = document.getElementById('availableMealsGrid');
        if (mealGrid) mealGrid.innerHTML = '<p class="no-data">No meals loaded. Please upload your meal Excel file.</p>';
        if (availableMealsGrid) availableMealsGrid.innerHTML = '<p class="no-data">No meals loaded. Please upload your meal Excel file.</p>';
        return;
    }
    
    let filteredMeals: Meal[];
    
    if (category === 'all' || category === 'ALL') {
        filteredMeals = currentMeals;
    } else {
        filteredMeals = currentMeals.filter(meal => {
            return meal.meal_type.toUpperCase() === category.toUpperCase();
        });
    }
    
    // Update filter button states first
    document.querySelectorAll('.meal-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll(`[data-category="${category}"]`).forEach(btn => {
        btn.classList.add('active');
    });
    
    // Display meals but skip filter regeneration to preserve active states
    displayMeals(filteredMeals, true);
}

// Dropdown functions
function toggleMealPlanDropdown(mealId: string) {
    // Hide any other open dropdowns first
    document.querySelectorAll('.meal-plan-dropdown').forEach(dropdown => {
        if (dropdown.id !== `dropdown-${mealId}`) {
            (dropdown as HTMLElement).style.display = 'none';
        }
    });
    
    const dropdown = document.getElementById(`dropdown-${mealId}`);
    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        dropdown.style.visibility = isVisible ? 'hidden' : 'visible';
        dropdown.style.opacity = isVisible ? '0' : '1';
        dropdown.style.pointerEvents = isVisible ? 'none' : 'auto';
        
        // Dynamic positioning - check available space and position accordingly
        if (!isVisible) {
            const container = dropdown.closest('.add-to-plan-container') as HTMLElement;
            if (container) {
                const rect = container.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const spaceBelow = viewportHeight - rect.bottom;
                const spaceAbove = rect.top;
                
                // If there's more space above or if below space is too small, position above
                if (spaceAbove > spaceBelow || spaceBelow < 200) {
                    dropdown.style.bottom = '100%';
                    dropdown.style.top = 'auto';
                    dropdown.style.marginBottom = '5px';
                    dropdown.style.marginTop = '0';
                } else {
                    dropdown.style.top = '100%';
                    dropdown.style.bottom = 'auto';
                    dropdown.style.marginTop = '5px';
                    dropdown.style.marginBottom = '0';
                }
            }
            
            setTimeout(() => {
                document.addEventListener('click', function handleClickOutside(event) {
                    const target = event.target as HTMLElement;
                    if (!dropdown.contains(target) && 
                        !target?.closest(`#dropdown-${mealId}`) &&
                        !target?.closest(`.add-to-plan-btn`)) {
                        dropdown.style.display = 'none';
                        dropdown.style.visibility = 'hidden';
                        dropdown.style.opacity = '0';
                        dropdown.style.pointerEvents = 'none';
                        document.removeEventListener('click', handleClickOutside);
                    }
                });
            }, 10);
        }
    }
}

function hideMealPlanDropdown(mealId: string) {
    const dropdown = document.getElementById(`dropdown-${mealId}`);
    if (dropdown) {
        dropdown.style.display = 'none';
        dropdown.style.visibility = 'hidden';
        dropdown.style.opacity = '0';
        dropdown.style.pointerEvents = 'none';
    }
}

function addMealToWeeklyPlan(mealId: string, mealName: string) {
    const meal = currentMeals.find((m: any) => m.id === mealId);
    if (!meal) {
        // console.error(`❌ Meal not found with ID: "${mealId}"`);
        // console.error(`Available meals:`, currentMeals.map(m => `ID: "${m.id}", Name: "${m.name}"`));
        showMealMessage(`Meal not found: ${mealName}`, 'error');
        return;
    }

    const daySelect = document.getElementById(`day-${mealId}`) as HTMLSelectElement;
    const mealTimeSelect = document.getElementById(`mealtime-${mealId}`) as HTMLSelectElement;
    
    if (!daySelect || !mealTimeSelect) {
        // console.error(`❌ Dropdown selects not found for meal ID: ${mealId}`);
        // console.error(`daySelect:`, daySelect);
        // console.error(`mealTimeSelect:`, mealTimeSelect);
        showMealMessage('Error: Dropdown elements not found', 'error');
        return;
    }

    const selectedDay = daySelect.value;
    const selectedMealTime = mealTimeSelect.value;
    
    // Initialize day if it doesn't exist
    if (!weeklyMealPlan[selectedDay]) {
        weeklyMealPlan[selectedDay] = {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: []
        };
    }

    // Check if meal is already in that slot
    const existingMeal = weeklyMealPlan[selectedDay][selectedMealTime].find(m => m.id === mealId);
    if (existingMeal) {
        showMealMessage(`${mealName} is already planned for ${selectedDay} ${selectedMealTime}`, 'error');
        hideMealPlanDropdown(mealId);
        return;
    }
    

    // Add meal to the selected day and time
    weeklyMealPlan[selectedDay][selectedMealTime].push(meal);
    
    // Save to localStorage
    localStorage.setItem('nutrivalor_weekly_meal_plan', JSON.stringify(weeklyMealPlan));
    
    // Update the weekly meal plan display
    updateWeeklyMealPlanDisplay();
    
    // Hide dropdown and show success message
    hideMealPlanDropdown(mealId);
    showMealMessage(`Added "${mealName}" to ${selectedDay} ${selectedMealTime}!`, 'success');
}

function removeMealFromWeeklyPlan(mealId: string, day: string, mealType: string) {
    if (weeklyMealPlan[day] && weeklyMealPlan[day][mealType]) {
        const index = weeklyMealPlan[day][mealType].findIndex((m: any) => m.id === mealId);
        if (index !== -1) {
            weeklyMealPlan[day][mealType].splice(index, 1);
            localStorage.setItem('nutrivalor_weekly_meal_plan', JSON.stringify(weeklyMealPlan));
            updateWeeklyMealPlanDisplay();
            showMealMessage('Meal removed from weekly plan', 'success');
        }
    }
}

function updateWeeklyMealPlanDisplay() {
    const weeklyPlanGrid = document.getElementById('weeklyMealPlan');
    if (!weeklyPlanGrid) return;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    const mealTypeLabels = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

    let html = '';
    days.forEach(day => {
        const dayPlan = weeklyMealPlan[day] || {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: []
        };

        // Calculate daily totals across all meal types
        let dailyTotalCarbs = 0;
        let dailyTotalFat = 0;
        let dailyTotalProtein = 0;
        let hasMeals = false;

        html += `
            <div class="day-plan">
                <div class="day-header">
                    <div class="day-name">${day}</div>
                </div>
                <div class="meal-types">
                    ${mealTypes.map((mealType, index) => {
                        const meals = dayPlan[mealType] || [];
                        
                        // Calculate totals for this meal time
                        const totalCarbs = meals.reduce((sum, meal) => sum + (meal.totalCarbs || 0), 0);
                        const totalFat = meals.reduce((sum, meal) => sum + (meal.totalFat || 0), 0);
                        const totalProtein = meals.reduce((sum, meal) => sum + (meal.totalProtein || 0), 0);
                        
                        // Add to daily totals
                        dailyTotalCarbs += totalCarbs;
                        dailyTotalFat += totalFat;
                        dailyTotalProtein += totalProtein;
                        if (meals.length > 0) hasMeals = true;
                        
                        return `
                            <div class="meal-type">
                                <div class="meal-type-label">${mealTypeLabels[index]}</div>
                                ${meals.map(meal => `
                                    <div class="planned-meal">
                                        <div class="planned-meal-content">
                                            <input 
                                                type="checkbox" 
                                                class="meal-shopping-checkbox" 
                                                id="shopping-${meal.id}-${day}-${mealType}"
                                                title="Add ingredients to Shopping List"
                                                onchange="handleMealToShoppingList('${meal.id}', '${meal.name.replace(/'/g, "\\'")}', this.checked)"
                                            />
                                            <span class="planned-meal-name">${meal.name}</span>
                                        </div>
                                        <button class="remove-planned-btn" onclick="removeMealFromWeeklyPlan('${meal.id}', '${day}', '${mealType}')">×</button>
                                    </div>
                                `).join('')}
                                ${meals.length === 0 ? '<div class="empty-meal-slot">No meals planned</div>' : ''}
                                ${meals.length > 0 ? `
                                    <div class="meal-time-totals">
                                        <span class="total-carbs">Carbs: ${formatNutrition(totalCarbs)}g</span>
                                        <span class="total-fat">Fat: ${formatNutrition(totalFat)}g</span>
                                        <span class="total-protein">Protein: ${formatNutrition(totalProtein)}g</span>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                    
                    <div class="daily-totals-column">
                        <div class="daily-totals-label">Daily Total</div>
                        ${hasMeals ? `
                            <div class="daily-totals-values">
                                <span class="daily-total-carbs">Carbs: ${formatNutrition(dailyTotalCarbs)}g</span>
                                <span class="daily-total-fat">Fat: ${formatNutrition(dailyTotalFat)}g</span>
                                <span class="daily-total-protein">Protein: ${formatNutrition(dailyTotalProtein)}g</span>
                            </div>
                        ` : '<div class="empty-meal-slot">No meals</div>'}
                    </div>
                </div>
            </div>
        `;
    });

    weeklyPlanGrid.innerHTML = html;
    
    // After rendering HTML, check which meals have ingredients in shopping list
    updateMealShoppingCheckboxes();
}

// Function to check shopping list and update checkboxes accordingly
async function updateMealShoppingCheckboxes() {
    // Prevent multiple simultaneous updates
    if (isUpdatingShoppingCheckboxes) {
        return;
    }
    
    try {
        isUpdatingShoppingCheckboxes = true;
        
        // Load current shopping list items
        const shoppingListItems = await loadShoppingListItems();
        if (!shoppingListItems) {
            return;
        }
        
        // Load current foods for matching
        const allFoods = await loadFoodsForMatching();
        if (!allFoods) {
            return;
        }
        
        // Create a set of shopping list item identifiers for quick lookup
        const shoppingItemIds = new Set(shoppingListItems
            .filter(item => item && item.food_id)
            .map(item => item.food_id));
            
        const shoppingItemNames = new Set(shoppingListItems
            .filter(item => item && typeof item.name === 'string')
            .map(item => item.name.toLowerCase().trim()));
            
        // Skip if no items to check against
        if (shoppingItemIds.size === 0 && shoppingItemNames.size === 0) {
            return;
        }
        
        // Check each meal in the weekly plan
        if (!weeklyMealPlan || typeof weeklyMealPlan !== 'object') {
            return;
        }
        
        Object.keys(weeklyMealPlan).forEach(day => {
            if (!weeklyMealPlan[day]) return;
            
            Object.keys(weeklyMealPlan[day]).forEach(mealType => {
                if (!Array.isArray(weeklyMealPlan[day][mealType])) return;
                
                weeklyMealPlan[day][mealType].forEach(meal => {
                    if (!meal || !meal.id) return;
                    
                    const checkboxId = `shopping-${meal.id}-${day}-${mealType}`;
                    const checkbox = document.getElementById(checkboxId) as HTMLInputElement;
                    
                    if (!checkbox || !meal.ingredients) return;
                    
                    // Validate ingredients array
                    const validIngredients = meal.ingredients.filter(ingredient => 
                        ingredient && 
                        typeof ingredient === 'object' && 
                        ingredient.name && 
                        typeof ingredient.name === 'string'
                    );
                    
                    // Check if any of this meal's ingredients are in the shopping list
                    let hasIngredientsInShoppingList = false;
                    
                    for (const ingredient of validIngredients) {
                        const ingredientName = ingredient.name.trim().toLowerCase();
                        
                        // Check if ingredient matches any food in shopping list (by food_id)
                        const matchedFood = findMatchingFood(ingredientName, allFoods);
                        if (matchedFood && shoppingItemIds.has(matchedFood.id)) {
                            hasIngredientsInShoppingList = true;
                            break;
                        }
                        
                        // Check if ingredient is directly in shopping list (SUNDRIES)
                        if (shoppingItemNames.has(ingredientName)) {
                            hasIngredientsInShoppingList = true;
                            break;
                        }
                    }
                    
                    // Update checkbox state
                    checkbox.checked = hasIngredientsInShoppingList;
                });
            });
        });
        
    } catch (error) {
        // console.error('Error updating meal shopping checkboxes:', error);
    } finally {
        isUpdatingShoppingCheckboxes = false;
    }
}

// Function to load shopping list items from database
async function loadShoppingListItems(): Promise<any[]> {
    try {
        const { supabase } = await import('./supabase-client');
        
        if (!supabase) {
            throw new Error('Supabase client not available');
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            throw new Error('User must be authenticated');
        }
        
        const { data, error } = await supabase
            .from('shopping_list')
            .select('*')
            .eq('user_id', user.id);
            
        if (error) throw error;
        
        return data || [];
        
    } catch (error) {
        // console.error('Error loading shopping list items:', error);
        return [];
    }
}

function loadWeeklyMealPlan() {
    // Prevent multiple loads
    if (weeklyMealPlanLoaded) {
        return;
    }
    
    const saved = localStorage.getItem('nutrivalor_weekly_meal_plan');
    if (saved) {
        try {
            const loadedPlan = JSON.parse(saved);
            
            // Clear and update the weekly meal plan
            Object.keys(weeklyMealPlan).forEach(key => delete weeklyMealPlan[key]);
            Object.keys(loadedPlan).forEach(day => {
                weeklyMealPlan[day] = {};
                if (loadedPlan[day] && typeof loadedPlan[day] === 'object') {
                    Object.keys(loadedPlan[day]).forEach(mealType => {
                        weeklyMealPlan[day][mealType] = [];
                        if (Array.isArray(loadedPlan[day][mealType])) {
                            weeklyMealPlan[day][mealType] = loadedPlan[day][mealType].filter(meal => 
                                meal && 
                                typeof meal === 'object' && 
                                meal.id && 
                                meal.name && 
                                Array.isArray(meal.ingredients)
                            );
                        }
                    });
                }
            });
            
            updateWeeklyMealPlanDisplay();
        } catch (error) {
            // console.error('Error loading weekly meal plan:', error);
            weeklyMealPlan = {};
        }
    } else {
        weeklyMealPlan = {};
    }
    
    weeklyMealPlanLoaded = true;
}

// Clear all meal plan data
function clearAllMealPlanData() {
    if (confirm('Are you sure you want to clear all meal plan data? This cannot be undone.')) {
        // Clear the weekly meal plan
        weeklyMealPlan = {};
        localStorage.removeItem('nutrivalor_weekly_meal_plan');
        
        // Clear the daily meal plan as well
        mealPlan = {};
        localStorage.removeItem('nutrivalor_meal_plan');
        
        // Update displays
        updateWeeklyMealPlanDisplay();
        displayMealPlan();
        
        showMealMessage('All meal plan data has been cleared!', 'success');
    }
}

// Clear all meal data silently for logout/user switching
export function clearAllMealData() {
    // Clear in-memory data
    currentMeals = [];
    weeklyMealPlan = {};
    mealPlan = {};
    
    // Reset the loaded flag so it can be loaded again
    weeklyMealPlanLoaded = false;
    
    // Clear localStorage
    localStorage.removeItem('nutrivalor_meals');
    localStorage.removeItem('nutrivalor_weekly_meal_plan');
    localStorage.removeItem('nutrivalor_meal_plan');
    
    // Clear displays
    updateWeeklyMealPlanDisplay();
    displayMealPlan();
    
}

// Clear meal shopping checkboxes only (not the meal plan data)
function clearMealShoppingCheckboxes() {
    // Find all meal shopping checkboxes and uncheck them
    const checkboxes = document.querySelectorAll('.meal-shopping-checkbox');
    
    let uncheckedCount = 0;
    let totalChecked = 0;
    
    checkboxes.forEach((checkbox, index) => {
        if (checkbox instanceof HTMLInputElement) {
            const wasChecked = checkbox.checked;
            if (wasChecked) {
                totalChecked++;
            }
            
            if (wasChecked) {
                checkbox.checked = false;
                uncheckedCount++;
            }
        }
    });
    
    if (uncheckedCount > 0) {
        showMealMessage(`Cleared ${uncheckedCount} "Add to List" selections`, 'success');
    } else if (totalChecked === 0) {
        showMealMessage('No checkboxes were selected to clear', 'info');
    } else {
        showMealMessage('All checkboxes were already cleared', 'info');
    }
}

// Global functions for HTML onclick handlers
(window as any).addMealToPlan = function(mealId: string, mealName: string) {
    addToMealPlan(mealId);
};

(window as any).toggleMealPlanDropdown = function(mealId: string) {
    toggleMealPlanDropdown(mealId);
};

(window as any).hideMealPlanDropdown = function(mealId: string) {
    hideMealPlanDropdown(mealId);
};

(window as any).addMealToWeeklyPlan = function(mealId: string, mealName: string) {
    addMealToWeeklyPlan(mealId, mealName);
};

(window as any).removeMealFromWeeklyPlan = function(mealId: string, day: string, mealType: string) {
    removeMealFromWeeklyPlan(mealId, day, mealType);
};

(window as any).filterMealsByCategory = function(category: string) {
    filterMealsByCategory(category);
};

(window as any).clearAllMealPlanData = function() {
    clearAllMealPlanData();
};

(window as any).clearMealShoppingCheckboxes = function() {
    clearMealShoppingCheckboxes();
};

(window as any).removeMealFromPlan = function(mealId: string, mealType: string) {
    const today = new Date().toISOString().split('T')[0];
    if (mealPlan[today] && mealPlan[today][mealType]) {
        const index = mealPlan[today][mealType].findIndex((m: any) => m.id === mealId);
        if (index !== -1) {
            mealPlan[today][mealType].splice(index, 1);
            localStorage.setItem('nutrivalor_meal_plan', JSON.stringify(mealPlan));
            displayMealPlan();
            showMealMessage('Meal removed from plan', 'success');
        }
    }
};

// Meal to Shopping List functionality
async function handleMealToShoppingList(mealId: string, mealName: string, isChecked: boolean): Promise<void> {
    
    if (!isChecked) {
        // When unchecked, just show info message but allow future additions
        showMealMessage('Checkbox unchecked - you can check it again to add more ingredients', 'info');
        return;
    }
    
    const meal = currentMeals.find(m => m.id === mealId);
    if (!meal) {
        // console.error(`❌ Meal not found with ID: "${mealId}"`);
        // console.error(`Available meals:`, currentMeals.map(m => ({ id: m.id, name: m.name })));
        showMealMessage('Meal not found', 'error');
        return;
    }
    
    if (!meal.ingredients || meal.ingredients.length === 0) {
        // console.warn(`⚠️ No ingredients found in meal: "${meal.name}"`);
        showMealMessage('No ingredients found in this meal', 'error');
        return;
    }
    
    try {
        showMealMessage('Processing ingredients...', 'info');
        const results = await addMealIngredientsToShoppingList(meal);
        
        const matched = results.matched.length;
        const unmatched = results.unmatched.length;
        
        let message = `Added ${matched + unmatched} more ingredients to shopping list`;
        if (matched > 0) message += ` (${matched} matched from Food Tracker`;
        if (unmatched > 0) message += `, ${unmatched} added to SUNDRIES`;
        if (matched > 0 || unmatched > 0) message += ')';
        message += ` - quantities increased!`;
        
        showMealMessage(message, 'success');
        
        // Small delay to ensure database operations complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update shopping list display - reload from database first
        try {
            // Use the new reload function that loads from database first
            if (typeof (window as any).reloadShoppingListFromDatabase === 'function') {
                await (window as any).reloadShoppingListFromDatabase();
            } else {
                // Fallback to just updating display
                if (typeof (window as any).updateShoppingListDisplay === 'function') {
                    (window as any).updateShoppingListDisplay();
                }
                showMealMessage('Ingredients added! Switch to Shopping List tab to see updates.', 'info');
            }
        } catch (error) {
            // console.warn('⚠️ Food-tracker shopping list reload failed:', error);
            showMealMessage('Ingredients added! Switch to Shopping List tab to see updates.', 'info');
        }
        
    } catch (error) {
        // console.error('Error adding meal ingredients to shopping list:', error);
        showMealMessage('Error adding ingredients to shopping list', 'error');
    }
}

async function addMealIngredientsToShoppingList(meal: any): Promise<{matched: any[], unmatched: any[]}> {
    
    // Load current foods from Food Tracker for matching
    const allFoods = await loadFoodsForMatching();
    
    const matched: any[] = [];
    const unmatched: any[] = [];
    
    for (const ingredient of meal.ingredients) {
        if (!ingredient) {
            // console.warn('⚠️ Skipping null ingredient');
            continue;
        }
        
        // Use food_name if available, otherwise try name
        const ingredientName = (ingredient.food_name || ingredient.name || '').trim();
        if (!ingredientName) {
            // console.warn('⚠️ Skipping ingredient without name:', ingredient);
            continue;
        }
        
        // If we have a food_id, use that directly
        if (ingredient.food_id) {
            const matchedFood = allFoods.find(food => food.id === ingredient.food_id);
            if (matchedFood) {
                try {
                    // Use the ingredient's quantity and unit if available
                    const quantity = ingredient.quantity || 1;
                    // Determine unit based on the food name
                    const unit = matchedFood.name.toLowerCase().includes('bacon') ? 'SLICE' : 'EACH';
                    await addFoodToShoppingList(matchedFood.id, quantity, unit);
                    matched.push({ ingredient, matchedFood, quantity, unit });
                    continue;
                } catch (error) {
                    // console.error(`❌ Error adding ${matchedFood.name} to shopping list:`, error);
                }
            }
        }
        
        // Fallback to name matching if no food_id or match not found
        const {quantity, cleanName} = parseIngredientQuantity(ingredientName);
        
        // Try to find a matching food in the Food Tracker using the cleaned name
        const matchedFood = findMatchingFood(cleanName, allFoods);
        
        if (matchedFood) {
            // Add to shopping list using existing food data with parsed quantity
            try {
                // Get the unit based on the food name
                const unit = cleanName.toLowerCase().includes('bacon') ? 'SLICE' : 'EACH';
                await addFoodToShoppingList(matchedFood.id, quantity, unit);
                matched.push({ ingredient, matchedFood, quantity, unit });
            } catch (error) {
                // console.error(`❌ Error adding ${matchedFood.name} to shopping list:`, error);
            }
        } else {
            // Add to SUNDRIES section with parsed quantity
            try {
                await addToSundries(ingredient, quantity);
                unmatched.push({...ingredient, quantity});
            } catch (error) {
                // console.error(`❌ Error adding ${ingredient.name} to SUNDRIES:`, error);
            }
        }
    }
    
    return { matched, unmatched };
}

// Load foods for ingredient matching
async function loadFoodsForMatching(): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('foods')
            .select('*')
            .order('name');
            
        if (error) throw error;
        return data || [];
    } catch (error) {
        // console.error('Error loading foods for matching:', error);
        return [];
    }
}

// Extract quantity and clean name from ingredient text like "2 Eggs" -> {quantity: 2, cleanName: "Eggs"}
function parseIngredientQuantity(ingredientName: string): {quantity: number, cleanName: string} {
    const trimmed = ingredientName.trim();
    
    // Look for patterns like "2 eggs", "1.5 cups flour", "3/4 cup milk", etc.
    const quantityPatterns = [
        /^(\d+(?:\.\d+)?)\s+(.+)$/,           // "2 eggs", "1.5 cups"
        /^(\d+\/\d+)\s+(.+)$/,                // "3/4 cup"
        /^(\d+\s+\d+\/\d+)\s+(.+)$/,          // "1 3/4 cups"
        /^(\w+)\s+(.+)$/                      // "one egg", "two eggs" (word numbers)
    ];
    
    for (const pattern of quantityPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
            const quantityStr = match[1].toLowerCase();
            let quantity = 1;
            
            // Handle numeric quantities
            if (/^\d+(?:\.\d+)?$/.test(quantityStr)) {
                quantity = parseFloat(quantityStr);
            }
            // Handle fractions like "3/4"
            else if (/^\d+\/\d+$/.test(quantityStr)) {
                const [num, den] = quantityStr.split('/').map(Number);
                quantity = num / den;
            }
            // Handle mixed numbers like "1 3/4"
            else if (/^\d+\s+\d+\/\d+$/.test(quantityStr)) {
                const [whole, fraction] = quantityStr.split(' ');
                const [num, den] = fraction.split('/').map(Number);
                quantity = parseInt(whole) + (num / den);
            }
            // Handle word numbers
            else {
                const wordNumbers: {[key: string]: number} = {
                    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
                };
                quantity = wordNumbers[quantityStr] || 1;
            }
            
            const finalQuantity = Math.max(1, Math.round(quantity));
            const finalName = match[2].trim();
            return {
                quantity: finalQuantity,
                cleanName: finalName
            };
        }
    }
 
    // No quantity found, return original name with quantity 1
    return {quantity: 1, cleanName: trimmed};
}

function findMatchingFood(ingredientName: string, foods: any[]): any | null {
    if (!foods || foods.length === 0) {
        return null;
    }
    // Only allow exact (case-insensitive, trimmed) match
    const searchName = ingredientName.toLowerCase().trim();
    const match = foods.find(food => food.name.toLowerCase().trim() === searchName);
    return match || null;
}

// Last update date functions
function updateLastMealUploadDate(): void {
  const now = new Date();
  const dateString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
  localStorage.setItem('lastMealUpdateDate', dateString);
  displayLastMealUploadDate();
}

function displayLastMealUploadDate(): void {
  const lastUpdate = localStorage.getItem('lastMealUpdateDate');
  const infoElement = document.getElementById('lastMealUpdateInfo');
  const dateElement = document.getElementById('lastMealUpdateDate');
  
  if (lastUpdate && infoElement && dateElement) {
    dateElement.textContent = lastUpdate;
    infoElement.style.display = 'block';
  } else if (infoElement) {
    infoElement.style.display = 'none';
  }
}

// Add new ingredient row to meal form
function addNewIngredientRow() {
    const container = document.getElementById('ingredientsContainer');
    if (!container) return;

    const index = container.children.length;
    const div = document.createElement('div');
    div.className = 'ingredient-row';

    // Create food select dropdown
    const foodSelect = document.createElement('select');
    foodSelect.className = 'food-select';
    foodSelect.onchange = () => (window as any).updateFoodDetails(foodSelect, index);
    
    // Add options from allFoods
    foodSelect.innerHTML = `
        <option value="">Select a food</option>
        ${allFoods.map(food => `
            <option value="${food.id}">${food.name}</option>
        `).join('')}
    `;

    // Create quantity input
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.className = 'ingredient-quantity';
    quantityInput.value = '1';
    quantityInput.min = '0';
    quantityInput.step = '0.1';
    quantityInput.onchange = () => (window as any).updateFoodDetails(foodSelect, index);

    // Create serving unit select
    const unitSelect = document.createElement('select');
    unitSelect.className = 'serving-unit-select';
    unitSelect.innerHTML = '<option value="g">g</option><option value="EACH">each</option>';
    unitSelect.onchange = () => (window as any).updateFoodDetails(foodSelect, index);

    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-ingredient-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.onclick = () => removeIngredientRow(div);

    // Create food details div
    const detailsDiv = document.createElement('div');
    detailsDiv.id = `food-details-${index}`;
    detailsDiv.className = 'food-details';
    detailsDiv.innerHTML = `
        <div class="food-info">
            <div class="food-name">Select a food</div>
            <div class="food-macros">
                <span>Carbs: 0g</span>
                <span>Fat: 0g</span>
                <span>Protein: 0g</span>
            </div>
        </div>
    `;

    // Add all elements to the row
    div.appendChild(foodSelect);
    div.appendChild(quantityInput);
    div.appendChild(unitSelect);
    div.appendChild(removeBtn);
    div.appendChild(detailsDiv);

    // Add row to container
    container.appendChild(div);
}

// Remove ingredient row from meal form
function removeIngredientRow(row: HTMLElement) {
    const container = document.getElementById('ingredientsContainer');
    if (container && row) {
        container.removeChild(row);
    }
}

// Update meal data with proper EACH unit handling
async function updateMealData(meal: any) {
    try {
        // Process ingredients
        const ingredients = meal.ingredients.map((ingredient: any) => {
            if (ingredient.serving_unit === 'EACH') {
                return {
                    ...ingredient,
                    carbs: ingredient.carbs * ingredient.quantity,
                    fat: ingredient.fat * ingredient.quantity,
                    protein: ingredient.protein * ingredient.quantity
                };
            }
            return ingredient;
        });

        // Calculate total macros
        const totalMacros = ingredients.reduce((acc: any, ingredient: any) => {
            acc.carbs += ingredient.carbs || 0;
            acc.fat += ingredient.fat || 0;
            acc.protein += ingredient.protein || 0;
            return acc;
        }, { carbs: 0, fat: 0, protein: 0 });

        // Update meal in database
        const { data, error } = await supabase
            .from('meals')
            .update({
                ingredients: JSON.stringify(ingredients),
                total_carbs: totalMacros.carbs,
                total_fat: totalMacros.fat,
                total_protein: totalMacros.protein
            })
            .eq('id', meal.id);

        if (error) throw error;
        return data;
    } catch (error) {
        // console.error('Error updating meal data:', error);
        throw error;
    }
}

// Export functions to window object
(window as any).handleMealToShoppingList = handleMealToShoppingList;