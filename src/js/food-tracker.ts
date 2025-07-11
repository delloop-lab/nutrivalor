import { supabase } from './supabase-client';
import { 
  saveFoodToDatabase, 
  saveAllFoodsToDatabase,
  loadFoodsFromDatabase, 
  updateFoodInDatabase, 
  deleteFoodFromDatabase,
  addToShoppingList as addToShoppingListDB,
  loadShoppingListFromDatabase,
  clearAllFoodsForUser,
  clearShoppingListFromDatabase,
  loadServingUnitsForFood,
  getDefaultServingUnit,
  calculateMacrosForServing
} from './database';
import { getCurrentAuthUser } from './auth';
import { showMessage } from '../main';

// Food Tracker Module
export async function initializeFoodTracker(): Promise<void> {
  setupFoodTrackerEventListeners();
  await loadAndDisplayFoods();
  await loadShoppingListData();
  displayLastUploadDate();
}

export function setupFoodTrackerEventListeners(): void {
  // Add event listeners for food tracker functionality
  const foodFileInput = document.getElementById('foodFileInput') as HTMLInputElement;
  if (foodFileInput) {
    foodFileInput.addEventListener('change', handleFoodFileUpload);
  } else {
    // Removed excessive logging for performance
  }

  // Add event listener for Add Food form
  const addFoodForm = document.getElementById('addFoodForm') as HTMLFormElement;
  if (addFoodForm) {
    addFoodForm.addEventListener('submit', handleAddFoodForm);
  } else {
    // Removed excessive logging for performance
  }

  // Add other event listeners as needed
  setupCategoryFilters();
  setupSearchFunctionality();
}

function setupCategoryFilters(): void {
  // Category filtering will be set up after foods are loaded
  // Removed excessive logging for performance
}

function setupSearchFunctionality(): void {
  // Implementation for search functionality will be added
  // Removed excessive logging for performance
}

// Store all foods for filtering and shopping list
export let allFoods: any[] = [];
let shoppingList: any[] = [];

// Load shopping list data from database
async function loadShoppingListData(): Promise<void> {
  try {
    // Removed excessive logging for performance
    const dbShoppingList = await loadShoppingListFromDatabase();
    shoppingList = dbShoppingList || [];
    // Removed excessive logging for performance
    updateShoppingListDisplay();
  } catch (error) {
    // Removed excessive logging for performance
    shoppingList = []; // Initialize as empty array on error
  }
}

export async function loadAndDisplayFoods(): Promise<void> {
  try {
          // Removed excessive logging for performance
      const foods = await loadFoodsFromDatabase();
    
    // Store all foods for filtering
    allFoods = foods;
    
    // Update category filters
    updateCategoryFilters(foods);
    
    // Display all foods initially (since ALL button is active by default)
    displayFoods(foods);
  } catch (error) {
    // Removed excessive logging for performance
    showMessage('Error loading foods: ' + (error as Error).message, 'error');
  }
}

function updateCategoryFilters(foods: any[]): void {
  const categoryFiltersContainer = document.querySelector('.category-filters');
  if (!categoryFiltersContainer) return;

  // Extract unique categories from foods (excluding 'General')
  const availableCategories = [...new Set(foods.map(food => food.category).filter(cat => cat && cat !== 'General'))];
  
  // Define the specific order requested: ALL VEGETABLES SALAD DAIRY PROTEIN CONDIMENTS DRINKS OTHER
  const categoryOrder = ['VEGETABLES', 'SALAD', 'DAIRY', 'PROTEIN', 'CONDIMENTS', 'DRINKS', 'OTHER'];
  
  // Start with ALL button, then add categories in the specified order that exist in our data
  const categories = ['all', ...categoryOrder.filter(cat => availableCategories.includes(cat))];

  // Helper to capitalize only the first letter
  function capitalizeFirst(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // Generate filter buttons (ALL button will be active by default)
  categoryFiltersContainer.innerHTML = categories.map((category, index) => {
    const isActive = index === 0 ? 'active' : '';
    const displayName = category === 'all' ? 'All' : capitalizeFirst(category);
    return `
      <button class="filter-btn ${isActive}" onclick="filterByCategory('${category}')" data-category="${category}">
        ${displayName}
      </button>
    `;
  }).join('');
  
      // Removed excessive logging for performance
}

export function filterByCategory(category: string): void {
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.querySelector(`[data-category="${category}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  // Filter foods
  let filteredFoods = allFoods;
  if (category !== 'all') {
    filteredFoods = allFoods.filter(food => 
      food.category && food.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  displayFoods(filteredFoods);
}

export function displayFoods(foods: any[]): void {
  const foodGrid = document.getElementById('foodGrid');
  if (!foodGrid) {
    // Removed excessive logging for performance
    return;
  }

  if (foods.length === 0) {
    foodGrid.innerHTML = '<p class="empty-state">No foods found. Upload your food data to get started!</p>';
    return;
  }

  // Sort foods alphabetically
  foods.sort((a, b) => a.name.localeCompare(b.name));

  // Generate HTML for food cards
  foodGrid.innerHTML = foods.map(food => {
    // Check if item is in shopping list
    const isInShoppingList = shoppingList.some(item => 
      item.food_id === food.id
    );
    const buttonClass = isInShoppingList ? 'add-btn added' : 'add-btn';
    const buttonText = isInShoppingList ? 'Remove from List' : 'Add to List';
    const buttonAction = isInShoppingList ? `handleRemoveFromShoppingList('${food.id}', true)` : `addToShoppingList('${food.id}')`;
    
    return `
      <div class="food-card" data-food-id="${food.id}">
        <h4>${food.name}</h4>
        ${food.brand ? `<div class="brand-info">Brand: ${food.brand}</div>` : ''}
        <div class="nutrition-info">
          <span>Carbs: ${formatNutrition(food.carbs)}g</span>
          <span>Fat: ${formatNutrition(food.fat)}g</span>
          <span>Protein: ${formatNutrition(food.protein)}g</span>
        </div>
        ${food.instructions ? `<div class="food-instructions">${food.instructions}</div>` : ''}
        <div class="food-attribution">
          Created by: ${food.created_by || 'Unknown'}
        </div>
        <div class="food-actions">
          <div class="quantity-unit-group">
            <input type="number" 
                   class="quantity-input" 
                   value="1" 
                   min="1" 
                   id="qty-${food.id}"
                   onchange="updateQuantity('${food.id}', this.value)"
                   placeholder="Qty">
          </div>
          <button class="${buttonClass}" onclick="${buttonAction}">
            ${buttonText}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function formatNutrition(value: any): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  return isNaN(num) ? '0' : num.toFixed(1);
}

// Load serving units for all foods and populate dropdowns
async function loadServingUnitsForAllFoods(foods: any[]): Promise<void> {
  for (const food of foods) {
    try {
      // First try to get serving units from the database
      const { data: servingUnits, error } = await supabase
        .from('serving_units')
        .select('*')
        .eq('food_id', food.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      
      const selectElement = document.getElementById(`unit-${food.id}`) as HTMLSelectElement;
      
      if (selectElement) {
        // Clear existing options except for the default gram option
        selectElement.innerHTML = '<option value="g">g</option>';
        
        // Add serving unit options if we have any
        if (servingUnits && servingUnits.length > 0) {
          servingUnits.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.unit_name;
            option.textContent = unit.unit_name;
            option.dataset.gramsPerUnit = unit.grams_per_unit.toString();
            option.dataset.unitId = unit.id;
            if (unit.is_default) {
              option.selected = true;
            }
            selectElement.appendChild(option);
          });
        } else {
          // If no serving units found, check if this is a known food with default units
          const defaultUnits = getDefaultUnitsForFood(food.name);
          if (defaultUnits) {
            // Add default unit and save it to database
            const unit = {
              food_id: food.id,
              unit_name: defaultUnits.name,
              grams_per_unit: defaultUnits.grams,
              is_default: true
            };
            
            try {
              const { data: savedUnit, error: saveError } = await supabase
                .from('serving_units')
                .insert([unit])
                .select()
                .single();
                
              if (!saveError && savedUnit) {
                const option = document.createElement('option');
                option.value = savedUnit.unit_name;
                option.textContent = savedUnit.unit_name;
                option.dataset.gramsPerUnit = savedUnit.grams_per_unit.toString();
                option.dataset.unitId = savedUnit.id;
                option.selected = true;
                selectElement.appendChild(option);
              }
            } catch (err) {
              // Removed excessive logging for performance
            }
          }
        }
      }
    } catch (error) {
      // Removed excessive logging for performance
    }
  }
}

// Helper function to get default units for known foods
function getDefaultUnitsForFood(foodName: string): { name: string, grams: number } | null {
  const name = foodName.toLowerCase();
  const defaultUnits: { [key: string]: { name: string, grams: number } } = {
    'bacon': { name: 'slice', grams: 28 },
    'bread': { name: 'slice', grams: 30 },
    'chicken breast': { name: 'piece', grams: 120 },
    'egg': { name: 'EACH', grams: 50 },
    'banana': { name: 'piece', grams: 120 },
    'apple': { name: 'piece', grams: 180 },
    'rice': { name: 'cup', grams: 200 },
    'pasta': { name: 'cup', grams: 140 },
    'milk': { name: 'cup', grams: 240 },
    'yogurt': { name: 'cup', grams: 245 },
    'cheese': { name: 'slice', grams: 30 },
    'butter': { name: 'tablespoon', grams: 14 },
    'oil': { name: 'tablespoon', grams: 15 },
    'sugar': { name: 'teaspoon', grams: 4 },
    'flour': { name: 'cup', grams: 120 },
  };

  // Check for exact matches first
  if (defaultUnits[name]) {
    return defaultUnits[name];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(defaultUnits)) {
    if (name.includes(key)) {
      return value;
    }
  }

  return null;
}

// Add these functions to handle quantity and serving unit changes
function updateQuantity(foodId: string, value: string) {
  const qty = parseFloat(value);
  if (isNaN(qty) || qty < 1) return;
  
  const unitSelect = document.getElementById(`unit-${foodId}`) as HTMLSelectElement;
  if (!unitSelect) return;
  
  const selectedOption = unitSelect.options[unitSelect.selectedIndex];
  const gramsPerUnit = selectedOption.dataset.gramsPerUnit ? parseFloat(selectedOption.dataset.gramsPerUnit) : 1;
  
  // Update display or calculations as needed
}

function updateServingUnit(foodId: string, unitName: string) {
  const qtyInput = document.getElementById(`qty-${foodId}`) as HTMLInputElement;
  const unitSelect = document.getElementById(`unit-${foodId}`) as HTMLSelectElement;
  if (!qtyInput || !unitSelect) return;
  
  const qty = parseFloat(qtyInput.value);
  const selectedOption = unitSelect.options[unitSelect.selectedIndex];
  const gramsPerUnit = selectedOption.dataset.gramsPerUnit ? parseFloat(selectedOption.dataset.gramsPerUnit) : 1;
  
  // Update display or calculations as needed
}

// Last update date functions
function updateLastUploadDate(): void {
  const now = new Date();
  const dateString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
  localStorage.setItem('lastFoodUploadDate', dateString);
  displayLastUploadDate();
}

function displayLastUploadDate(): void {
  const lastUpdate = localStorage.getItem('lastFoodUploadDate');
  const infoElement = document.getElementById('lastUpdateInfo');
  const dateElement = document.getElementById('lastUpdateDate');
  
  if (lastUpdate && infoElement && dateElement) {
    dateElement.textContent = lastUpdate;
    infoElement.style.display = 'block';
  } else if (infoElement) {
    infoElement.style.display = 'none';
  }
}

export async function handleFoodFileUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  
  try {
    showMessage('Processing file...', 'success');
    
    // Basic file validation
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      throw new Error('Please upload an Excel file (.xlsx or .xls)');
    }

    // Get current user
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('You must be logged in to upload food data');
    }

    // Parse the Excel file
    const foods = await parseExcelFile(file);
    
    if (foods && foods.length > 0) {
      
      // Show progress message
      showMessage('Clearing existing foods and uploading new data...', 'success');
      
              // Smart upload strategy: Check if user is admin
        const { isCurrentUserAdmin } = await import('./auth');
        const isAdmin = await isCurrentUserAdmin();
        let shareGlobally = false; // Initialize for scope
      
      if (isAdmin) {
        // Admin upload: Choice between replacing all OR only Excel-sourced foods
        const choice = confirm(
          '🔧 SMART MODE UPLOAD (Recommended) 🔧\n\n' +
          'This will:\n' +
          '✅ Replace Excel-uploaded foods with new data\n' +
          '✅ PRESERVE your manually added foods\n' +
          '✅ Keep admin panel foods safe\n\n' +
          'Click OK to use Smart Mode (recommended)\n' +
          'Click Cancel for old "Replace All" mode'
        );
        
        if (choice) {
          // SMART MODE: Only delete foods that were uploaded from Excel (preserve manual foods)
          try {
            const { error } = await supabase
              .from('foods')
              .delete()
              .eq('created_by', 'Excel Upload')
              .is('user_id', null); // Only delete global Excel foods
            
            if (error) throw error;
          } catch (error) {
            // Removed excessive logging for performance
          }
        } else {
          // REPLACE ALL MODE: Traditional behavior
          const confirmed = confirm(
            '⚠️ FINAL WARNING ⚠️\n\n' +
            'This will DELETE ALL FOODS including manually added ones.\n' +
            'Are you absolutely sure?'
          );
          
          if (!confirmed) {
            showMessage('Upload cancelled', 'error');
            input.value = '';
            return;
          }
          
          try {
            // Clear ALL foods in database (admin privilege)
            const { error } = await supabase
              .from('foods')
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            
            if (error) throw error;
          } catch (error) {
            // Removed excessive logging for performance
          }
        }
        
      } else {
        // Regular user upload: Smart approach to prevent database bloat
        shareGlobally = confirm(
          '🌍 SMART SHARING (Recommended) 🌍\n\n' +
          'To prevent database bloat, we recommend sharing Excel data globally:\n\n' +
          '✅ Adds foods to shared global database\n' +
          '✅ Prevents duplicate storage\n' +
          '✅ All users benefit from shared data\n' +
          '✅ Shows your name as contributor\n\n' +
          'Click OK to share globally (recommended)\n' +
          'Click Cancel for personal-only storage'
        );
        
        if (shareGlobally) {
          // SMART SHARING: Add to global database with user attribution
          try {
            // Clear only Excel uploads to prevent endless duplication
            const { error } = await supabase
              .from('foods')
              .delete()
              .eq('created_by', 'Excel Upload')
              .is('user_id', null); // Only delete global Excel foods
            
            if (error) throw error;
          } catch (error) {
            // Removed excessive logging for performance
          }
        } else {
          // PERSONAL MODE: Traditional user-specific storage
          try {
            await clearAllFoodsForUser();
          } catch (error) {
            // Removed excessive logging for performance
          }
        }
      }
      
      // Determine metadata based on upload strategy
      let foodsWithMetadata;
      
      if (isAdmin) {
        // Admin uploads: Always global
        foodsWithMetadata = foods.map(food => ({
          ...food,
          user_id: null,
          created_by: 'Excel Upload'
        }));
      } else {
        // Regular user uploads: Check sharing choice
        if (shareGlobally) {
          // Smart sharing: Global with user attribution
          foodsWithMetadata = foods.map(food => ({
            ...food,
            user_id: null, // Global access
            created_by: `Excel Upload by ${user.email || 'User'}`
          }));
        } else {
          // Personal storage: User-specific
          foodsWithMetadata = foods.map(food => ({
            ...food,
            user_id: user.id,
            created_by: user.email
          }));
        }
      }
      
      // Save all foods to database in bulk (much faster!)
      
      let savedCount = 0;
      let errorCount = 0;
      
      try {
        await saveAllFoodsToDatabase(foodsWithMetadata);
        savedCount = foodsWithMetadata.length;
        errorCount = 0;
      } catch (error) {
        // Removed excessive logging for performance
        // Fallback to individual saves if bulk fails
        
        for (const food of foodsWithMetadata) {
          try {
            await saveFoodToDatabase(food);
            savedCount++;
          } catch (error) {
            // Removed excessive logging for performance
            errorCount++;
          }
        }
      }
      
      // Refresh the display
      await loadAndDisplayFoods();
      
      // Close modal
      const modal = document.getElementById('uploadModal');
      if (modal) modal.style.display = 'none';
      
      const message = errorCount > 0 
        ? `Uploaded ${savedCount} foods (${errorCount} failed)` 
        : `Successfully uploaded ${savedCount} food items!`;
      showMessage(message, 'success');
      
      // Update last upload date
      updateLastUploadDate();
      
    } else {
      showMessage('No valid food data found in the file', 'error');
    }
    
  } catch (error) {
    // Removed excessive logging for performance
    showMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
  
  // Reset file input
  input.value = '';
}

// Parse Excel files using XLSX library
async function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        // Load XLSX library if not already loaded
        if (typeof (window as any).XLSX === 'undefined') {
          loadXLSXLibrary(() => {
            parseExcelData(e.target?.result, resolve, reject);
          });
        } else {
          parseExcelData(e.target?.result, resolve, reject);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function loadXLSXLibrary(callback: () => void): void {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  script.onload = callback;
  script.onerror = () => {
    throw new Error('Failed to load XLSX library');
  };
  document.head.appendChild(script);
}

function parseExcelData(data: any, resolve: (foods: any[]) => void, reject: (error: Error) => void): void {
  try {
    const XLSX = (window as any).XLSX;
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const lines = [];
    
    // Read cell by cell to get all data including multiple sections
    for (let row = range.s.r; row <= range.e.r; row++) {
      const line = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        const value = cell ? (cell.v || '') : '';
        line.push(value.toString().trim());
      }
      lines.push(line);
    }
    
    // Parse food data from the 2D array using the multi-section logic
    const foods = parseFoodLines(lines);
    
    resolve(foods);
  } catch (error) {
    // Removed excessive logging for performance
    reject(new Error('Failed to parse Excel file. Please check the format.'));
  }
}

function parseFoodLines(lines: any[][]): any[] {
  const foods: any[] = [];
  
  if (lines.length < 3) {
    // Removed excessive logging for performance
    return [];
  }
  
  const numCols = lines[0].length;
  
  // Loop through columns in steps of 6: 5 data cols + 1 blank
  for (let col = 0; col + 4 < numCols; col += 6) {
    const sectionHeader = (lines[0][col] || '').toString().trim();
    if (!sectionHeader) continue;
    
    // Check headers for this group (should be: Food Item, Brand, Carb, Fat, Prot)
    const groupHeaders = [
      (lines[1][col] || '').toString().trim().toLowerCase(),
      (lines[1][col + 1] || '').toString().trim().toLowerCase(),
      (lines[1][col + 2] || '').toString().trim().toLowerCase(),
      (lines[1][col + 3] || '').toString().trim().toLowerCase(),
      (lines[1][col + 4] || '').toString().trim().toLowerCase()
    ];
    
    // Validate headers (should be: food item, brand, carb, fat, prot)
    if (groupHeaders.join(',') !== 'food item,brand,carb,fat,prot') {
      // Removed excessive logging for performance
      continue;
    }
    
    // Process data rows (starting from row 2)
    for (let row = 2; row < lines.length; row++) {
      const line = lines[row];
      if (!line || line.length <= col + 4) continue;
      
      const foodName = (line[col] || '').toString().trim();
      if (!foodName) continue;
      
      let brand = (line[col + 1] || '').toString().trim();
      const carbs = parseFloat(line[col + 2]) || 0;
      const fat = parseFloat(line[col + 3]) || 0;
      const protein = parseFloat(line[col + 4]) || 0;
      
      // Strict brand validation (filter out invalid brand values)
      if (!brand || 
          brand.length <= 1 || 
          /^\d+$/.test(brand) || 
          /^\d+\.\d+$/.test(brand) || 
          /^[0-9\s\.]+$/.test(brand) ||
          brand.toLowerCase().includes('carb') ||
          brand.toLowerCase().includes('fat') ||
          brand.toLowerCase().includes('prot') ||
          brand.toLowerCase().includes('protein') ||
          brand.toLowerCase().includes('brand') ||
          brand.toLowerCase().includes('item') ||
          brand.toLowerCase().includes('total') ||
          brand.toLowerCase().includes('example')) {
        brand = '';
      }
      
      // Check if this is a valid food row
      if (foodName && foodName.length > 0 && foodName.length < 100) {
        const lowerName = foodName.toLowerCase();
        const invalidKeywords = ['food item', 'foor item', 'brand', 'item', 'carb', 'fat', 'prot', 'total', 'add up values', 'example'];
        if (invalidKeywords.some(kw => lowerName.includes(kw))) continue;
        
        // Check if this food already exists (avoid duplicates)
        const existingFood = foods.find(f => 
          f.name.toLowerCase() === toTitleCase(foodName).toLowerCase() && 
          f.brand.toLowerCase() === (brand ? toTitleCase(brand) : '').toLowerCase() &&
          f.category === sectionHeader
        );
        
        if (!existingFood) {
          foods.push({
            // Let Supabase auto-generate UUID for id
            name: toTitleCase(foodName),
            brand: brand ? toTitleCase(brand) : '',
            carbs: carbs,
            fat: fat,
            instructions: '',  // Initialize empty instructions for Excel imports
            protein: protein,
            category: sectionHeader,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    }
  }
  
  return foods;
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

export async function addFood(foodData: any): Promise<void> {
  try {
    // Get current user
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('You must be logged in to add food data');
    }

    const foodWithUserId = {
      ...foodData,
      user_id: user.id,
      created_by: user.email
    };

    await saveFoodToDatabase(foodWithUserId);
    await loadAndDisplayFoods(); // Refresh the display
    showMessage('Food added successfully', 'success');
  } catch (error) {
    // Removed excessive logging for performance
    showMessage('Error adding food', 'error');
  }
}

async function handleAddFoodForm(event: Event): Promise<void> {
  event.preventDefault();
  
  try {
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Get form values
    const name = formData.get('foodName') as string;
    const brand = formData.get('foodBrand') as string;
    const category = formData.get('foodCategory') as string;
    const servingUnit = formData.get('foodServingUnit') as string;
    const carbs = parseFloat(formData.get('foodCarbs') as string) || 0;
    const fat = parseFloat(formData.get('foodFat') as string) || 0;
    const protein = parseFloat(formData.get('foodProtein') as string) || 0;
    
    // Validate required fields
    if (!name || !category || !servingUnit) {
      showMessage('Please fill in all required fields (Name, Category, and Serving Unit)', 'error');
      return;
    }
    
    // Create food data object
    const foodData = {
      name: name.trim(),
      brand: brand?.trim() || '',
      category: category,
      carbs: carbs,
      fat: fat,
      protein: protein,
      instructions: '', // Not in the form, but required by database
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add the food to database
    await addFood(foodData);
    
    // Reset the form
    form.reset();
    
    // Show success message with better visibility
    showMessage('✅ Food item added successfully!', 'success');
    
    // Fallback: also show an alert if the toast doesn't work
    setTimeout(() => {
      const toast = document.getElementById('messageToast');
      if (toast && toast.style.display === 'none') {
        alert('✅ Food item added successfully!');
      }
    }, 100);
    
    // Navigate back to Admin section
    const adminLink = document.querySelector('nav a[href="#admin"]') as HTMLElement;
    if (adminLink) {
      adminLink.click();
    } else {
      // Fallback: try to use showSection function
      if (typeof (window as any).showSection === 'function') {
        (window as any).showSection('admin');
      }
    }
    
  } catch (error) {
    // Removed excessive logging for performance
    showMessage(`Error adding food: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
}

export async function addToShoppingList(foodId: string): Promise<void> {
    try {
        const quantityInput = document.getElementById(`qty-${foodId}`) as HTMLInputElement;
        
        if (!quantityInput) {
            throw new Error('Could not find quantity input');
        }
        
        const quantity = parseInt(quantityInput.value) || 1;
        
        await addToShoppingListDB(foodId, quantity);
        
        // Update UI
        const addButton = document.querySelector(`[onclick="addToShoppingList('${foodId}')"]`);
        if (addButton) {
            addButton.classList.add('added');
            addButton.textContent = 'Remove from List';
            addButton.setAttribute('onclick', `handleRemoveFromShoppingList('${foodId}', true)`);
        }
        
        // Refresh shopping list display
        await loadShoppingListData();
        
        showMessage(`Added ${quantity} to shopping list!`, 'success');
        
    } catch (error) {
        // Removed excessive logging for performance
        showMessage('Error adding to shopping list', 'error');
    }
}



// Remove from shopping list function
export async function removeFromShoppingList(foodId: string, fromFoodCard: boolean = false): Promise<void> {
  try {
    // Find the item in the shopping list to get its database ID
    const itemToRemove = shoppingList.find(item => item.food_id === foodId || item.id === foodId);
    
    if (itemToRemove) {
      // Remove from database using the shopping list item's ID
      const { removeFromShoppingList: removeFromShoppingListDB } = await import('./database');
      await removeFromShoppingListDB(itemToRemove.id);
      
      // Remove from local array (filter by food_id)
      shoppingList = shoppingList.filter(item => 
        item.food_id !== foodId
      );
      
      updateShoppingListDisplay();
      
      // Always refresh the food display to update button states
      displayFoods(allFoods.filter(food => {
        const activeBtn = document.querySelector('.filter-btn.active');
        const activeCategory = activeBtn?.getAttribute('data-category') || 'all';
        return activeCategory === 'all' || food.category?.toLowerCase() === activeCategory.toLowerCase();
      }));
      
      // Force update all food card buttons with a small delay
      setTimeout(() => {
        const foodCards = document.querySelectorAll('.food-card');
        foodCards.forEach(card => {
          const button = card.querySelector('.add-btn');
          const foodId = card.getAttribute('data-food-id');
          if (button && foodId) {
            const isInShoppingList = shoppingList.some(item => item.food_id === foodId || item.id === foodId);
            button.textContent = isInShoppingList ? 'Remove' : 'Add to List';
            button.classList.toggle('added', isInShoppingList);
          }
        });
      }, 100);
      

    }
  } catch (error) {
    // Removed excessive logging for performance
    showMessage('Error removing item from shopping list', 'error');
  }
}

// Update shopping list display
export function updateShoppingListDisplay(): void {
    const container = document.getElementById('shoppingItems');
    if (!container) return;

    if (shoppingList.length === 0) {
        container.innerHTML = '<p class="empty-state">Your shopping list is empty. Add items from the Food Tracker!</p>';
        return;
    }

    // Group items by category
    const groupedItems = shoppingList.reduce((acc: any, item: any) => {
        const category = item.food?.category || 'Other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {});

    // Sort categories and items within categories
    const sortedCategories = Object.keys(groupedItems).sort();
    sortedCategories.forEach(category => {
        groupedItems[category].sort((a: any, b: any) => {
            const nameA = a?.food?.name || '';
            const nameB = b?.food?.name || '';
            return nameA.localeCompare(nameB);
        });
    });

    // Generate HTML
    const html = sortedCategories.map(category => `
        <div class="shopping-category">
            <h3>${category}</h3>
            <div class="shopping-items-list">
                ${groupedItems[category].map((item: any) => `
                    <div class="shopping-item" data-id="${item.id}">
                        <div class="item-info">
                            <span class="item-name">${item.food?.name || 'Unknown Food'}</span>
                            ${item.food?.brand ? `<span class="item-brand">(${item.food.brand})</span>` : ''}
                            <div class="macro-info">
                                <span>Carbs: ${item.food?.carbs || 0}g</span>
                                <span>Fat: ${item.food?.fat || 0}g</span>
                                <span>Protein: ${item.food?.protein || 0}g</span>
                            </div>
                        </div>
                        <div class="item-quantity">
                            <input type="number" 
                                   value="${item.quantity}" 
                                   min="1" 
                                   onchange="updateShoppingItemQuantity('${item.id}', this.value)">
                            <button onclick="handleRemoveFromShoppingList('${item.id}')" class="remove-btn">
                                Remove
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    container.innerHTML = html;

    // Update totals
    updateShoppingListTotals();
}

function updateShoppingListTotals(): void {
    const totalsContainer = document.getElementById('shoppingTotals');
    if (!totalsContainer) return;

    // Calculate totals
    const totals = shoppingList.reduce((acc: any, item: any) => {
        const quantity = item.quantity || 0;
        const gramsPerUnit = item.grams_per_unit || 1;
        const totalGrams = quantity * gramsPerUnit;
        const multiplier = totalGrams / 100; // Convert to per 100g basis

        acc.carbs += (item.carbs || 0) * multiplier;
        acc.fat += (item.fat || 0) * multiplier;
        acc.protein += (item.protein || 0) * multiplier;
        return acc;
    }, { carbs: 0, fat: 0, protein: 0 });

    // Format totals to 1 decimal place
    const formattedTotals = {
        carbs: totals.carbs.toFixed(1),
        fat: totals.fat.toFixed(1),
        protein: totals.protein.toFixed(1)
    };

    totalsContainer.innerHTML = `
        <div class="totals-header">Shopping List Totals</div>
        <div class="macro-totals">
            <div class="macro-total">
                <span class="macro-label">Carbs:</span>
                <span class="macro-value">${formattedTotals.carbs}g</span>
            </div>
            <div class="macro-total">
                <span class="macro-label">Fat:</span>
                <span class="macro-value">${formattedTotals.fat}g</span>
            </div>
            <div class="macro-total">
                <span class="macro-label">Protein:</span>
                <span class="macro-value">${formattedTotals.protein}g</span>
            </div>
        </div>
    `;

    totalsContainer.style.display = 'block';
}

// Force refresh shopping list data (clears orphaned data)
async function forceRefreshShoppingList(): Promise<void> {
  try {
    // Removed excessive logging for performance
    
    // Clear database shopping list for current user
    await clearShoppingListFromDatabase();
    
    // Clear local array
    shoppingList = [];
    
    // Reload fresh data
    await loadShoppingListData();
    
    // Removed excessive logging for performance
  } catch (error) {
    // Removed excessive logging for performance
  }
}

// Clear shopping list function
export async function clearShoppingList(): Promise<void> {
  try {
    // Removed excessive logging for performance
    
    // Clear from database first
    await clearShoppingListFromDatabase();
    // Removed excessive logging for performance
    
    // Clear from local array
    shoppingList = [];
    // Removed excessive logging for performance
    
    // Also try to clear the shopping-list.ts system (skip database since we already cleared it)
    try {
      if (typeof (window as any).clearAllShoppingItems === 'function') {
        await (window as any).clearAllShoppingItems(true); // true = skip database clear
      }
    } catch (error) {
      // Removed excessive logging for performance
    }
    
    updateShoppingListDisplay();
    
    // Refresh the food display to update all button states
    displayFoods(allFoods.filter(food => {
      const activeBtn = document.querySelector('.filter-btn.active');
      const activeCategory = activeBtn?.getAttribute('data-category') || 'all';
      return activeCategory === 'all' || food.category?.toLowerCase() === activeCategory.toLowerCase();
    }));
    
    showMessage('Shopping list cleared! 🧹', 'success');
  } catch (error) {
    // Removed excessive logging for performance
    showMessage('Error clearing shopping list', 'error');
  }
}

// Reload shopping list from database and update display
export async function reloadShoppingListFromDatabase(): Promise<void> {
  await loadShoppingListData();
}

// Global declarations for TypeScript
declare global {
  interface Window {
    addToShoppingList: (foodId: string) => Promise<void>;
    removeFromShoppingList: (foodId: string, fromFoodCard?: boolean) => Promise<void>;
    handleRemoveFromShoppingList: (foodId: string, fromFoodCard?: boolean) => void;
    filterByCategory: (category: string) => void;
    clearShoppingList: () => Promise<void>;
    handleClearShoppingList: () => void;
    updateShoppingListDisplay: () => void;
    reloadShoppingListFromDatabase: () => Promise<void>;
    loadAndDisplayFoods: () => Promise<void>;
    editFood: (foodId: string) => void;
    updateQuantity: (foodId: string, value: string) => void;
    updateServingUnit: (foodId: string, unitName: string) => void;
  }
}

// Make functions globally available
window.addToShoppingList = addToShoppingList;
window.removeFromShoppingList = removeFromShoppingList;
window.handleRemoveFromShoppingList = handleRemoveFromShoppingList;
window.filterByCategory = filterByCategory;
window.clearShoppingList = clearShoppingList;
window.handleClearShoppingList = handleClearShoppingList;
window.updateShoppingListDisplay = updateShoppingListDisplay;
window.reloadShoppingListFromDatabase = reloadShoppingListFromDatabase;
window.loadAndDisplayFoods = loadAndDisplayFoods;
window.editFood = editFood;
window.updateQuantity = updateQuantity;
window.updateServingUnit = updateServingUnit;

// Debug function for console use
(window as any).debugShoppingList = function() {
  // Debug function removed for production
  updateShoppingListDisplay();
};

(window as any).forceFixShoppingList = function() {
  forceRefreshShoppingList().then(() => {
    // Force fix completed
  }).catch(error => {
    // Removed excessive logging for performance
  });
};

// Wrapper function for clear shopping list - ensure both systems are cleared
function handleClearShoppingList(): void {
  // Check if we have items to clear
  if (!shoppingList || shoppingList.length === 0) {
    showMessage('Shopping list is already empty!', 'success');
    return;
  }
  
  const confirmed = confirm(`Are you sure you want to clear all ${shoppingList.length} items from your shopping list? This cannot be undone.`);
  
  if (confirmed) {
    clearShoppingList().catch(error => {
      // Removed excessive logging for performance
      showMessage('Error clearing shopping list', 'error');
    });
  }
}

// Wrapper function for remove from shopping list  
function handleRemoveFromShoppingList(foodId: string, fromFoodCard: boolean = false): void {
  removeFromShoppingList(foodId, fromFoodCard).catch(error => {
    // Removed excessive logging for performance
    showMessage('Error removing item', 'error');
  });
}

// Add editFood function
export function editFood(foodId: string): void {
    const food = allFoods.find(f => f.id === foodId);
    if (!food) {
        // Removed excessive logging for performance
        return;
    }

    // Get form elements
    const editForm = document.getElementById('editFoodForm') as HTMLFormElement;
    const editFoodId = document.getElementById('editFoodId') as HTMLInputElement;
    const editFoodName = document.getElementById('editFoodName') as HTMLInputElement;
    const editFoodBrand = document.getElementById('editFoodBrand') as HTMLInputElement;
    const editFoodCarbs = document.getElementById('editFoodCarbs') as HTMLInputElement;
    const editFoodFat = document.getElementById('editFoodFat') as HTMLInputElement;
    const editFoodProtein = document.getElementById('editFoodProtein') as HTMLInputElement;
    const editFoodInstructions = document.getElementById('editFoodInstructions') as HTMLTextAreaElement;
    const editFoodCategory = document.getElementById('editFoodCategory') as HTMLSelectElement;

    if (!editForm || !editFoodId || !editFoodName || !editFoodBrand || !editFoodCarbs || 
        !editFoodFat || !editFoodProtein || !editFoodInstructions || !editFoodCategory) {
        // Removed excessive logging for performance
        return;
    }

    // Populate form
    editFoodId.value = food.id;
    editFoodName.value = food.name;
    editFoodBrand.value = food.brand || '';
    editFoodCarbs.value = food.carbs || '0';
    editFoodFat.value = food.fat || '0';
    editFoodProtein.value = food.protein || '0';
    editFoodInstructions.value = food.instructions || '';
    editFoodCategory.value = food.category || 'OTHER';

    // Show edit form modal
    const editModal = document.getElementById('editFoodModal');
    if (editModal) {
        editModal.style.display = 'block';
    }
}

// Cancel food edit
export function cancelFoodEdit(): void {
    const modal = document.getElementById('editFoodModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Delete food
export async function deleteFoodFromEdit(): Promise<void> {
    const editFoodId = document.getElementById('editFoodId') as HTMLInputElement;
    if (!editFoodId || !editFoodId.value) {
        showMessage('No food selected for deletion', 'error');
        return;
    }

    const confirmed = confirm('Are you sure you want to delete this food?');
    if (!confirmed) return;

    try {
        await deleteFoodFromDatabase(editFoodId.value);
        showMessage('Food deleted successfully', 'success');
        cancelFoodEdit();
        await loadAndDisplayFoods();
    } catch (error) {
        // Removed excessive logging for performance
        showMessage('Error deleting food', 'error');
    }
}

// Setup form submission handler
document.addEventListener('DOMContentLoaded', () => {
    const editFoodForm = document.getElementById('editFoodForm') as HTMLFormElement;
    if (editFoodForm) {
        // Food edit form found, event handling moved to simple-edit.ts
    }
});