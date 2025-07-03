import { 
  loadShoppingListFromDatabase, 
  removeFromShoppingList,
  updateShoppingListQuantity
} from './database';

// Store shopping list items for quick lookup
let currentShoppingList: any[] = [];

// Initialize shopping list functionality
export async function initializeShoppingList(): Promise<void> {
  // Removed excessive logging for performance
  await loadAndDisplayShoppingList();
  
  // Set up event listener for cross-module refresh requests
  window.addEventListener('shoppingListNeedsRefresh', async (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log('📡 Received shopping list refresh event from:', customEvent.detail?.source);
    try {
      await loadAndDisplayShoppingList();
      console.log('✅ Shopping list refreshed via event listener');
    } catch (error) {
      console.error('❌ Error refreshing shopping list via event:', error);
    }
  });
  
      // Removed excessive logging for performance
}

// Load and display shopping list
export async function loadAndDisplayShoppingList(): Promise<void> {
  try {
      // Removed excessive logging for performance
    const items = await loadShoppingListFromDatabase();
    
    // Removed excessive logging for performance
    
    // Update local cache
    currentShoppingList = items || [];
    
    // Removed excessive logging for performance
    
    // Removed excessive logging for performance
    displayShoppingList(currentShoppingList);
    
    // Refresh meal plan checkboxes to reflect current shopping list state
    try {
      if (typeof (window as any).refreshMealShoppingCheckboxes === 'function') {
        await (window as any).refreshMealShoppingCheckboxes();
        // Removed excessive logging for performance
      }
    } catch (error) {
      console.warn('⚠️ Could not refresh meal plan checkboxes:', error);
    }
    
  } catch (error) {
    console.error('❌ Error loading shopping list:', error);
    // Clear local cache on error
    currentShoppingList = [];
    displayShoppingList([]);
  }
}

// Consolidate duplicate items by combining quantities
function consolidateItems(items: any[]): any[] {
  const consolidated: Record<string, any> = {};
  
  items.forEach(item => {
    // Create a more specific key that includes name and brand for better matching
    const brand = item.brand || 'Any';
    const category = item.category || 'General';
    const key = `${item.name.toLowerCase().trim()}_${brand.toLowerCase().trim()}_${category.toLowerCase().trim()}`;
    
    console.log(`🔍 Processing item: ${item.name}, Brand: ${brand}, Category: ${category}, Key: ${key}`);
    console.log(`🔍 Item quantity RAW: value="${item.quantity}", type="${typeof item.quantity}", parsed=${parseInt(item.quantity)}`);
    
    if (consolidated[key]) {
      // Item already exists, add quantities together
      const oldQty = consolidated[key].quantity;
      const addQty = parseInt(item.quantity) || 1;
      consolidated[key].quantity = (parseInt(oldQty) || 1) + addQty;
      console.log(`🔄 Consolidated ${item.name}: ${oldQty} + ${addQty} = ${consolidated[key].quantity} total quantity`);
    } else {
      // New item, add to consolidated list
      const quantity = parseInt(item.quantity) || 1;
      consolidated[key] = { ...item, quantity: quantity };
      console.log(`➕ Added new item: ${item.name} with quantity ${quantity} (original: ${item.quantity}, type: ${typeof item.quantity})`);
    }
  });
  
  console.log(`📦 Consolidation complete: ${Object.keys(consolidated).length} unique items`);
  return Object.values(consolidated);
}

// Display shopping list items
function displayShoppingList(items: any[]): void {
  const shoppingItemsContainer = document.getElementById('shoppingItems');
  const shoppingTotalsContainer = document.getElementById('shoppingTotals');
  
  // Removed excessive logging for performance
  
  if (!shoppingItemsContainer) {
    console.warn('❌ Shopping items container not found');
    return;
  }

  // Clear totals first to avoid inconsistency
  if (shoppingTotalsContainer) {
    shoppingTotalsContainer.style.display = 'none';
    shoppingTotalsContainer.innerHTML = '';
  }

  if (!items || items.length === 0) {
    // Removed excessive logging for performance
    shoppingItemsContainer.innerHTML = '<p class="empty-state">Your shopping list is empty. Add items from the Food Tracker!</p>';
    // Ensure totals are hidden for empty state
    if (shoppingTotalsContainer) {
      shoppingTotalsContainer.style.display = 'none';
    }
    return;
  }

  console.log('🛒 Processing', items.length, 'items for display');

  // Consolidate duplicate items first
  const consolidatedItems = consolidateItems(items);
  console.log('🛒 After consolidation:', consolidatedItems.length, 'unique items');

  // Group consolidated items by category
  const itemsByCategory = consolidatedItems.reduce((groups: Record<string, any[]>, item: any) => {
    const category = item.category || item.brand || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, any[]>);

  console.log('🛒 Items grouped by category:', Object.keys(itemsByCategory));

  // Sort categories with SUNDRIES at the end
  const categoryOrder = Object.keys(itemsByCategory).sort((a, b) => {
    if (a === 'SUNDRIES') return 1;
    if (b === 'SUNDRIES') return -1;
    return a.localeCompare(b);
  });

  // Display items grouped by category
  shoppingItemsContainer.innerHTML = categoryOrder.map(category => {
    const categoryItems = itemsByCategory[category];
    const isSundries = category === 'SUNDRIES';
    
    return `
      <div class="shopping-category">
        <h3 class="category-header ${isSundries ? 'sundries-header' : ''}">${category}${isSundries ? ' (From Meal Plans)' : ''}</h3>
        <div class="category-items">
          ${categoryItems.map(item => `
            <div class="shopping-item" data-id="${item.id}">
              <div class="item-info">
                <h4>${item.name}</h4>
                <div class="quantity-display">Qty: ${item.quantity}</div>
                ${item.brand && item.brand !== 'SUNDRIES' ? `<div class="brand-info">Brand: ${item.brand}</div>` : ''}
                <div class="nutrition-info">
                  <span>Carbs: ${formatNutrition(item.carbs)}g</span>
                  <span>Fat: ${formatNutrition(item.fat)}g</span>
                  <span>Protein: ${formatNutrition(item.protein)}g</span>
                </div>
                ${!isSundries ? `<div class="category-info">${item.category || 'General'}</div>` : ''}
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
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Calculate and display totals ONLY if we have items
  const totals = calculateTotals(consolidatedItems);
  console.log('🛒 Calculated totals:', totals);
  
  if (shoppingTotalsContainer && totals.totalItems > 0) {
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
    
    // Refresh meal plan checkboxes to reflect changes
    try {
      if (typeof (window as any).refreshMealShoppingCheckboxes === 'function') {
        await (window as any).refreshMealShoppingCheckboxes();
        console.log('✅ Meal plan checkboxes refreshed after item removal');
      }
    } catch (error) {
      console.warn('⚠️ Could not refresh meal plan checkboxes:', error);
    }
    
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
    
    // No need to refresh checkboxes for quantity changes - only for add/remove
    
  } catch (error) {
    console.error('Error updating quantity:', error);
    showMessage('Error updating quantity', 'error');
  }
}

// Clear all items from shopping list
export async function clearAllShoppingItems(skipDatabase: boolean = false): Promise<void> {
  console.log('🧹 SHOPPING-LIST: Starting shopping list clear...');
  
  try {
    // Clear from database only if not skipped (to avoid double-clearing)
    if (!skipDatabase) {
      const { clearShoppingListFromDatabase } = await import('./database');
      await clearShoppingListFromDatabase();
      console.log('✅ Database cleared successfully');
    } else {
      console.log('⏭️ Database clear skipped (already done by food-tracker)');
    }
    
    // Clear local array
    currentShoppingList = [];
    console.log('✅ Local shopping list array cleared');
    
    // Update display
    displayShoppingList([]);
    console.log('✅ Display updated');
    
    // Refresh meal plan checkboxes to reflect changes
    try {
      if (typeof (window as any).refreshMealShoppingCheckboxes === 'function') {
        await (window as any).refreshMealShoppingCheckboxes();
        console.log('✅ Meal plan checkboxes refreshed after clearing list');
      }
    } catch (error) {
      console.warn('⚠️ Could not refresh meal plan checkboxes:', error);
    }
    
    if (!skipDatabase) {
      showMessage('Shopping list cleared', 'success');
    }
  } catch (error) {
    console.error('❌ Error clearing shopping list:', error);
    if (!skipDatabase) {
      showMessage('Error clearing shopping list', 'error');
    }
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
function showMessage(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
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
    loadAndDisplayShoppingList: () => Promise<void>;
    printShoppingList: () => void;
    handleClearShoppingList: () => void;
  }
}

// Expose functions globally
(window as any).removeShoppingItem = removeShoppingItem;
(window as any).updateItemQuantity = updateItemQuantity;
(window as any).loadAndDisplayShoppingList = loadAndDisplayShoppingList;
(window as any).printShoppingList = printShoppingList;
(window as any).clearAllShoppingItems = clearAllShoppingItems;
(window as any).getCurrentShoppingList = getCurrentShoppingList;
// Note: Don't expose handleClearShoppingList here since food-tracker.ts handles the main clear button

// Print shopping list
export function printShoppingList(): void {
  console.log('🖨️ Printing shopping list...');
  
  if (!currentShoppingList || currentShoppingList.length === 0) {
    showMessage('Shopping list is empty - nothing to print!', 'error');
    return;
  }
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showMessage('Unable to open print window. Please check your browser settings.', 'error');
    return;
  }
  
  // Generate print content
  const printContent = generatePrintContent();
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>NutriValor Shopping List</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .category { margin-bottom: 20px; }
        .category h2 { color: #666; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .item { margin: 8px 0; padding: 8px 0; border-bottom: 1px dotted #ddd; display: flex; align-items: flex-start; }
        .checkbox { font-size: 24px; font-weight: bold; margin-right: 12px; line-height: 1; color: #333; }
        .item-content { flex: 1; }
        .item-name { font-weight: bold; margin-bottom: 4px; }
        .item-details { font-size: 0.9em; color: #666; }
        .totals { margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      ${printContent}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  
  showMessage('Shopping list opened for printing!', 'success');
}

// Generate print content
function generatePrintContent(): string {
  // Consolidate items for printing
  const consolidatedItems = consolidateItems(currentShoppingList);
  const totals = calculateTotals(consolidatedItems);
  const date = new Date().toLocaleDateString();
  
  // Group consolidated items by category
  const itemsByCategory = consolidatedItems.reduce((groups: Record<string, any[]>, item: any) => {
    const category = item.category || item.brand || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, any[]>);
  
  // Sort categories with SUNDRIES at the end
  const categoryOrder = Object.keys(itemsByCategory).sort((a, b) => {
    if (a === 'SUNDRIES') return 1;
    if (b === 'SUNDRIES') return -1;
    return a.localeCompare(b);
  });
  
  let content = `
    <h1>NutriValor Shopping List</h1>
    <p><strong>Generated:</strong> ${date}</p>
    <p><strong>Total Items:</strong> ${totals.totalItems}</p>
  `;
  
  categoryOrder.forEach(category => {
    const items = itemsByCategory[category];
    const isSundries = category === 'SUNDRIES';
    
    content += `
      <div class="category">
        <h2>${category}${isSundries ? ' (From Meal Plans)' : ''}</h2>
    `;
    
    items.forEach(item => {
      content += `
        <div class="item">
          <div class="checkbox">☐</div>
          <div class="item-content">
            <div class="item-name">${item.name} (Qty: ${item.quantity})</div>
            <div class="item-details">
              Carbs: ${formatNutrition(item.carbs)}g | 
              Fat: ${formatNutrition(item.fat)}g | 
              Protein: ${formatNutrition(item.protein)}g
              ${item.brand && item.brand !== 'SUNDRIES' ? ` | Brand: ${item.brand}` : ''}
            </div>
          </div>
        </div>
      `;
    });
    
    content += `</div>`;
  });
  
  content += `
    <div class="totals">
      <h2>Totals</h2>
      <p><strong>Total Carbs:</strong> ${totals.totalCarbs.toFixed(1)}g</p>
      <p><strong>Total Fat:</strong> ${totals.totalFat.toFixed(1)}g</p>
      <p><strong>Total Protein:</strong> ${totals.totalProtein.toFixed(1)}g</p>
    </div>
  `;
  
  return content;
}

// Handle clear shopping list with confirmation
export function handleClearShoppingList(): void {
  console.log('🗑️ Clear shopping list requested...');
  
  if (!currentShoppingList || currentShoppingList.length === 0) {
    showMessage('Shopping list is already empty!', 'info');
    return;
  }
  
  const confirmed = confirm(`Are you sure you want to clear all ${currentShoppingList.length} items from your shopping list? This cannot be undone.`);
  
  if (confirmed) {
    clearAllShoppingItems();
  } else {
    console.log('🚫 Clear shopping list cancelled by user');
  }
}
 