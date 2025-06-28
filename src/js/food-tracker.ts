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
  const foodFileInput = document.getElementById('foodFileInput');
  if (foodFileInput) {
    foodFileInput.addEventListener('change', handleFoodFileUpload);
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
    const foods = await loadFoodsFromDatabase();
    displayFoods(foods);
  } catch (error) {
    console.error('Error loading foods:', error);
    showMessage('Error loading foods', 'error');
  }
}

export function displayFoods(foods: any[]): void {
  const foodGrid = document.getElementById('foodGrid');
  if (!foodGrid) return;

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
    
    // Basic file validation
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      throw new Error('Please upload an Excel file (.xlsx or .xls)');
    }

    // File processing will be implemented here
    console.log('Processing file:', file.name);
    showMessage('File upload functionality will be implemented', 'success');
    
  } catch (error) {
    console.error('Error processing food file:', error);
    showMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
}

export async function addFood(foodData: any): Promise<void> {
  try {
    await saveFoodToDatabase(foodData);
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
    const button = quantityInput?.parentElement?.querySelector('.add-btn');
    if (button) {
      button.textContent = 'Added';
      button.classList.add('added');
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
    const container = document.querySelector('.food-section') || document.body;
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