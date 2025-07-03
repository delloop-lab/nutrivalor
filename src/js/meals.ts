import { supabase } from './supabase-client.ts';
import * as XLSX from 'xlsx';
import { allFoods } from './food-tracker';

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

let currentMeals: Meal[] = [];
let mealPlan: MealPlan = {};

// Export currentMeals as allMeals for consistency with food-tracker
export const allMeals = currentMeals;

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
    console.log('🔄 Reloading meals...');
    await loadUserMeals();
}

function setupMealEventListeners() {
    const mealFileInput = document.getElementById('mealFileInput') as HTMLInputElement;
    
    if (mealFileInput) {
        mealFileInput.addEventListener('change', handleMealFileChange);
    }

    // Add click-outside listener for dropdowns
    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        
        // If click is not on dropdown or its trigger button, close all dropdowns
        if (!target.closest('.add-to-plan-container')) {
            document.querySelectorAll('.meal-plan-dropdown').forEach(dropdown => {
                (dropdown as HTMLElement).style.display = 'none';
            });
        }
    });
}

// Make functions available globally for HTML onclick handlers
(window as any).showMealUploadModal = function() {
    const modal = document.getElementById('mealUploadModal');
    if (modal) {
        modal.style.display = 'block';
    }
};

(window as any).closeMealUploadModal = function() {
    const modal = document.getElementById('mealUploadModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

async function handleMealFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
        console.log('📁 Meal file selected:', file.name);
        showMealMessage(`File selected: ${file.name}`, 'info');
        
        // Automatically process the file
        await processMealFile(file);
    }
}

async function processMealFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showMealMessage('Please select a valid Excel file (.xlsx or .xls)', 'error');
        return;
    }
    
    try {
        showMealMessage('📊 Processing meal Excel file...', 'info');
        
        if (!supabase) {
            showMealMessage('Database not available.', 'error');
            return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showMealMessage('Please log in first.', 'error');
            return;
        }
        
        // Clear existing meals for this user
        await clearAllMealsForUser(user.id);
        
        // Parse Excel file
        const meals = await parseMealExcelFile(file);
        console.log(`📊 Parsed ${meals.length} meals from Excel file`);
        
        if (meals.length === 0) {
            showMealMessage('No valid meals found in the Excel file.', 'error');
            return;
        }
        
        // Save to database
        await saveMealsToDatabase(meals, user.id);
        
        // Update display
        currentMeals = meals;
        
        // Save to localStorage as backup
        localStorage.setItem('nutrivalor_meals', JSON.stringify(meals));
        
        displayMeals(meals);
        
        // Close modal
        const modal = document.getElementById('mealUploadModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        showMealMessage(`✅ Successfully loaded ${meals.length} meals! They will persist after refresh.`, 'success');
        
        // Update last upload date
        updateLastMealUploadDate();
        
    } catch (error) {
        console.error('❌ Error uploading meal file:', error);
        showMealMessage('Error uploading meal file. Please try again.', 'error');
    }
}

// Parse meal data from Excel with vertical hierarchical structure
function parseMealData(jsonData: any[][]): Meal[] {
    const meals: Meal[] = [];
    let currentMeal: Meal | null = null;
    let currentMealType = '';
    
    for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Skip empty or header rows
        if (!row || row.every(cell => !cell) || row[0] === 'Meal #' || row[1] === 'Meal Name') continue;

        const mealNumber = (row[0] || '').toString().trim();
        const mealName = (row[1] || '').toString().trim();
        const ingredient = (row[2] || '').toString().trim();
        const carbs = parseFloat(row[3]) || 0;
        const instructions = (row[4] || '').toString().trim();
        const picture = (row[5] || '').toString().trim();
        
        // Fat and protein are 0 for now since not in Excel yet
        const fat = 0;
        const protein = 0;
        
        // Debug: Log the full row data every few rows to understand structure
        if (i % 10 === 0) {
            console.log(`📋 Row ${i}:`, row.slice(0, 6));
        }

        // Detect meal type header (meal name without number or ingredient)
        if (mealName && !mealNumber && !ingredient && carbs === 0 && fat === 0 && protein === 0) {
            currentMealType = mealName.toUpperCase();
            console.log(`📋 Found meal type: ${currentMealType}`);
            continue;
        }

        // Start new meal (meal number starts with #)
        if (mealNumber && mealNumber.startsWith('#') && mealName) {
            // Save previous meal if it exists
            if (currentMeal && currentMeal.ingredients.length > 0) {
                meals.push(currentMeal);
            }
            
            // Generate a unique ID for the meal (combination of meal name and row)
            const mealId = `meal_${mealName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${i}`;
            
            currentMeal = {
                id: mealId,
                number: mealNumber,
                name: mealName,
                meal_type: currentMealType || 'OTHER',
                ingredients: [],
                totalCarbs: 0,
                totalFat: 0,
                totalProtein: 0,
                picture: picture,
                startRow: i + 1,
                endRow: i + 1,
                images: []
            };
            console.log(`🆕 Started new meal: ${mealName} (${currentMealType}) with ID: ${mealId} at row ${i + 1}`);
        }

        // Add ingredient to current meal
        if (currentMeal && ingredient && ingredient.toLowerCase() !== 'total') {
            currentMeal.ingredients.push({
                name: ingredient,
                carbs: carbs,
                fat: fat,
                protein: protein,
                instructions: instructions,
                row: i + 1
            });
            currentMeal.endRow = i + 1;
        }

        // Handle total row
        if (currentMeal && ingredient && ingredient.toLowerCase() === 'total') {
            currentMeal.totalCarbs = carbs;
            currentMeal.endRow = i + 1;
        }
    }
    
    // Add the last meal if it exists
    if (currentMeal && currentMeal.ingredients.length > 0) {
        meals.push(currentMeal);
    }
    
    return meals;
}

async function parseMealExcelFile(file: File): Promise<Meal[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Convert to JSON array
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1,
                    raw: false,
                    defval: ''
                });
                
                console.log(`📊 Read ${jsonData.length} rows from Excel sheet`);
                
                // Parse meals using the hierarchical structure
                const meals = parseMealData(jsonData as any[][]);
                console.log(`✅ Parsed ${meals.length} meals from data`);
                
                resolve(meals);
            } catch (error) {
                console.error('❌ Error parsing Excel file:', error);
                reject(error);
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

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
            console.error('❌ Error clearing meals:', error);
            throw error;
        }
        
        console.log('🗑️ Cleared all existing meals for user');
    } catch (error) {
        console.error('❌ Error in clearAllMealsForUser:', error);
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
            console.error('❌ Error saving meals:', error);
            throw error;
        }
        
        console.log(`✅ Saved ${meals.length} meals to database`);
    } catch (error) {
        console.error('❌ Error in saveMealsToDatabase:', error);
        throw error;
    }
}

async function loadUserMeals() {
    try {
        const meals = await loadMealsFromDatabase();
        // Update the array in place to maintain references
        currentMeals.length = 0;
        currentMeals.push(...meals);
        displayMeals(currentMeals);
    } catch (error) {
        console.error('Error loading meals:', error);
        showNoMealsState();
    }
}

function showNoMealsState() {
    const mealGrid = document.getElementById('mealGrid');
    const availableMealsGrid = document.getElementById('availableMealsGrid');
    if (mealGrid) mealGrid.innerHTML = '<p class="no-data">No meals loaded. Please upload your meal Excel file.</p>';
    if (availableMealsGrid) availableMealsGrid.innerHTML = '<p class="no-data">No meals loaded. Please upload your meal Excel file.</p>';
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
        console.log('⚠️ No meal filter containers found');
        return;
    }

    // Extract unique meal types from loaded meals
    const availableMealTypes = [...new Set(meals.map(meal => meal.meal_type).filter(type => type))];
    // Removed excessive logging for performance
    
    // Define the order of meal categories
    const mealTypeOrder = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS', 'SAUCES', 'OTHER'];
    
    // Start with ALL button, then add meal types in the specified order that exist in our data
    const categories = ['all', ...mealTypeOrder.filter(type => availableMealTypes.includes(type))];
    
    // Update all meal filter containers (both meals section and meal plan section)
    mealFiltersContainers.forEach((container, containerIndex) => {
        // Removed excessive logging for performance
        
        // Generate filter buttons (ALL button will be active by default)
        container.innerHTML = categories.map((category, index) => {
            const isActive = index === 0 ? 'active' : '';
            const displayName = category === 'all' ? 'All' : 
                               category === 'BREAKFAST' ? 'Breakfast' :
                               category === 'LUNCH' ? 'Lunch' :
                               category === 'DINNER' ? 'Dinner' :
                               category === 'SNACKS' ? 'Snacks' :
                               category === 'SAUCES' ? 'Sauces' :
                               category;
            return `
              <button class="filter-btn ${isActive}" onclick="filterMealsByCategory('${category}')" data-category="${category}">
                ${displayName}
              </button>
            `;
        }).join('');
    });
    
    // Removed excessive logging for performance
}

function updateMealGrid(container: HTMLElement, meals: Meal[]) {
    if (meals.length === 0) {
        container.innerHTML = '<p class="no-data">No meals loaded. Please upload your meal Excel file.</p>';
        return;
    }
    
    // Sort meals by meal type in the desired order: Breakfast, Lunch, Dinner, then others
    const mealTypeOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Sauces'];
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
    // Removed excessive logging for performance
}

function generateMealCardHTML(meal: Meal): string {
    // Removed excessive logging for performance
    // Use stored total nutritional values, or calculate from ingredients as fallback
    const totalCarbs = meal.totalCarbs || meal.ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
    const totalFat = meal.totalFat || meal.ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
    const totalProtein = meal.totalProtein || meal.ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
    
    // Prepare image path - handle both base64 data and image filenames
    let imagePath = null;
    let imageDisplayName = meal.name;
    
    if (meal.picture) {
        if (meal.picture.startsWith('data:image/')) {
            // Base64 image data from admin form
            imagePath = meal.picture;
            imageDisplayName = 'Uploaded Image';
        } else if (meal.picture.startsWith('http')) {
            // Full URL
            imagePath = meal.picture;
            imageDisplayName = meal.picture.split('/').pop() || meal.name;
        } else {
            // Filename - try to match in images folder
            imagePath = `/images/${meal.picture}`;
            imageDisplayName = meal.picture;
        }
    } else {
        // Try using meal name as fallback for images folder
        const cleanName = meal.name.replace(/[^\w\s]/g, '').trim();
        imagePath = `/images/${cleanName}.jpg`;
        imageDisplayName = `${cleanName}.jpg`;
    }
    
    if (meal.name && meal.name.toLowerCase().includes('bacon and eggs')) {
        // Removed debug logging for performance
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
                ${meal.ingredients.map(ing => `
                    <div class="ingredient-item">
                        <span class="ingredient-name">${ing.name || ing.food_name || 'Unknown Ingredient'}</span>
                        <div class="ingredient-nutrition">
                            <span class="ingredient-carbs">${formatNutrition(ing.carbs)}g carbs</span>
                            <span class="ingredient-fat">${formatNutrition(ing.fat || 0)}g fat</span>
                            <span class="ingredient-protein">${formatNutrition(ing.protein || 0)}g protein</span>
                        </div>
                        ${ing.instructions ? `<div class="ingredient-instructions">${ing.instructions}</div>` : ''}
                    </div>
                `).join('')}
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
                                    <option value="snack" ${meal.meal_type.toLowerCase() === 'snack' || meal.meal_type.toLowerCase() === 'snacks' ? 'selected' : ''}>Snack</option>
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

    if (meal.name && meal.name.toLowerCase().includes('bacon')) {
        meal.ingredients.forEach(ing => {
            console.log('🐞 Ingredient in Bacon meal:', ing);
        });
    }
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
    console.log('✅ Weekly meal plan initialized');
}

function showMealMessage(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Use the global message system
    if ((window as any).showMessage) {
        (window as any).showMessage(message, type);
    } else {
        // Fallback to console if global function not available
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Meal plan functions
export function addToMealPlan(mealId: string): void {
    const meal = currentMeals.find((m: any) => m.id === mealId);
    
    if (!meal) {
        console.error('Meal not found:', mealId);
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
                console.log('📅 Loaded daily meal plan from localStorage');
            } catch (error) {
                console.error('Error loading daily meal plan:', error);
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
    console.log(`🔍 Filtering meals by category: ${category}`);
    
    // Safety check: if no meals are loaded, show empty state
    if (!currentMeals || currentMeals.length === 0) {
        console.log(`⚠️ No meals available for filtering`);
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
    
    console.log(`📊 Found ${filteredMeals.length} meals for category: ${category}`);
    
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

// New weekly meal plan structure
let weeklyMealPlan: { [day: string]: { [mealType: string]: Meal[] } } = {};

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
    console.log(`🔍 addMealToWeeklyPlan called with mealId: "${mealId}", mealName: "${mealName}"`);
    console.log(`📊 Current meals count: ${currentMeals.length}`);
    console.log(`📋 Available meal IDs:`, currentMeals.map(m => ({ id: m.id, name: m.name })));
    
    const meal = currentMeals.find((m: any) => m.id === mealId);
    if (!meal) {
        console.error(`❌ Meal not found with ID: "${mealId}"`);
        console.error(`Available meals:`, currentMeals.map(m => `ID: "${m.id}", Name: "${m.name}"`));
        showMealMessage(`Meal not found: ${mealName}`, 'error');
        return;
    }

    console.log(`✅ Found meal: ${meal.name} with ID: ${meal.id}`);

    const daySelect = document.getElementById(`day-${mealId}`) as HTMLSelectElement;
    const mealTimeSelect = document.getElementById(`mealtime-${mealId}`) as HTMLSelectElement;
    
    if (!daySelect || !mealTimeSelect) {
        console.error(`❌ Dropdown selects not found for meal ID: ${mealId}`);
        console.error(`daySelect:`, daySelect);
        console.error(`mealTimeSelect:`, mealTimeSelect);
        showMealMessage('Error: Dropdown elements not found', 'error');
        return;
    }

    const selectedDay = daySelect.value;
    const selectedMealTime = mealTimeSelect.value;
    
    console.log(`📅 Selected day: ${selectedDay}, meal time: ${selectedMealTime}`);

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
    console.log(`🔍 DUPLICATE CHECK: Looking for meal ID "${mealId}" in ${selectedDay} ${selectedMealTime}`);
    console.log(`🔍 DUPLICATE CHECK: Current meals in that slot:`, weeklyMealPlan[selectedDay][selectedMealTime]);
    console.log(`🔍 DUPLICATE CHECK: Meal IDs in that slot:`, weeklyMealPlan[selectedDay][selectedMealTime].map(m => m.id));
    
    const existingMeal = weeklyMealPlan[selectedDay][selectedMealTime].find(m => m.id === mealId);
    if (existingMeal) {
        console.log(`❌ DUPLICATE CHECK: Found existing meal:`, existingMeal);
        showMealMessage(`${mealName} is already planned for ${selectedDay} ${selectedMealTime}`, 'error');
        hideMealPlanDropdown(mealId);
        return;
    }
    
    console.log(`✅ DUPLICATE CHECK: No duplicate found, proceeding to add meal`);
    

    // Add meal to the selected day and time
    weeklyMealPlan[selectedDay][selectedMealTime].push(meal);
    
    // Save to localStorage
    localStorage.setItem('nutrivalor_weekly_meal_plan', JSON.stringify(weeklyMealPlan));
    
    // Update the weekly meal plan display
    updateWeeklyMealPlanDisplay();
    
    // Hide dropdown and show success message
    hideMealPlanDropdown(mealId);
    showMealMessage(`Added "${mealName}" to ${selectedDay} ${selectedMealTime}!`, 'success');
    console.log(`✅ Successfully added meal to weekly plan`);
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
                                                onchange="console.log('📦 CHECKBOX EVENT: Checkbox clicked!', this.id, this.checked); handleMealToShoppingList('${meal.id}', '${meal.name.replace(/'/g, "\\'")}', this.checked)"
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
    try {
        // Removed excessive logging for performance
        
        // Load current shopping list items
        const shoppingListItems = await loadShoppingListItems();
        // Removed excessive logging for performance
        
        // Load current foods for matching
        const allFoods = await loadFoodsForMatching();
        // Removed excessive logging for performance
        
        // Create a set of shopping list item identifiers for quick lookup
        const shoppingItemIds = new Set(shoppingListItems.map(item => item.food_id).filter(id => id !== null));
        const shoppingItemNames = new Set(shoppingListItems.map(item => item.name.toLowerCase().trim()));
        
        // Removed excessive logging for performance
        
        // Check each meal in the weekly plan
        Object.keys(weeklyMealPlan).forEach(day => {
            Object.keys(weeklyMealPlan[day]).forEach(mealType => {
                weeklyMealPlan[day][mealType].forEach(meal => {
                    const checkboxId = `shopping-${meal.id}-${day}-${mealType}`;
                    const checkbox = document.getElementById(checkboxId) as HTMLInputElement;
                    
                    if (checkbox && meal.ingredients) {
                        // Check if any of this meal's ingredients are in the shopping list
                        let hasIngredientsInShoppingList = false;
                        
                        for (const ingredient of meal.ingredients) {
                            const ingredientName = ingredient.name.trim().toLowerCase();
                            
                            // Check if ingredient matches any food in shopping list (by food_id)
                            const matchedFood = findMatchingFood(ingredientName, allFoods);
                            if (matchedFood && shoppingItemIds.has(matchedFood.id)) {
                                hasIngredientsInShoppingList = true;
                                console.log(`✅ Found ingredient "${ingredient.name}" in shopping list via food match`);
                                break;
                            }
                            
                            // Check if ingredient is directly in shopping list (SUNDRIES)
                            if (shoppingItemNames.has(ingredientName)) {
                                hasIngredientsInShoppingList = true;
                                console.log(`✅ Found ingredient "${ingredient.name}" in shopping list as SUNDRIES`);
                                break;
                            }
                        }
                        
                        // Update checkbox state
                        const wasChecked = checkbox.checked;
                        checkbox.checked = hasIngredientsInShoppingList;
                        
                        if (wasChecked !== hasIngredientsInShoppingList) {
                            console.log(`🔄 Updated checkbox ${checkboxId}: ${wasChecked} → ${hasIngredientsInShoppingList}`);
                        }
                    }
                });
            });
        });
        
        // Removed excessive logging for performance
        
    } catch (error) {
        console.error('Error updating meal shopping checkboxes:', error);
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
        console.error('Error loading shopping list items:', error);
        return [];
    }
}

// Load weekly meal plan from localStorage
function loadWeeklyMealPlan() {
    // Removed excessive logging for performance
    const saved = localStorage.getItem('nutrivalor_weekly_meal_plan');
    if (saved) {
        try {
            weeklyMealPlan = JSON.parse(saved);
            console.log(`✅ Loaded weekly meal plan:`, weeklyMealPlan);
            
            // Log each day's contents for debugging
            Object.keys(weeklyMealPlan).forEach(day => {
                console.log(`📅 ${day}:`, weeklyMealPlan[day]);
                Object.keys(weeklyMealPlan[day]).forEach(mealTime => {
                    const meals = weeklyMealPlan[day][mealTime];
                    if (meals && meals.length > 0) {
                        console.log(`  🕐 ${mealTime}: ${meals.length} meals`, meals.map(m => `ID: ${m.id}, Name: ${m.name}`));
                    }
                });
            });
            
            updateWeeklyMealPlanDisplay();
            console.log('📅 Loaded weekly meal plan from localStorage');
        } catch (error) {
            console.error('Error loading weekly meal plan:', error);
            weeklyMealPlan = {};
        }
    } else {
        // Removed excessive logging for performance
        weeklyMealPlan = {};
    }
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
        console.log('🗑️ All meal plan data cleared');
    }
}

// Clear all meal data silently for logout/user switching
export function clearAllMealData() {
    console.log('🧹 Clearing all meal data for user switch...');
    
    // Clear in-memory data
    currentMeals = [];
    weeklyMealPlan = {};
    mealPlan = {};
    
    // Clear localStorage
    localStorage.removeItem('nutrivalor_meals');
    localStorage.removeItem('nutrivalor_weekly_meal_plan');
    localStorage.removeItem('nutrivalor_meal_plan');
    
    // Clear displays
    updateWeeklyMealPlanDisplay();
    displayMealPlan();
    
    console.log('✅ All meal data cleared for next user');
}

// Clear meal shopping checkboxes only (not the meal plan data)
function clearMealShoppingCheckboxes() {
    console.log('🗑️ Clearing all meal shopping checkboxes...');
    console.log('🔍 Searching for checkboxes with class: .meal-shopping-checkbox');
    
    // Find all meal shopping checkboxes and uncheck them
    const checkboxes = document.querySelectorAll('.meal-shopping-checkbox');
    console.log(`📊 Found ${checkboxes.length} checkboxes total`);
    
    let uncheckedCount = 0;
    let totalChecked = 0;
    
    checkboxes.forEach((checkbox, index) => {
        if (checkbox instanceof HTMLInputElement) {
            const wasChecked = checkbox.checked;
            if (wasChecked) {
                totalChecked++;
            }
            console.log(`🔲 Checkbox ${index + 1}: ID="${checkbox.id}", checked=${wasChecked}`);
            
            if (wasChecked) {
                checkbox.checked = false;
                uncheckedCount++;
                console.log(`✅ Unchecked checkbox: ${checkbox.id}`);
            }
        }
    });
    
    console.log(`📈 Summary: ${uncheckedCount} unchecked out of ${totalChecked} that were checked`);
    
    if (uncheckedCount > 0) {
        showMealMessage(`Cleared ${uncheckedCount} "Add to List" selections`, 'success');
        console.log(`✅ Successfully unchecked ${uncheckedCount} meal shopping checkboxes`);
    } else if (totalChecked === 0) {
        showMealMessage('No checkboxes were selected to clear', 'info');
        console.log('ℹ️ No meal shopping checkboxes were checked');
    } else {
        showMealMessage('All checkboxes were already cleared', 'info');
        console.log('ℹ️ All checkboxes were already unchecked');
    }
}

// Global functions for HTML onclick handlers
(window as any).addMealToPlan = function(mealId: string, mealName: string) {
    console.log(`🍽️ Adding meal ${mealName} to plan`);
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
    console.log(`🛒 handleMealToShoppingList called - mealId: "${mealId}", mealName: "${mealName}", isChecked: ${isChecked}`);
    console.log(`📊 Current meals available: ${currentMeals.length}`);
    console.log(`🔍 Available meal IDs:`, currentMeals.map(m => m.id));
    
    if (!isChecked) {
        // When unchecked, just show info message but allow future additions
        showMealMessage('Checkbox unchecked - you can check it again to add more ingredients', 'info');
        console.log(`📋 Checkbox unchecked for meal: ${mealName}. Ready for future additions.`);
        return;
    }
    
    const meal = currentMeals.find(m => m.id === mealId);
    if (!meal) {
        console.error(`❌ Meal not found with ID: "${mealId}"`);
        console.error(`Available meals:`, currentMeals.map(m => ({ id: m.id, name: m.name })));
        showMealMessage('Meal not found', 'error');
        return;
    }
    
    console.log(`✅ Found meal: "${meal.name}" with ${meal.ingredients?.length || 0} ingredients`);
    
    if (!meal.ingredients || meal.ingredients.length === 0) {
        console.warn(`⚠️ No ingredients found in meal: "${meal.name}"`);
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
        console.log('🔄 Reloading food-tracker shopping list from database...');
        
        try {
            // Use the new reload function that loads from database first
            if (typeof (window as any).reloadShoppingListFromDatabase === 'function') {
                await (window as any).reloadShoppingListFromDatabase();
                console.log('✅ Food-tracker shopping list reloaded successfully');
            } else {
                console.warn('⚠️ Food-tracker shopping list reload function not available, using fallback');
                // Fallback to just updating display
                if (typeof (window as any).updateShoppingListDisplay === 'function') {
                    (window as any).updateShoppingListDisplay();
                }
                showMealMessage('Ingredients added! Switch to Shopping List tab to see updates.', 'info');
            }
        } catch (error) {
            console.warn('⚠️ Food-tracker shopping list reload failed:', error);
            showMealMessage('Ingredients added! Switch to Shopping List tab to see updates.', 'info');
        }
        
    } catch (error) {
        console.error('Error adding meal ingredients to shopping list:', error);
        showMealMessage('Error adding ingredients to shopping list', 'error');
    }
}

async function addMealIngredientsToShoppingList(meal: any): Promise<{matched: any[], unmatched: any[]}> {
    console.log(`🔍 Processing ${meal.ingredients.length} ingredients from "${meal.name}"`);
    
    // Load current foods from Food Tracker for matching
    const allFoods = await loadFoodsForMatching();
    
    const matched: any[] = [];
    const unmatched: any[] = [];
    
    for (const ingredient of meal.ingredients) {
        const ingredientName = ingredient.name.trim();
        
        // Parse quantity from ingredient name (e.g., "2 Eggs" -> quantity: 2, cleanName: "Eggs")
        const {quantity, cleanName} = parseIngredientQuantity(ingredientName);
        
        console.log(`🔢 PARSED: "${ingredientName}" → quantity: ${quantity}, cleanName: "${cleanName}"`);
        
        // Try to find a matching food in the Food Tracker using the cleaned name
        const matchedFood = findMatchingFood(cleanName, allFoods);
        
        console.log(`🔍 MATCHING: Searching for "${cleanName}" in ${allFoods.length} foods`);
        console.log(`🔍 MATCHING: Found match: ${matchedFood ? `"${matchedFood.name}" (ID: ${matchedFood.id})` : 'None'}`);
        
        if (matchedFood) {
            // Add to shopping list using existing food data with parsed quantity
            try {
                console.log(`🔄 CALLING addFoodToShoppingList("${matchedFood.id}", ${quantity})`);
                await addFoodToShoppingList(matchedFood.id, quantity);
                matched.push({ ingredient, matchedFood, quantity });
                console.log(`✅ Matched "${ingredient.name}" with "${matchedFood.name}" (quantity: ${quantity})`);
            } catch (error) {
                console.error(`❌ Error adding ${matchedFood.name} to shopping list:`, error);
            }
        } else {
            // Add to SUNDRIES section with parsed quantity
            try {
                console.log(`🔄 CALLING addIngredientToSundries("${ingredient.name}", ${quantity})`);
                await addIngredientToSundries(ingredient, quantity);
                unmatched.push({...ingredient, quantity});
                console.log(`📝 Added "${ingredient.name}" to SUNDRIES (quantity: ${quantity})`);
            } catch (error) {
                console.error(`❌ Error adding ${ingredient.name} to SUNDRIES:`, error);
            }
        }
    }
    
    return { matched, unmatched };
}

async function loadFoodsForMatching(): Promise<any[]> {
    try {
        // Removed excessive logging for performance
        // Import the loadFoodsFromDatabase function
        const { loadFoodsFromDatabase } = await import('./database');
        const foods = await loadFoodsFromDatabase();
        return foods;
    } catch (error) {
        console.error('❌ LOADING: Error loading foods for matching:', error);
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
                    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
                    'a': 1, 'an': 1, 'half': 0.5, 'quarter': 0.25
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
        console.log(`🔍 SEARCH: No foods available for matching`);
        return null;
    }
    
    // Use the ingredient name as-is (it should already be cleaned)
    const searchName = ingredientName.toLowerCase().trim();
    console.log(`🔍 SEARCH: Looking for "${searchName}" in foods database`);
    
    // Try exact match first
    let match = foods.find(food => 
        food.name.toLowerCase().trim() === searchName
    );
    
    if (match) {
        console.log(`🎯 SEARCH: Exact match found: "${match.name}"`);
        return match;
    }
    console.log(`🔍 SEARCH: No exact match found, trying partial matches...`);
    
    // Try partial matches - ingredient contains food name or vice versa
    match = foods.find(food => {
        const foodName = food.name.toLowerCase().trim();
        return searchName.includes(foodName) || foodName.includes(searchName);
    });
    
    if (match) {
        console.log(`🎯 SEARCH: Partial match found: "${match.name}"`);
        return match;
    }
    console.log(`🔍 SEARCH: No partial match found, trying word-based matching...`);
    
    // Try word-based matching (split by spaces and check for common words)
    const ingredientWords = searchName.split(/\s+/);
    match = foods.find(food => {
        const foodWords = food.name.toLowerCase().trim().split(/\s+/);
        return ingredientWords.some(word => 
            word.length > 2 && foodWords.some((foodWord: string) => 
                foodWord.includes(word) || word.includes(foodWord)
            )
        );
    });
    
    if (match) {
        console.log(`🎯 SEARCH: Word-based match found: "${match.name}"`);
        return match;
    }
    
    console.log(`❌ SEARCH: No match found for "${searchName}"`);
    return null;
}

async function addFoodToShoppingList(foodId: string, quantity: number = 1): Promise<void> {
    try {
        // Import the addToShoppingList function from database
        const { addToShoppingList } = await import('./database');
        await addToShoppingList(foodId, quantity);
    } catch (error) {
        console.error('Error adding food to shopping list:', error);
        throw error;
    }
}

async function addIngredientToSundries(ingredient: any, quantity: number = 1): Promise<void> {
    try {
        // Get current user
        const { supabase } = await import('./supabase-client');
        
        if (!supabase) {
            throw new Error('Supabase client not available');
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            throw new Error('User must be authenticated');
        }
        
        // Add ingredient as a shopping list item directly (not linked to foods table)
        const { error } = await supabase
            .from('shopping_list')
            .insert([{
                food_id: null, // No link to foods table for SUNDRIES items
                name: ingredient.name,
                brand: 'SUNDRIES',
                category: 'SUNDRIES',
                carbs: ingredient.carbs || 0,
                fat: ingredient.fat || 0,
                protein: ingredient.protein || 0,
                quantity: quantity,
                user_id: user.id
            }]);
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Error adding ingredient to SUNDRIES:', error);
        throw error;
    }
}

// Global function for HTML onclick handler
(window as any).handleMealToShoppingList = async function(mealId: string, mealName: string, isChecked: boolean) {
    console.log('🚀🚀🚀 CHECKBOX CLICKED! Global handleMealToShoppingList wrapper called!');
    console.log(`📋 Parameters: mealId="${mealId}", mealName="${mealName}", isChecked=${isChecked}`);
    console.log(`📊 Current meals available: ${currentMeals.length}`);
    try {
        await handleMealToShoppingList(mealId, mealName, isChecked);
        console.log('✅ handleMealToShoppingList completed successfully');
    } catch (error) {
        console.error('❌ Error in handleMealToShoppingList:', error);
        showMealMessage('Error processing ingredients', 'error');
    }
};

// Debug function to check if the global function is available
(window as any).testMealShoppingFunction = function() {
    console.log('🧪 Testing handleMealToShoppingList availability:');
    console.log('- Function exists:', typeof (window as any).handleMealToShoppingList);
    console.log('- Current meals:', currentMeals.length);
    console.log('- Meals data:', currentMeals.map(m => ({ id: m.id, name: m.name })));
};

// Debug function to test the CLEAR button functionality
(window as any).testClearFunction = function() {
    console.log('🧪 Testing CLEAR button functionality:');
    console.log('- clearMealShoppingCheckboxes function exists:', typeof (window as any).clearMealShoppingCheckboxes);
    console.log('- clearAllMealPlanData function exists:', typeof (window as any).clearAllMealPlanData);
    
    // Check checkboxes on page
    const checkboxes = document.querySelectorAll('.meal-shopping-checkbox');
    console.log('- Meal shopping checkboxes found:', checkboxes.length);
    
    if (checkboxes.length > 0) {
        console.log('- Checkbox details:');
        checkboxes.forEach((checkbox, index) => {
            if (checkbox instanceof HTMLInputElement) {
                console.log(`  Checkbox ${index + 1}: ID="${checkbox.id}", checked=${checkbox.checked}`);
            }
        });
    } else {
        console.log('- No checkboxes found. Make sure you have meals added to your weekly plan first.');
    }
    
    // Test the function directly
    console.log('🔧 Testing clearMealShoppingCheckboxes() directly...');
    clearMealShoppingCheckboxes();
};

// Debug function to force add meal ingredients (bypass checkbox)
(window as any).forceAddMealIngredients = async function(mealName) {
    console.log(`🚀 FORCE ADD: Looking for meal "${mealName}"`);
    const meal = currentMeals.find(m => m.name.toLowerCase().includes(mealName.toLowerCase()));
    if (meal) {
        console.log(`✅ Found meal: ${meal.name} (ID: ${meal.id})`);
        console.log(`📋 Forcing addition of ${meal.ingredients?.length || 0} ingredients to shopping list...`);
        try {
            await handleMealToShoppingList(meal.id, meal.name, true);
            console.log(`✅ FORCE ADD completed for ${meal.name}`);
        } catch (error) {
            console.error(`❌ FORCE ADD failed:`, error);
        }
    } else {
        console.error(`❌ Meal not found. Available meals:`, currentMeals.map(m => m.name));
        console.log(`💡 Try: forceAddMealIngredients("omelette") or forceAddMealIngredients("thai")`);
    }
};

// Add ALL planned meals to shopping list with correct quantities
(window as any).addAllPlannedMealsToShoppingList = async function() {
    console.log('🛒🛒🛒 ADDING ALL PLANNED MEALS TO SHOPPING LIST...');
    
    if (!weeklyMealPlan || Object.keys(weeklyMealPlan).length === 0) {
        console.log('❌ No weekly meal plan found');
        showMealMessage('No meals planned yet', 'info');
        return;
    }
    
    // Count meal occurrences across the entire week
    const mealCounts = new Map();
    
    Object.keys(weeklyMealPlan).forEach(day => {
        Object.keys(weeklyMealPlan[day]).forEach(mealType => {
            weeklyMealPlan[day][mealType].forEach(meal => {
                const count = mealCounts.get(meal.id) || 0;
                mealCounts.set(meal.id, count + 1);
                console.log(`📅 Found "${meal.name}" on ${day} ${mealType} (count: ${count + 1})`);
            });
        });
    });
    
    console.log(`📊 Total unique meals planned: ${mealCounts.size}`);
    
    let totalAdded = 0;
    let errors = 0;
    
    for (const [mealId, count] of mealCounts) {
        const meal = currentMeals.find(m => m.id === mealId);
        if (meal) {
            console.log(`\n🔄 Processing "${meal.name}" (appears ${count} times in week)`);
            try {
                // Add meal ingredients with multiplied quantities
                const results = await addMealIngredientsToShoppingListWithMultiplier(meal, count);
                totalAdded += results.matched.length + results.unmatched.length;
                console.log(`✅ Added ${results.matched.length + results.unmatched.length} ingredients for "${meal.name}" x${count}`);
            } catch (error) {
                console.error(`❌ Error adding meal "${meal.name}":`, error);
                errors++;
            }
        } else {
            console.error(`❌ Meal not found in currentMeals: ${mealId}`);
            errors++;
        }
    }
    
    const message = `Added ${totalAdded} ingredients from ${mealCounts.size} unique meals to shopping list!`;
    if (errors > 0) {
        showMealMessage(`${message} (${errors} errors)`, 'info');
    } else {
        showMealMessage(message, 'success');
    }
    
    // Refresh shopping list display
    try {
        if (typeof (window as any).loadAndDisplayShoppingList === 'function') {
            await (window as any).loadAndDisplayShoppingList();
        }
    } catch (error) {
        console.warn('Failed to refresh shopping list display:', error);
    }
    
    console.log('✅ ALL PLANNED MEALS PROCESSING COMPLETED');
};

// Helper function to add meal ingredients with a multiplier for multiple occurrences
async function addMealIngredientsToShoppingListWithMultiplier(meal: any, multiplier: number): Promise<{matched: any[], unmatched: any[]}> {
    console.log(`🔍 Processing ${meal.ingredients.length} ingredients from "${meal.name}" x${multiplier}`);
    
    const allFoods = await loadFoodsForMatching();
    const matched: any[] = [];
    const unmatched: any[] = [];
    
    for (const ingredient of meal.ingredients) {
        const ingredientName = ingredient.name.trim();
        const {quantity, cleanName} = parseIngredientQuantity(ingredientName);
        const totalQuantity = quantity * multiplier;
        
        console.log(`🔢 MULTIPLIED: "${ingredientName}" → base: ${quantity}, multiplier: ${multiplier}, total: ${totalQuantity}`);
        
        const matchedFood = findMatchingFood(cleanName, allFoods);
        
        if (matchedFood) {
            try {
                await addFoodToShoppingList(matchedFood.id, totalQuantity);
                matched.push({ ingredient, matchedFood, quantity: totalQuantity });
                console.log(`✅ Added "${ingredient.name}" x${totalQuantity} to shopping list`);
            } catch (error) {
                console.error(`❌ Error adding ${matchedFood.name}:`, error);
            }
        } else {
            try {
                await addIngredientToSundries(ingredient, totalQuantity);
                unmatched.push({...ingredient, quantity: totalQuantity});
                console.log(`📝 Added "${ingredient.name}" x${totalQuantity} to SUNDRIES`);
            } catch (error) {
                console.error(`❌ Error adding ${ingredient.name} to SUNDRIES:`, error);
            }
        }
    }
    
    return { matched, unmatched };
}

// Global function to refresh meal shopping checkboxes (can be called from other modules)
(window as any).refreshMealShoppingCheckboxes = async function() {
    // Removed excessive logging for performance
    await updateMealShoppingCheckboxes();
};

// Meal last update date functions
function updateLastMealUploadDate(): void {
  const now = new Date();
  const dateString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
  localStorage.setItem('lastMealUploadDate', dateString);
  displayLastMealUploadDate();
}

function displayLastMealUploadDate(): void {
  const lastUpdate = localStorage.getItem('lastMealUploadDate');
  const infoElement = document.getElementById('lastMealUpdateInfo');
  const dateElement = document.getElementById('lastMealUpdateDate');
  
  if (lastUpdate && infoElement && dateElement) {
    dateElement.textContent = lastUpdate;
    infoElement.style.display = 'block';
  } else if (infoElement) {
    infoElement.style.display = 'none';
  }
}

// === COMPREHENSIVE DEBUGGING FUNCTIONS ===

// Test a specific meal checkbox functionality
(window as any).testMealCheckbox = async function(mealName) {
    console.log(`🧪 === TESTING MEAL CHECKBOX: ${mealName} ===`);
    
    // Find the meal
    const meal = currentMeals.find(m => m.name.toLowerCase().includes(mealName.toLowerCase()));
    if (!meal) {
        console.error(`❌ Meal "${mealName}" not found. Available meals:`, currentMeals.map(m => m.name));
        return;
    }
    
    console.log(`✅ Found meal: ${meal.name} (ID: ${meal.id})`);
    console.log(`📋 Ingredients: ${meal.ingredients?.length || 0}`);
    
    if (!meal.ingredients || meal.ingredients.length === 0) {
        console.error('❌ This meal has no ingredients to add to shopping list');
        return;
    }
    
    // Show ingredients
    console.log('🥗 Meal ingredients:');
    meal.ingredients.forEach((ingredient, index) => {
        console.log(`  ${index + 1}. ${ingredient.name}`);
    });
    
    // Test the function
    console.log('\n🚀 Testing handleMealToShoppingList...');
    try {
        await (window as any).handleMealToShoppingList(meal.id, meal.name, true);
        console.log('✅ Test completed successfully!');
        
        // Check if items were added
        setTimeout(() => {
            console.log('\n🔍 Checking shopping list after test...');
            if (typeof (window as any).debugShoppingList === 'function') {
                (window as any).debugShoppingList();
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Quick fix for shopping list display issues - use only food-tracker system
(window as any).forceRefreshShoppingList = async function() {
    console.log('🔄 === FORCE REFRESHING FOOD-TRACKER SHOPPING LIST ===');
    
    try {
        // Only use food-tracker.ts system (the primary one)
        if (typeof (window as any).updateShoppingListDisplay === 'function') {
            console.log('🔄 Refreshing food-tracker shopping list...');
            (window as any).updateShoppingListDisplay();
            console.log('✅ Food-tracker shopping list refresh completed');
        } else {
            console.warn('⚠️ Food-tracker shopping list function not available');
        }
        
    } catch (error) {
        console.error('❌ Error during food-tracker refresh:', error);
    }
};

// Export function to load meals from database
export async function loadMealsFromDatabase(): Promise<Meal[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('No user logged in');
            return [];
        }

        const { data: meals, error } = await supabase
            .from('meals')
            .select('*')
            .or(`user_id.eq.${user.id},user_id.is.null`)
            .order('name');

        if (error) {
            console.error('Error loading meals:', error);
            return [];
        }

        // Map database meals to our Meal interface
        const mappedMeals = (meals || []).map(dbMeal => ({
            id: dbMeal.id,
            number: dbMeal.number || '',
            name: dbMeal.name,
            meal_type: dbMeal.meal_type || 'OTHER',
            ingredients: typeof dbMeal.ingredients === 'string'
                ? JSON.parse(dbMeal.ingredients || '[]')
                : dbMeal.ingredients || [],
            totalCarbs: dbMeal.total_carbs || 0,
            totalFat: dbMeal.total_fat || 0,
            totalProtein: dbMeal.total_protein || 0,
            picture: dbMeal.picture || '',
            startRow: dbMeal.start_row || 0,
            endRow: dbMeal.end_row || 0,
            images: [],
            user_id: dbMeal.user_id,
            created_by: dbMeal.created_by,
            cooking_instructions: dbMeal.cooking_instructions
        }));

        // Update currentMeals which is linked to allMeals
        currentMeals.length = 0;
        currentMeals.push(...mappedMeals);
        
        // Removed excessive logging for performance
        return mappedMeals;
    } catch (error) {
        console.error('Error loading meals:', error);
        return [];
    }
}

export async function editMeal(mealId: string): Promise<void> {
    const meal = currentMeals.find(m => m.id === mealId);
    if (!meal) {
        console.error('Meal not found:', mealId);
        return;
    }

    // Get form elements
    const editForm = document.getElementById('editMealForm') as HTMLFormElement;
    const editMealId = document.getElementById('editMealId') as HTMLInputElement;
    const editMealName = document.getElementById('editMealName') as HTMLInputElement;
    const editMealType = document.getElementById('editMealType') as HTMLSelectElement;
    const editMealInstructions = document.getElementById('editMealInstructions') as HTMLTextAreaElement;
    const editMealIngredients = document.getElementById('editMealIngredients') as HTMLDivElement;

    if (!editForm || !editMealId || !editMealName || !editMealType || !editMealInstructions || !editMealIngredients) {
        console.error('Edit form elements not found');
        return;
    }

    // Populate form
    editMealId.value = meal.id || '';
    editMealName.value = meal.name;
    editMealType.value = meal.meal_type;
    editMealInstructions.value = meal.cooking_instructions || '';

    // Clear existing ingredients
    editMealIngredients.innerHTML = '';

    // Add ingredient rows
    meal.ingredients.forEach((ingredient, index) => {
        const row = document.createElement('div');
        row.className = 'ingredient-row';
        row.innerHTML = `
            <select class="ingredient-select" name="ingredient_${index}">
                <option value="${ingredient.food_id}">${ingredient.food_name}</option>
            </select>
            <input type="number" class="ingredient-quantity" name="quantity_${index}" 
                   value="${ingredient.quantity || 1}" min="0.1" step="0.1">
            <button type="button" class="remove-ingredient" onclick="removeIngredientRow(this)">Remove</button>
        `;
        editMealIngredients.appendChild(row);
    });

    // Show edit form modal
    const editModal = document.getElementById('editMealModal');
    if (editModal) {
        editModal.style.display = 'block';
    }

    // Load available foods for ingredient selection
    await loadFoodsForIngredients();
}

async function loadFoodsForIngredients(): Promise<void> {
    try {
        const { data: foods, error } = await supabase
            .from('foods')
            .select('id, name')
            .order('name');

        if (error) throw error;

        // Update all ingredient selects with food options
        const selects = document.querySelectorAll('.ingredient-select');
        selects.forEach(select => {
            const currentValue = (select as HTMLSelectElement).value;
            
            // Keep the current selection and add all other foods
            let options = `<option value="${currentValue}">${
                foods.find(f => f.id === currentValue)?.name || 'Select food'
            }</option>`;
            
            foods.forEach(food => {
                if (food.id !== currentValue) {
                    options += `<option value="${food.id}">${food.name}</option>`;
                }
            });
            
            select.innerHTML = options;
        });
    } catch (error) {
        console.error('Error loading foods for ingredients:', error);
        showMealMessage('Error loading foods for ingredients', 'error');
    }
}

// Cancel meal edit
export function cancelMealEdit(): void {
    const modal = document.getElementById('editMealModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Delete meal
export async function deleteMealFromEdit(): Promise<void> {
    const editMealId = document.getElementById('editMealId') as HTMLInputElement;
    if (!editMealId || !editMealId.value) {
        showMealMessage('No meal selected for deletion', 'error');
        return;
    }

    const confirmed = confirm('Are you sure you want to delete this meal?');
    if (!confirmed) return;

    try {
        const { error } = await supabase
            .from('meals')
            .delete()
            .eq('id', editMealId.value);

        if (error) throw error;

        showMealMessage('Meal deleted successfully', 'success');
        cancelMealEdit();
        await loadUserMeals();
    } catch (error) {
        console.error('Error deleting meal:', error);
        showMealMessage('Error deleting meal', 'error');
    }
}

// Setup form submission handler
document.addEventListener('DOMContentLoaded', () => {
    const editMealForm = document.getElementById('editMealForm') as HTMLFormElement;
    if (editMealForm) {
        editMealForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const mealId = (document.getElementById('editMealId') as HTMLInputElement).value;
            const name = (document.getElementById('editMealName') as HTMLInputElement).value;
            const mealType = (document.getElementById('editMealType') as HTMLSelectElement).value;
            const instructions = (document.getElementById('editMealInstructions') as HTMLTextAreaElement).value;

            // Get ingredients
            const ingredients: MealIngredient[] = [];
            const ingredientRows = document.querySelectorAll('#editMealIngredients .ingredient-row');
            ingredientRows.forEach((row, index) => {
                const select = row.querySelector('.ingredient-select') as HTMLSelectElement;
                const quantity = row.querySelector('.ingredient-quantity') as HTMLInputElement;
                if (select && quantity) {
                    const food = allFoods.find(f => f.id === select.value);
                    if (food) {
                        ingredients.push({
                            name: food.name,
                            food_name: food.name,
                            food_id: food.id,
                            carbs: food.carbs * parseFloat(quantity.value),
                            fat: food.fat * parseFloat(quantity.value),
                            protein: food.protein * parseFloat(quantity.value),
                            quantity: parseFloat(quantity.value),
                            instructions: food.instructions || '',
                            row: index
                        });
                    }
                }
            });

            try {
                // Calculate totals
                const totalCarbs = ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
                const totalFat = ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
                const totalProtein = ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);

                const updatedMeal = {
                    id: mealId,
                    name,
                    meal_type: mealType,
                    cooking_instructions: instructions,
                    ingredients,
                    totalCarbs,
                    totalFat,
                    totalProtein
                };

                const { error } = await supabase
                    .from('meals')
                    .update(updatedMeal)
                    .eq('id', mealId);

                if (error) throw error;

                showMealMessage('Meal updated successfully', 'success');
                cancelMealEdit();
                await loadUserMeals();
            } catch (error) {
                console.error('Error updating meal:', error);
                showMealMessage('Error updating meal', 'error');
            }
        });
    }
});
