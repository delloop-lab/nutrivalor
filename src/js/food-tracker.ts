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
  console.log('🍎 Initializing food tracker...');
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
    console.log('✅ Food file input listener attached');
  } else {
    console.warn('❌ Food file input not found');
  }

  // Add other event listeners as needed
  setupCategoryFilters();
  setupSearchFunctionality();
}

function setupCategoryFilters(): void {
  // Category filtering will be set up after foods are loaded
  console.log('Category filters will be initialized after loading foods...');
}

function setupSearchFunctionality(): void {
  // Implementation for search functionality will be added
  console.log('Setting up search functionality...');
}

// Store all foods for filtering and shopping list
let allFoods: any[] = [];
let shoppingList: any[] = [];

// Load shopping list data from database
async function loadShoppingListData(): Promise<void> {
  try {
    console.log('🛒 Loading shopping list from database...');
    const dbShoppingList = await loadShoppingListFromDatabase();
    shoppingList = dbShoppingList || [];
    console.log(`🛒 Loaded ${shoppingList.length} items in shopping list`);
    updateShoppingListDisplay();
  } catch (error) {
    console.error('❌ Error loading shopping list:', error);
    shoppingList = []; // Initialize as empty array on error
  }
}

export async function loadAndDisplayFoods(): Promise<void> {
  try {
    console.log('📊 Loading foods from database...');
    const foods = await loadFoodsFromDatabase();
    console.log(`📊 Loaded ${foods.length} foods from database`);
    
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
  
  console.log(`✅ Created filters for categories: ${categories.join(', ')}`);
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

  console.log(`🍽️ Displaying ${foods.length} foods`);

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
        <div class="food-actions">
          <input type="number" class="quantity-input" value="1" min="1" id="qty-${food.id}">
          <button class="${buttonClass}" onclick="${buttonAction}">
            ${buttonText}
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  console.log('✅ Food cards displayed successfully');
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
      
      // First, clear all existing foods for this user
      try {
        await clearAllFoodsForUser();
        console.log('🗑️ Cleared all existing foods');
      } catch (error) {
        console.warn('⚠️ Could not clear existing foods:', error);
        // Continue with upload even if clearing fails
      }
      
      // Add user_id to each food item
      const foodsWithUserId = foods.map(food => ({
        ...food,
        user_id: user.id
      }));
      
      // Save all foods to database in bulk (much faster!)
      console.log(`💾 Saving ${foodsWithUserId.length} foods in bulk...`);
      
      let savedCount = 0;
      let errorCount = 0;
      
      try {
        await saveAllFoodsToDatabase(foodsWithUserId);
        console.log(`✅ Successfully saved all ${foodsWithUserId.length} foods`);
        savedCount = foodsWithUserId.length;
        errorCount = 0;
      } catch (error) {
        console.error('❌ Failed to save foods in bulk:', error);
        // Fallback to individual saves if bulk fails
        console.log('🔄 Falling back to individual saves...');
        savedCount = 0;
        errorCount = 0;
        
        for (const food of foodsWithUserId) {
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
      user_id: user.id
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
  
  shoppingItems.innerHTML = '';
  let totalCarbs = 0;
  let totalFat = 0;
  let totalProtein = 0;

  if (shoppingList.length === 0) {
    shoppingItems.innerHTML = '<p class="empty-state">Your shopping list is empty. Add some foods from the Food Tracker!</p>';
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
            <span class="item-quantity">Qty: ${item.quantity}</span>
          </div>
          <div class="item-nutrition">
            <span>carbs: ${carbs.toFixed(1)}g</span>
            <span>fat: ${fat.toFixed(1)}g</span>  
            <span>protein: ${protein.toFixed(1)}g</span>
          </div>
          <button class="remove-btn" onclick="handleRemoveFromShoppingList('${item.food_id || item.id}')">Remove</button>
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
}

// Clear shopping list function
export async function clearShoppingList(): Promise<void> {
  try {
    // Clear from database first
    await clearShoppingListFromDatabase();
    
    // Clear from local array
    shoppingList = [];
    
    updateShoppingListDisplay();
    
    // Refresh the food display to update all button states
    displayFoods(allFoods.filter(food => {
      const activeBtn = document.querySelector('.filter-btn.active');
      const activeCategory = activeBtn?.getAttribute('data-category') || 'all';
      return activeCategory === 'all' || food.category?.toLowerCase() === activeCategory.toLowerCase();
    }));
    
    showMessage('Shopping list cleared! 🧹', 'success');
  } catch (error) {
    console.error('Error clearing shopping list:', error);
    showMessage('Error clearing shopping list', 'error');
  }
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
    printShoppingList: () => void;
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
window.printShoppingList = printShoppingList;

// Wrapper function for clear shopping list
function handleClearShoppingList(): void {
  clearShoppingList().catch(error => {
    console.error('Error clearing shopping list:', error);
    showMessage('Error clearing shopping list', 'error');
  });
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