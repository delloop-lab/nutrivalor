// Food Tracker Module for Nutrime
let foodData = [];
let shoppingList = [];
let currentCategory = 'all';

// Load foods from database
async function loadFoodsFromDatabase() {
    try {
        if (!currentUser) return;
        
        // For localStorage fallback
        const storedFoods = localStorage.getItem('nutrime_foods');
        if (storedFoods) {
            foodData = JSON.parse(storedFoods);
            updateCategoryFilters();
            displayFoods();
            return;
        }
        
        // For Supabase (when configured)
        if (supabase && supabase.from) {
            const { data, error } = await supabase
                .from('foods')
                .select('*')
                .eq('user_id', currentUser.id);
            
            if (error) {
                console.error('Error loading foods:', error);
                return;
            }
            
            foodData = data || [];
            updateCategoryFilters();
            displayFoods();
        }
        
    } catch (error) {
        console.error('Error loading foods from database:', error);
    }
}

// Save foods to database
async function saveFoodsToDatabase(foods) {
    try {
        if (!currentUser) return;
        
        // Add user ID to each food item
        const foodsWithUserId = foods.map(food => ({
            ...food,
            user_id: currentUser.id,
            id: generateId()
        }));
        
        // For localStorage fallback
        const existingFoods = JSON.parse(localStorage.getItem('nutrime_foods') || '[]');
        const updatedFoods = [...existingFoods, ...foodsWithUserId];
        localStorage.setItem('nutrime_foods', JSON.stringify(updatedFoods));
        foodData = updatedFoods;
        
        // For Supabase (when configured)
        if (supabase && supabase.from) {
            const { data, error } = await supabase
                .from('foods')
                .insert(foodsWithUserId)
                .select();
            
            if (error) {
                console.error('Error saving foods:', error);
                throw error;
            }
            
            foodData = [...foodData, ...(data || [])];
        }
        
        updateCategoryFilters();
        displayFoods();
        
    } catch (error) {
        console.error('Error saving foods to database:', error);
        throw error;
    }
}

// Display foods in the grid
function displayFoods() {
    const foodGrid = document.getElementById('foodGrid');
    if (!foodGrid) return;
    
    // Filter foods by current category
    const filteredFoods = currentCategory === 'all' 
        ? foodData 
        : foodData.filter(food => food.category === currentCategory);
    
    if (filteredFoods.length === 0) {
        foodGrid.innerHTML = '<p class="empty-state">No foods found. Upload your food data to get started!</p>';
        return;
    }
    
    // Sort foods alphabetically
    filteredFoods.sort((a, b) => a.name.localeCompare(b.name));
    
    // Generate HTML for food cards
    foodGrid.innerHTML = filteredFoods.map(food => {
        const isInShoppingList = shoppingList.some(item => item.id === food.id);
        const buttonClass = isInShoppingList ? 'add-btn added' : 'add-btn';
        const buttonText = isInShoppingList ? 'Added' : 'Add to List';
        
        const existingItem = shoppingList.find(item => item.id === food.id);
        const quantityValue = existingItem ? existingItem.quantity : 1;
        
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
                    <input type="number" class="quantity-input" value="${quantityValue}" min="1" id="qty-${food.id}">
                    <button class="${buttonClass}" onclick="${isInShoppingList ? `removeFromShoppingList('${food.id}')` : `addToShoppingList('${food.id}')`}">
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Update category filters
function updateCategoryFilters() {
    const filterContainer = document.querySelector('.category-filters');
    if (!filterContainer) return;
    
    // Get unique categories
    const categories = [...new Set(foodData.map(food => food.category))];
    
    // Generate filter buttons
    const filtersHTML = `
        <button class="filter-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterByCategory('all')">All</button>
        ${categories.map(category => `
            <button class="filter-btn ${currentCategory === category ? 'active' : ''}" onclick="filterByCategory('${category}')">
                ${category}
            </button>
        `).join('')}
    `;
    
    filterContainer.innerHTML = filtersHTML;
}

// Filter foods by category
function filterByCategory(category) {
    currentCategory = category;
    updateCategoryFilters();
    displayFoods();
}

// Add food to shopping list
function addToShoppingList(foodId) {
    const food = foodData.find(f => f.id === foodId);
    const quantityInput = document.getElementById(`qty-${foodId}`);
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
    
    if (!food) {
        showMessage('Food item not found', 'error');
        return;
    }
    
    // Check if item already exists in shopping list
    const existingItem = shoppingList.find(item => item.id === foodId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        shoppingList.push({
            ...food,
            quantity: quantity
        });
    }
    
    // Save to localStorage
    localStorage.setItem('nutrime_shopping_list', JSON.stringify(shoppingList));
    
    showMessage(`Added ${quantity}x ${food.name} to shopping list`, 'success');
    displayFoods(); // Refresh to update button states
    
    // Update shopping list if we're on that section
    if (currentSection === 'shopping-list') {
        displayShoppingList();
    }
}

// Remove food from shopping list
function removeFromShoppingList(foodId) {
    shoppingList = shoppingList.filter(item => item.id !== foodId);
    
    // Save to localStorage
    localStorage.setItem('nutrime_shopping_list', JSON.stringify(shoppingList));
    
    showMessage('Removed from shopping list', 'success');
    displayFoods(); // Refresh to update button states
    
    // Update shopping list if we're on that section
    if (currentSection === 'shopping-list') {
        displayShoppingList();
    }
}

// Load shopping list from storage
async function loadShoppingListFromDatabase() {
    try {
        const storedList = localStorage.getItem('nutrime_shopping_list');
        if (storedList) {
            shoppingList = JSON.parse(storedList);
        }
        
        // For Supabase integration later
        // Add logic to load from Supabase when configured
        
    } catch (error) {
        console.error('Error loading shopping list:', error);
    }
}

// Display shopping list
function displayShoppingList() {
    const shoppingItems = document.getElementById('shoppingItems');
    const shoppingTotals = document.getElementById('shoppingTotals');
    
    if (!shoppingItems) return;
    
    if (shoppingList.length === 0) {
        shoppingItems.innerHTML = '<p class="empty-state">Your shopping list is empty. Add items from the Food Tracker!</p>';
        shoppingTotals.style.display = 'none';
        return;
    }
    
    // Calculate totals
    let totalCarbs = 0;
    let totalFat = 0;
    let totalProtein = 0;
    
    // Generate shopping list HTML
    shoppingItems.innerHTML = shoppingList.map(item => {
        const itemCarbs = (item.carbs || 0) * item.quantity;
        const itemFat = (item.fat || 0) * item.quantity;
        const itemProtein = (item.protein || 0) * item.quantity;
        
        totalCarbs += itemCarbs;
        totalFat += itemFat;
        totalProtein += itemProtein;
        
        return `
            <div class="shopping-item">
                <div class="shopping-item-info">
                    <h4>${item.name}</h4>
                    ${item.brand ? `<div class="brand-info">${item.brand}</div>` : ''}
                    <div class="nutrition-info">
                        <span>Carbs: ${formatNutrition(itemCarbs)}g</span>
                        <span>Fat: ${formatNutrition(itemFat)}g</span>
                        <span>Protein: ${formatNutrition(itemProtein)}g</span>
                    </div>
                </div>
                <div class="shopping-item-actions">
                    <div class="quantity-controls">
                        <button onclick="updateShoppingListQuantity('${item.id}', ${item.quantity - 1})" class="quantity-btn">-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button onclick="updateShoppingListQuantity('${item.id}', ${item.quantity + 1})" class="quantity-btn">+</button>
                    </div>
                    <button onclick="removeFromShoppingList('${item.id}')" class="remove-btn">Remove</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Display totals
    shoppingTotals.innerHTML = `
        <h3>Shopping List Totals</h3>
        <div class="nutrition-totals">
            <div class="total-item">
                <span class="total-label">Total Carbs:</span>
                <span class="total-value">${formatNutrition(totalCarbs)}g</span>
            </div>
            <div class="total-item">
                <span class="total-label">Total Fat:</span>
                <span class="total-value">${formatNutrition(totalFat)}g</span>
            </div>
            <div class="total-item">
                <span class="total-label">Total Protein:</span>
                <span class="total-value">${formatNutrition(totalProtein)}g</span>
            </div>
            <div class="total-item">
                <span class="total-label">Total Items:</span>
                <span class="total-value">${shoppingList.length}</span>
            </div>
        </div>
    `;
    shoppingTotals.style.display = 'block';
}

// Update shopping list item quantity
function updateShoppingListQuantity(foodId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromShoppingList(foodId);
        return;
    }
    
    const item = shoppingList.find(item => item.id === foodId);
    if (item) {
        item.quantity = newQuantity;
        localStorage.setItem('nutrime_shopping_list', JSON.stringify(shoppingList));
        displayShoppingList();
    }
}

// Clear shopping list
function clearShoppingList() {
    if (shoppingList.length === 0) {
        showMessage('Shopping list is already empty', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to clear your shopping list?')) {
        shoppingList = [];
        localStorage.setItem('nutrime_shopping_list', JSON.stringify(shoppingList));
        displayShoppingList();
        displayFoods(); // Refresh food display to update button states
        showMessage('Shopping list cleared', 'success');
    }
}