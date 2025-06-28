import { supabase } from './supabase-client';
import { 
  saveFoodToDatabase, 
  loadFoodsFromDatabase, 
  updateFoodInDatabase, 
  deleteFoodFromDatabase,
  addToShoppingList as addToShoppingListDB
} from './database';

// Food Tracker Module
export async function initializeFoodTracker(): Promise<void> {
  console.log('🍎 Initializing food tracker...');
  setupFoodTrackerEventListeners();
  await loadAndDisplayFoods();
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
  // Implementation for category filtering will be added
  console.log('Setting up category filters...');
}

function setupSearchFunctionality(): void {
  // Implementation for search functionality will be added
  console.log('Setting up search functionality...');
}

export async function loadAndDisplayFoods(): Promise<void> {
  try {
    console.log('📊 Loading foods from database...');
    const foods = await loadFoodsFromDatabase();
    console.log(`📊 Loaded ${foods.length} foods from database`);
    displayFoods(foods);
  } catch (error) {
    console.error('❌ Error loading foods:', error);
    showMessage('Error loading foods: ' + (error as Error).message, 'error');
  }
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
  foodGrid.innerHTML = foods.map(food => `
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
        <button class="add-btn" onclick="addToShoppingList('${food.id}')">
          Add to List
        </button>
      </div>
    </div>
  `).join('');
  
  console.log('✅ Food cards displayed successfully');
}

function formatNutrition(value: any): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  return isNaN(num) ? '0' : num.toFixed(1);
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
      
      // Add user_id to each food item
      const foodsWithUserId = foods.map(food => ({
        ...food,
        user_id: user.id
      }));
      
      // Save each food to database
      let savedCount = 0;
      let errorCount = 0;
      
      for (const food of foodsWithUserId) {
        try {
          await saveFoodToDatabase(food);
          savedCount++;
          console.log(`✅ Saved food: ${food.name}`);
        } catch (error) {
          console.warn('❌ Failed to save food:', food.name, error);
          errorCount++;
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
    
    // Convert to JSON first
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const foods: any[] = [];
    
    // Parse food data from Excel (skip header row)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length < 5) continue;
      
      const food = {
        name: String(row[0] || '').trim(),
        brand: String(row[1] || '').trim(),
        carbs: parseFloat(String(row[2] || '0')) || 0,
        fat: parseFloat(String(row[3] || '0')) || 0,
        protein: parseFloat(String(row[4] || '0')) || 0,
        category: String(row[5] || 'General').trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Only add if name is not empty
      if (food.name && food.name.length > 0) {
        foods.push(food);
      }
    }
    
    console.log(`📊 Parsed ${foods.length} foods from Excel file`);
    resolve(foods);
  } catch (error) {
    console.error('❌ Error parsing Excel data:', error);
    reject(new Error('Failed to parse Excel file. Please check the format.'));
  }
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
    const quantityInput = document.getElementById(`qty-${foodId}`) as HTMLInputElement;
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
    
    await addToShoppingListDB(foodId, quantity);
    showMessage('Added to shopping list', 'success');
    
    // Update button state
    const button = quantityInput?.parentElement?.querySelector('.add-btn') as HTMLElement;
    if (button) {
      button.textContent = 'Added ✓';
      button.classList.add('added');
      
      // Reset after 2 seconds
      setTimeout(() => {
        button.textContent = 'Add to List';
        button.classList.remove('added');
      }, 2000);
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

// Make functions available globally for onclick handlers
declare global {
  interface Window {
    addToShoppingList: (foodId: string) => Promise<void>;
    filterByCategory: (category: string) => void;
  }
}

window.addToShoppingList = addToShoppingList;