import { 
  loadShoppingListFromDatabase, 
  removeFromShoppingList,
  updateShoppingListQuantity
} from './database';
import { allFoods } from './food-tracker';
import { loadFoodsFromDatabase } from './database';

// Store shopping list items for quick lookup
let currentShoppingList: any[] = [];

// Initialize shopping list functionality
export async function initializeShoppingList(): Promise<void> {
  // Removed excessive logging for performance
  await loadAndDisplayShoppingList();
  
  // Set up event listener for cross-module refresh requests
  window.addEventListener('shoppingListNeedsRefresh', async (event: Event) => {
    const customEvent = event as CustomEvent;
    try {
      await loadAndDisplayShoppingList();
    } catch (error) {
      // console.error('❌ Error refreshing shopping list via event:', error);
    }
  });
  
      // Removed excessive logging for performance
}

// Load and display shopping list
export async function loadAndDisplayShoppingList(): Promise<void> {
  const items = await loadShoppingListFromDatabase();
  if (!items) return;
  
  // Store items for print functionality and other access
  currentShoppingList = items;
  displayShoppingList(items);
}

// Consolidate duplicate items by combining quantities
function consolidateItems(items: any[]): any[] {
  const consolidated: Record<string, any> = {};
  
  items.forEach((item, index) => {
    
    // Create a more specific key that includes name, brand, category and unit for better matching
    // Skip invalid items
    if (!item || !item.name) {
      return;
    }

    const brand = (item.brand || 'Any').toString();
    const category = (item.category || 'General').toString();
    const unit = (item.unit || 'EACH').toString();
    const key = `${item.name.toString().toLowerCase().trim()}_${brand.toLowerCase().trim()}_${category.toLowerCase().trim()}_${unit.toLowerCase().trim()}`;
    
    if (consolidated[key]) {
      // Item already exists, add quantities together
      const oldQty = consolidated[key].quantity;
      const addQty = parseInt(item.quantity) || 1;
      consolidated[key].quantity = (parseInt(oldQty) || 1) + addQty;
    } else {
      // New item, add to consolidated list
      const quantity = parseInt(item.quantity) || 1;
      consolidated[key] = { ...item, quantity: quantity };
    }
  });
  
  const result = Object.values(consolidated);
  return result;
}

// Display shopping list items
export function displayShoppingList(items: any[]): void {
  const shoppingItemsContainer = document.getElementById('shoppingItems');
  const shoppingTotalsContainer = document.getElementById('shoppingTotals');
  
  if (!shoppingItemsContainer) {
    return;
  }

  // Clear totals first to avoid inconsistency
  if (shoppingTotalsContainer) {
    shoppingTotalsContainer.style.display = 'none';
    shoppingTotalsContainer.innerHTML = '';
  }

  if (!items || items.length === 0) {
    shoppingItemsContainer.innerHTML = '<p class="empty-state">Your shopping list is empty. Add items from the Food Tracker!</p>';
    // Ensure totals are hidden for empty state
    if (shoppingTotalsContainer) {
      shoppingTotalsContainer.style.display = 'none';
    }
    return;
  }

  // Enrich items with food data from allFoods
  const enrichedItems = items.map(item => {
    if (item.name) return item; // Already enriched
    const food = allFoods.find(f => f.id === item.food_id);
    if (food) {
      return {
        ...item,
        name: food.name,
        brand: food.brand,
        category: food.category,
        carbs: food.carbs,
        fat: food.fat,
        protein: food.protein
      };
    }
    return item;
  });

  // Consolidate duplicate items first
  const consolidatedItems = consolidateItems(enrichedItems);

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
                <h4>${item.name || 'Unknown Food'}</h4>
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
                  <span class="unit-label">${item.unit || 'EACH'}</span>
                </div>
                <button onclick="removeShoppingItem('${item.id}')" class="remove-btn">Remove</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Calculate and display totals
  const totals = calculateTotals(consolidatedItems);
  
  if (shoppingTotalsContainer) {
    shoppingTotalsContainer.style.display = 'block';
    if (totals.totalItems > 0) {
      const totalsHTML = `
        <div class="totals-header">
          <h3>Shopping List Totals</h3>
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
      shoppingTotalsContainer.innerHTML = totalsHTML;
    } else {
      const emptyTotalsHTML = `
        <div class="totals-header">
          <h3>Shopping List Totals</h3>
        </div>
        <div class="totals-grid">
          <div class="total-item">
            <span class="label">Total Carbs:</span>
            <span class="value">0.0g</span>
          </div>
          <div class="total-item">
            <span class="label">Total Fat:</span>
            <span class="value">0.0g</span>
          </div>
          <div class="total-item">
            <span class="label">Total Protein:</span>
            <span class="value">0.0g</span>
          </div>
        </div>
      `;
      shoppingTotalsContainer.innerHTML = emptyTotalsHTML;
    }
  }
}

// Calculate totals for shopping list
function calculateTotals(items: any[]): any {
  const totals = {
    totalItems: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    totalCarbs: 0,
    totalFat: 0,
    totalProtein: 0
  };

  items.forEach(item => {
    const quantity = item.quantity || 0;
    totals.totalCarbs += (parseFloat(item.carbs) || 0) * quantity;
    totals.totalFat += (parseFloat(item.fat) || 0) * quantity;
    totals.totalProtein += (parseFloat(item.protein) || 0) * quantity;
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
        // console.log('✅ Meal plan checkboxes refreshed after item removal');
      }
    } catch (error) {
      // console.warn('⚠️ Could not refresh meal plan checkboxes:', error);
    }
    
    showMessage('Item removed from shopping list', 'success');
  } catch (error) {
    // console.error('Error removing item:', error);
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
    // console.error('Error updating quantity:', error);
    showMessage('Error updating quantity', 'error');
  }
}

// Clear all items from shopping list
export async function clearAllShoppingItems(skipDatabase: boolean = false): Promise<void> {
  // console.log('🧹 SHOPPING-LIST: Starting shopping list clear...');
  
  try {
    // Clear from database only if not skipped (to avoid double-clearing)
    if (!skipDatabase) {
      const { clearShoppingListFromDatabase } = await import('./database');
      await clearShoppingListFromDatabase();
      // console.log('✅ Database cleared successfully');
    } else {
      // console.log('⏭️ Database clear skipped (already done by food-tracker)');
    }
    
    // Clear local array
    currentShoppingList = [];
    // console.log('✅ Local shopping list array cleared');
    
    // Update display
    displayShoppingList([]);
    // console.log('✅ Display updated');
    
    // Refresh meal plan checkboxes to reflect changes
    try {
      if (typeof (window as any).refreshMealShoppingCheckboxes === 'function') {
        await (window as any).refreshMealShoppingCheckboxes();
        // console.log('✅ Meal plan checkboxes refreshed after clearing list');
      }
    } catch (error) {
      // console.warn('⚠️ Could not refresh meal plan checkboxes:', error);
    }
    
    if (!skipDatabase) {
      showMessage('Shopping list cleared', 'success');
    }
  } catch (error) {
    // console.error('❌ Error clearing shopping list:', error);
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
export async function printShoppingList(): Promise<void> {
  // console.log('🖨️ PRINT DEBUG: Starting print process...');
  // console.log('🖨️ PRINT DEBUG: currentShoppingList length:', currentShoppingList?.length);
  // console.log('🖨️ PRINT DEBUG: currentShoppingList sample:', currentShoppingList?.[0]);
  // console.log('🖨️ PRINT DEBUG: allFoods length:', allFoods?.length);
  // console.log('🖨️ PRINT DEBUG: allFoods sample:', allFoods?.[0]);
  
  // Ensure allFoods is loaded before printing
  if (!allFoods || allFoods.length === 0) {
    // console.log('🖨️ PRINT DEBUG: allFoods is empty, loading from database...');
    const foods = await loadFoodsFromDatabase();
    // console.log('🖨️ PRINT DEBUG: Loaded foods from database:', foods?.length, 'items');
    // console.log('🖨️ PRINT DEBUG: Sample loaded food:', foods?.[0]);
    if (foods && foods.length > 0) {
      allFoods.length = 0;
      allFoods.push(...foods);
      // console.log('🖨️ PRINT DEBUG: allFoods populated with', allFoods.length, 'items');
      
      // Also re-enrich currentShoppingList with the loaded foods
      currentShoppingList = currentShoppingList.map(item => {
        if (item.name) return item; // Already enriched
        const food = allFoods.find(f => f.id === item.food_id);
        if (food) {
          // console.log('🖨️ PRINT DEBUG: Enriching item with food:', food.name);
          return {
            ...item,
            name: food.name,
            brand: food.brand,
            category: food.category,
            carbs: food.carbs,
            fat: food.fat,
            protein: food.protein
          };
        }
        // console.log('🖨️ PRINT DEBUG: No food found for item:', item);
        return item;
      });
      // console.log('🖨️ PRINT DEBUG: currentShoppingList after enrichment:', currentShoppingList);
    } else {
      // console.error('🖨️ PRINT DEBUG: Failed to load foods from database');
    }
  }
  
  if (!currentShoppingList || currentShoppingList.length === 0) {
    // console.log('🖨️ PRINT DEBUG: Shopping list is empty');
    showMessage('Shopping list is empty - nothing to print!', 'error');
    return;
  }
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // console.error('🖨️ PRINT DEBUG: Failed to open print window');
    showMessage('Unable to open print window. Please check your browser settings.', 'error');
    return;
  }
  
  // console.log('🖨️ PRINT DEBUG: Generating print content...');
  const printContent = generatePrintContent();
  // console.log('🖨️ PRINT DEBUG: Generated content length:', printContent.length);
  // console.log('🖨️ PRINT DEBUG: Content preview:', printContent.substring(0, 500));
  
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
  // console.log('🖨️ CONTENT DEBUG: Starting generatePrintContent...');
  // console.log('🖨️ CONTENT DEBUG: currentShoppingList:', currentShoppingList);
  
  // Enrich shopping list items with food data from allFoods for printing
  const enrichedItems = currentShoppingList.map((item, index) => {
    // console.log(`🖨️ CONTENT DEBUG: Processing item ${index}:`, item);
    if (item.name) {
      // console.log(`🖨️ CONTENT DEBUG: Item ${index} already has name:`, item.name);
      return item; // Already enriched
    }
    const food = allFoods.find(f => f.id === item.food_id);
    // console.log(`🖨️ CONTENT DEBUG: Found food for item ${index}:`, food);
    if (food) {
      const enriched = {
        ...item,
        name: food.name,
        brand: food.brand,
        category: food.category,
        carbs: food.carbs,
        fat: food.fat,
        protein: food.protein
      };
      // console.log(`🖨️ CONTENT DEBUG: Enriched item ${index}:`, enriched);
      return enriched;
    }
    // console.log(`🖨️ CONTENT DEBUG: No food found for item ${index}, using as-is`);
    return item;
  });
  
  // console.log('🖨️ CONTENT DEBUG: Enriched items:', enrichedItems);
  
  // Consolidate items for printing
  // console.log('🖨️ CONTENT DEBUG: Starting consolidation...');
  const consolidatedItems = consolidateItems(enrichedItems);
  // console.log('🖨️ CONTENT DEBUG: Consolidated items:', consolidatedItems);
  
  const totals = calculateTotals(consolidatedItems);
  // console.log('🖨️ CONTENT DEBUG: Calculated totals:', totals);
  
  const date = new Date().toLocaleDateString();
  
  // Group consolidated items by category using direct item fields
  const itemsByCategory = consolidatedItems.reduce((groups: Record<string, any[]>, item: any) => {
    const category = item.category || item.brand || 'General';
    // console.log('🖨️ CONTENT DEBUG: Item category:', category, 'for item:', item);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, any[]>);
  
  // console.log('🖨️ CONTENT DEBUG: Items by category:', itemsByCategory);
  
  // Sort categories with SUNDRIES at the end
  const categoryOrder = Object.keys(itemsByCategory).sort((a, b) => {
    if (a === 'SUNDRIES') return 1;
    if (b === 'SUNDRIES') return -1;
    return a.localeCompare(b);
  });
  
  // console.log('🖨️ CONTENT DEBUG: Category order:', categoryOrder);
  
  let content = `
    <h1>NutriValor Shopping List</h1>
    <p><strong>Generated:</strong> ${date}</p>
    <p><strong>Total Items:</strong> ${totals.totalItems}</p>
  `;
  
  categoryOrder.forEach(category => {
    const items = itemsByCategory[category];
    const isSundries = category === 'SUNDRIES';
    // console.log(`🖨️ CONTENT DEBUG: Processing category ${category} with ${items.length} items`);
    
    content += `
      <div class="category">
        <h2>${category}${isSundries ? ' (From Meal Plans)' : ''}</h2>
    `;
    
    items.forEach((item, itemIndex) => {
      // console.log(`🖨️ CONTENT DEBUG: Processing item ${itemIndex} in category ${category}:`, item);
      const foodName = item.name || 'Unknown Food';
      const carbs = item.carbs;
      const fat = item.fat;
      const protein = item.protein;
      const brand = item.brand;
      
      // console.log(`🖨️ CONTENT DEBUG: Item ${itemIndex} values - name: ${foodName}, carbs: ${carbs}, fat: ${fat}, protein: ${protein}, brand: ${brand}`);
      
      const unitDisplay = item.unit ? (item.quantity > 1 && item.unit.toUpperCase() === 'SLICE' ? 'SLICES' : item.unit) : '';
      content += `
        <div class="item">
          <div class="checkbox">☐</div>
          <div class="item-content">
            <div class="item-name">${foodName} (Qty: ${item.quantity} ${unitDisplay})</div>
            <div class="item-details">
              Carbs: ${formatNutrition(carbs)}g | 
              Fat: ${formatNutrition(fat)}g | 
              Protein: ${formatNutrition(protein)}g
              ${brand && brand !== 'SUNDRIES' ? ` | Brand: ${brand}` : ''}
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
  
  // console.log('🖨️ CONTENT DEBUG: Final content generated, length:', content.length);
  return content;
}

// Handle clear shopping list with confirmation
export function handleClearShoppingList(): void {
  // console.log('🗑️ Clear shopping list requested...');
  
  if (!currentShoppingList || currentShoppingList.length === 0) {
    showMessage('Shopping list is already empty!', 'info');
    return;
  }
  
  const confirmed = confirm(`Are you sure you want to clear all ${currentShoppingList.length} items from your shopping list? This cannot be undone.`);
  
  if (confirmed) {
    clearAllShoppingItems();
  } else {
    // console.log('🚫 Clear shopping list cancelled by user');
  }
}
 