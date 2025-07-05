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
  clearShoppingListFromDatabase
} from './database';
import { getCurrentAuthUser } from './auth';

// Food Tracker Module
export async function initializeFoodTracker(): Promise<void> {
  // Removed excessive logging for performance
  setupFoodTrackerEventListeners();
  await loadAndDisplayFoods();
  await loadShoppingListData();
  displayLastUploadDate();
}

function setupFoodTrackerEventListeners(): void {
  // Add event listeners for food tracker functionality
  const foodFileInput = document.getElementById('foodFileInput') as HTMLInputElement;
  if (foodFileInput) {
    foodFileInput.addEventListener('change', handleFoodFileUpload);
    // Removed excessive logging for performance
  } else {
    console.warn('❌ Food file input not found');
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
    console.error('❌ Error loading shopping list:', error);
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
    console.error('❌ Error loading foods:', error);
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
  
  // Generate filter buttons (ALL button will be active by default)
  categoryFiltersContainer.innerHTML = categories.map((category, index) => {
    const isActive = index === 0 ? 'active' : '';
    const displayName = category === 'all' ? 'ALL' : category;
    return `
      <button class="filter-btn ${isActive}" onclick="filterByCategory('${category}')" data-category="${category}">
        ${displayName}
      </button>
    `;
  }).join('');
  
      // Removed excessive logging for performance
}

export function filterByCategory(category: string): void {
  console.log(`🔍 Filtering by category: ${category}`);
  
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
  
  console.log(`📊 Filtered to ${filteredFoods.length} foods`);
  displayFoods(filteredFoods);
}

export function displayFoods(foods: any[]): void {
  const foodGrid = document.getElementById('foodGrid');
  if (!foodGrid) {
    console.warn('❌ Food grid element not found');
    return;
  }

      // Removed excessive logging for performance

  if (foods.length === 0) {
    foodGrid.innerHTML = '<p class="empty-state">No foods found. Upload your food data to get started!</p>';
    return;
  }

  // Sort foods alphabetically
  foods.sort((a, b) => a.name.localeCompare(b.name));

  // Generate HTML for food cards
  foodGrid.innerHTML = foods.map(food => {
    // Check if item is in shopping list by comparing both id and food_id
    const isInShoppingList = shoppingList.some(item => 
      item.id === food.id || item.food_id === food.id
    );
    const buttonClass = isInShoppingList ? 'add-btn added' : 'add-btn';
    const buttonText = isInShoppingList ? 'Remove from List' : 'Add to List';
    const buttonAction = isInShoppingList ? `handleRemoveFromShoppingList('${food.id}', true)` : `addToShoppingList('${food.id}')`;
    
    return `
      <div class="food-card">
        <h4>${food.name}</h4>
        ${food.brand ? `<div class="brand-info">Brand: ${food.brand}</div>` : ''}
        <div class="nutrition-info">
          <span>Carbs: ${formatNutrition(food.carbs)}g</span>
          <span>Fat: ${formatNutrition(food.fat)}g</span>
          <span>Protein: ${formatNutrition(food.protein)}g</span>
        </div>
        ${food.instructions ? `<div class="food-instructions">${food.instructions}</div>` : ''}
        <div class="food-attribution">
          Created by: ${food.created_by}
        </div>
        <div class="food-actions">
          <input type="number" class="quantity-input" value="1" min="1" id="qty-${food.id}">
          <span class="serving-unit">${food.default_serving_unit || 'g'}</span>
          <button class="${buttonClass}" onclick="${buttonAction}">
            ${buttonText}
          </button>
        </div>
      </div>
    `;
  }).join('');
  
      // Removed excessive logging for performance
}

function formatNutrition(value: any): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  return isNaN(num) ? '0' : num.toFixed(1);
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
    console.log('📄 Processing file:', file.name);
    
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

    console.log('👤 Current user:', user.id);

    // Parse the Excel file
    const foods = await parseExcelFile(file);
    
    if (foods && foods.length > 0) {
      console.log(`📊 Parsed ${foods.length} foods from Excel`);
      
      // Show progress message
      showMessage('Clearing existing foods and uploading new data...', 'success');
      
              // Smart upload strategy: Check if user is admin
        const { isCurrentUserAdmin } = await import('./auth');
        const isAdmin = await isCurrentUserAdmin();
        let shareGlobally = false; // Initialize for scope
      
      if (isAdmin) {
        // Admin upload: Choice between replacing all OR only Excel-sourced foods
        console.log('🔧 Admin upload detected - choosing upload strategy');
        
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
          console.log('🔧 Smart Mode activated: Preserving manually added admin foods');
          try {
            const { error } = await supabase
              .from('foods')
              .delete()
              .eq('created_by', 'Excel Upload')
              .is('user_id', null); // Only delete global Excel foods
            
            if (error) throw error;
            console.log('🗑️ Cleared only Excel-uploaded foods, manually added admin foods preserved');
          } catch (error) {
            console.warn('⚠️ Could not clear Excel foods:', error);
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
            console.log('🗑️ Cleared entire food database');
          } catch (error) {
            console.warn('⚠️ Could not clear database:', error);
          }
        }
        
      } else {
        // Regular user upload: Smart approach to prevent database bloat
        console.log('👤 User upload detected - using smart sharing approach');
        
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
          console.log('🌍 Smart sharing mode: Adding to global database');
          try {
            // Clear only Excel uploads to prevent endless duplication
            const { error } = await supabase
              .from('foods')
              .delete()
              .eq('created_by', 'Excel Upload')
              .is('user_id', null); // Only delete global Excel foods
            
            if (error) throw error;
            console.log('🗑️ Cleared previous Excel uploads to prevent duplication');
          } catch (error) {
            console.warn('⚠️ Could not clear previous Excel uploads:', error);
          }
        } else {
          // PERSONAL MODE: Traditional user-specific storage
          console.log('👤 Personal mode: User-specific storage');
          try {
            await clearAllFoodsForUser();
            console.log('🗑️ Cleared user\'s existing foods');
          } catch (error) {
            console.warn('⚠️ Could not clear existing foods:', error);
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
      console.log(`💾 Saving ${foodsWithMetadata.length} foods in bulk...`);
      
      let savedCount = 0;
      let errorCount = 0;
      
      try {
        await saveAllFoodsToDatabase(foodsWithMetadata);
        console.log(`✅ Successfully saved all ${foodsWithMetadata.length} foods`);
        savedCount = foodsWithMetadata.length;
        errorCount = 0;
      } catch (error) {
        console.error('❌ Failed to save foods in bulk:', error);
        // Fallback to individual saves if bulk fails
        console.log('🔄 Falling back to individual saves...');
        savedCount = 0;
        errorCount = 0;
        
        for (const food of foodsWithMetadata) {
          try {
            await saveFoodToDatabase(food);
            savedCount++;
          } catch (error) {
            console.warn('❌ Failed to save food:', food.name, error);
            errorCount++;
          }
        }
      }
      
      console.log(`📊 Save results: ${savedCount} saved, ${errorCount} errors`);
      
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
    console.error('❌ Error processing food file:', error);
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
    
    console.log('📊 Excel data converted to 2D array, first 3 rows:', lines.slice(0, 3));
    
    // Parse food data from the 2D array using the multi-section logic
    const foods = parseFoodLines(lines);
    
    console.log(`📊 Parsed ${foods.length} foods from Excel file`);
    resolve(foods);
  } catch (error) {
    console.error('❌ Error parsing Excel data:', error);
    reject(new Error('Failed to parse Excel file. Please check the format.'));
  }
}

function parseFoodLines(lines: any[][]): any[] {
  const foods: any[] = [];
  
  if (lines.length < 3) {
    console.error("Excel has too few rows to parse.");
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
      console.log(`⚠️ Skipping section "${sectionHeader}" - headers don't match expected format:`, groupHeaders);
      continue;
    }
    
    console.log(`📊 Processing section "${sectionHeader}" at column ${col}`);
    
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
    console.error('Error adding food:', error);
    showMessage('Error adding food', 'error');
  }
}

export async function addToShoppingList(foodId: string): Promise<void> {
  try {
    const food = allFoods.find(f => f.id === foodId);
    const quantityInput = document.getElementById(`qty-${foodId}`) as HTMLInputElement;
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
    
    if (food) {
      // Check if the item is already in the shopping list
      const existingItem = shoppingList.find(item => (item.food_id === foodId || item.id === foodId));
      
      if (existingItem) {
        // If it exists, just update the quantity
        existingItem.quantity += quantity;
      } else {
        // If it's a new item, add it to the list
        const newItem = {
          ...food,
          food_id: foodId,
          quantity: quantity
        };
        shoppingList.push(newItem);
      }

      // Save to database
      await addToShoppingListDB(foodId, quantity);
      
      // Reload shopping list from database to get proper IDs
      await loadShoppingListData();
      
      // Refresh the food display to update button states
      displayFoods(allFoods.filter(food => {
        const activeBtn = document.querySelector('.filter-btn.active');
        const activeCategory = activeBtn?.getAttribute('data-category') || 'all';
        return activeCategory === 'all' || food.category?.toLowerCase() === activeCategory.toLowerCase();
      }));
      
      // Trigger shopping list refresh in the Shopping List module
      try {
        if (typeof (window as any).loadAndDisplayShoppingList === 'function') {
          await (window as any).loadAndDisplayShoppingList();
          console.log('✅ Shopping list display refreshed');
        }
        
        // Also dispatch custom event for shopping list refresh
        const refreshEvent = new CustomEvent('shoppingListNeedsRefresh', {
          detail: { source: 'food-tracker', timestamp: Date.now() }
        });
        window.dispatchEvent(refreshEvent);
      } catch (error) {
        console.warn('⚠️ Could not refresh shopping list display:', error);
      }
      

      
    } else {
      console.error('Could not find food with ID:', foodId);
      showMessage('Error: Could not add item to list.', 'error');
    }
    
  } catch (error) {
    console.error('Error adding to shopping list:', error);
    showMessage('Error adding to shopping list', 'error');
  }
}

function showMessage(message: string, type: 'success' | 'error' = 'success'): void {
  // Create or update message element
  let messageEl = document.getElementById('food-tracker-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'food-tracker-message';
    messageEl.className = 'message';
    const container = document.getElementById('food-tracker') || document.body;
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

// Remove from shopping list function
export async function removeFromShoppingList(foodId: string, fromFoodCard: boolean = false): Promise<void> {
  try {
    // Find the item in the shopping list to get its database ID
    const itemToRemove = shoppingList.find(item => item.food_id === foodId || item.id === foodId);
    
    if (itemToRemove) {
      // Remove from database using the shopping list item's ID
      const { removeFromShoppingList: removeFromShoppingListDB } = await import('./database');
      await removeFromShoppingListDB(itemToRemove.id);
      
      // Remove from local array (filter by food_id for shopping list items, or id for food items)
      shoppingList = shoppingList.filter(item => 
        item.food_id !== foodId && item.id !== foodId
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
    console.error('Error removing from shopping list:', error);
    showMessage('Error removing item from shopping list', 'error');
  }
}

// Update shopping list display
export function updateShoppingListDisplay(): void {
  const shoppingItems = document.getElementById('shoppingItems');
  if (!shoppingItems) return;
  
      // Removed excessive logging for performance
  
  shoppingItems.innerHTML = '';
  let totalCarbs = 0;
  let totalFat = 0;
  let totalProtein = 0;

  // Force reload shopping list data if display shows empty but totals are non-zero
  if (shoppingList.length === 0) {
    shoppingItems.innerHTML = '<p class="empty-state">Your shopping list is empty. Add some foods from the Food Tracker!</p>';
    
    // Reset totals to zero when list is empty
    totalCarbs = 0;
    totalFat = 0;
    totalProtein = 0;
  } else {
    // Group items by category
    const grouped: { [key: string]: any[] } = {};
    shoppingList.forEach(item => {
      const category = item.category || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });

    Object.keys(grouped).sort().forEach(category => {
      const catDiv = document.createElement('div');
      catDiv.className = 'shopping-category-group';
      catDiv.innerHTML = `<h4 class="shopping-category-heading">${category}</h4>`;
      
      // Create grid container for items
      const itemsGrid = document.createElement('div');
      itemsGrid.className = 'shopping-category-items';
      
      grouped[category].forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shopping-item';
        const brand = item.brand || '';
        const name = item.name || '';
        
        // Create compact nutrition display
        const carbs = parseFloat(item.carbs) || 0;
        const fat = parseFloat(item.fat) || 0;
        const protein = parseFloat(item.protein) || 0;
        
        itemElement.innerHTML = `
          <div class="item-info">
            <h4>${name}</h4>
            ${brand ? `<span class="item-brand">Brand: ${brand}</span>` : ''}
            <div class="item-nutrition">
              <span>Carbs: ${carbs.toFixed(1)}g</span>
              <span>Fat: ${fat.toFixed(1)}g</span>  
              <span>Protein: ${protein.toFixed(1)}g</span>
            </div>
          </div>
          <div class="food-attribution">
            <span>Quantity: ${item.quantity}</span>
            <button class="remove-btn" onclick="handleRemoveFromShoppingList('${item.food_id || item.id}')">Remove</button>
          </div>
        `;
        itemsGrid.appendChild(itemElement);
        
        // Sum up nutrition for totals
        totalCarbs += carbs * item.quantity;
        totalFat += fat * item.quantity;
        totalProtein += protein * item.quantity;
      });
      
      catDiv.appendChild(itemsGrid);
      shoppingItems.appendChild(catDiv);
    });
  }
  
  // Update totals if elements exist
  const totalCarbsEl = document.getElementById('totalCarbs');
  const totalFatEl = document.getElementById('totalFat');
  const totalProteinEl = document.getElementById('totalProtein');
  
  if (totalCarbsEl) totalCarbsEl.textContent = totalCarbs.toFixed(1) + 'g';
  if (totalFatEl) totalFatEl.textContent = totalFat.toFixed(1) + 'g';
  if (totalProteinEl) totalProteinEl.textContent = totalProtein.toFixed(1) + 'g';
  
      // Removed excessive logging for performance
  
  // Force clear orphaned data if we have inconsistent state (empty list but non-zero totals)
  if (shoppingList.length === 0 && (totalCarbs > 0 || totalFat > 0 || totalProtein > 0)) {
    console.warn('⚠️ Detected orphaned shopping list data - clearing...');
    forceRefreshShoppingList();
  }
}

// Force refresh shopping list data (clears orphaned data)
async function forceRefreshShoppingList(): Promise<void> {
  try {
    console.log('🔧 Force refreshing shopping list to clear orphaned data...');
    
    // Clear database shopping list for current user
    await clearShoppingListFromDatabase();
    
    // Clear local array
    shoppingList = [];
    
    // Reload fresh data
    await loadShoppingListData();
    
    console.log('✅ Shopping list force refresh completed');
  } catch (error) {
    console.error('❌ Error during force refresh:', error);
  }
}

// Clear shopping list function
export async function clearShoppingList(): Promise<void> {
  try {
    console.log('🧹 FOOD-TRACKER: Starting shopping list clear...');
    
    // Clear from database first
    await clearShoppingListFromDatabase();
    console.log('✅ Database cleared');
    
    // Clear from local array
    shoppingList = [];
    console.log('✅ Local food-tracker array cleared');
    
    // Also try to clear the shopping-list.ts system (skip database since we already cleared it)
    try {
      if (typeof (window as any).clearAllShoppingItems === 'function') {
        await (window as any).clearAllShoppingItems(true); // true = skip database clear
        console.log('✅ shopping-list.ts system also cleared');
      }
    } catch (error) {
      console.warn('⚠️ Could not clear shopping-list.ts system:', error);
    }
    
    updateShoppingListDisplay();
    
    // Refresh the food display to update all button states
    displayFoods(allFoods.filter(food => {
      const activeBtn = document.querySelector('.filter-btn.active');
      const activeCategory = activeBtn?.getAttribute('data-category') || 'all';
      return activeCategory === 'all' || food.category?.toLowerCase() === activeCategory.toLowerCase();
    }));
    
    console.log('🎉 Shopping list fully cleared!');
    showMessage('Shopping list cleared! 🧹', 'success');
  } catch (error) {
    console.error('❌ Error clearing shopping list:', error);
    showMessage('Error clearing shopping list', 'error');
  }
}

// Reload shopping list from database and update display
export async function reloadShoppingListFromDatabase(): Promise<void> {
  console.log('🔄 Reloading shopping list from database...');
  await loadShoppingListData();
  console.log('✅ Shopping list reloaded successfully');
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
    printShoppingList: () => void;
    handleClearFoodTracker: () => void;
    reloadFoodTracker: () => Promise<void>;
    loadAndDisplayFoods: () => Promise<void>;
    editFood: (foodId: string) => void;
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
window.printShoppingList = printShoppingList;
window.loadAndDisplayFoods = loadAndDisplayFoods;
window.reloadFoodTracker = loadAndDisplayFoods; // Alias for reloadFoodTracker
window.editFood = editFood;

// Debug function for console use
(window as any).debugShoppingList = function() {
  console.log('🔧 DEBUG: Shopping List State');
  console.log('📊 FOOD-TRACKER array length:', shoppingList.length);
  console.log('📋 FOOD-TRACKER array contents:', shoppingList);
  
  // Also check shopping-list.ts system
  if (typeof (window as any).getCurrentShoppingList === 'function') {
    const currentList = (window as any).getCurrentShoppingList();
    console.log('📊 SHOPPING-LIST array length:', currentList.length);
    console.log('📋 SHOPPING-LIST array contents:', currentList);
  }
  
  updateShoppingListDisplay();
};

(window as any).forceFixShoppingList = function() {
  console.log('🔧 FORCE FIX: Clearing shopping list completely');
  forceRefreshShoppingList().then(() => {
    console.log('✅ Shopping list force fix completed');
  }).catch(error => {
    console.error('❌ Error during force fix:', error);
  });
};
window.handleClearFoodTracker = () => {
  handleClearFoodTracker().catch(error => {
    console.error('Error clearing food tracker:', error);
    showMessage('Error clearing food tracker', 'error');
  });
};

// Wrapper function for clear shopping list - ensure both systems are cleared
function handleClearShoppingList(): void {
  console.log('🗑️ FOOD-TRACKER: Clear shopping list requested...');
  
  // Check if we have items to clear
  if (!shoppingList || shoppingList.length === 0) {
    showMessage('Shopping list is already empty!', 'success');
    return;
  }
  
  const confirmed = confirm(`Are you sure you want to clear all ${shoppingList.length} items from your shopping list? This cannot be undone.`);
  
  if (confirmed) {
    clearShoppingList().catch(error => {
      console.error('Error clearing shopping list:', error);
      showMessage('Error clearing shopping list', 'error');
    });
  } else {
    console.log('🚫 Clear shopping list cancelled by user');
  }
}

// Wrapper function for remove from shopping list  
function handleRemoveFromShoppingList(foodId: string, fromFoodCard: boolean = false): void {
  removeFromShoppingList(foodId, fromFoodCard).catch(error => {
    console.error('Error removing from shopping list:', error);
    showMessage('Error removing item', 'error');
  });
}

// Print shopping list function
export function printShoppingList(): void {
  if (!shoppingList || shoppingList.length === 0) {
    showMessage('Your shopping list is empty. Add some items first!', 'error');
    return;
  }

  // Get current user information
  const currentUser = getCurrentAuthUser();
  const userName = currentUser?.user_metadata?.name || currentUser?.email || 'User';

  // Create a print-friendly version of the shopping list
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showMessage('Please allow popups to print your shopping list', 'error');
    return;
  }

  // Calculate totals
  let totalCarbs = 0;
  let totalFat = 0;
  let totalProtein = 0;
  let totalItems = 0;

  shoppingList.forEach(item => {
    totalCarbs += (parseFloat(item.carbs) || 0) * item.quantity;
    totalFat += (parseFloat(item.fat) || 0) * item.quantity;
    totalProtein += (parseFloat(item.protein) || 0) * item.quantity;
    totalItems += item.quantity;
  });

  // Group items by category
  const grouped: { [key: string]: any[] } = {};
  shoppingList.forEach(item => {
    const category = item.category || 'Other';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
  });

  // Generate print HTML
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>NutriValor - Shopping List</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 10px; 
          line-height: 1.2;
          font-size: 12px;
        }
        .header {
          text-align: center;
          border-bottom: 1px solid #333;
          padding-bottom: 8px;
          margin-bottom: 15px;
        }
        .header h1 {
          font-size: 18px;
          margin: 0 0 5px 0;
        }
        .user-info {
          font-size: 12px;
          color: #667eea;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .header p {
          font-size: 10px;
          margin: 0;
          color: #666;
        }
        .content-wrapper {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          column-fill: balance;
        }
        .category {
          margin-bottom: 12px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .category-title {
          background: #f5f5f5;
          padding: 4px 8px;
          font-weight: bold;
          font-size: 13px;
          border-left: 3px solid #667eea;
          margin-bottom: 5px;
        }
        .item {
          padding: 3px 8px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          font-size: 11px;
        }
        .item-checkbox {
          width: 12px;
          height: 12px;
          border: 1px solid #333;
          margin-right: 8px;
          margin-top: 2px;
          flex-shrink: 0;
        }
        .item-details {
          flex: 1;
          margin-right: 8px;
        }
        .item-name {
          font-weight: bold;
          font-size: 12px;
          line-height: 1.2;
        }
        .item-brand {
          color: #666;
          font-style: italic;
          font-size: 10px;
          line-height: 1.1;
        }
        .item-nutrition {
          font-size: 9px;
          color: #888;
          line-height: 1.1;
          margin-top: 2px;
        }
        .item-quantity {
          font-weight: bold;
          color: #667eea;
          font-size: 11px;
          white-space: nowrap;
        }
        .totals {
          margin-top: 15px;
          border: 1px solid #333;
          padding: 10px;
          background: #f9f9f9;
          break-inside: avoid;
          page-break-inside: avoid;
          grid-column: 1 / -1;
        }
        .totals-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 8px;
          text-align: center;
        }
        .totals-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          text-align: center;
        }
        .total-item {
          padding: 5px;
          background: white;
          border-radius: 3px;
        }
        .total-label {
          font-size: 9px;
          color: #666;
          display: block;
        }
        .total-value {
          font-size: 12px;
          font-weight: bold;
          color: #333;
        }
        .footer {
          margin-top: 15px;
          text-align: center;
          font-size: 9px;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 5px;
          grid-column: 1 / -1;
        }
        @media screen and (max-width: 600px) {
          .content-wrapper {
            grid-template-columns: 1fr;
          }
        }
        @media print {
          body { margin: 5px; }
          .category { break-inside: avoid; page-break-inside: avoid; }
          .item { break-inside: avoid; }
          .totals { break-inside: avoid; page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>NutriValor Shopping List</h1>
        <div class="user-info">For: ${userName}</div>
        <p>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
      </div>
      
      <div class="content-wrapper">
        ${Object.keys(grouped).sort().map(category => `
          <div class="category">
            <div class="category-title">${category}</div>
            ${grouped[category].map(item => `
              <div class="item">
                <div class="item-checkbox"></div>
                <div class="item-details">
                  <div class="item-name">${item.name}</div>
                  ${item.brand ? `<div class="item-brand">${item.brand}</div>` : ''}
                  <div class="item-nutrition">
                    C:${formatNutrition(item.carbs)}g F:${formatNutrition(item.fat)}g P:${formatNutrition(item.protein)}g
                  </div>
                </div>
                <div class="item-quantity">${item.quantity}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
        
        <div class="totals">
          <div class="totals-title">Nutrition Totals</div>
          <div class="totals-grid">
            <div class="total-item">
              <span class="total-label">Items</span>
              <div class="total-value">${totalItems}</div>
            </div>
            <div class="total-item">
              <span class="total-label">Carbs</span>
              <div class="total-value">${totalCarbs.toFixed(1)}g</div>
            </div>
            <div class="total-item">
              <span class="total-label">Fat</span>
              <div class="total-value">${totalFat.toFixed(1)}g</div>
            </div>
            <div class="total-item">
              <span class="total-label">Protein</span>
              <div class="total-value">${totalProtein.toFixed(1)}g</div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>© NutriValor - Value your Nutrition</p>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  
  showMessage('Opening print dialog...', 'success');
}

// Clear all food items from Food Tracker
export async function handleClearFoodTracker(): Promise<void> {
  console.log('🗑️ Clear food tracker requested...');
  
  if (!allFoods || allFoods.length === 0) {
    showMessage('Food tracker is already empty!', 'error');
    return;
  }
  
  const confirmed = confirm(`Are you sure you want to clear all ${allFoods.length} food items from the Food Tracker? This will also clear your shopping list. This action cannot be undone.`);
  
  if (!confirmed) {
    console.log('🚫 Clear food tracker cancelled by user');
    return;
  }
  
  try {
    // Get current user
    const user = await getCurrentAuthUser();
    if (!user) {
      showMessage('Please log in first.', 'error');
      return;
    }
    
    console.log('🗑️ Clearing all foods for user...');
    
    // Clear foods from database
    await clearAllFoodsForUser();
    
    // Clear shopping list from database as well since it depends on foods
    await clearShoppingListFromDatabase();
    
    // Clear local data
    allFoods = [];
    shoppingList = [];
    
    // Update displays
    displayFoods([]);
    updateShoppingListDisplay();
    
    // Clear category filters (reset to just ALL)
    const categoryFiltersContainer = document.querySelector('.category-filters');
    if (categoryFiltersContainer) {
      categoryFiltersContainer.innerHTML = '<button class="filter-btn active" onclick="filterByCategory(\'all\')">ALL</button>';
    }
    
    // Clear last update info
    localStorage.removeItem('lastFoodUploadDate');
    const lastUpdateInfo = document.getElementById('lastUpdateInfo');
    if (lastUpdateInfo) {
      lastUpdateInfo.style.display = 'none';
    }
    
    showMessage('Food tracker and shopping list cleared successfully!', 'success');
    console.log('✅ Food tracker cleared successfully');
    
  } catch (error) {
    console.error('❌ Error clearing food tracker:', error);
    showMessage('Error clearing food tracker: ' + (error as Error).message, 'error');
  }
}

// Add editFood function
export function editFood(foodId: string): void {
    const food = allFoods.find(f => f.id === foodId);
    if (!food) {
        console.error('Food not found:', foodId);
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
        console.error('Edit form elements not found');
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
        console.error('Error deleting food:', error);
        showMessage('Error deleting food', 'error');
    }
}

// Setup form submission handler
document.addEventListener('DOMContentLoaded', () => {
    const editFoodForm = document.getElementById('editFoodForm') as HTMLFormElement;
    if (editFoodForm) {
        editFoodForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const foodId = (document.getElementById('editFoodId') as HTMLInputElement).value;
            const name = (document.getElementById('editFoodName') as HTMLInputElement).value;
            const brand = (document.getElementById('editFoodBrand') as HTMLInputElement).value;
            const carbs = parseFloat((document.getElementById('editFoodCarbs') as HTMLInputElement).value);
            const fat = parseFloat((document.getElementById('editFoodFat') as HTMLInputElement).value);
            const protein = parseFloat((document.getElementById('editFoodProtein') as HTMLInputElement).value);
            const instructions = (document.getElementById('editFoodInstructions') as HTMLTextAreaElement).value;
            const category = (document.getElementById('editFoodCategory') as HTMLSelectElement).value;

            try {
                const updatedFood = {
                    id: foodId,
                    name,
                    brand,
                    carbs,
                    fat,
                    protein,
                    instructions,
                    category
                };

                await updateFoodInDatabase(updatedFood);
                showMessage('Food updated successfully', 'success');
                cancelFoodEdit();
                await loadAndDisplayFoods();
            } catch (error) {
                console.error('Error updating food:', error);
                showMessage('Error updating food', 'error');
            }
        });
    }
});