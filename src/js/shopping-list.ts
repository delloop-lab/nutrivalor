import { 
  loadShoppingListFromDatabase, 
  removeFromShoppingList,
  updateShoppingListQuantity
} from './database';

// Store shopping list items for quick lookup
let currentShoppingList: any[] = [];

// Initialize shopping list functionality
export async function initializeShoppingList(): Promise<void> {
  console.log('🛒 Initializing shopping list...');
  await loadAndDisplayShoppingList();
}

// Load and display shopping list
export async function loadAndDisplayShoppingList(): Promise<void> {
  try {
    console.log('🛒 Loading shopping list from database...');
    const items = await loadShoppingListFromDatabase();
    currentShoppingList = items;
    
    console.log(`🛒 Loaded ${items.length} items from shopping list`);
    displayShoppingList(items);
  } catch (error) {
    console.error('❌ Error loading shopping list:', error);
    displayShoppingList([]);
  }
}

// Display shopping list items
function displayShoppingList(items: any[]): void {
  const shoppingItemsContainer = document.getElementById('shoppingItems');
  const shoppingTotalsContainer = document.getElementById('shoppingTotals');
  
  if (!shoppingItemsContainer) {
    console.warn('❌ Shopping items container not found');
    return;
  }

  if (items.length === 0) {
    shoppingItemsContainer.innerHTML = '<p class="empty-state">Your shopping list is empty. Add items from the Food Tracker!</p>';
    if (shoppingTotalsContainer) {
      shoppingTotalsContainer.style.display = 'none';
    }
    return;
  }

  // Display items
  shoppingItemsContainer.innerHTML = items.map(item => `
    <div class="shopping-item" data-id="${item.id}">
      <div class="item-info">
        <h4>${item.name}</h4>
        ${item.brand ? `<div class="brand-info">Brand: ${item.brand}</div>` : ''}
        <div class="nutrition-info">
          <span>Carbs: ${formatNutrition(item.carbs)}g</span>
          <span>Fat: ${formatNutrition(item.fat)}g</span>
          <span>Protein: ${formatNutrition(item.protein)}g</span>
        </div>
        <div class="category-info">${item.category || 'General'}</div>
      </div>
      <div class="item-controls">
        <div class="quantity-controls">
          <button onclick="updateItemQuantity('${item.id}', ${item.quantity - 1})" class="qty-btn" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
          <span class="quantity">${item.quantity}</span>
          <button onclick="updateItemQuantity('${item.id}', ${item.quantity + 1})" class="qty-btn">+</button>
        </div>
        <button onclick="removeShoppingItem('${item.id}')" class="remove-btn">Remove</button>
      </div>
    </div>
  `).join('');

  // Calculate and display totals
  const totals = calculateTotals(items);
  if (shoppingTotalsContainer) {
    shoppingTotalsContainer.style.display = 'block';
    shoppingTotalsContainer.innerHTML = `
      <div class="totals-header">
        <h3>Shopping List Totals</h3>
        <span class="total-items">${totals.totalItems} items</span>
      </div>
      <div class="totals-grid">
        <div class="total-item">
          <span class="label">Total Carbs:</span>
          <span class="value">${totals.totalCarbs.toFixed(1)}g</span>
        </div>
        <div class="total-item">
          <span class="label">Total Fat:</span>
          <span class="value">${totals.totalFat.toFixed(1)}g</span>
        </div>
        <div class="total-item">
          <span class="label">Total Protein:</span>
          <span class="value">${totals.totalProtein.toFixed(1)}g</span>
        </div>
      </div>
    `;
  }
}

// Calculate totals for shopping list
function calculateTotals(items: any[]): any {
  const totals = {
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalCarbs: 0,
    totalFat: 0,
    totalProtein: 0
  };

  items.forEach(item => {
    totals.totalCarbs += (parseFloat(item.carbs) || 0) * item.quantity;
    totals.totalFat += (parseFloat(item.fat) || 0) * item.quantity;
    totals.totalProtein += (parseFloat(item.protein) || 0) * item.quantity;
  });

  return totals;
}

// Format nutrition values
function formatNutrition(value: any): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  return isNaN(num) ? '0' : num.toFixed(1);
}

// Remove item from shopping list
export async function removeShoppingItem(id: string): Promise<void> {
  try {
    await removeFromShoppingList(id);
    await loadAndDisplayShoppingList(); // Refresh display
    showMessage('Item removed from shopping list', 'success');
  } catch (error) {
    console.error('Error removing item:', error);
    showMessage('Error removing item', 'error');
  }
}

// Update item quantity
export async function updateItemQuantity(id: string, newQuantity: number): Promise<void> {
  if (newQuantity < 1) {
    // Remove item if quantity becomes 0
    await removeShoppingItem(id);
    return;
  }

  try {
    await updateShoppingListQuantity(id, newQuantity);
    await loadAndDisplayShoppingList(); // Refresh display
  } catch (error) {
    console.error('Error updating quantity:', error);
    showMessage('Error updating quantity', 'error');
  }
}

// Clear all items from shopping list
export async function clearAllShoppingItems(): Promise<void> {
  try {
    // Remove all items one by one
    for (const item of currentShoppingList) {
      await removeFromShoppingList(item.id);
    }
    await loadAndDisplayShoppingList(); // Refresh display
    showMessage('Shopping list cleared', 'success');
  } catch (error) {
    console.error('Error clearing shopping list:', error);
    showMessage('Error clearing shopping list', 'error');
  }
}

// Check if a food item is in the shopping list
export function isInShoppingList(foodId: string): boolean {
  return currentShoppingList.some(item => item.food_id === foodId);
}

// Get current shopping list (for other modules to access)
export function getCurrentShoppingList(): any[] {
  return currentShoppingList;
}

// Show message helper
function showMessage(message: string, type: 'success' | 'error' = 'success'): void {
  // Create or update message element
  let messageEl = document.getElementById('shopping-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'shopping-message';
    messageEl.className = 'message';
    const container = document.getElementById('shopping-list') || document.body;
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

// Make functions globally available
declare global {
  interface Window {
    removeShoppingItem: (id: string) => Promise<void>;
    updateItemQuantity: (id: string, newQuantity: number) => Promise<void>;
  }
}

window.removeShoppingItem = removeShoppingItem;
 