import { supabase } from './supabase-client.ts';
import * as XLSX from 'xlsx';

interface MealIngredient {
    name: string;
    carbs: number;
    fat?: number;
    protein?: number;
    instructions: string;
    row: number;
}

interface Meal {
    id?: string;
    number: string;
    name: string;
    mealType: string;
    ingredients: MealIngredient[];
    totalCarbs: number;
    totalFat: number;
    totalProtein: number;
    picture: string;
    startRow: number;
    endRow: number;
    images: any[];
    user_id?: string;
}

interface MealPlan {
    [date: string]: {
        [mealType: string]: Meal[]
    }
}

let currentMeals: Meal[] = [];
let mealPlan: MealPlan = {};

export async function initializeMeals() {
    console.log('🍽️ Initializing Meals module');
    await loadUserMeals();
    setupMealEventListeners();
    loadWeeklyMealPlan(); // Load saved weekly meal plan data
    updateWeeklyMealPlanDisplay(); // Initialize the weekly meal plan grid
    console.log('✅ Meals module initialized successfully');
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
            
            currentMeal = {
                number: mealNumber,
                name: mealName,
                mealType: currentMealType || 'OTHER',
                ingredients: [],
                totalCarbs: 0,
                totalFat: 0,
                totalProtein: 0,
                picture: picture,
                startRow: i + 1,
                endRow: i + 1,
                images: []
            };
            console.log(`🆕 Started new meal: ${mealName} (${currentMealType}) at row ${i + 1}`);
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
            meal_type: meal.mealType,
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
        if (!supabase) {
            console.log('❌ Database not available, checking localStorage...');
            loadMealsFromLocalStorage();
            return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log('❌ No user logged in, checking localStorage...');
            loadMealsFromLocalStorage();
            return;
        }
        
        const { data, error } = await supabase
            .from('meals')
            .select('*')
            .eq('user_id', user.id)
            .order('start_row');
        
        if (error) {
            console.error('❌ Error loading meals from database:', error);
            console.log('📂 Falling back to localStorage...');
            loadMealsFromLocalStorage();
            return;
        }
        
        if (data && data.length > 0) {
            currentMeals = data.map(dbMeal => ({
                id: dbMeal.id,
                number: dbMeal.number,
                name: dbMeal.name,
                mealType: dbMeal.meal_type,
                ingredients: JSON.parse(dbMeal.ingredients || '[]'),
                totalCarbs: dbMeal.total_carbs || 0,
                totalFat: 0, // Will be loaded from database when schema is updated
                totalProtein: 0, // Will be loaded from database when schema is updated
                picture: dbMeal.picture,
                startRow: dbMeal.start_row,
                endRow: dbMeal.end_row,
                images: [],
                user_id: dbMeal.user_id
            }));
            
            // Also save to localStorage as backup
            localStorage.setItem('nutrivalor_meals', JSON.stringify(currentMeals));
            
            console.log(`📂 Loaded ${currentMeals.length} meals from database`);
            displayMeals(currentMeals);
        } else {
            console.log('📂 No existing meals found in database, checking localStorage...');
            loadMealsFromLocalStorage();
        }
    } catch (error) {
        console.error('❌ Error loading user meals:', error);
        console.log('📂 Falling back to localStorage...');
        loadMealsFromLocalStorage();
    }
}

function loadMealsFromLocalStorage() {
    const saved = localStorage.getItem('nutrivalor_meals');
    if (saved) {
        try {
            currentMeals = JSON.parse(saved);
            console.log(`📂 Loaded ${currentMeals.length} meals from localStorage`);
            displayMeals(currentMeals);
        } catch (error) {
            console.error('❌ Error loading meals from localStorage:', error);
            showNoMealsState();
        }
    } else {
        console.log('📂 No meals found in localStorage');
        showNoMealsState();
    }
}

function showNoMealsState() {
    const mealGrid = document.getElementById('mealGrid');
    const availableMealsGrid = document.getElementById('availableMealsGrid');
    if (mealGrid) mealGrid.innerHTML = '<p class="no-data">No meals loaded. Please upload your meal Excel file.</p>';
    if (availableMealsGrid) availableMealsGrid.innerHTML = '<p class="no-data">No meals loaded. Please upload your meal Excel file.</p>';
}

function displayMeals(meals: Meal[], skipFilterUpdate: boolean = false) {
    const mealGrid = document.getElementById('mealGrid');
    const availableMealsGrid = document.getElementById('availableMealsGrid');
    
    // Update category filters based on available meal types (but only if not filtering)
    if (meals.length > 0 && !skipFilterUpdate) {
        updateMealCategoryFilters(currentMeals); // Use all meals for filter generation, not just filtered ones
    }
    
    // Display in both main meals section and meal plan section
    if (mealGrid) updateMealGrid(mealGrid, meals);
    if (availableMealsGrid) updateMealGrid(availableMealsGrid, meals);
    
    // Also update the weekly meal plan
    if (!skipFilterUpdate) {
        initializeWeeklyMealPlan();
    }
}

function updateMealCategoryFilters(meals: Meal[]): void {
    const mealFiltersContainers = document.querySelectorAll('.meal-filters');
    if (!mealFiltersContainers.length) {
        console.log('⚠️ No meal filter containers found');
        return;
    }

    // Extract unique meal types from loaded meals
    const availableMealTypes = [...new Set(meals.map(meal => meal.mealType).filter(type => type))];
    console.log('🔍 Available meal types:', availableMealTypes);
    
    // Define the order of meal categories
    const mealTypeOrder = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS', 'SAUCES', 'OTHER'];
    
    // Start with ALL button, then add meal types in the specified order that exist in our data
    const categories = ['all', ...mealTypeOrder.filter(type => availableMealTypes.includes(type))];
    
    // Update all meal filter containers (both meals section and meal plan section)
    mealFiltersContainers.forEach((container, containerIndex) => {
        console.log(`📝 Updating filter container ${containerIndex + 1}`);
        
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
    
    console.log(`✅ Created meal filters for categories: ${categories.join(', ')}`);
}

function updateMealGrid(container: HTMLElement, meals: Meal[]) {
    if (meals.length === 0) {
        container.innerHTML = '<p class="no-data">No meals loaded. Please upload your meal Excel file.</p>';
        return;
    }
    
    // Sort meals by meal type in the desired order: Breakfast, Lunch, Dinner, then others
    const mealTypeOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Sauces'];
    const sortedMeals = [...meals].sort((a, b) => {
        const aIndex = mealTypeOrder.indexOf(a.mealType);
        const bIndex = mealTypeOrder.indexOf(b.mealType);
        
        // If both meal types are in our order array, sort by that order
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }
        // If only one is in our order array, it comes first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        // If neither is in our order array, sort alphabetically
        return a.mealType.localeCompare(b.mealType);
    });
    
    // Display all meals in a continuous 3-column grid
    let html = '';
    sortedMeals.forEach(meal => {
        html += generateMealCardHTML(meal);
    });
    
    container.innerHTML = html;
    console.log(`✅ Displayed ${meals.length} meals in continuous 3-column layout`);
}

function generateMealCardHTML(meal: Meal): string {
    // Calculate total nutritional values from ingredients
    const totalCarbs = meal.ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
    const totalFat = meal.ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
    const totalProtein = meal.ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
    
    // Prepare image path - try multiple approaches to match images
    let imagePath = null;
    if (meal.picture) {
        // Try exact match first
        imagePath = `/images/${meal.picture}`;
    } else {
        // Try using meal name as fallback
        const cleanName = meal.name.replace(/[^\w\s]/g, '').trim();
        imagePath = `/images/${cleanName}.jpg`;
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
                    <div class="meal-image-name">${meal.picture || meal.name}</div>
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
            </div>
            <div class="meal-ingredients">
                ${meal.ingredients.map(ing => `
                    <div class="ingredient-item">
                        <span class="ingredient-name">${ing.name}</span>
                        <div class="ingredient-nutrition">
                            <span class="ingredient-carbs">${formatNutrition(ing.carbs)}g carbs</span>
                            ${ing.fat ? `<span class="ingredient-fat">${formatNutrition(ing.fat)}g fat</span>` : ''}
                            ${ing.protein ? `<span class="ingredient-protein">${formatNutrition(ing.protein)}g protein</span>` : ''}
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
                                    <option value="breakfast" ${meal.mealType.toLowerCase() === 'breakfast' ? 'selected' : ''}>Breakfast</option>
                                    <option value="lunch" ${meal.mealType.toLowerCase() === 'lunch' ? 'selected' : ''}>Lunch</option>
                                    <option value="dinner" ${meal.mealType.toLowerCase() === 'dinner' ? 'selected' : ''}>Dinner</option>
                                    <option value="snack" ${meal.mealType.toLowerCase() === 'snack' || meal.mealType.toLowerCase() === 'snacks' ? 'selected' : ''}>Snack</option>
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
            return meal.mealType.toUpperCase() === category.toUpperCase();
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
    const meal = currentMeals.find((m: any) => m.id === mealId);
    if (!meal) {
        console.error('Meal not found:', mealId);
        return;
    }

    const daySelect = document.getElementById(`day-${mealId}`) as HTMLSelectElement;
    const mealTimeSelect = document.getElementById(`mealtime-${mealId}`) as HTMLSelectElement;
    
    if (!daySelect || !mealTimeSelect) {
        console.error('Dropdown selects not found');
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
                                        <span class="planned-meal-name">${meal.name}</span>
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
}

// Load weekly meal plan from localStorage
function loadWeeklyMealPlan() {
    const saved = localStorage.getItem('nutrivalor_weekly_meal_plan');
    if (saved) {
        try {
            weeklyMealPlan = JSON.parse(saved);
            updateWeeklyMealPlanDisplay();
            console.log('📅 Loaded weekly meal plan from localStorage');
        } catch (error) {
            console.error('Error loading weekly meal plan:', error);
            weeklyMealPlan = {};
        }
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

// Test global function availability
console.log('🧪 Testing global filterMealsByCategory function availability:', typeof (window as any).filterMealsByCategory);
